import { spawn } from 'child_process';
import { createLogger } from '../utils/logger.js';
import { randomUUID } from 'crypto';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const logger = createLogger('EdgeTTSService');

// Edge TTS Voices - completely FREE and unlimited!
const VOICES = {
  // Chinese (Taiwan) - same quality as Azure!
  'zh-female': 'zh-TW-HsiaoChenNeural',
  'zh-male': 'zh-TW-YunJheNeural',
  // English
  'en-female': 'en-US-JennyNeural',
  'en-male': 'en-US-GuyNeural',
} as const;

type VoiceKey = keyof typeof VOICES;

export class EdgeTTSService {
  private pythonAvailable: boolean = false;

  constructor() {
    this.checkPythonAndEdgeTTS();
  }

  private async checkPythonAndEdgeTTS(): Promise<void> {
    try {
      await this.runCommand('python3', ['-c', 'import edge_tts']);
      this.pythonAvailable = true;
      logger.info('Edge-TTS service initialized (Python edge-tts available)');
    } catch {
      logger.warn('edge-tts Python package not found. Install with: pip install edge-tts');
      this.pythonAvailable = false;
    }
  }

  private runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Process exited with code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }

  async synthesize(text: string, language: 'zh' | 'en', gender: 'female' | 'male' = 'female'): Promise<Buffer> {
    if (!this.pythonAvailable) {
      throw new Error('edge-tts not available. Install with: pip install edge-tts');
    }

    const startTime = Date.now();
    const voiceKey = `${language}-${gender}` as VoiceKey;
    const voice = VOICES[voiceKey];

    // Create temp file for output
    const tempFile = join(tmpdir(), `edge-tts-${randomUUID()}.mp3`);

    try {
      // Use edge-tts CLI
      await this.runCommand('edge-tts', [
        '--voice', voice,
        '--text', text,
        '--write-media', tempFile,
      ]);

      // Read the generated audio file
      const audioBuffer = await readFile(tempFile);

      const latency = Date.now() - startTime;
      logger.info({ latency, textLength: text.length, voice }, 'Edge-TTS synthesis completed');

      return audioBuffer;
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  async synthesizeToFile(text: string, outputPath: string, language: 'zh' | 'en', gender: 'female' | 'male' = 'female'): Promise<void> {
    if (!this.pythonAvailable) {
      throw new Error('edge-tts not available. Install with: pip install edge-tts');
    }

    const voiceKey = `${language}-${gender}` as VoiceKey;
    const voice = VOICES[voiceKey];

    await this.runCommand('edge-tts', [
      '--voice', voice,
      '--text', text,
      '--write-media', outputPath,
    ]);

    logger.info({ outputPath, voice }, 'Edge-TTS file synthesis completed');
  }

  isAvailable(): boolean {
    return this.pythonAvailable;
  }

  // List all available voices (for reference)
  async listVoices(): Promise<string> {
    if (!this.pythonAvailable) {
      throw new Error('edge-tts not available');
    }
    return this.runCommand('edge-tts', ['--list-voices']);
  }
}
