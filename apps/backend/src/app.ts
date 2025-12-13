import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import type { Server } from 'http';
import { createLogger } from './utils/logger.js';
import { env } from './config/env.js';

const logger = createLogger('App');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function buildApp(httpServer: Server) {
  const app = Fastify({
    logger: false,
    serverFactory: (handler) => {
      httpServer.on('request', handler);
      return httpServer;
    },
  });

  // Register CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
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

  // Serve static frontend files in production
  const frontendDistPath = join(__dirname, '../../frontend/dist');
  if (env.NODE_ENV === 'production' && existsSync(frontendDistPath)) {
    await app.register(fastifyStatic, {
      root: frontendDistPath,
      prefix: '/',
    });

    // SPA fallback - serve index.html for all non-API routes
    app.setNotFoundHandler(async (request, reply) => {
      if (!request.url.startsWith('/api') && !request.url.startsWith('/health')) {
        return reply.sendFile('index.html');
      }
      return reply.status(404).send({ error: 'Not found' });
    });

    logger.info('Serving static frontend files from: ' + frontendDistPath);
  }

  logger.info('Fastify app built');

  return app;
}
