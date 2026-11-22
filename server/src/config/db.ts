import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';
import { SERVER_MESSAGES } from './constants';

// ============================================================
// MongoDB Connection
// ============================================================

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info(SERVER_MESSAGES.DB_CONNECTED);
  } catch (error) {
    logger.error(SERVER_MESSAGES.DB_CONNECT_FAILED, error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn(SERVER_MESSAGES.DB_CONNECT_FAILED);
});

mongoose.connection.on('error', (err) => {
  logger.error(SERVER_MESSAGES.DB_CONNECT_FAILED, err);
});

export { connectDB };
