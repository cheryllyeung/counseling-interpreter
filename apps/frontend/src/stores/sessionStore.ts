import { create } from 'zustand';
import type {
  Role,
  Language,
  TranscriptData,
  LatencyMetrics,
} from '@counseling-interpreter/shared';

interface TranscriptEntry {
  id: string;
  originalText: string;
  translatedText?: string;
  speaker: Role;
  sourceLanguage: Language;
  timestamp: number;
  isFinal: boolean;
}

interface SessionState {
  // Connection
  isConnected: boolean;
  socketId: string | null;

  // Session
  sessionId: string | null;
  role: Role | null;

  // Status
  isRecording: boolean;
  isProcessing: boolean;
  processingStage: 'stt' | 'translation' | 'tts' | null;

  // Transcripts
  currentTranscript: string;
  transcriptHistory: TranscriptEntry[];

  // Metrics
  latencyMetrics: LatencyMetrics | null;

  // Actions
  setConnected: (connected: boolean, socketId?: string) => void;
  setSession: (sessionId: string, role: Role) => void;
  clearSession: () => void;
  setRecording: (recording: boolean) => void;
  setProcessing: (processing: boolean, stage?: 'stt' | 'translation' | 'tts' | null) => void;
  setCurrentTranscript: (text: string) => void;
  addTranscript: (data: TranscriptData) => void;
  updateTranslation: (id: string, translation: string) => void;
  setLatencyMetrics: (metrics: LatencyMetrics) => void;
  reset: () => void;
}

const initialState = {
  isConnected: false,
  socketId: null,
  sessionId: null,
  role: null,
  isRecording: false,
  isProcessing: false,
  processingStage: null,
  currentTranscript: '',
  transcriptHistory: [],
  latencyMetrics: null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  setConnected: (isConnected, socketId) =>
    set({ isConnected, socketId: socketId ?? null }),

  setSession: (sessionId, role) => set({ sessionId, role }),

  clearSession: () =>
    set({
      sessionId: null,
      role: null,
      isRecording: false,
      currentTranscript: '',
      transcriptHistory: [],
    }),

  setRecording: (isRecording) => set({ isRecording }),

  setProcessing: (isProcessing, processingStage = null) =>
    set({ isProcessing, processingStage }),

  setCurrentTranscript: (currentTranscript) => set({ currentTranscript }),

  addTranscript: (data) => {
    const { transcriptHistory } = get();
    const existingIndex = transcriptHistory.findIndex((t) => t.id === data.id);

    if (existingIndex >= 0) {
      // Update existing transcript
      const updated = [...transcriptHistory];
      updated[existingIndex] = {
        ...updated[existingIndex],
        originalText: data.text,
        isFinal: data.isFinal,
      };
      set({ transcriptHistory: updated });
    } else {
      // Add new transcript
      set({
        transcriptHistory: [
          ...transcriptHistory,
          {
            id: data.id,
            originalText: data.text,
            speaker: data.speaker,
            sourceLanguage: data.language,
            timestamp: data.timestamp,
            isFinal: data.isFinal,
          },
        ],
      });
    }
  },

  updateTranslation: (id, translation) => {
    const { transcriptHistory } = get();
    const updated = transcriptHistory.map((t) =>
      t.id === id ? { ...t, translatedText: translation } : t
    );
    set({ transcriptHistory: updated });
  },

  setLatencyMetrics: (latencyMetrics) => set({ latencyMetrics }),

  reset: () => set(initialState),
}));
