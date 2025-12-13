import { v4 as uuidv4 } from 'uuid';
import type { Socket } from 'socket.io';
import { DeepgramService, DeepgramConnection, type TranscriptResult } from '../services/deepgram.service.js';
import { TranslationService } from '../services/translation.service.js';
import { AzureTTSService } from '../services/azure-tts.service.js';
import { ElevenLabsService } from '../services/elevenlabs.service.js';
import { createLogger } from '../utils/logger.js';
import type {
  Language,
  TranslationDirection,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  LatencyMetrics,
} from '@counseling-interpreter/shared';

const logger = createLogger('AudioPipeline');

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface PipelineMetrics {
  sttLatency: number;
  translationLatency: number;
  ttsLatency: number;
}

export abstract class AudioPipeline {
  protected sessionId: string;
  protected socket: TypedSocket;
  protected targetSocket: TypedSocket | null;
  protected deepgramService: DeepgramService;
  protected translationService: TranslationService;
  protected deepgramConnection: DeepgramConnection | null = null;
  protected metrics: PipelineMetrics = { sttLatency: 0, translationLatency: 0, ttsLatency: 0 };
  protected pendingText: string = '';

  constructor(
    sessionId: string,
    socket: TypedSocket,
    targetSocket: TypedSocket | null,
    deepgramService: DeepgramService,
    translationService: TranslationService
  ) {
    this.sessionId = sessionId;
    this.socket = socket;
    this.targetSocket = targetSocket;
    this.deepgramService = deepgramService;
    this.translationService = translationService;
  }

  abstract getSourceLanguage(): Language;
  abstract getTargetLanguage(): Language;
  abstract getTranslationDirection(): TranslationDirection;
  abstract synthesizeSpeech(text: string): Promise<Buffer>;

  async start(): Promise<void> {
    logger.info({ sessionId: this.sessionId, direction: this.getTranslationDirection() }, 'Starting audio pipeline');

    this.deepgramConnection = this.deepgramService.createLiveConnection(this.getSourceLanguage());

    this.deepgramConnection.on('transcript', (result: TranscriptResult) => {
      this.handleTranscript(result);
    });

    this.deepgramConnection.on('error', (error) => {
      logger.error({ error }, 'Pipeline Deepgram error');
      this.socket.emit('connection:error', {
        code: 'STT_ERROR',
        message: 'Speech recognition error',
        details: error,
      });
    });
  }

  processAudio(chunk: Buffer): void {
    if (this.deepgramConnection) {
      this.deepgramService.sendAudio(this.deepgramConnection, chunk);
    }
  }

  private async handleTranscript(result: TranscriptResult): Promise<void> {
    const transcriptId = uuidv4();
    const startTime = Date.now();

    // Emit interim or final transcript
    if (!result.isFinal) {
      this.socket.emit('transcript:interim', {
        id: transcriptId,
        text: result.text,
        speaker: this.socket.data.role!,
        language: this.getSourceLanguage(),
        timestamp: Date.now(),
        isFinal: false,
      });
      return;
    }

    // Record STT latency
    this.metrics.sttLatency = Date.now() - startTime;

    // Emit final transcript
    this.socket.emit('transcript:final', {
      id: transcriptId,
      text: result.text,
      speaker: this.socket.data.role!,
      language: this.getSourceLanguage(),
      timestamp: Date.now(),
      isFinal: true,
    });

    // Also emit to target socket if available
    if (this.targetSocket) {
      this.targetSocket.emit('transcript:final', {
        id: transcriptId,
        text: result.text,
        speaker: this.socket.data.role!,
        language: this.getSourceLanguage(),
        timestamp: Date.now(),
        isFinal: true,
      });
    }

    // Process translation and TTS
    await this.processTranslationAndTTS(transcriptId, result.text);
  }

  private async processTranslationAndTTS(id: string, text: string): Promise<void> {
    const translationStart = Date.now();

    try {
      // Emit translation start
      this.socket.emit('translation:start', { id });
      this.targetSocket?.emit('translation:start', { id });
      this.socket.emit('status:processing', { stage: 'translation', active: true });

      // Translate with streaming - text appears immediately as it's generated
      const translation = await this.translationService.translateStream(
        text,
        this.getTranslationDirection(),
        (chunk) => {
          this.socket.emit('translation:chunk', { id, chunk });
          this.targetSocket?.emit('translation:chunk', { id, chunk });
        }
      );

      this.metrics.translationLatency = Date.now() - translationStart;
      this.socket.emit('status:processing', { stage: 'translation', active: false });

      // Emit translation complete immediately - don't wait for TTS
      const translationData = {
        id,
        originalText: text,
        translatedText: translation,
        direction: this.getTranslationDirection(),
        timestamp: Date.now(),
      };
      this.socket.emit('translation:complete', translationData);
      this.targetSocket?.emit('translation:complete', translationData);

      // TTS runs in background - don't block the pipeline
      this.processTTSInBackground(id, translation);

    } catch (error) {
      logger.error({ error }, 'Translation pipeline error');
      this.socket.emit('connection:error', {
        code: 'PIPELINE_ERROR',
        message: 'Translation error',
        details: error,
      });
    }
  }

