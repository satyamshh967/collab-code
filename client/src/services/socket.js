import { io } from 'socket.io-client';

const socketClient = io('http://localhost:3001', {
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: false
});

export default socketClient;
