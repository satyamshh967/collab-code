import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { executeJavascript } from '../runners/javascriptRunner.js';
import { executePython } from '../runners/pythonRunner.js';
import { executeJava } from '../runners/javaRunner.js';
import { validateCode } from '../sandbox/securityPolicy.js';

const QUEUE_NAME = 'code-execution';
const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

export const startExecutionWorker = () => {
  let publisher = null;

  try {
    publisher = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 1000, 3000)),
      enableOfflineQueue: false,
      lazyConnect: true
    });

    publisher.connect().catch(() => {});
  } catch (err) {
    console.warn('[Worker] Failed to create Redis publisher:', err.message);
  }

  const broadcastEvent = async (roomId, jobId, type, data) => {
    if (publisher && publisher.status === 'ready') {
      try {
        const payload = JSON.stringify({ roomId, jobId, type, data });
        await publisher.publish(`execution:events:${jobId}`, payload);
      } catch (err) {
        console.warn('[Worker] Failed to publish event:', err.message);
      }
    }
  };

  try {
    const connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false
    });

    const worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const { code, language, stdin = '', roomId, userId } = job.data;
        console.log(`[Worker] Processing execution job ${job.id} for language: ${language}`);

        // Notify job started
        await broadcastEvent(roomId, job.id, 'status', { status: 'running' });

        // Security check
        const securityCheck = validateCode(code, language);
        if (!securityCheck.valid) {
          const errRes = {
            output: '',
            error: `Security policy violation: ${securityCheck.reason}`,
            exitCode: -1,
            executionTime: 0
          };
          await broadcastEvent(roomId, job.id, 'result', { status: 'failed', ...errRes });
          throw new Error(errRes.error);
        }

        // Chunk streaming callback
        const onChunk = ({ chunk, type }) => {
          broadcastEvent(roomId, job.id, 'output', { chunk, type });
        };

        let result;
        switch (language.toLowerCase()) {
          case 'java':
            result = await executeJava(code, stdin, onChunk);
            break;
          case 'python':
          case 'py':
            result = await executePython(code, stdin, onChunk);
            break;
          case 'javascript':
          case 'js':
            result = await executeJavascript(code, stdin, onChunk);
            break;
          default:
            throw new Error(`Unsupported execution language: ${language}`);
        }

        const isFailed = result.exitCode !== 0;
        await broadcastEvent(roomId, job.id, 'result', {
          status: isFailed ? 'failed' : 'completed',
          ...result
        });

        return result;
      },
      {
        connection,
        concurrency: 5
      }
    );

    worker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      console.warn(`[Worker] Job ${job?.id} failed:`, err.message);
    });

    console.log('✅ BullMQ code execution worker active (concurrency: 5)');
    return worker;
  } catch (err) {
    console.warn('⚠️  Could not start BullMQ worker:', err.message);
    return null;
  }
};
