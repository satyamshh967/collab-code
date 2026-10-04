import roomHandlers from './roomHandlers.js';
import editorHandlers from './editorHandlers.js';
import chatHandlers from './chatHandlers.js';

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    roomHandlers(io, socket);
    editorHandlers(io, socket);
    chatHandlers(io, socket);

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  });
};
