import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

const socketClient = io(SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  timeout: 10000,
  autoConnect: false,
  transports: ['websocket', 'polling']
});

// Periodic heartbeat to detect half-open sockets
let heartbeatInterval = null;

socketClient.on('connect', () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    if (socketClient.connected) {
      socketClient.emit('heartbeat:ping');
    }
  }, 15000);
});

socketClient.on('disconnect', () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
});

export { SERVER_URL };
export default socketClient;
