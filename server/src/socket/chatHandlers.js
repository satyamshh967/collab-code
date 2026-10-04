import { roomManager } from '../models/Room.js';
import { userManager } from '../models/User.js';
import { generateId, formatTimestamp } from '../utils/helpers.js';

export default (io, socket) => {
  socket.on('chat:message', ({ roomId, text }) => {
    const user = userManager.getUser(socket.id);
    const room = roomManager.findById(roomId);
    
    if (user && room) {
      const message = {
        id: generateId(),
        userId: user.id,
        username: user.username,
        text,
        type: 'message',
        timestamp: formatTimestamp()
      };
      
      room.addChatMessage(message);
      io.to(roomId).emit('chat:message', message);
    }
  });

  socket.on('chat:history', ({ roomId }, callback) => {
    const room = roomManager.findById(roomId);
    if (room) {
      if (typeof callback === 'function') {
        callback(room.chatMessages);
      } else {
        socket.emit('chat:history', room.chatMessages);
      }
    }
  });
};
