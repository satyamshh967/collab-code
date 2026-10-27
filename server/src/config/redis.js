import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

let redisClient = null;
let isRedisAvailable = false;
let lastHealthCheck = 0;
let cachedHealth = false;

export const getRedisClient = () => {
  if (redisClient) return redisClient;

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Do not auto-retry when offline
      enableOfflineQueue: false,
      lazyConnect: true
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      cachedHealth = true;
      console.log('✅ Connected to Redis successfully');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      cachedHealth = false;
      if (err.code !== 'ECONNREFUSED') {
        console.warn('⚠️  Redis error:', err.message);
      }
    });

    return redisClient;
  } catch (err) {
    console.warn('Failed to initialize Redis client:', err.message);
    return null;
  }
};

export const createRedisConnection = () => {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
    lazyConnect: true
  });
};

export const checkRedisHealth = async () => {
  const now = Date.now();
  if (now - lastHealthCheck < 3000) {
    return cachedHealth;
  }
  lastHealthCheck = now;

  try {
    const client = getRedisClient();
    if (!client) {
      cachedHealth = false;
      return false;
    }
    if (client.status === 'ready') {
      cachedHealth = true;
      return true;
    }
    if (client.status === 'wait') {
      try {
        await client.connect();
        cachedHealth = true;
        return true;
      } catch (e) {
        cachedHealth = false;
        return false;
      }
    }
    cachedHealth = false;
    return false;
  } catch (e) {
    cachedHealth = false;
    return false;
  }
};

export const closeRedisClient = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (e) {
      redisClient.disconnect();
    }
    redisClient = null;
  }
  cachedHealth = false;
};

export { redisUrl, isRedisAvailable };
