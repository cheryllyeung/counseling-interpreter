import type { Server, Socket } from 'socket.io';
import { registerParticipant, getSessionParticipants, unregisterParticipant } from './audio.handler.js';
import { createLogger } from '../../utils/logger.js';
import type {
  Role,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '@counseling-interpreter/shared';

const logger = createLogger('SessionHandler');

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerSessionHandler(_io: TypedServer, socket: TypedSocket) {
  socket.on('session:join', (data: { sessionId: string; role: Role }) => {
    const { sessionId, role } = data;

    logger.info({ sessionId, role, socketId: socket.id }, 'Participant joining session');

    // Leave any previous session
    if (socket.data.sessionId) {
      socket.leave(socket.data.sessionId);
    }

    // Join new session
    socket.join(sessionId);
    socket.data.sessionId = sessionId;
    socket.data.role = role;
    socket.data.isMuted = false;

    // Register participant
    registerParticipant(sessionId, role, socket);

    // Get all participants
    const participants = getSessionParticipants(sessionId);
    const participantList = participants
      ? Array.from(participants.entries()).map(([r, s]) => ({
          role: r as Role,
          socketId: s.id,
          connected: true,
        }))
      : [];

    // Notify the joining participant
    socket.emit('session:joined', {
      sessionId,
      participants: participantList,
      startedAt: Date.now(),
    });

    // Notify other participants in the session
    socket.to(sessionId).emit('session:participant-joined', {
      role,
      socketId: socket.id,
    });

    logger.info({ sessionId, role, participantCount: participantList.length }, 'Participant joined session');
  });

  socket.on('session:leave', () => {
    const { sessionId, role } = socket.data;

    if (sessionId && role) {
      socket.leave(sessionId);

      // Remove from session participants tracking
      unregisterParticipant(sessionId, role);

      // Notify other participants
      socket.to(sessionId).emit('session:participant-left', {
        role,
        socketId: socket.id,
      });

      // Clear socket data
      socket.data.sessionId = null;
      socket.data.role = null;
      socket.data.language = null;

      logger.info({ sessionId, role }, 'Participant left session');
    }
  });

  // Control handlers
  socket.on('control:mute', () => {
    socket.data.isMuted = true;
    logger.debug({ socketId: socket.id }, 'Participant muted');
  });

  socket.on('control:unmute', () => {
    socket.data.isMuted = false;
    logger.debug({ socketId: socket.id }, 'Participant unmuted');
  });
}
