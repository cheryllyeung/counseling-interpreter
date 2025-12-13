// ===========================================
// Socket.IO Event Type Definitions
// ===========================================

export type Role = 'student' | 'counselor';
export type Language = 'en' | 'zh';
export type TranslationDirection = 'en-to-zh' | 'zh-to-en';

// ===========================================
// Data Types
// ===========================================

export interface TranscriptData {
  id: string;
  text: string;
  speaker: Role;
  language: Language;
  timestamp: number;
  isFinal: boolean;
}

export interface TranslationData {
  id: string;
  originalText: string;
  translatedText: string;
  direction: TranslationDirection;
  timestamp: number;
}

export interface LatencyMetrics {
  stt: number;
  translation: number;
  tts: number;
  total: number;
}

export interface SessionInfo {
  sessionId: string;
  participants: {
    role: Role;
    socketId: string;
    connected: boolean;
  }[];
  startedAt: number;
}

export interface ErrorData {
  code: string;
  message: string;
  details?: unknown;
}

// ===========================================
// Client -> Server Events
// ===========================================

export interface ClientToServerEvents {
  // Session Management
  'session:join': (data: { sessionId: string; role: Role }) => void;
  'session:leave': () => void;

  // Audio Streaming
  'audio:start': (data: { language: Language }) => void;
  'audio:chunk': (chunk: ArrayBuffer) => void;
  'audio:stop': () => void;

  // Control
  'control:mute': () => void;
  'control:unmute': () => void;
}

// ===========================================
// Server -> Client Events
// ===========================================

export interface ServerToClientEvents {
  // Connection
  'connection:established': (data: { socketId: string }) => void;
  'connection:error': (error: ErrorData) => void;

  // Session
  'session:joined': (data: SessionInfo) => void;
  'session:participant-joined': (data: { role: Role; socketId: string }) => void;
  'session:participant-left': (data: { role: Role; socketId: string }) => void;
  'session:error': (error: ErrorData) => void;

  // Transcription
  'transcript:interim': (data: TranscriptData) => void;
  'transcript:final': (data: TranscriptData) => void;

  // Translation
  'translation:start': (data: { id: string }) => void;
  'translation:chunk': (data: { id: string; chunk: string }) => void;
  'translation:complete': (data: TranslationData) => void;

  // TTS Audio
  'tts:start': (data: { id: string }) => void;
  'tts:chunk': (data: { id: string; chunk: ArrayBuffer }) => void;
  'tts:complete': (data: { id: string }) => void;

  // Status
  'status:latency': (data: LatencyMetrics) => void;
  'status:processing': (data: { stage: 'stt' | 'translation' | 'tts'; active: boolean }) => void;
}

// ===========================================
// Inter-Server Events (for internal use)
// ===========================================

export interface InterServerEvents {
  ping: () => void;
}

// ===========================================
// Socket Data (attached to socket instance)
// ===========================================

export interface SocketData {
  sessionId: string | null;
  role: Role | null;
  language: Language | null;
  isMuted: boolean;
}
