import { WebSocketServer, WebSocket } from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { getYDoc, unloadDocIfEmpty } from './persistence.js';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_QUERY_AWARENESS = 3;

const MAX_DOC_NAME_LENGTH = 128;
const MAX_MESSAGE_BYTES = 2 * 1024 * 1024;

/**
 * docName -> { doc, awareness, conns: Map<WebSocket, Set<number>> }
 * `conns` maps each socket to the awareness client IDs it controls, so their
 * cursors can be removed when the socket goes away.
 */
const docStates = new Map();
const pendingDocStates = new Map();

const send = (conn, message) => {
  if (conn.readyState === WebSocket.OPEN) {
    try {
      conn.send(message);
    } catch (e) {
      console.warn('[Yjs WS] Failed to send message:', e.message);
    }
  }
};

const broadcast = (state, message, originConn) => {
  for (const conn of state.conns.keys()) {
    if (conn !== originConn) send(conn, message);
  }
};

const encodeAwareness = (awareness, clients) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, clients));
  return encoding.toUint8Array(encoder);
};

/** Create (once) the shared doc/awareness state and its broadcast listeners. */
const getDocState = (docName) => {
  if (docStates.has(docName)) return Promise.resolve(docStates.get(docName));
  if (pendingDocStates.has(docName)) return pendingDocStates.get(docName);

  const pending = getYDoc(docName).then((doc) => {
    const awareness = new awarenessProtocol.Awareness(doc);
    // The server is not an editing peer; don't advertise a presence for it
    awareness.setLocalState(null);
    const state = { doc, awareness, conns: new Map() };

    awareness.on('update', ({ added, updated, removed }, origin) => {
      // Remember which awareness clients each connection controls
      const controlled = state.conns.get(origin);
      if (controlled) {
        added.forEach((id) => controlled.add(id));
        removed.forEach((id) => controlled.delete(id));
      }
      const changed = added.concat(updated, removed);
      broadcast(state, encodeAwareness(awareness, changed), origin);
    });

    doc.on('update', (update, origin) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      broadcast(state, encoding.toUint8Array(encoder), origin);
    });

    docStates.set(docName, state);
    pendingDocStates.delete(docName);
    return state;
  }).catch((err) => {
    pendingDocStates.delete(docName);
    throw err;
  });

  pendingDocStates.set(docName, pending);
  return pending;
};

const handleMessage = (conn, state, message) => {
  const decoder = decoding.createDecoder(new Uint8Array(message));
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MESSAGE_SYNC: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, state.doc, conn);
      if (encoding.length(encoder) > 1) {
        send(conn, encoding.toUint8Array(encoder));
      }
      break;
    }
    case MESSAGE_AWARENESS:
      awarenessProtocol.applyAwarenessUpdate(state.awareness, decoding.readVarUint8Array(decoder), conn);
      break;
    case MESSAGE_QUERY_AWARENESS:
      send(conn, encodeAwareness(state.awareness, Array.from(state.awareness.getStates().keys())));
      break;
    default:
      break;
  }
};

export const resolveDocName = (requestUrl, host = 'localhost') => {
  const url = new URL(requestUrl, `http://${host}`);
  let docName = url.searchParams.get('room');
  if (!docName) {
    docName = url.pathname.replace(/^\/yjs\/?/, '').split('/')[0];
  }
  try {
    docName = decodeURIComponent(docName || '');
  } catch (e) {
    return null;
  }
  if (!docName || docName.length > MAX_DOC_NAME_LENGTH) return null;
  return docName;
};

/**
 * Setup WebSocket handling for Yjs CRDT room documents
 */
export const setupYjsWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    // Socket.io handles its own /socket.io upgrades
    if (pathname === '/yjs' || pathname.startsWith('/yjs/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (conn, req) => {
    conn.binaryType = 'arraybuffer';
    conn.isAlive = true;

    const docName = resolveDocName(req.url, req.headers.host);
    if (!docName) {
      conn.close(1008, 'Invalid document name');
      return;
    }

    // Attach listeners synchronously and queue anything that arrives while the
    // document is still loading (e.g. from Redis) — otherwise the client's
    // first sync step is silently dropped and it never finishes syncing.
    let state = null;
    let closed = false;
    const queued = [];

    conn.on('message', (message) => {
      if (!state) {
        queued.push(message);
        return;
      }
      try {
        handleMessage(conn, state, message);
      } catch (err) {
        console.error(`[Yjs WS Error in ${docName}]:`, err.message);
      }
    });

    conn.on('pong', () => {
      conn.isAlive = true;
    });

    conn.on('error', (err) => {
      console.warn(`[Yjs WS Connection Error in ${docName}]:`, err.message);
    });

    conn.on('close', () => {
      closed = true;
      if (!state) return;

      const controlled = state.conns.get(conn);
      state.conns.delete(conn);
      if (controlled && controlled.size > 0) {
        // Drop the departed peer's cursor for everyone else
        awarenessProtocol.removeAwarenessStates(state.awareness, Array.from(controlled), null);
      }
      if (state.conns.size === 0) {
        unloadDocIfEmpty(docName, 0).catch(() => {});
      }
    });

    getDocState(docName).then((docState) => {
      if (closed) return;
      state = docState;
      state.conns.set(conn, new Set());

      // Initial sync step 1
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeSyncStep1(encoder, state.doc);
      send(conn, encoding.toUint8Array(encoder));

      // Current peer cursors
      const states = state.awareness.getStates();
      if (states.size > 0) {
        send(conn, encodeAwareness(state.awareness, Array.from(states.keys())));
      }

      for (const message of queued.splice(0)) {
        try {
          handleMessage(conn, state, message);
        } catch (err) {
          console.error(`[Yjs WS Error in ${docName}]:`, err.message);
        }
      }
    }).catch((err) => {
      console.error(`[Yjs WS] Failed to load document ${docName}:`, err.message);
      conn.close(1011, 'Failed to load document');
    });
  });

  // Heartbeat: terminate connections that stop answering pings
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 25000);
  interval.unref?.();

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
};
