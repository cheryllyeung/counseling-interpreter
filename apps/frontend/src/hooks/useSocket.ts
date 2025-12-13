import { useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socket.service';
import { useSessionStore } from '../stores/sessionStore';
import type { Role, Language } from '@counseling-interpreter/shared';

export function useSocket() {
  const socketRef = useRef(socketService.getSocket());
  const {
    setConnected,
    setSession,
    addTranscript,
    updateTranslation,
    setProcessing,
    setLatencyMetrics,
  } = useSessionStore();

  useEffect(() => {
    const connect = async () => {
      try {
        const socket = await socketService.connect();
        socketRef.current = socket;

        // Connection events
        socket.on('connection:established', (data) => {
          setConnected(true, data.socketId);
        });

        socket.on('connection:error', (error) => {
          console.error('Connection error:', error);
        });

        // Session events
        socket.on('session:joined', (data) => {
          console.log('Session joined:', data);
        });

        socket.on('session:participant-joined', (data) => {
          console.log('Participant joined:', data);
        });

        socket.on('session:participant-left', (data) => {
          console.log('Participant left:', data);
        });

        // Transcript events
        socket.on('transcript:interim', (data) => {
          addTranscript(data);
        });

        socket.on('transcript:final', (data) => {
          addTranscript(data);
        });

        // Translation events
        socket.on('translation:complete', (data) => {
          updateTranslation(data.id, data.translatedText);
        });

        // Processing status
        socket.on('status:processing', (data) => {
          setProcessing(data.active, data.stage);
        });

        // Latency metrics
        socket.on('status:latency', (data) => {
          setLatencyMetrics(data);
        });

        socket.on('disconnect', () => {
          setConnected(false);
        });
      } catch (error) {
        console.error('Failed to connect:', error);
        setConnected(false);
      }
    };

    connect();

    return () => {
      // Don't disconnect on unmount to maintain connection
    };
  }, [setConnected, addTranscript, updateTranslation, setProcessing, setLatencyMetrics]);

  const joinSession = useCallback((sessionId: string, role: Role) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('session:join', { sessionId, role });
      setSession(sessionId, role);
    }
  }, [setSession]);

  const leaveSession = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('session:leave');
    }
  }, []);

  const startAudio = useCallback((language: Language) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('audio:start', { language });
    }
  }, []);

  const sendAudioChunk = useCallback((chunk: ArrayBuffer) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('audio:chunk', chunk);
    }
  }, []);

  const stopAudio = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('audio:stop');
    }
  }, []);

  return {
    socket: socketRef.current,
    joinSession,
    leaveSession,
    startAudio,
    sendAudioChunk,
    stopAudio,
  };
}
