import { roomManager } from '../models/Room.js';
import CodeSnapshot, { snapshotManager } from '../models/CodeSnapshot.js';
import { userManager } from '../models/User.js';

export default (io, socket) => {
  socket.on('editor:change', ({ roomId, code }) => {
    const room = roomManager.findById(roomId);
    if (room) {
      room.updateCode(code);
      socket.to(roomId).emit('editor:change', { code, socketId: socket.id });
    }
  });

  socket.on('editor:cursor', ({ roomId, cursorPosition }) => {
    const user = userManager.getUser(socket.id);
    if (user) {
      user.cursorPosition = cursorPosition;
      socket.to(roomId).emit('editor:cursor', {
        userId: user.id,
        username: user.username,
        color: user.color,
        cursorPosition
      });
    }
  });

  socket.on('editor:language-change', ({ roomId, language }) => {
    const room = roomManager.findById(roomId);
    if (room) {
      room.language = language;
      io.to(roomId).emit('editor:language-change', language);
    }
  });

  socket.on('editor:save-snapshot', ({ roomId, label }) => {
    const room = roomManager.findById(roomId);
    const user = userManager.getUser(socket.id);
    if (room && user) {
      const snapshot = new CodeSnapshot(roomId, room.code, room.language, user.username, label);
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

  socket.on('editor:restore-snapshot', ({ roomId, snapshotId }) => {
    const room = roomManager.findById(roomId);
    const snapshot = snapshotManager.getSnapshot(roomId, snapshotId);
    
    if (room && snapshot) {
      room.updateCode(snapshot.code);
      room.language = snapshot.language;
      io.to(roomId).emit('editor:change', { code: snapshot.code });
      io.to(roomId).emit('editor:language-change', snapshot.language);
    }
  });

  socket.on('editor:sync-request', ({ roomId }) => {
    const room = roomManager.findById(roomId);
    if (room) {
      socket.emit('editor:change', { code: room.code });
    }
  });
};
