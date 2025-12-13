import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { registerAudioHandler } from './handlers/audio.handler.js';
import { registerSessionHandler } from './handlers/session.handler.js';
import { createLogger } from '../utils/logger.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '@counseling-interpreter/shared';

const logger = createLogger('SocketIO');

type TypedServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function setupSocketIO(httpServer: HTTPServer): TypedServer {
  const io: TypedServer = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Client connected');

    // Initialize socket data
    socket.data = {
      sessionId: null,
      role: null,
      language: null,
      isMuted: false,
    };

    // Emit connection established
    socket.emit('connection:established', { socketId: socket.id });

    // Register handlers
    registerSessionHandler(io, socket);
    registerAudioHandler(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Client disconnected');
    });

    socket.on('error', (error) => {
      logger.error({ socketId: socket.id, error }, 'Socket error');
    });
  });

  logger.info('Socket.IO server initialized');

  return io;
}