  private processTTSInBackground(id: string, translation: string): void {
    const ttsStart = Date.now();
    console.log('🔊 Starting TTS for:', translation.substring(0, 50) + '...');
    this.socket.emit('tts:start', { id });
    this.targetSocket?.emit('tts:start', { id });
    this.socket.emit('status:processing', { stage: 'tts', active: true });

    this.synthesizeSpeech(translation)
      .then((audioBuffer) => {
        console.log('✅ TTS completed, audio size:', audioBuffer.length, 'bytes');
        this.metrics.ttsLatency = Date.now() - ttsStart;
        this.socket.emit('status:processing', { stage: 'tts', active: false });

        // Send audio to target (the person who needs to hear the translation)
        const audioArrayBuffer = audioBuffer.buffer.slice(
          audioBuffer.byteOffset,
          audioBuffer.byteOffset + audioBuffer.byteLength
        );

        if (this.targetSocket) {
          // Send to the other participant
          this.targetSocket.emit('tts:chunk', { id, chunk: audioArrayBuffer as ArrayBuffer });
          this.targetSocket.emit('tts:complete', { id });
        } else {
          // No other participant - send to self for testing
          console.log('📢 No target socket, sending audio to self for testing');
          this.socket.emit('tts:chunk', { id, chunk: audioArrayBuffer as ArrayBuffer });
        }
        this.socket.emit('tts:complete', { id });

        // Emit latency metrics
        const metrics: LatencyMetrics = {
          stt: this.metrics.sttLatency,
          translation: this.metrics.translationLatency,
          tts: this.metrics.ttsLatency,
          total: this.metrics.sttLatency + this.metrics.translationLatency + this.metrics.ttsLatency,
        };

        this.socket.emit('status:latency', metrics);
        logger.info({ metrics, sessionId: this.sessionId }, 'Pipeline metrics');
      })
      .catch((error) => {
        this.socket.emit('status:processing', { stage: 'tts', active: false });
        console.error('❌ TTS ERROR:', error);
        logger.error({ error }, 'TTS error (non-blocking)');
        // Emit error to client so they know TTS failed
        this.socket.emit('connection:error', {
          code: 'TTS_ERROR',
          message: 'TTS synthesis failed',
          details: String(error),
        });
      });
  }

  stop(): void {
    if (this.deepgramConnection) {
      this.deepgramService.closeConnection(this.deepgramConnection);
      this.deepgramConnection = null;
    }
    logger.info({ sessionId: this.sessionId }, 'Audio pipeline stopped');
  }
}

// English to Chinese Pipeline (for Student speaking English)
// Uses Azure TTS for best Taiwan Chinese voice quality
export class EnglishToChinese extends AudioPipeline {
  private azureTTS: AzureTTSService;

  constructor(
    sessionId: string,
    socket: TypedSocket,
    targetSocket: TypedSocket | null,
    deepgramService: DeepgramService,
    translationService: TranslationService,
    azureTTS: AzureTTSService
  ) {
    super(sessionId, socket, targetSocket, deepgramService, translationService);
    this.azureTTS = azureTTS;
  }

  getSourceLanguage(): Language {
    return 'en';
  }
  getTargetLanguage(): Language {
    return 'zh';
  }
  getTranslationDirection(): TranslationDirection {
    return 'en-to-zh';
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    return this.azureTTS.synthesize(text);
  }
}

// Chinese to English Pipeline (for Counselor speaking Chinese)
// Uses ElevenLabs for best English voice quality
export class ChineseToEnglish extends AudioPipeline {
  private elevenLabsTTS: ElevenLabsService;

  constructor(
    sessionId: string,
    socket: TypedSocket,
    targetSocket: TypedSocket | null,
    deepgramService: DeepgramService,
    translationService: TranslationService,
    elevenLabsTTS: ElevenLabsService
  ) {
    super(sessionId, socket, targetSocket, deepgramService, translationService);
    this.elevenLabsTTS = elevenLabsTTS;
  }

  getSourceLanguage(): Language {
    return 'zh';
  }
  getTargetLanguage(): Language {
    return 'en';
  }
  getTranslationDirection(): TranslationDirection {
    return 'zh-to-en';
  }

  async synthesizeSpeech(text: string): Promise<Buffer> {
    return this.elevenLabsTTS.synthesize(text);
  }
}
