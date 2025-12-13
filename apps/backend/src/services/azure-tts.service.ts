import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AzureTTSService');

// Taiwan Mandarin voices
const VOICES = {
  female: 'zh-TW-HsiaoChenNeural', // Natural female voice
  male: 'zh-TW-YunJheNeural', // Natural male voice
} as const;

export class AzureTTSService {
  private speechConfig: sdk.SpeechConfig;

  constructor() {
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      env.AZURE_SPEECH_KEY,
      env.AZURE_SPEECH_REGION
    );

    // Use Taiwan Mandarin female voice by default
    this.speechConfig.speechSynthesisVoiceName = VOICES.female;

    // Output format: MP3 16kHz for good quality with low latency
    this.speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    logger.info('Azure TTS service initialized');
  }

  async synthesize(text: string): Promise<Buffer> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);

      synthesizer.speakTextAsync(
        text,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const latency = Date.now() - startTime;
            logger.info({ latency, textLength: text.length }, 'Azure TTS completed');
            resolve(Buffer.from(result.audioData));
          } else {
            logger.error({ reason: result.reason, errorDetails: result.errorDetails }, 'Azure TTS failed');
            reject(new Error(`Speech synthesis failed: ${result.errorDetails}`));
          }
          synthesizer.close();
        },
        (error) => {
          synthesizer.close();
          logger.error({ error }, 'Azure TTS error');
          reject(error);
        }
      );
    });
  }

  async synthesizeWithSSML(
    text: string,
    options?: {
      rate?: string; // e.g., '+10%', '-20%', '1.2'
      pitch?: string; // e.g., '+5%', '-10%'
      voice?: keyof typeof VOICES;
    }
  ): Promise<Buffer> {
    const startTime = Date.now();
    const voice = VOICES[options?.voice || 'female'];
    const rate = options?.rate || '1.0';
    const pitch = options?.pitch || '+0%';

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW">
        <voice name="${voice}">
          <prosody rate="${rate}" pitch="${pitch}">
            ${this.escapeXml(text)}
          </prosody>
        </voice>
      </speak>
    `.trim();

    return new Promise((resolve, reject) => {
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig);

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            const latency = Date.now() - startTime;
            logger.info({ latency, textLength: text.length }, 'Azure TTS SSML completed');
            resolve(Buffer.from(result.audioData));
          } else {
            logger.error({ reason: result.reason, errorDetails: result.errorDetails }, 'Azure TTS SSML failed');
            reject(new Error(`SSML synthesis failed: ${result.errorDetails}`));
          }
          synthesizer.close();
        },
        (error) => {
          synthesizer.close();
          logger.error({ error }, 'Azure TTS SSML error');
          reject(error);
        }
      );
    });
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
