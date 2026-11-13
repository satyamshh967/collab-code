import { roomManager } from '../models/Room.js';
import User, { userManager } from '../models/User.js';
import { snapshotManager } from '../models/CodeSnapshot.js';
import { generateId, generateColor, formatTimestamp, sanitizeInput } from '../utils/helpers.js';
import { getDocText, persistYDoc, docs } from '../yjs/persistence.js';

// Timers for scheduled room cleanups when all users leave
const roomCleanupTimers = new Map();
const ROOM_CLEANUP_GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_USERNAME_LENGTH = 32;

export const isValidRoomId = (roomId) => typeof roomId === 'string' && ROOM_ID_PATTERN.test(roomId);

const systemMessage = (text) => ({
  id: generateId(),
  type: 'system',
  text,
  timestamp: formatTimestamp()
});

export default (io, socket) => {
  const leaveCurrentRoom = () => {
    const user = userManager.removeUser(socket.id);
    if (!user) return;

    socket.leave(user.roomId);

    const room = roomManager.findById(user.roomId);
    if (!room) return;

    room.removeUser(socket.id);
    socket.to(room.id).emit('room:user-left', user.id);
    io.to(room.id).emit('room:users', Array.from(room.users.values()));

    const msg = systemMessage(`${user.username} left the room`);
    room.addChatMessage(msg);
    io.to(room.id).emit('chat:message', msg);

    // Schedule a final persist once the room has been empty for a while
    if (room.users.size === 0 && !roomCleanupTimers.has(room.id)) {
      const timer = setTimeout(async () => {
        roomCleanupTimers.delete(room.id);
        const currentRoom = roomManager.findById(room.id);
        if (currentRoom && currentRoom.users.size === 0) {
          const ydoc = docs.get(room.id);
          if (ydoc) {
            await persistYDoc(room.id, ydoc);
          }
        }
      }, ROOM_CLEANUP_GRACE_PERIOD_MS);
      timer.unref?.();
      roomCleanupTimers.set(room.id, timer);
    }
  };

  socket.on('room:join', (payload = {}) => {
    const { roomId, username } = payload || {};
    if (!isValidRoomId(roomId)) {
      return socket.emit('error', { message: 'Invalid room ID' });
    }

    // A socket belongs to at most one room: leave the previous one first
    // (also makes repeated joins from React re-renders idempotent).
    const existing = userManager.getUser(socket.id);
    if (existing) {
      leaveCurrentRoom();
    }

    let room = roomManager.findById(roomId);
    if (!room) {
      // Auto-create room so direct URL sharing or join-by-code always succeeds seamlessly
      room = roomManager.create(roomId, `Room ${roomId.slice(0, 8)}`, 'javascript');
    }

    if (roomCleanupTimers.has(roomId)) {
      clearTimeout(roomCleanupTimers.get(roomId));
      roomCleanupTimers.delete(roomId);
    }

    const cleanName = sanitizeInput(typeof username === 'string' ? username : '').slice(0, MAX_USERNAME_LENGTH);
    const effectiveUsername = cleanName || `Guest_${Math.floor(Math.random() * 1000)}`;
    const existingColors = Array.from(room.users.values()).map(u => u.color);
    const color = generateColor(existingColors);

    const user = new User(generateId(), effectiveUsername, color, socket.id, roomId);
    room.addUser(user);
    userManager.addUser(user);

    socket.join(roomId);

    socket.emit('room:info', {
      id: room.id,
      name: room.name,
      language: room.language,
      code: getDocText(roomId) || room.code,
      users: Array.from(room.users.values()),
      isInterviewRoom: room.isInterviewRoom,
      chatMessages: room.chatMessages,
      snapshots: snapshotManager.getSnapshots(roomId)
    });

    socket.to(roomId).emit('room:user-joined', user);
    io.to(roomId).emit('room:users', Array.from(room.users.values()));

    const msg = systemMessage(`${effectiveUsername} joined the room`);
    room.addChatMessage(msg);
    io.to(roomId).emit('chat:message', msg);
  });

  // Heartbeat ping handling
  socket.on('heartbeat:ping', () => {
    socket.emit('heartbeat:pong', { timestamp: Date.now() });
  });

  socket.on('room:leave', leaveCurrentRoom);
  socket.on('disconnect', leaveCurrentRoom);
};
