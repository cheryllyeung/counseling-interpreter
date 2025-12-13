import { createServer } from 'http';
import { buildApp } from './app.js';
import { setupSocketIO } from './socket/index.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // Build Fastify app
    const app = await buildApp();

    // Create HTTP server from Fastify
    await app.ready();
    const httpServer = createServer(app.server);

    // Setup Socket.IO
    const io = setupSocketIO(httpServer);

    // Start server
    const port = parseInt(env.PORT, 10);

    httpServer.listen(port, '0.0.0.0', () => {
      logger.info(`Server running on http://localhost:${port}`);
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
