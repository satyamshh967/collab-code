import { roomManager } from '../models/Room.js';
import User, { userManager } from '../models/User.js';
import { generateId, generateColor, formatTimestamp } from '../utils/helpers.js';
import { getDocText, persistYDoc, docs } from '../yjs/persistence.js';

// Timers for scheduled room cleanups when all users leave
const roomCleanupTimers = new Map();
const ROOM_CLEANUP_GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes

export default (io, socket) => {
  socket.on('room:join', async ({ roomId, username }) => {
    if (!roomId) {
      return socket.emit('error', { message: 'Invalid room ID' });
    }

    let room = roomManager.findById(roomId);
    if (!room) {
      // Auto-create room so direct URL sharing or join-by-code always succeeds seamlessly
      room = roomManager.create(roomId, `Room ${roomId.slice(0, 8)}`, 'javascript');
      console.log(`[Room Manager] Auto-created room ${roomId} on peer join`);
    }

    // Cancel pending room cleanup if someone joins
    if (roomCleanupTimers.has(roomId)) {
      clearTimeout(roomCleanupTimers.get(roomId));
      roomCleanupTimers.delete(roomId);
      console.log(`[Room Manager] Cancelled cleanup timer for room ${roomId} (peer reconnected)`);
    }

    const effectiveUsername = username || `Guest_${Math.floor(Math.random() * 1000)}`;
    const existingColors = Array.from(room.users.values()).map(u => u.color);
    const color = generateColor(existingColors);
    
    const user = new User(generateId(), effectiveUsername, color, socket.id, roomId);
    room.addUser(user);
    userManager.addUser(user);

    socket.join(roomId);

    // Ensure room code reflects latest Yjs CRDT document text
    const latestCode = getDocText(roomId) || room.code;

    socket.emit('room:info', {
      id: room.id,
      name: room.name,
      language: room.language,
      code: latestCode,
      users: Array.from(room.users.values()),
      isInterviewRoom: room.isInterviewRoom
    });

    socket.to(roomId).emit('room:user-joined', user);
    io.to(roomId).emit('room:users', Array.from(room.users.values()));
    
    const systemMsg = {
      id: generateId(),
      type: 'system',
      text: `${effectiveUsername} joined the room`,
      timestamp: formatTimestamp()
    };
    room.addChatMessage(systemMsg);
    io.to(roomId).emit('chat:message', systemMsg);
  });

  const handleDisconnect = async () => {
    const user = userManager.removeUser(socket.id);
    if (user) {
      const room = roomManager.findById(user.roomId);
      if (room) {
        room.removeUser(socket.id);
        socket.to(room.id).emit('room:user-left', user.id);
        io.to(room.id).emit('room:users', Array.from(room.users.values()));
        
        const systemMsg = {
          id: generateId(),
          type: 'system',
          text: `${user.username} left the room`,
          timestamp: formatTimestamp()
        };
        room.addChatMessage(systemMsg);
        io.to(room.id).emit('chat:message', systemMsg);

        // Schedule room cleanup if empty
        if (room.users.size === 0) {
          console.log(`[Room Manager] Room ${room.id} is now empty. Starting ${ROOM_CLEANUP_GRACE_PERIOD_MS / 1000}s cleanup countdown.`);
          
          const timer = setTimeout(async () => {
            const currentRoom = roomManager.findById(room.id);
            if (currentRoom && currentRoom.users.size === 0) {
              console.log(`[Room Manager] Cleaning up inactive empty room ${room.id}`);
              const ydoc = docs.get(room.id);
              if (ydoc) {
                await persistYDoc(room.id, ydoc);
              }
            }
            roomCleanupTimers.delete(room.id);
          }, ROOM_CLEANUP_GRACE_PERIOD_MS);

          roomCleanupTimers.set(room.id, timer);
        }
      }
    }
  };

  // Heartbeat ping handling
  socket.on('heartbeat:ping', () => {
    socket.emit('heartbeat:pong', { timestamp: Date.now() });
  });

  socket.on('room:leave', handleDisconnect);
  socket.on('disconnect', handleDisconnect);
};
