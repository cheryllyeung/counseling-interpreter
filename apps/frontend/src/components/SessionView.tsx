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
  const { startAudio, sendAudioChunk, stopAudio, joinSession } = useSocket();
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

    const handleTTSChunk = (data: { id: string; chunk: ArrayBuffer }) => {
      // Only play if it's meant for us (we're the target)
      enqueueAudio(data.chunk);
    };

    socket.on('tts:chunk', handleTTSChunk);

    return () => {
      socket.off('tts:chunk', handleTTSChunk);
    };
  }, [enqueueAudio]);

  // Join session when component mounts
  useEffect(() => {
    if (isConnected && role) {
      joinSession(sessionId, role);
    }
  }, [isConnected, role, sessionId, joinSession]);

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
