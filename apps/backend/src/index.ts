import { buildApp } from './app.js';
import { setupSocketIO } from './socket/index.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // Build Fastify app
    const app = await buildApp();

    // Get Fastify's underlying HTTP server
    await app.ready();
    const httpServer = app.server;

    // Setup Socket.IO on the same HTTP server
    const io = setupSocketIO(httpServer);

    // Start server using Fastify's listen (which uses the same httpServer)
    const port = parseInt(env.PORT, 10);

    await app.listen({ port, host: '0.0.0.0' });
    logger.info(`Server running on http://0.0.0.0:${port}`);
    logger.info(`Socket.IO ready for connections`);
    logger.info(`Environment: ${env.NODE_ENV}`);

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');

      io.close();
      await app.close(); // This also closes the underlying HTTP server

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
