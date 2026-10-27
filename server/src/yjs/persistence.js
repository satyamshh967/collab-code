import * as Y from 'yjs';
import { getRedisClient } from '../config/redis.js';
import { roomManager } from '../models/Room.js';

// In-memory document storage cache
const docs = new Map();
const docDebounceTimers = new Map();

/**
 * Get or initialize a Yjs document for a given room.
 * Hydrates state from Redis if available, or room default code.
 */
export const getYDoc = async (docName, defaultCode = '') => {
  let doc = docs.get(docName);
  if (doc) {
    return doc;
  }

  doc = new Y.Doc();
  docs.set(docName, doc);

  const redis = getRedisClient();
  let stateLoaded = false;

  if (redis && redis.status === 'ready') {
    try {
      const savedBase64 = await redis.get(`yjs:doc:${docName}`);
      if (savedBase64) {
        const updateBuffer = Buffer.from(savedBase64, 'base64');
        Y.applyUpdate(doc, new Uint8Array(updateBuffer));
        stateLoaded = true;
      }
    } catch (err) {
      console.warn(`[Yjs Persistence] Failed to load ${docName} from Redis:`, err.message);
    }
  }

  // If not in Redis, check roomManager or defaultCode
  if (!stateLoaded) {
    const room = roomManager.findById(docName);
    const initialText = (room && room.code) ? room.code : defaultCode;
    if (initialText) {
      const yText = doc.getText('monaco');
      if (yText.length === 0) {
        yText.insert(0, initialText);
      }
    }
  }

  // Automatically sync updates to roomManager and schedule Redis persistence
  doc.on('update', (update) => {
    scheduleDocPersistence(docName, doc);
    
    // Keep room model in sync
    const room = roomManager.findById(docName);
    if (room) {
      room.updateCode(doc.getText('monaco').toString());
    }
  });

  return doc;
};

/**
 * Persist document state to Redis and local memory
 */
export const persistYDoc = async (docName, doc) => {
  if (!doc) return;

  const yText = doc.getText('monaco').toString();
  const room = roomManager.findById(docName);
  if (room) {
    room.updateCode(yText);
  }

  const redis = getRedisClient();
  if (redis && redis.status === 'ready') {
    try {
      const stateUpdate = Y.encodeStateAsUpdate(doc);
      const base64 = Buffer.from(stateUpdate).toString('base64');
      await redis.set(`yjs:doc:${docName}`, base64);
    } catch (err) {
      console.warn(`[Yjs Persistence] Failed to persist ${docName} to Redis:`, err.message);
    }
  }
};

/**
 * Debounced persistence helper
 */
const scheduleDocPersistence = (docName, doc) => {
  if (docDebounceTimers.has(docName)) {
    clearTimeout(docDebounceTimers.get(docName));
  }

  const timer = setTimeout(() => {
    docDebounceTimers.delete(docName);
    persistYDoc(docName, doc);
  }, 1000);

  docDebounceTimers.set(docName, timer);
};

/**
 * Get current code string directly from Yjs doc
 */
export const getDocText = (docName) => {
  const doc = docs.get(docName);
  if (doc) {
    return doc.getText('monaco').toString();
  }
  const room = roomManager.findById(docName);
  return room ? room.code : '';
};

/**
 * Clean up doc from in-memory cache if no connections remain
 */
export const unloadDocIfEmpty = async (docName, activeConnectionsCount = 0) => {
  if (activeConnectionsCount <= 0) {
    const doc = docs.get(docName);
    if (doc) {
      await persistYDoc(docName, doc);
    }
  }
};

export { docs };
