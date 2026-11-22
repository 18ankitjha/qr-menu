import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { SOCKET_EVENTS } from '../config/constants';
import { logger } from '../utils/logger';

// ============================================================
// Socket.IO — Kitchen Real-time Updates
// ============================================================

let io: SocketIOServer;

export const initializeSocket = (server: http.Server): void => {
  io = new SocketIOServer(server, {
    cors: {
      origin: [env.CLIENT_ADMIN_URL, env.CLIENT_MENU_URL, env.CLIENT_KITCHEN_URL],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join a restaurant-specific room
    socket.on(SOCKET_EVENTS.JOIN_RESTAURANT_ROOM, (restaurantId: string) => {
      const room = `restaurant:${restaurantId}`;
      socket.join(room);
      logger.info(`Socket ${socket.id} joined room: ${room}`);
    });

    // Leave a restaurant-specific room
    socket.on(SOCKET_EVENTS.LEAVE_RESTAURANT_ROOM, (restaurantId: string) => {
      const room = `restaurant:${restaurantId}`;
      socket.leave(room);
      logger.info(`Socket ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emits a new order event to the restaurant's kitchen room.
 */
export const emitNewOrder = (restaurantId: string, order: unknown): void => {
  if (io) {
    const room = `restaurant:${restaurantId}`;
    io.to(room).emit(SOCKET_EVENTS.NEW_ORDER, order);
    logger.info(`Emitted ${SOCKET_EVENTS.NEW_ORDER} to room ${room}`);
  }
};

/**
 * Emits an order status update to the restaurant's kitchen room.
 */
export const emitOrderStatusUpdate = (
  restaurantId: string,
  orderId: string,
  status: string
): void => {
  if (io) {
    const room = `restaurant:${restaurantId}`;
    io.to(room).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, { orderId, status });
    logger.info(`Emitted ${SOCKET_EVENTS.ORDER_STATUS_UPDATED} to room ${room}: ${orderId} → ${status}`);
  }
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};
