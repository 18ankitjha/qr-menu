import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { initializeSocket } from './services/realtime/socket/kitchen.socket';
import { RestaurantDM } from './services/restaurant';
import { logger } from './utils/logger';
import { SERVER_MESSAGES } from './config/constants';

// ============================================================
// Server Entry Point
// ============================================================

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    // Older restaurants were created before restaurant codes (used for staff login)
    const backfilled = await RestaurantDM.backfillRestaurantCodes();
    if (backfilled > 0) {
      logger.info(`Assigned restaurant codes to ${backfilled} restaurant(s)`);
    }

    const server = http.createServer(app);

    initializeSocket(server);

    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(SERVER_MESSAGES.SERVER_RUNNING(env.PORT, env.NODE_ENV));
      logger.info(SERVER_MESSAGES.HEALTH_CHECK_URL(env.PORT));
      logger.info(SERVER_MESSAGES.SOCKET_READY);
    });

    const gracefulShutdown = (signal: string) => {
      logger.info(SERVER_MESSAGES.GRACEFUL_SHUTDOWN(signal));
      server.close(() => {
        logger.info(SERVER_MESSAGES.SERVER_CLOSED);
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error(SERVER_MESSAGES.SERVER_START_FAILED, error);
    process.exit(1);
  }
};

startServer();
