import { WebSocketServer, WebSocket } from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { getYDoc, unloadDocIfEmpty } from './persistence.js';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_AUTH = 2;
const MESSAGE_QUERY_AWARENESS = 3;

// Map of docName -> Set<WebSocket>
const docConnections = new Map();
// Map of docName -> Awareness
const docAwareness = new Map();

const send = (conn, message) => {
  if (conn.readyState === WebSocket.OPEN) {
    try {
      conn.send(message);
    } catch (e) {
      console.warn('[Yjs WS] Failed to send message:', e.message);
    }
  }
};

const broadcastToDoc = (docName, message, originConn) => {
  const conns = docConnections.get(docName);
  if (!conns) return;

  for (const conn of conns) {
    if (conn !== originConn && conn.readyState === WebSocket.OPEN) {
      send(conn, message);
    }
  }
};

/**
 * Setup WebSocket handling for Yjs CRDT room documents
 */
export const setupYjsWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    
    // Check if the upgrade request is for /yjs/<docName> or /yjs?room=<docName>
    if (url.pathname.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (conn, req) => {
    conn.binaryType = 'arraybuffer';
    conn.isAlive = true;

    // Extract docName from path: /yjs/<roomId> or /yjs?room=<roomId>
    const url = new URL(req.url, `http://${req.headers.host}`);
    let docName = url.searchParams.get('room');
    if (!docName) {
      const parts = url.pathname.replace(/^\/yjs\/?/, '').split('/');
      docName = parts[0] || 'default-room';
    }

    const doc = await getYDoc(docName);

    // Initialize or fetch awareness for document
    let awareness = docAwareness.get(docName);
    if (!awareness) {
      awareness = new awarenessProtocol.Awareness(doc);
      docAwareness.set(docName, awareness);

      // Listen to awareness changes and broadcast to other peers
      awareness.on('update', ({ added, updated, removed }, origin) => {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        );
        const msg = encoding.toUint8Array(encoder);
        broadcastToDoc(docName, msg, origin);
      });

      // Listen to document updates and broadcast to peers
      doc.on('update', (update, origin) => {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.writeUpdate(encoder, update);
        const msg = encoding.toUint8Array(encoder);
        broadcastToDoc(docName, msg, origin);
      });
    }

    // Register connection
    if (!docConnections.has(docName)) {
      docConnections.set(docName, new Set());
    }
    const connections = docConnections.get(docName);
    connections.add(conn);

    // Send initial sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    send(conn, encoding.toUint8Array(encoder));

    // Send initial awareness states
    const awarenessStates = awareness.getStates();
    if (awarenessStates.size > 0) {
      const encoderAwareness = encoding.createEncoder();
      encoding.writeVarUint(encoderAwareness, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoderAwareness,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
      );
      send(conn, encoding.toUint8Array(encoderAwareness));
    }

    // Handle incoming messages
    conn.on('message', (message) => {
      try {
        const bytes = new Uint8Array(message);
        const decoder = decoding.createDecoder(bytes);
        const messageType = decoding.readVarUint(decoder);

        switch (messageType) {
          case MESSAGE_SYNC: {
            const replyEncoder = encoding.createEncoder();
            encoding.writeVarUint(replyEncoder, MESSAGE_SYNC);
            syncProtocol.readSyncMessage(decoder, replyEncoder, doc, conn);
            if (encoding.length(replyEncoder) > 1) {
              send(conn, encoding.toUint8Array(replyEncoder));
            }
            break;
          }
          case MESSAGE_AWARENESS: {
            awarenessProtocol.applyAwarenessUpdate(
              awareness,
              decoding.readVarUint8Array(decoder),
              conn
            );
            break;
          }
          case MESSAGE_QUERY_AWARENESS: {
            const encoderAwareness = encoding.createEncoder();
            encoding.writeVarUint(encoderAwareness, MESSAGE_AWARENESS);
            encoding.writeVarUint8Array(
              encoderAwareness,
              awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()))
            );
            send(conn, encoding.toUint8Array(encoderAwareness));
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error(`[Yjs WS Error in ${docName}]:`, err);
      }
    });

    conn.on('pong', () => {
      conn.isAlive = true;
    });

    // Cleanup on disconnect
    conn.on('close', () => {
      connections.delete(conn);
      if (connections.size === 0) {
        docConnections.delete(docName);
        unloadDocIfEmpty(docName, 0);
      }
    });

    conn.on('error', (err) => {
      console.warn(`[Yjs WS Connection Error in ${docName}]:`, err.message);
    });
  });

  // Heartbeat ping interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
};
