import { Request, Response } from 'express';
import { SUCCESS_MESSAGES } from '../../../config/constants';
import { sendSuccess } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { emitNewOrder, emitOrderStatusUpdate, emitTableUpdated } from '../../realtime/socket/kitchen.socket';
import * as OrderDM from '../dm/order.dm';
import { IOrderFilters } from '../interfaces/order.interface';
import { ORDER_MESSAGES } from '../constants/order.constants';
import { getActorName } from '../../auth/utils/actor.util';

// ============================================================
// Order Controller
// ============================================================

/**
 * POST /order/placeByStaff — waiter or owner places an order for a table (no GPS check).
 */
export const placeOrderByStaff = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!;
  const order = await OrderDM.placeOrder({
    ...req.body,
    placedBy: {
      role: auth.role!,
      actorId: (auth.staffId ?? auth.userId)!,
      name: await getActorName(auth),
    },
  });

  emitNewOrder(order.restaurantId.toString(), order);
  // Diners at the table see the waiter's order live
  emitTableUpdated(order.tableId.toString());

  sendSuccess(res, order, ORDER_MESSAGES.STAFF_ORDER_PLACED(order.tableNumber), 201);
});

/**
 * GET /order/getAll/:restaurantId?tableId&status — owner or waiter: all orders (filterable).
 */
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string;
  const orders = await OrderDM.getAllOrdersByRestaurantId(restaurantId, req.query as IOrderFilters);
  sendSuccess(res, orders, 'All orders fetched');
});

/**
 * GET /order/getByTable/:tableId — owner or waiter: every order on a table + unbilled total.
 */
export const getByTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await OrderDM.getOrdersForTable(req.params.tableId as string);
  sendSuccess(res, result, ORDER_MESSAGES.TABLE_ORDERS_FETCHED);
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
    emitTableUpdated(order.tableId.toString());
  }

  sendSuccess(res, order, SUCCESS_MESSAGES.ORDER_STATUS_UPDATED);
});

/**
 * PATCH /order/updateItems/:orderId — owner or waiter changes what's on an unbilled order.
 */
export const updateItems = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth!;
  const order = await OrderDM.updateOrderItems(req.params.orderId as string, {
    ...req.body,
    editedBy: {
      role: auth.role!,
      actorId: (auth.staffId ?? auth.userId)!,
      name: await getActorName(auth),
    },
  });

  // The kitchen board refetches on any order update; diners see the new items live
  emitOrderStatusUpdate(order.restaurantId.toString(), order._id.toString(), order.status);
  emitTableUpdated(order.tableId.toString());

  sendSuccess(res, order, ORDER_MESSAGES.ORDER_UPDATED);
});
