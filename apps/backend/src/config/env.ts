import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file (for local development)
// In production (Railway), env vars are set directly
config({ path: '../../.env' });
config(); // Also try loading from current directory

const envSchema = z.object({
  // Server
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Deepgram
  DEEPGRAM_API_KEY: z.string().min(1, 'DEEPGRAM_API_KEY is required'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // Azure Speech
  AZURE_SPEECH_KEY: z.string().min(1, 'AZURE_SPEECH_KEY is required'),
  AZURE_SPEECH_REGION: z.string().default('eastasia'),

  // ElevenLabs
  ELEVENLABS_API_KEY: z.string().min(1, 'ELEVENLABS_API_KEY is required'),
  ELEVENLABS_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment validation failed:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
