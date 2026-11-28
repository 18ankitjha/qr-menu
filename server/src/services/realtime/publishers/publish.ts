import { logger } from '../../../utils/logger';
import { getIO } from '../socket/socket.server';

// ============================================================
// publish — the single place a push leaves the server. Logs room + event so pushes are easy to trace
// (NODE_ENV=development prints every push). Never throws: a failed push must not fail the API call.
// ============================================================

export const publish = (rooms: string | string[], event: string, payload: unknown): void => {
  const io = getIO();
  if (!io) return;
  try {
    io.to(rooms).emit(event, payload);
    logger.debug(`[realtime] → ${[rooms].flat().join(', ')} ${event}`, payload);
  } catch (error) {
    logger.error(`[realtime] push ${event} failed`, (error as Error).message);
  }
};
