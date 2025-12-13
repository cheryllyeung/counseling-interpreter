import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { EventEmitter } from 'events';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';
import type { Language } from '@counseling-interpreter/shared';

const logger = createLogger('DeepgramService');

export interface TranscriptResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

// Wrapper class that holds the connection and emits events
export class DeepgramConnection extends EventEmitter {
  private connection: ReturnType<ReturnType<typeof createClient>['listen']['live']>;

  constructor(connection: ReturnType<ReturnType<typeof createClient>['listen']['live']>) {
    super();
    this.connection = connection;
  }

  getReadyState() {
    return this.connection.getReadyState();
  }

  send(data: ArrayBuffer) {
    this.connection.send(data);
  }

  requestClose() {
    this.connection.requestClose();
  }
}

export class DeepgramService {
  private client;

  constructor() {
    this.client = createClient(env.DEEPGRAM_API_KEY);
    logger.info('Deepgram service initialized');
  }

  createLiveConnection(language: Language): DeepgramConnection {
    const langCode = language === 'zh' ? 'zh-TW' : 'en-US';

    logger.info({ language: langCode }, 'Creating live transcription connection');

    const connection = this.client.listen.live({
      model: 'nova-2', // nova-3 is not yet available, using nova-2 which is very fast
      language: langCode,
      smart_format: true,
      punctuate: true,
      interim_results: true,
      utterance_end_ms: 1000,
      vad_events: true,
      endpointing: 300, // 300ms silence detection for low latency
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
    });

    // Create a wrapper that emits events
    const wrapper = new DeepgramConnection(connection);

    connection.on(LiveTranscriptionEvents.Open, () => {
      logger.info('Deepgram connection opened');
      wrapper.emit('ready');
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0];
      if (!transcript) return;

      const result: TranscriptResult = {
        text: transcript.transcript || '',
        confidence: transcript.confidence || 0,
        isFinal: data.is_final || false,
        words: transcript.words?.map((w: { word: string; start: number; end: number; confidence: number }) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        })),
      };

      // Only emit if there's actual text
      if (result.text.trim()) {
        logger.debug({ text: result.text, isFinal: result.isFinal }, 'Transcript received');
        wrapper.emit('transcript', result);
      }
    });

    connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      logger.debug('Utterance end detected');
      wrapper.emit('utteranceEnd');
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      logger.error({ error }, 'Deepgram error');
      wrapper.emit('error', error);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      logger.info('Deepgram connection closed');
      wrapper.emit('close');
    });

    return wrapper;
  }

  sendAudio(connection: DeepgramConnection, audioBuffer: Buffer) {
    if (connection.getReadyState() === 1) {
      // WebSocket.OPEN - convert Buffer to ArrayBuffer for type compatibility
      const arrayBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
      );
      connection.send(arrayBuffer as ArrayBuffer);
    }
  }

  closeConnection(connection: DeepgramConnection) {
    try {
      connection.requestClose();
      logger.info('Deepgram connection close requested');
    } catch (error) {
      logger.error({ error }, 'Error closing Deepgram connection');
    }
  }
}
