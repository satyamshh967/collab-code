import { roomManager } from '../models/Room.js';
import User, { userManager } from '../models/User.js';
import { generateId, generateColor, formatTimestamp } from '../utils/helpers.js';

export default (io, socket) => {
  socket.on('room:join', ({ roomId, username }) => {
    let room = roomManager.findById(roomId);
    if (!room) {
      return socket.emit('error', { message: 'Room not found' });
    }

    const existingColors = Array.from(room.users.values()).map(u => u.color);
    const color = generateColor(existingColors);
    
    const user = new User(generateId(), username, color, socket.id, roomId);
    room.addUser(user);
    userManager.addUser(user);

    socket.join(roomId);

    socket.emit('room:info', {
      id: room.id,
      name: room.name,
      language: room.language,
      code: room.code,
      users: Array.from(room.users.values()),
      isInterviewRoom: room.isInterviewRoom
    });

    socket.to(roomId).emit('room:user-joined', user);
    io.to(roomId).emit('room:users', Array.from(room.users.values()));
    
    const systemMsg = {
      id: generateId(),
      type: 'system',
      text: `${username} joined the room`,
      timestamp: formatTimestamp()
    };
    room.addChatMessage(systemMsg);
    io.to(roomId).emit('chat:message', systemMsg);
  });

  const handleDisconnect = () => {
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

        if (room.users.size === 0) {
          // Optional: schedule room deletion if empty for too long
        }
      }
    }
  };

  socket.on('room:leave', handleDisconnect);
  socket.on('disconnect', handleDisconnect);
};
