import { Queue, QueueEvents } from 'bullmq';
import { createRedisConnection, checkRedisHealth } from '../config/redis.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { config } from '../config/index.js';
import { runLocalSandbox } from '../../../execution-service/src/sandbox/localRunner.js';

const QUEUE_NAME = 'code-execution';

let executionQueue = null;
let queueEvents = null;
const localJobStore = new Map();

/**
 * Initialize BullMQ execution queue only if Redis is healthy
 */
export const getExecutionQueue = async () => {
  if (executionQueue) return executionQueue;

  const isUp = await checkRedisHealth();
  if (!isUp) return null;

  try {
    const connection = createRedisConnection();
    executionQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 1
      }
    });

    queueEvents = new QueueEvents(QUEUE_NAME, { connection });
    console.log('✅ BullMQ code execution queue initialized');
    return executionQueue;
  } catch (err) {
    console.warn('⚠️  Could not initialize BullMQ queue:', err.message);
    return null;
  }
};

/**
 * Enqueue code execution job
 */
export const enqueueExecution = async ({ code, language, stdin = '', roomId = null, userId = null }) => {
  const isRedisUp = await checkRedisHealth();
  const queue = await getExecutionQueue();

  if (isRedisUp && queue) {
    const job = await queue.add('execute-code', {
      code,
      language,
      stdin,
      roomId,
      userId,
      submittedAt: Date.now()
    });

    return {
      jobId: job.id,
      status: 'queued',
      queuedAt: new Date().toISOString()
    };
  }

  // Resilient fallback for standalone environment without active Redis
  const jobId = uuidv4();
  localJobStore.set(jobId, {
    status: 'queued',
    submittedAt: Date.now(),
    code,
    language,
    roomId
  });

  // Asynchronously execute in background to preserve non-blocking decoupled contract
  (async () => {
    try {
      localJobStore.set(jobId, { ...localJobStore.get(jobId), status: 'running' });

      let result;
      try {
        const res = await axios.post(`${config.executionServiceUrl}/execute`, {
          code,
          language,
          stdin
        }, { timeout: 6000 });
        result = res.data;
      } catch (httpErr) {
        // Fallback to internal sandbox runner if microservice is offline
        result = await runLocalSandbox(language, code, stdin);
      }

      localJobStore.set(jobId, {
        status: (result.exitCode === 0 || !result.error) ? 'completed' : 'failed',
        output: result.output || '',
        error: result.error || '',
        exitCode: result.exitCode ?? 0,
        executionTime: result.executionTime || 0
      });
    } catch (err) {
      localJobStore.set(jobId, {
        status: 'failed',
        output: '',
        error: err.message || 'Execution failed',
        exitCode: -1,
        executionTime: 0
      });
    }
  })();

  return {
    jobId,
    status: 'queued',
    queuedAt: new Date().toISOString()
  };
};

/**
 * Get job status by ID
 */
export const getJobStatus = async (jobId) => {
  const isRedisUp = await checkRedisHealth();
  if (isRedisUp) {
    const queue = await getExecutionQueue();
    if (queue) {
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          const state = await job.getState();
          const progress = job.progress || {};
          return {
            jobId: job.id,
            status: state,
            output: job.returnvalue?.output || progress.output || '',
            error: job.returnvalue?.error || progress.error || job.failedReason || '',
            exitCode: job.returnvalue?.exitCode ?? (state === 'failed' ? -1 : 0),
            executionTime: job.returnvalue?.executionTime || 0
          };
        }
      } catch (e) {}
    }
  }

  const localJob = localJobStore.get(jobId);
  if (localJob) {
    return {
      jobId,
      status: localJob.status,
      output: localJob.output || '',
      error: localJob.error || '',
      exitCode: localJob.exitCode ?? 0,
      executionTime: localJob.executionTime || 0
    };
  }

  return null;
};

export { queueEvents, QUEUE_NAME };
