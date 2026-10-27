import { roomManager } from '../models/Room.js';
import CodeSnapshot, { snapshotManager } from '../models/CodeSnapshot.js';
import { userManager } from '../models/User.js';
import { getDocText, getYDoc } from '../yjs/persistence.js';

export default (io, socket) => {
  // Fallback for non-Yjs clients or legacy sync
  socket.on('editor:change', ({ roomId, code }) => {
    const room = roomManager.findById(roomId);
    if (room) {
      room.updateCode(code);
      socket.to(roomId).emit('editor:change', { code, socketId: socket.id });
    }
  });

  socket.on('editor:language-change', ({ roomId, language }) => {
    const room = roomManager.findById(roomId);
    if (room) {
      room.language = language;
      io.to(roomId).emit('editor:language-change', language);
    }
  });

  socket.on('editor:save-snapshot', async ({ roomId, label }) => {
    const room = roomManager.findById(roomId);
    const user = userManager.getUser(socket.id);
    if (room && user) {
      const currentCode = getDocText(roomId) || room.code;
      const snapshot = new CodeSnapshot(roomId, currentCode, room.language, user.username, label);
      snapshotManager.addSnapshot(snapshot);
      room.addSnapshot(snapshot);
      io.to(roomId).emit('editor:snapshot-saved', snapshot);
    }
  });

  socket.on('editor:get-snapshots', ({ roomId }, callback) => {
    const snapshots = snapshotManager.getSnapshots(roomId);
    if (typeof callback === 'function') {
      callback(snapshots);
    } else {
      socket.emit('editor:snapshots', snapshots);
    }
  });

  socket.on('editor:restore-snapshot', async ({ roomId, snapshotId }) => {
    const room = roomManager.findById(roomId);
    const snapshot = snapshotManager.getSnapshot(roomId, snapshotId);
    
    if (room && snapshot) {
      room.updateCode(snapshot.code);
      room.language = snapshot.language;

      // Update Yjs CRDT doc so all connected Monaco editors receive the update
      const ydoc = await getYDoc(roomId);
      const yText = ydoc.getText('monaco');
      ydoc.transact(() => {
        yText.delete(0, yText.length);
        yText.insert(0, snapshot.code);
      });

      io.to(roomId).emit('editor:language-change', snapshot.language);
      io.to(roomId).emit('editor:change', { code: snapshot.code });
    }
  });

  socket.on('editor:sync-request', ({ roomId }) => {
    const room = roomManager.findById(roomId);
    if (room) {
      const currentCode = getDocText(roomId) || room.code;
      socket.emit('editor:change', { code: currentCode });
    }
  });
};
