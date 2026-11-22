import { OrderModel } from './order.model';
import { IOrder, IPlaceOrderInput } from '../../interfaces/order.interface';
import {
  OrderStatus,
  ACTIVE_ORDER_STATUSES,
  TERMINAL_ORDER_STATUSES,
  APP_CONSTANTS,
  ERROR_MESSAGES,
} from '../../config/constants';
import { createAppError } from '../../middlewares/error.middleware';
import * as DishDM from '../dish/dish.dm';
import * as TableDM from '../table/table.dm';

// ============================================================
// Order DM Layer
// ============================================================

/**
 * Valid status transitions map.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.CANNOT_DELIVER],
  [OrderStatus.CONFIRMED]: [OrderStatus.COOKING, OrderStatus.CANCELLED, OrderStatus.CANNOT_DELIVER],
  [OrderStatus.COOKING]: [OrderStatus.READY, OrderStatus.CANCELLED, OrderStatus.CANNOT_DELIVER],
  [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANNOT_DELIVER],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.CANNOT_DELIVER]: [],
};

/**
 * Place a new order.
 * Validates dishes exist and snapshots names/prices.
 */
export const placeOrder = async (input: IPlaceOrderInput): Promise<IOrder> => {
  // Snapshot table number at order creation time
  const table = await TableDM.getTableById(input.tableId);
  if (!table) {
    throw createAppError(ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
  }

  // Fetch all dishes to validate and snapshot
  const dishIds = input.items.map((item) => item.dishId);
  const dishes = await DishDM.getDishesByIds(dishIds);

  // Validate all dishes exist and are available
  const dishMap = new Map(dishes.map((d) => [d._id.toString(), d]));

  const orderItems = input.items.map((item) => {
    const dish = dishMap.get(item.dishId);
    if (!dish) {
      throw createAppError(`Dish not found: ${item.dishId}`, 404);
    }
    if (!dish.isAvailable) {
      throw createAppError(`Dish is not available: ${dish.name}`, 400);
    }

    return {
      dishId: dish._id,
      dishName: dish.name,
      quantity: item.quantity,
      price: dish.price,
      notes: item.notes,
    };
  });

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const order = await OrderModel.create({
    restaurantId: input.restaurantId,
    tableId: input.tableId,
    tableNumber: table.tableNumber,
    items: orderItems,
    status: OrderStatus.PLACED,
    specialInstructions: input.specialInstructions,
    customerName: input.customerName,
    totalAmount,
    gpsCoordinates: input.gpsCoordinates,
  });

  return order.toObject();
};

/**
 * Get order by ID.
 */
export const getOrderById = async (id: string): Promise<IOrder | null> => {
  return OrderModel.findById(id).lean();
};

/**
 * Get all orders for a table (for table-level invoice).
 */
export const getAllOrdersByTableId = async (tableId: string): Promise<IOrder[]> => {
  return OrderModel.find({ tableId }).sort({ createdAt: 1 }).lean();
};

/**
 * Get active orders for a table.
 */
export const getActiveOrdersByTableId = async (
  tableId: string
): Promise<IOrder[]> => {
  return OrderModel.find({
    tableId,
    status: { $in: ACTIVE_ORDER_STATUSES },
  })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Get ALL orders for a restaurant (admin view — full history).
 */
export const getAllOrdersByRestaurantId = async (
  restaurantId: string
): Promise<IOrder[]> => {
  return OrderModel.find({ restaurantId })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Get kitchen orders: active + delivered/cancelled within last 30 minutes.
 */
export const getKitchenOrders = async (
  restaurantId: string
): Promise<IOrder[]> => {
  const thirtyMinutesAgo = new Date(
    Date.now() - APP_CONSTANTS.KITCHEN_ORDER_VISIBILITY_MINUTES * 60 * 1000
  );

  return OrderModel.find({
    restaurantId,
    $or: [
      // Active orders — always visible
      { status: { $in: ACTIVE_ORDER_STATUSES } },
      // Terminal orders — only if updated within last 30 min
      {
        status: { $in: TERMINAL_ORDER_STATUSES },
        updatedAt: { $gte: thirtyMinutesAgo },
      },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Update order status with transition validation.
 */
export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus
): Promise<IOrder | null> => {
  const order = await OrderModel.findById(orderId).lean();
  if (!order) {
    throw createAppError(ERROR_MESSAGES.ORDER_NOT_FOUND, 404);
  }

  const currentStatus = order.status as OrderStatus;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw createAppError(
      `${ERROR_MESSAGES.INVALID_ORDER_STATUS_TRANSITION}: ${currentStatus} → ${newStatus}`,
      400
    );
  }

  return OrderModel.findByIdAndUpdate(
    orderId,
    { status: newStatus },
    { new: true }
  ).lean();
};

/**
 * Get order status.
 */
export const getOrderStatus = async (
  orderId: string
): Promise<{ status: OrderStatus } | null> => {
  const order = await OrderModel.findById(orderId).select('status').lean();
  if (!order) return null;
  return { status: order.status as OrderStatus };
};
