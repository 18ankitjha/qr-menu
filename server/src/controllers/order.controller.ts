import { Request, Response } from 'express';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/constants';
import { sendSuccess, sendError } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import { emitNewOrder, emitOrderStatusUpdate } from '../socket/kitchen.socket';
import * as OrderDM from '../dm/order/order.dm';

// ============================================================
// Order Controller
// ============================================================

/**
 * POST /order/place — Customer places an order.
 */
export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await OrderDM.placeOrder(req.body);

  // Emit to kitchen via Socket.IO
  emitNewOrder(order.restaurantId.toString(), order);

  sendSuccess(res, order, SUCCESS_MESSAGES.ORDER_PLACED, 201);
});

/**
 * GET /order/getStatus/:orderId
 */
export const getOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const status = await OrderDM.getOrderStatus(orderId);
  if (!status) {
    sendError(res, ERROR_MESSAGES.ORDER_NOT_FOUND, 404);
    return;
  }
  sendSuccess(res, status, 'Order status fetched');
});

/**
 * GET /order/getActiveByTable/:tableId
 */
export const getActiveByTable = asyncHandler(async (req: Request, res: Response) => {
  const tableId = req.params.tableId as string;
  const orders = await OrderDM.getActiveOrdersByTableId(tableId);
  sendSuccess(res, orders, 'Active orders fetched');
});

/**
 * GET /order/getAll/:restaurantId — Admin: get ALL orders.
 */
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string;
  const orders = await OrderDM.getAllOrdersByRestaurantId(restaurantId);
  sendSuccess(res, orders, 'All orders fetched');
});

/**
 * GET /order/getKitchenOrders/:restaurantId
 */
export const getKitchenOrders = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string;
  const orders = await OrderDM.getKitchenOrders(restaurantId);
  sendSuccess(res, orders, 'Kitchen orders fetched');
});

/**
 * PATCH /order/setStatus/:orderId
 */
export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const { status } = req.body;
  const order = await OrderDM.updateOrderStatus(orderId, status);

  if (order) {
    emitOrderStatusUpdate(order.restaurantId.toString(), order._id.toString(), status);
  }

  sendSuccess(res, order, SUCCESS_MESSAGES.ORDER_STATUS_UPDATED);
});
