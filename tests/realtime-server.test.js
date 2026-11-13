import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import WebSocket from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// socket.io-client is a client dependency; resolve it from there
const requireFromClient = createRequire(new URL('../client/package.json', import.meta.url));
const { io: ioClient } = requireFromClient('socket.io-client');

process.env.PORT = '0';
process.env.NODE_ENV = 'test';
const { server, io } = await import('../server/src/index.js');
if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
const { port } = server.address();
const httpBase = `http://127.0.0.1:${port}`;
const wsBase = `ws://127.0.0.1:${port}/yjs`;

const waitFor = async (predicate, { timeout = 4000, interval = 20, message = 'condition' } = {}) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Timed out waiting for ${message}`);
};

const connectProvider = (room) => {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(wsBase, room, doc, { WebSocketPolyfill: WebSocket, disableBc: true });
  return { doc, provider, text: doc.getText('monaco') };
};

const connectSocket = () => new Promise((resolve, reject) => {
  const socket = ioClient(httpBase, { transports: ['websocket'], forceNew: true, reconnection: false });
  socket.once('connect', () => resolve(socket));
  socket.once('connect_error', reject);
});

const joinRoom = (socket, roomId, username) => new Promise((resolve) => {
  socket.once('room:info', resolve);
  socket.emit('room:join', { roomId, username });
});

test('Real-time server integration', async (t) => {
  const cleanups = [];
  t.after(async () => {
    for (const fn of cleanups) {
      try { fn(); } catch (e) {}
    }
    io.close();
    server.close();
  });

  await t.test('seeds a new room document exactly once and converges two editors', async () => {
    const a = connectProvider('yjs-converge');
    const b = connectProvider('yjs-converge');
    cleanups.push(() => a.provider.destroy(), () => b.provider.destroy());

    await waitFor(() => a.provider.synced && b.provider.synced, { message: 'both providers to sync' });
    assert.strictEqual(a.text.toString(), 'console.log("Hello World!");\n', 'starter snippet is seeded server-side');
    assert.strictEqual(b.text.toString(), a.text.toString());

    a.text.insert(0, '// from A\n');
    b.text.insert(b.text.length, '// from B\n');
    await waitFor(() => a.text.toString() === b.text.toString() && a.text.toString().includes('from B') && b.text.toString().includes('from A'),
      { message: 'convergence' });
    assert.strictEqual((a.text.toString().match(/Hello World/g) || []).length, 1, 'snippet must not be duplicated');
  });

  await t.test('removes a departed peer\'s cursor from other clients (no ghost cursors)', async () => {
    const a = connectProvider('yjs-awareness');
    const b = connectProvider('yjs-awareness');
    cleanups.push(() => b.provider.destroy());

    a.provider.awareness.setLocalStateField('user', { name: 'Alice', color: '#ff0000' });
    await waitFor(() => b.provider.awareness.getStates().get(a.doc.clientID)?.user?.name === 'Alice',
      { message: 'B to see Alice' });

    // Simulate an abrupt drop (no graceful awareness cleanup from the client)
    a.provider.shouldConnect = false;
    a.provider.ws.terminate?.() ?? a.provider.ws.close();

    await waitFor(() => !b.provider.awareness.getStates().has(a.doc.clientID), { message: 'Alice cursor removal' });
    a.provider.destroy();
  });

  await t.test('rejects invalid Yjs document names', async () => {
    const ws = new WebSocket(`${wsBase}/${'x'.repeat(200)}`);
    const code = await new Promise((resolve) => ws.on('close', resolve));
    assert.strictEqual(code, 1008);
  });

  await t.test('room:info includes chat history and snapshots for late joiners', async () => {
    const alice = await connectSocket();
    const bob = await connectSocket();
    cleanups.push(() => alice.close(), () => bob.close());

    await joinRoom(alice, 'hist-room', 'Alice');
    const delivered = new Promise((resolve) => alice.on('chat:message', (m) => m.type === 'message' && resolve(m)));
    alice.emit('chat:message', { roomId: 'hist-room', text: '  hello history  ' });
    const msg = await delivered;
    assert.strictEqual(msg.text, 'hello history');

    const info = await joinRoom(bob, 'hist-room', 'Bob');
    assert.ok(Array.isArray(info.chatMessages));
    assert.ok(info.chatMessages.some((m) => m.text === 'hello history'));
    assert.ok(Array.isArray(info.snapshots));
    assert.strictEqual(info.users.length, 2);
  });

  await t.test('sockets cannot post chat into rooms they have not joined', async () => {
    const insider = await connectSocket();
    const outsider = await connectSocket();
    cleanups.push(() => insider.close(), () => outsider.close());

    await joinRoom(insider, 'private-room', 'Insider');
    await joinRoom(outsider, 'other-room', 'Outsider');

    const received = [];
    insider.on('chat:message', (m) => received.push(m));
    outsider.emit('chat:message', { roomId: 'private-room', text: 'intrusion' });
    await new Promise((r) => setTimeout(r, 200));
    assert.ok(!received.some((m) => m.text === 'intrusion'));
  });

  await t.test('room:leave stops delivery of room broadcasts and hands off ownership', async () => {
    const owner = await connectSocket();
    const guest = await connectSocket();
    cleanups.push(() => owner.close(), () => guest.close());

    const ownerInfo = await joinRoom(owner, 'leave-room', 'Owner');
    assert.ok(ownerInfo.users[0].isOwner);
    await joinRoom(guest, 'leave-room', 'Guest');

    const usersAfterLeave = new Promise((resolve) => guest.on('room:users', (u) => u.length === 1 && resolve(u)));
    owner.emit('room:leave');
    const remaining = await usersAfterLeave;
    assert.strictEqual(remaining[0].username, 'Guest');
    assert.ok(remaining[0].isOwner, 'ownership passes to the remaining user');

    const leakedToOwner = [];
    owner.on('chat:message', (m) => leakedToOwner.push(m));
    guest.emit('chat:message', { roomId: 'leave-room', text: 'after leave' });
    await new Promise((r) => setTimeout(r, 200));
    assert.ok(!leakedToOwner.some((m) => m.text === 'after leave'));
  });

  await t.test('invalid room IDs are rejected', async () => {
    const socket = await connectSocket();
    cleanups.push(() => socket.close());
    const err = await new Promise((resolve) => {
      socket.once('error', resolve);
      socket.emit('room:join', { roomId: '../../etc', username: 'x' });
    });
    assert.match(err.message, /Invalid room ID/);
  });

  await t.test('execute API rejects languages that cannot be run', async () => {
    const res = await fetch(`${httpBase}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'fn main() {}', language: 'rust' })
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('execute API never bypasses the security policy via aliases or fallbacks', async () => {
    const submit = await fetch(`${httpBase}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: "require('child_process').execSync('whoami')", language: 'js' })
    });
    assert.strictEqual(submit.status, 202);
    const { jobId } = await submit.json();

    let status;
    await waitFor(async () => {
      status = await (await fetch(`${httpBase}/api/execute/status/${jobId}`)).json();
      return status.status === 'completed' || status.status === 'failed';
    }, { timeout: 20000, interval: 100, message: 'job completion' });

    assert.strictEqual(status.status, 'failed');
    assert.match(status.error, /[Ss]ecurity/);
    assert.strictEqual(status.output, '');
  });

  await t.test('status polling does not consume the general API rate limit', async () => {
    const polls = await Promise.all(
      Array.from({ length: 60 }, () => fetch(`${httpBase}/api/execute/status/does-not-exist`))
    );
    assert.ok(polls.every((r) => r.status === 404));
    const general = await fetch(`${httpBase}/api/rooms`);
    assert.strictEqual(general.headers.get('ratelimit-remaining') !== null, true);
    assert.ok(Number(general.headers.get('ratelimit-remaining')) > 100);
  });
});
