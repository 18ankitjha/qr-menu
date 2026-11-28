import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../../../utils/logger';

// ============================================================
// Multi-server seam. With ONE API server, Socket.IO keeps rooms in memory and nothing is needed.
// With SEVERAL servers behind a load balancer, a push made on server A must reach browsers on server B:
// set REDIS_URL and install the adapter (`npm i @socket.io/redis-adapter redis` in server/).
// Every server then relays pushes through Redis pub/sub. No other code changes — publishers stay the same.
// ============================================================

// Variable names keep TypeScript from requiring the optional packages at build time
const REDIS_ADAPTER_PKG = '@socket.io/redis-adapter';
const REDIS_PKG = 'redis';

export const attachScalingAdapter = async (io: SocketIOServer): Promise<void> => {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.info('[realtime] single-server mode (set REDIS_URL to share pushes across servers)');
    return;
  }
  try {
    const { createAdapter } = await import(REDIS_ADAPTER_PKG);
    const { createClient } = await import(REDIS_PKG);
    const pub = createClient({ url });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    io.adapter(createAdapter(pub, sub));
    logger.info('[realtime] Redis adapter on — pushes are shared across servers');
  } catch (error) {
    logger.error(
      `[realtime] REDIS_URL is set but the Redis adapter could not start; staying single-server. ` +
        `Install with: npm i ${REDIS_ADAPTER_PKG} ${REDIS_PKG}`,
      (error as Error).message
    );
  }
};
