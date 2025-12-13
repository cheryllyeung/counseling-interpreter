import { ElevenLabsClient } from 'elevenlabs';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ElevenLabsService');

export class ElevenLabsService {
  private client: ElevenLabsClient;
  private voiceId: string;

  constructor() {
    const apiKey = env.ELEVENLABS_API_KEY;
    // Log masked API key for debugging (show first 8 and last 4 chars)
    const maskedKey = apiKey.length > 12
      ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
      : '***';
    logger.info({ maskedKey, keyLength: apiKey.length }, 'ElevenLabs API key loaded');

    this.client = new ElevenLabsClient({
      apiKey: apiKey,
    });
    this.voiceId = env.ELEVENLABS_VOICE_ID;
    logger.info({ voiceId: this.voiceId }, 'ElevenLabs service initialized');
  }

  async synthesize(text: string): Promise<Buffer> {
    const startTime = Date.now();

    try {
      const audioStream = await this.client.textToSpeech.convert(this.voiceId, {
        text,
        model_id: 'eleven_turbo_v2_5', // Fastest model with good quality
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
        output_format: 'mp3_44100_128',
      });

      // Collect stream into buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.from(chunk));
      }

      const audioBuffer = Buffer.concat(chunks);
      const latency = Date.now() - startTime;
      logger.info({ latency, textLength: text.length }, 'ElevenLabs TTS completed');

      return audioBuffer;
    } catch (error) {
      logger.error({ error }, 'ElevenLabs TTS error');
      throw error;
    }
  }

  async synthesizeStream(
    text: string,
    onChunk: (chunk: Buffer) => void
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const audioStream = await this.client.textToSpeech.convertAsStream(this.voiceId, {
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
        output_format: 'mp3_44100_128',
      });

      for await (const chunk of audioStream) {
        onChunk(Buffer.from(chunk));
      }

      const latency = Date.now() - startTime;
      logger.info({ latency, textLength: text.length }, 'ElevenLabs stream TTS completed');
    } catch (error) {
      logger.error({ error }, 'ElevenLabs stream TTS error');
      throw error;
    }
  }
}
