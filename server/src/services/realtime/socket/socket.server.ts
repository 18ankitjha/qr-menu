import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { CLIENT_ORIGINS } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { socketAuthMiddleware } from './socket.auth';
import { registerRoomHandlers } from './room.handlers';
import { attachScalingAdapter } from './scaling.adapter';

// ============================================================
// Socket server — ONE Socket.IO server, hosted by the API process on the same port (/socket.io).
// Every web app opens one connection to it; services never touch sockets, they call ../publishers.
// ============================================================

let io: SocketIOServer | null = null;

export const initializeRealtime = (server: http.Server): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: { origin: CLIENT_ORIGINS, credentials: true },
    // Phones drop idle connections; a ping every 25s notices a dead link within ~45s
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(socketAuthMiddleware);
  io.on('connection', (socket: Socket) => {
    logger.debug(`[realtime] connected ${socket.id} (${socket.data.auth ? 'staff' : 'guest'})`);
    registerRoomHandlers(socket);
    socket.on('disconnect', (reason) => logger.debug(`[realtime] disconnected ${socket.id}: ${reason}`));
  });

  void attachScalingAdapter(io);
  return io;
};

/** The live server, or null before startup / in scripts — publishers then do nothing. */
export const getIO = (): SocketIOServer | null => io;
