import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createLogger } from './utils/logger.js';
import { env } from './config/env.js';

const logger = createLogger('App');

export async function buildApp() {
  const app = Fastify({
    logger: false, // We use our own pino logger
  });

  // Register CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    };
  });

  // API info endpoint
  app.get('/api', async () => {
    return {
      name: 'Counseling Interpreter API',
      version: '1.0.0',
      description: 'Real-time bilingual interpretation system for psychological counseling',
    };
  });

  logger.info('Fastify app built');

  return app;
}
