import type { Server, Socket } from 'socket.io';
import { DeepgramService } from '../../services/deepgram.service.js';
import { TranslationService } from '../../services/translation.service.js';
import { AzureTTSService } from '../../services/azure-tts.service.js';
import { ElevenLabsService } from '../../services/elevenlabs.service.js';
import { EnglishToChinese, ChineseToEnglish, type AudioPipeline } from '../../pipelines/audio-pipeline.js';
import { createLogger } from '../../utils/logger.js';
import type {
  Language,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '@counseling-interpreter/shared';

const logger = createLogger('AudioHandler');

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Services (singleton instances)
const deepgramService = new DeepgramService();
const translationService = new TranslationService();
const azureTTSService = new AzureTTSService();
const elevenLabsService = new ElevenLabsService();

// Active pipelines per socket
const activePipelines = new Map<string, AudioPipeline>();

// Session participants tracking
const sessionParticipants = new Map<string, Map<string, TypedSocket>>(); // sessionId -> role -> socket

export function registerAudioHandler(_io: TypedServer, socket: TypedSocket) {
  socket.on('audio:start', async (data: { language: Language }) => {
    const { sessionId, role } = socket.data;

    if (!sessionId || !role) {
      socket.emit('connection:error', {
        code: 'NOT_IN_SESSION',
        message: 'Must join a session before starting audio',
      });
      return;
    }

    logger.info({ sessionId, role, language: data.language }, 'Audio stream starting');

    // Create a getter function to dynamically get target socket
    const targetRole = role === 'student' ? 'counselor' : 'student';
    const getTargetSocket = () => {
      const participants = sessionParticipants.get(sessionId);
      return participants?.get(targetRole) || null;
    };

    // Create appropriate pipeline based on language
    let pipeline: AudioPipeline;

    if (data.language === 'en') {
      // English speaker (student) -> Chinese translation for counselor
      pipeline = new EnglishToChinese(
        sessionId,
        socket,
        getTargetSocket,
        deepgramService,
        translationService,
        azureTTSService
      );
    } else {
      // Chinese speaker (counselor) -> English translation for student
      pipeline = new ChineseToEnglish(
        sessionId,
        socket,
        getTargetSocket,
        deepgramService,
        translationService,
        elevenLabsService
      );
    }

    try {
      await pipeline.start();
      activePipelines.set(socket.id, pipeline);
      socket.data.language = data.language;
      socket.emit('status:processing', { stage: 'stt', active: true });
    } catch (error) {
      logger.error({ error }, 'Failed to start audio pipeline');
      socket.emit('connection:error', {
        code: 'PIPELINE_START_ERROR',
        message: 'Failed to start audio processing',
        details: error,
      });
    }
  });

  socket.on('audio:chunk', (chunk: ArrayBuffer) => {
    const pipeline = activePipelines.get(socket.id);
    if (pipeline) {
      pipeline.processAudio(Buffer.from(chunk));
    }
  });

  socket.on('audio:stop', () => {
    const pipeline = activePipelines.get(socket.id);
    if (pipeline) {
      pipeline.stop();
      activePipelines.delete(socket.id);
      socket.emit('status:processing', { stage: 'stt', active: false });
      logger.info({ socketId: socket.id }, 'Audio stream stopped');
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    const pipeline = activePipelines.get(socket.id);
    if (pipeline) {
      pipeline.stop();
      activePipelines.delete(socket.id);
    }

    // Remove from session participants
    const { sessionId, role } = socket.data;
    if (sessionId && role) {
      const participants = sessionParticipants.get(sessionId);
      if (participants) {
        participants.delete(role);
        if (participants.size === 0) {
          sessionParticipants.delete(sessionId);
        }
      }
    }

    logger.info({ socketId: socket.id }, 'Socket disconnected, pipeline cleaned up');
  });
}

// Helper to register participant in session
export function registerParticipant(sessionId: string, role: string, socket: TypedSocket) {
  if (!sessionParticipants.has(sessionId)) {
    sessionParticipants.set(sessionId, new Map());
  }
  sessionParticipants.get(sessionId)!.set(role, socket);
}

// Helper to get session participants
export function getSessionParticipants(sessionId: string) {
  return sessionParticipants.get(sessionId);
}
