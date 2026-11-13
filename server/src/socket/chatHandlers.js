import { generateId, formatTimestamp } from '../utils/helpers.js';
import { getMembership } from './membership.js';

const MAX_MESSAGE_LENGTH = 2000;

export default (io, socket) => {
  socket.on('chat:message', (payload) => {
    const { roomId, text } = payload || {};
    const member = getMembership(socket, roomId);
    if (!member || typeof text !== 'string') return;

    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed) return;

    const message = {
      id: generateId(),
      userId: member.user.id,
      username: member.user.username,
      color: member.user.color,
      text: trimmed,
      type: 'message',
      timestamp: formatTimestamp()
    };

    member.room.addChatMessage(message);
    io.to(roomId).emit('chat:message', message);
  });

  socket.on('chat:history', (payload, callback) => {
    const member = getMembership(socket, payload?.roomId);
    const history = member ? member.room.chatMessages : [];
    if (typeof callback === 'function') {
      callback(history);
    } else if (member) {
      socket.emit('chat:history', history);
    }
  });
};
