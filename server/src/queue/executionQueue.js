import { Queue, QueueEvents } from 'bullmq';
import { createRedisConnection, checkRedisHealth } from '../config/redis.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { config } from '../config/index.js';

const QUEUE_NAME = 'code-execution';
const LOCAL_JOB_TTL_MS = 10 * 60 * 1000; // forget finished standalone jobs after 10 minutes
const EXECUTION_HTTP_TIMEOUT_MS = 15000;

let executionQueue = null;
let queueEvents = null;
const localJobStore = new Map();

const BULL_STATE_MAP = {
  waiting: 'queued',
  'waiting-children': 'queued',
  delayed: 'queued',
  prioritized: 'queued',
  active: 'running'
};

/**
 * Last-resort in-process sandbox used only when the execution microservice is
 * unreachable. Loaded lazily so the server still boots in deployments (e.g. its
 * own Docker image) where the execution-service sources are not present.
 */
const runInProcessFallback = async (language, code, stdin) => {
  let sandbox;
  try {
    const [{ runLocalSandbox }, { validateCode }] = await Promise.all([
      import('../../../execution-service/src/sandbox/localRunner.js'),
      import('../../../execution-service/src/sandbox/securityPolicy.js')
    ]);
    sandbox = { runLocalSandbox, validateCode };
  } catch (err) {
    return {
      output: '',
      error: 'Execution service is unavailable. Please try again shortly.',
      exitCode: -1,
      executionTime: 0
    };
  }

  // Apply the same policy the execution service enforces — never skip it
  const check = sandbox.validateCode(code, language);
  if (!check.valid) {
    return { output: '', error: `Security validation failed: ${check.reason}`, exitCode: -1, executionTime: 0 };
  }
  return sandbox.runLocalSandbox(language, code, stdin);
};

const finishLocalJob = (jobId, record) => {
  localJobStore.set(jobId, record);
  const timer = setTimeout(() => localJobStore.delete(jobId), LOCAL_JOB_TTL_MS);
  timer.unref?.();
};

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
export const enqueueExecution = async ({ code, language, stdin = '', roomId = null, userId = null, onEvent = null }) => {
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

  // In standalone mode there is no worker publishing events, so report
  // progress through the caller's callback (used to broadcast to the room).
  const emit = (type, data) => {
    try {
      onEvent?.(type, { jobId, roomId, ...data });
    } catch (e) {
      // Broadcasting is best-effort; the job store remains the source of truth
    }
  };
  const finish = (record) => {
    finishLocalJob(jobId, record);
    emit('result', record);
  };

  // Execute in the background, after the caller has announced the job as queued
  setImmediate(async () => {
    try {
      localJobStore.set(jobId, { ...localJobStore.get(jobId), status: 'running' });
      emit('status', { status: 'running' });

      let result;
      try {
        const res = await axios.post(`${config.executionServiceUrl}/execute`, {
          code,
          language,
          stdin
        }, { timeout: EXECUTION_HTTP_TIMEOUT_MS });
        result = res.data;
      } catch (httpErr) {
        if (httpErr.response) {
          // The service answered (e.g. 400 security violation): honour its verdict.
          // Falling back to a local run here would bypass the security policy.
          result = {
            output: '',
            error: httpErr.response.data?.error || `Execution service error (${httpErr.response.status})`,
            exitCode: -1,
            executionTime: 0
          };
        } else {
          // Service unreachable: run in-process with the same policy applied
          result = await runInProcessFallback(language, code, stdin);
        }
      }

      finish({
        status: result.exitCode === 0 ? 'completed' : 'failed',
        output: result.output || '',
        error: result.error || '',
        exitCode: result.exitCode ?? 0,
        executionTime: result.executionTime || 0
      });
    } catch (err) {
      finish({
        status: 'failed',
        output: '',
        error: err.message || 'Execution failed',
        exitCode: -1,
        executionTime: 0
      });
    }
  });

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
            status: BULL_STATE_MAP[state] || state,
            output: job.returnvalue?.output || progress.output || '',
            error: job.returnvalue?.error || progress.error || job.failedReason || '',
            exitCode: job.returnvalue?.exitCode ?? (state === 'failed' ? -1 : 0),
            executionTime: job.returnvalue?.executionTime || 0
          };
        }
      } catch (e) {
        // Fall through to the standalone store
      }
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
