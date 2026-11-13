import CodeSnapshot, { snapshotManager } from '../models/CodeSnapshot.js';
import { getDocText, getYDoc } from '../yjs/persistence.js';
import { DEFAULT_SNIPPETS } from '../utils/defaultSnippets.js';
import { sanitizeInput } from '../utils/helpers.js';
import { getMembership } from './membership.js';

const MAX_LEGACY_CODE_LENGTH = 200000;
const MAX_SNAPSHOT_LABEL_LENGTH = 80;
const MAX_SNAPSHOTS_PER_ROOM = 50;

export default (io, socket) => {
  // Fallback for non-Yjs clients or legacy sync
  socket.on('editor:change', (payload) => {
    const { roomId, code } = payload || {};
    const member = getMembership(socket, roomId);
    if (!member || typeof code !== 'string' || code.length > MAX_LEGACY_CODE_LENGTH) return;
    member.room.updateCode(code);
    socket.to(roomId).emit('editor:change', { code, socketId: socket.id });
  });

  socket.on('editor:language-change', (payload) => {
    const { roomId, language } = payload || {};
    const member = getMembership(socket, roomId);
    if (!member || typeof language !== 'string' || !Object.hasOwn(DEFAULT_SNIPPETS, language)) return;
    if (member.room.language === language) return;
    member.room.language = language;
    // Tell everyone else; the sender already switched locally
    socket.to(roomId).emit('editor:language-change', language);
  });

  socket.on('editor:save-snapshot', (payload) => {
    const { roomId, label } = payload || {};
    const member = getMembership(socket, roomId);
    if (!member) return;

    const cleanLabel = sanitizeInput(typeof label === 'string' ? label : '').slice(0, MAX_SNAPSHOT_LABEL_LENGTH);
    const currentCode = getDocText(roomId) || member.room.code;
    const snapshot = new CodeSnapshot(roomId, currentCode, member.room.language, member.user.username, cleanLabel);
    snapshotManager.addSnapshot(snapshot, MAX_SNAPSHOTS_PER_ROOM);
    io.to(roomId).emit('editor:snapshot-saved', snapshot);
  });

  socket.on('editor:get-snapshots', (payload, callback) => {
    const member = getMembership(socket, payload?.roomId);
    const snapshots = member ? snapshotManager.getSnapshots(payload.roomId) : [];
    if (typeof callback === 'function') {
      callback(snapshots);
    } else if (member) {
      socket.emit('editor:snapshots', snapshots);
    }
  });

  socket.on('editor:restore-snapshot', async (payload) => {
    const { roomId, snapshotId } = payload || {};
    const member = getMembership(socket, roomId);
    if (!member) return;
    const snapshot = snapshotManager.getSnapshot(roomId, snapshotId);
    if (!snapshot) return;

    try {
      member.room.updateCode(snapshot.code);

      // Update the CRDT doc; connected editors receive it through Yjs sync
      const ydoc = await getYDoc(roomId);
      const yText = ydoc.getText('monaco');
      ydoc.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, snapshot.code);
      });

      if (member.room.language !== snapshot.language) {
        member.room.language = snapshot.language;
        io.to(roomId).emit('editor:language-change', snapshot.language);
      }
      io.to(roomId).emit('editor:snapshot-restored', {
        snapshotId,
        label: snapshot.label,
        restoredBy: member.user.username
      });
    } catch (err) {
      console.error(`[Snapshots] Failed to restore ${snapshotId} in ${roomId}:`, err.message);
      socket.emit('error', { message: 'Failed to restore snapshot' });
    }
  });

  socket.on('editor:sync-request', (payload) => {
    const member = getMembership(socket, payload?.roomId);
    if (!member) return;
    socket.emit('editor:change', { code: getDocText(payload.roomId) || member.room.code });
  });
};
