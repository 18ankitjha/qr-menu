import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { CLIENT_ORIGINS } from '../../../config/env';
import { SOCKET_EVENTS } from '../../../config/constants';
import { logger } from '../../../utils/logger';

// ============================================================
// Socket.IO — Kitchen Real-time Updates
// ============================================================

let io: SocketIOServer;

export const initializeSocket = (server: http.Server): void => {
  io = new SocketIOServer(server, {
    cors: {
      origin: CLIENT_ORIGINS,
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

    // Customer menu: watch one table. Only a "something changed" ping is ever sent to this room;
    // the client then refetches through the authenticated REST API.
    socket.on(SOCKET_EVENTS.JOIN_TABLE_ROOM, (tableId: string) => {
      if (typeof tableId !== 'string' || !/^[a-f0-9]{24}$/.test(tableId)) return;
      socket.join(`table:${tableId}`);
    });

    socket.on(SOCKET_EVENTS.LEAVE_TABLE_ROOM, (tableId: string) => {
      if (typeof tableId !== 'string') return;
      socket.leave(`table:${tableId}`);
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

/**
 * Tells everyone watching a table (customer menu) that its cart / orders / bill changed. No data is sent.
 */
export const emitTableUpdated = (tableId: string): void => {
  if (io) {
    io.to(`table:${tableId}`).emit(SOCKET_EVENTS.TABLE_SESSION_UPDATED, { tableId, at: Date.now() });
  }
};

/**
 * A table requested the bill or called a waiter — sent to the restaurant room (admin / waiter screens).
 */
export const emitTableAlert = (restaurantId: string, alert: unknown): void => {
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit(SOCKET_EVENTS.TABLE_ALERT, alert);
  }
};
