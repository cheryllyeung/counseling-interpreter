import { useCallback, useEffect } from 'react';
import { AudioControls } from './AudioControls';
import { TranscriptPanel } from './TranscriptPanel';
import { StatusIndicator } from './StatusIndicator';
import { useSocket } from '../hooks/useSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useSessionStore } from '../stores/sessionStore';
import { socketService } from '../services/socket.service';
import type { Language } from '@counseling-interpreter/shared';

interface SessionViewProps {
  sessionId: string;
}

export function SessionView({ sessionId }: SessionViewProps) {
  const { startAudio, sendAudioChunk, stopAudio } = useSocket();
  const { role, isConnected, setRecording } = useSessionStore();
  const { enqueueAudio, resumeContext } = useAudioPlayer();

  // Setup audio recorder
  const { isRecording, startRecording, stopRecording, error } = useAudioRecorder({
    onAudioChunk: sendAudioChunk,
  });

  // Setup TTS audio playback from socket
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTTSChunk = async (data: { id: string; chunk: any }) => {
      console.log('[TTS] Received audio chunk, type:', Object.prototype.toString.call(data.chunk));

      // Socket.IO sends binary data - handle various formats
      let audioData: ArrayBuffer;

      if (data.chunk instanceof ArrayBuffer) {
        audioData = data.chunk;
      } else if (data.chunk instanceof Blob) {
        // Socket.IO may send as Blob in some browsers
        audioData = await data.chunk.arrayBuffer();
      } else if (data.chunk && data.chunk.buffer instanceof ArrayBuffer) {
        // Uint8Array or similar typed array
        const view = data.chunk;
        audioData = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
      } else if (data.chunk && typeof data.chunk === 'object' && data.chunk.type === 'Buffer' && Array.isArray(data.chunk.data)) {
        // Node.js Buffer serialized to JSON: { type: 'Buffer', data: [72, 101, ...] }
        audioData = new Uint8Array(data.chunk.data).buffer;
      } else if (Array.isArray(data.chunk)) {
        // Plain array of bytes
        audioData = new Uint8Array(data.chunk).buffer;
      } else {
        console.error('[TTS] Unknown chunk type:', typeof data.chunk, data.chunk);
        return;
      }

      console.log('[TTS] Enqueuing audio:', audioData.byteLength, 'bytes');
      enqueueAudio(audioData);
    };

    const handleTTSStart = (data: { id: string }) => {
      console.log('[TTS] Starting for id:', data.id);
    };

    const handleTTSComplete = (data: { id: string }) => {
      console.log('[TTS] Complete for id:', data.id);
    };

    socket.on('tts:chunk', handleTTSChunk);
    socket.on('tts:start', handleTTSStart);
    socket.on('tts:complete', handleTTSComplete);

    return () => {
      socket.off('tts:chunk', handleTTSChunk);
      socket.off('tts:start', handleTTSStart);
      socket.off('tts:complete', handleTTSComplete);
    };
  }, [enqueueAudio]);

  // Note: Session is already joined from App.tsx, no need to join again here

  // Determine language based on role
  const getLanguage = (): Language => {
    return role === 'student' ? 'en' : 'zh';
  };

  const handleStartRecording = useCallback(async () => {
    try {
      // Resume audio context (required for autoplay policy)
      await resumeContext();

      // Start recording
      await startRecording();

      // Notify server
      startAudio(getLanguage());
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [startRecording, startAudio, resumeContext, setRecording, role]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    stopAudio();
    setRecording(false);
  }, [stopRecording, stopAudio, setRecording]);

  if (!role) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please select a role to continue</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Counseling Interpreter
            </h1>
            <p className="text-sm text-gray-500">
              Session: {sessionId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary-100 text-primary-700">
              {role === 'student' ? 'Student (EN)' : 'Counselor (ZH)'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript Panel */}
        <div className="flex-1 border-r">
          <TranscriptPanel />
        </div>

        {/* Audio Controls Panel */}
        <div className="w-80 flex flex-col items-center justify-center bg-white p-8">
          <AudioControls
            isRecording={isRecording}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            disabled={!isConnected}
          />

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              {role === 'student'
                ? 'Speak in English. Your words will be translated to Chinese for the counselor.'
                : 'Speak in Chinese. Your words will be translated to English for the student.'}
            </p>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <StatusIndicator />
    </div>
  );
}
