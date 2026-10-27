import { createAdapter } from '@socket.io/redis-adapter';
import { createRedisConnection } from '../config/redis.js';

/**
 * Configure horizontal scaling adapter for Socket.io
 * Seamlessly connects to Redis pub/sub if available, otherwise falls back to memory.
 */
export const configureSocketAdapter = async (io) => {
  try {
    const pubClient = createRedisConnection();
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      // Handled silently to prevent crash if Redis is unavailable
    });
    subClient.on('error', (err) => {
      // Handled silently
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.io Redis adapter initialized for horizontal scaling');
    return true;
  } catch (err) {
    console.warn('⚠️  Redis adapter could not connect - continuing with default in-memory adapter for single-instance mode.');
    return false;
  }
};
