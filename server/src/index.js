import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import roomRoutes from './routes/room.js';
import executeRoutes from './routes/execute.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './socket/index.js';
import { configureSocketAdapter } from './socket/adapter.js';
import { setupYjsWebSocket } from './yjs/yjsServer.js';
import { initExecutionEventBridge } from './queue/eventBridge.js';

const app = express();
const server = http.createServer(app);

// Socket.io setup with heartbeat pings
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

// Configure horizontal Redis adapter
configureSocketAdapter(io);

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use('/api', limiter);

// Pass io to routes so execution events can be broadcast
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/execute', executeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Initialize Socket.io business handlers
initSocket(io);

// Initialize Yjs WebSocket server for CRDT editing
setupYjsWebSocket(server);

// Initialize real-time execution event bridge
initExecutionEventBridge(io);

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received kill signal, shutting down gracefully');
  server.close(() => {
    console.log('Closed out remaining connections');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
server.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
});

export { app, server, io };
