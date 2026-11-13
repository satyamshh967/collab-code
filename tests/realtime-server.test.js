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
  await t.test('reactions are broadcast to everyone in the room and validated', async () => {
    const a = await connectSocket();
    const b = await connectSocket();
    cleanups.push(() => a.close(), () => b.close());
    await joinRoom(a, 'react-room', 'A');
    await joinRoom(b, 'react-room', 'B');

    const seen = [];
    b.on('room:reaction', (r) => seen.push(r));
    a.emit('room:reaction', { roomId: 'react-room', emoji: '<script>' }); // not allowed
    a.emit('room:reaction', { roomId: 'react-room', emoji: '🔥' });
    await waitFor(() => seen.length > 0, { message: 'reaction broadcast' });
    await new Promise((r) => setTimeout(r, 100));
    assert.deepStrictEqual(seen.map((r) => r.emoji), ['🔥']);
    assert.strictEqual(seen[0].username, 'A');
  });

  await t.test('only the host can end or extend an interview, and everyone gets the update', async () => {
    const created = await (await fetch(`${httpBase}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Interview', language: 'python', isInterview: true })
    })).json();

    const host = await connectSocket();
    const candidate = await connectSocket();
    cleanups.push(() => host.close(), () => candidate.close());
    const hostInfo = await joinRoom(host, created.id, 'Host');
    assert.ok(hostInfo.interview?.startedAt, 'clock starts on first join');
    const startDuration = hostInfo.interview.durationMs;
    await joinRoom(candidate, created.id, 'Candidate');

    const denied = new Promise((resolve) => candidate.once('error', resolve));
    candidate.emit('interview:end', { roomId: created.id });
    assert.match((await denied).message, /host/);

    const extended = new Promise((resolve) => candidate.once('interview:update', resolve));
    host.emit('interview:extend', { roomId: created.id });
    assert.strictEqual((await extended).durationMs, startDuration + 10 * 60 * 1000);

    const ended = new Promise((resolve) => candidate.once('interview:update', resolve));
    host.emit('interview:end', { roomId: created.id });
    assert.ok((await ended).endedAt);
  });

  await t.test('switching language replaces untouched starter code but keeps real work', async () => {
    const socket = await connectSocket();
    const editor = connectProvider('lang-room');
    cleanups.push(() => socket.close(), () => editor.provider.destroy());
    await joinRoom(socket, 'lang-room', 'Dev');
    await waitFor(() => editor.provider.synced, { message: 'sync' });

    socket.emit('editor:language-change', { roomId: 'lang-room', language: 'python' });
    await waitFor(() => editor.text.toString() === 'print("Hello World!")\n', { message: 'starter swap' });

    editor.text.insert(editor.text.length, 'print(42)\n');
    await new Promise((r) => setTimeout(r, 100));
    socket.emit('editor:language-change', { roomId: 'lang-room', language: 'java' });
    await new Promise((r) => setTimeout(r, 200));
    assert.ok(editor.text.toString().includes('print(42)'), 'edited code must never be replaced');
  });

  await t.test('in standalone mode, collaborators receive run status and results', async () => {
    const runner = await connectSocket();
    const watcher = await connectSocket();
    cleanups.push(() => runner.close(), () => watcher.close());
    await joinRoom(runner, 'run-room', 'Runner');
    await joinRoom(watcher, 'run-room', 'Watcher');

    const statuses = [];
    watcher.on('execution:status', (s) => statuses.push(s));
    const result = new Promise((resolve) => watcher.once('execution:result', resolve));

    await fetch(`${httpBase}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'console.log(1 + 1)', language: 'javascript', roomId: 'run-room', runBy: 'Runner' })
    });

    const final = await result;
    assert.strictEqual(final.status, 'completed');
    assert.strictEqual(final.output, '2');
    assert.deepStrictEqual(statuses.map((s) => s.status), ['queued', 'running']);
    assert.strictEqual(statuses[0].runBy, 'Runner');
  });
});
