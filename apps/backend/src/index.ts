import { createServer } from 'http';
import { buildApp } from './app.js';
import { setupSocketIO } from './socket/index.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    const port = parseInt(env.PORT, 10);

    // Create HTTP server first
    const httpServer = createServer();

    // Build Fastify app with the shared HTTP server
    const app = await buildApp(httpServer);

    // Setup Socket.IO on the same HTTP server
    const io = setupSocketIO(httpServer);

    // Initialize Fastify
    await app.ready();

    // Start listening
    httpServer.listen(port, '0.0.0.0', () => {
      logger.info(`Server running on http://0.0.0.0:${port}`);
      logger.info(`Socket.IO ready for connections`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');

      io.close();
      httpServer.close();
      await app.close();

      logger.info('Server shut down gracefully');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

main();
