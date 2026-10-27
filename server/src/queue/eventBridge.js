import { queueEvents, QUEUE_NAME, getExecutionQueue } from './executionQueue.js';
import { createRedisConnection, checkRedisHealth } from '../config/redis.js';

/**
 * Bridge BullMQ and Redis pub/sub execution events to Socket.io clients
 */
export const initExecutionEventBridge = async (io) => {
  const isRedisUp = await checkRedisHealth();
  if (!isRedisUp) {
    return;
  }

  try {
    const subscriber = createRedisConnection();
    await subscriber.connect();

    // Subscribe to execution event channels
    await subscriber.psubscribe('execution:events:*');

    subscriber.on('pmessage', (pattern, channel, message) => {
      try {
        const event = JSON.parse(message);
        const { roomId, jobId, type, data } = event;

        if (roomId) {
          if (type === 'output') {
            io.to(roomId).emit('execution:output', { jobId, ...data });
          } else if (type === 'status') {
            io.to(roomId).emit('execution:status', { jobId, ...data });
          } else if (type === 'result') {
            io.to(roomId).emit('execution:result', { jobId, ...data });
          }
        }
      } catch (err) {
        console.warn('[EventBridge] Error handling pub/sub message:', err.message);
      }
    });

    console.log('✅ Real-time execution event bridge initialized');
  } catch (err) {
    console.warn('⚠️  Could not initialize Redis pub/sub event bridge:', err.message);
  }
};
