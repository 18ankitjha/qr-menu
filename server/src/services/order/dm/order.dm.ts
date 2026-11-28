import { Types } from 'mongoose';
import { OrderModel } from './order.model';
import {
  IOrder,
  IOrderFilters,
  IOrderItem,
  IOrderSummary,
  IPlaceOrderInput,
  ITableOrders,
  IUpdateOrderItemsInput,
} from '../interfaces/order.interface';
import { ORDER_MESSAGES } from '../constants/order.constants';
import {
  OrderStatus,
  ACTIVE_ORDER_STATUSES,
  TERMINAL_ORDER_STATUSES,
  NON_BILLABLE_ORDER_STATUSES,
  APP_CONSTANTS,
  ERROR_MESSAGES,
} from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';
import { DishDM, MenuDM } from '../../menu';
import { TableDM } from '../../table';
import { RestaurantDM } from '../../restaurant';

// ============================================================
// Order DM Layer
// ============================================================

/**
 * Valid status transitions. For now the flow is just PLACED → DELIVERED | CANCELLED.
 * CONFIRMED / COOKING / READY / CANNOT_DELIVER are paused (kept in the enum because older orders may have them;
 * those can still be closed). To bring the kitchen flow back, swap in the commented map.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.COOKING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.CANNOT_DELIVER]: [],
};
// Full kitchen flow (paused):
// const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
//   [OrderStatus.PLACED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.CANNOT_DELIVER],
//   [OrderStatus.CONFIRMED]: [OrderStatus.COOKING, OrderStatus.CANCELLED, OrderStatus.CANNOT_DELIVER],
//   [OrderStatus.COOKING]: [OrderStatus.READY, OrderStatus.CANCELLED, OrderStatus.CANNOT_DELIVER],
//   [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANNOT_DELIVER],
//   [OrderStatus.DELIVERED]: [],
//   [OrderStatus.CANCELLED]: [],
//   [OrderStatus.CANNOT_DELIVER]: [],
// };

type IItemInput = IPlaceOrderInput['items'][number];

const sumItems = (items: Pick<IOrderItem, 'price' | 'quantity'>[]): number =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

/**
 * Validates dishes (exist, on this restaurant's menu, available) and snapshots name + price.
 * Lines for dishes already on the order (`existing`) keep their original snapshot, so editing an
 * order never reprices what was ordered, and a dish that has since gone unavailable can still stay.
 */
const snapshotItems = async (
  restaurantId: string,
  items: IItemInput[],
  existing: IOrderItem[] = []
) => {
  const kept = new Map(existing.map((item) => [item.dishId.toString(), item]));
  const newDishIds = items.map((item) => item.dishId).filter((id) => !kept.has(id));

  const [dishes, menu] = newDishIds.length
    ? await Promise.all([DishDM.getDishesByIds(newDishIds), MenuDM.getMenuByRestaurantId(restaurantId)])
    : [[], null];
  const menuId = menu?._id.toString();
  const dishMap = new Map(dishes.map((d) => [d._id.toString(), d]));

  return items.map((item) => {
    const previous = kept.get(item.dishId);
    if (previous) {
      return {
        dishId: previous.dishId,
        dishName: previous.dishName,
        price: previous.price,
        quantity: item.quantity,
        notes: item.notes,
        addedBy: item.addedBy,
      };
    }
    const dish = dishMap.get(item.dishId);
    if (!dish) {
      throw createAppError(`Dish not found: ${item.dishId}`, 404);
    }
    if (!menuId || dish.menuId.toString() !== menuId) {
      throw createAppError(ORDER_MESSAGES.DISH_NOT_IN_RESTAURANT(dish.name), 400);
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
      addedBy: item.addedBy,
    };
  });
};

/**
 * Place a new order (customer via QR, or staff on behalf of a table when `placedBy` is set).
 * Validates dishes exist and snapshots names/prices.
 */
export const placeOrder = async (input: IPlaceOrderInput): Promise<IOrder> => {
  // Snapshot table number at order creation time
  const table = await TableDM.getTableById(input.tableId);
  if (!table) {
    throw createAppError(ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
  }
  if (table.restaurantId.toString() !== input.restaurantId) {
    throw createAppError(ERROR_MESSAGES.TABLE_RESTAURANT_MISMATCH, 400);
  }

  // Pending, suspended, rejected or owner-deactivated restaurants cannot take orders
  const restaurant = await RestaurantDM.getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }
  if (!RestaurantDM.isRestaurantOperational(restaurant)) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_OPERATIONAL, 403);
  }

  const orderItems = await snapshotItems(input.restaurantId, input.items);
  const totalAmount = sumItems(orderItems);

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
    placedBy: input.placedBy,
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
 * Get ALL orders for a restaurant (admin view — full history), optionally filtered.
 */
export const getAllOrdersByRestaurantId = async (
  restaurantId: string,
  filters: IOrderFilters = {}
): Promise<IOrder[]> => {
  const query: Record<string, unknown> = { restaurantId };
  if (filters.tableId) query.tableId = filters.tableId;
  if (filters.status) query.status = filters.status;

  return OrderModel.find(query)
    .sort({ createdAt: -1 })
    .lean();
};

const billableUnbilledQuery = (tableId: string) => ({
  tableId,
  billId: null,
  status: { $nin: NON_BILLABLE_ORDER_STATUSES },
});

/**
 * Orders of the customer currently on the table (newest first) plus what is still waiting to be billed.
 * A bill closes the table's session: only unbilled orders placed after the table's last billed order count.
 * (Generating a bill claims every billable order, so older unbilled ones are cancelled leftovers of a past customer.)
 */
export const getOrdersForTable = async (tableId: string): Promise<ITableOrders> => {
  const lastBilled = await OrderModel.findOne({ tableId, billId: { $ne: null } })
    .sort({ createdAt: -1 })
    .select('createdAt')
    .lean();
  const query: Record<string, unknown> = { tableId, billId: null };
  if (lastBilled) query.createdAt = { $gt: lastBilled.createdAt };

  const orders = await OrderModel.find(query).sort({ createdAt: -1 }).lean();
  const unbilled = orders.filter(
    (o) => !o.billId && !NON_BILLABLE_ORDER_STATUSES.includes(o.status as OrderStatus)
  );

  return {
    orders,
    unbilledCount: unbilled.length,
    unbilledAmount: unbilled.reduce((sum, o) => sum + o.totalAmount, 0),
  };
};

/**
 * Orders on a table that should go on the next bill (not billed, not cancelled), oldest first.
 */
export const getUnbilledBillableOrders = async (tableId: string): Promise<IOrder[]> => {
  return OrderModel.find(billableUnbilledQuery(tableId)).sort({ createdAt: 1 }).lean();
};

/** How many orders are waiting to be billed on each of these tables (one query; tables with none are absent). */
export const countUnbilledByTable = async (tableIds: string[]): Promise<Map<string, number>> => {
  if (tableIds.length === 0) return new Map();
  const rows = await OrderModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        tableId: { $in: tableIds.map((id) => new Types.ObjectId(id)) },
        billId: null,
        status: { $nin: NON_BILLABLE_ORDER_STATUSES },
      },
    },
    { $group: { _id: '$tableId', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), r.count]));
};

/**
 * Attach orders to a bill. Only still-unbilled orders are touched; returns how many were attached
 * so the caller can detect a concurrent bill.
 */
export const markOrdersBilled = async (orderIds: string[], billId: string): Promise<number> => {
  const result = await OrderModel.updateMany(
    { _id: { $in: orderIds }, billId: null },
    { billId }
  );
  return result.modifiedCount;
};

/**
 * When a table is billed, attach its unbilled cancelled / not-delivered orders to the same bill so they
 * close with that customer's session instead of showing up for the next customer. They are not charged.
 */
export const closeNonBillableOrders = async (tableId: string, billId: string, upTo: Date): Promise<void> => {
  await OrderModel.updateMany(
    { tableId, billId: null, status: { $in: NON_BILLABLE_ORDER_STATUSES }, createdAt: { $lte: upTo } },
    { billId }
  );
};

/**
 * Every order closed by a bill (charged and not-charged), newest first — a billed customer's order history.
 */
export const getOrdersByBillId = async (billId: string): Promise<IOrder[]> => {
  return OrderModel.find({ billId }).sort({ createdAt: -1 }).lean();
};

/**
 * Detach all orders from a bill (rollback when bill generation fails).
 */
export const unmarkOrdersBilled = async (billId: string): Promise<void> => {
  await OrderModel.updateMany({ billId }, { billId: null });
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

  // A billed order is already on a customer's bill — it can't be cancelled afterwards
  if (NON_BILLABLE_ORDER_STATUSES.includes(newStatus)) {
    if (order.billId) {
      throw createAppError(ORDER_MESSAGES.ALREADY_BILLED, 409);
    }
    // Conditional update so a bill generated in between still wins
    const updated = await OrderModel.findOneAndUpdate(
      { _id: orderId, billId: null },
      { status: newStatus },
      { new: true }
    ).lean();
    if (!updated) {
      throw createAppError(ORDER_MESSAGES.ALREADY_BILLED, 409);
    }
    return updated;
  }

  return OrderModel.findByIdAndUpdate(
    orderId,
    { status: newStatus },
    { new: true }
  ).lean();
};

/**
 * Owner/waiter edits an order's items (and optionally its instructions) before it is billed.
 * Cancelled / not-delivered orders can't be edited. The update is conditional, so a bill generated
 * in between wins and the edit is rejected instead of changing a billed order.
 */
export const updateOrderItems = async (orderId: string, input: IUpdateOrderItemsInput): Promise<IOrder> => {
  const order = await OrderModel.findById(orderId).lean();
  if (!order) {
    throw createAppError(ERROR_MESSAGES.ORDER_NOT_FOUND, 404);
  }
  if (order.billId) {
    throw createAppError(ORDER_MESSAGES.EDIT_BILLED, 409);
  }
  if (NON_BILLABLE_ORDER_STATUSES.includes(order.status as OrderStatus)) {
    throw createAppError(ORDER_MESSAGES.EDIT_CLOSED, 409);
  }

  const items = await snapshotItems(order.restaurantId.toString(), input.items, order.items);
  const update: Record<string, unknown> = {
    items,
    totalAmount: sumItems(items),
    editedBy: { ...input.editedBy, at: new Date() },
  };
  if (input.specialInstructions !== undefined) update.specialInstructions = input.specialInstructions;

  const updated = await OrderModel.findOneAndUpdate(
    { _id: orderId, billId: null, status: { $nin: NON_BILLABLE_ORDER_STATUSES } },
    update,
    { new: true, runValidators: true }
  ).lean();
  if (!updated) {
    throw createAppError(ORDER_MESSAGES.EDIT_BILLED, 409);
  }
  return updated;
};

/**
 * Order totals for a restaurant (platform overview). Revenue counts delivered orders only.
 */
export const getOrderSummaryByRestaurantId = async (
  restaurantId: string
): Promise<IOrderSummary> => {
  const [summary] = await OrderModel.aggregate<IOrderSummary>([
    { $match: { restaurantId: new Types.ObjectId(restaurantId) } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, 1, 0] },
        },
        deliveredRevenue: {
          $sum: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, '$totalAmount', 0] },
        },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
    { $project: { _id: 0 } },
  ]);

  return summary ?? { totalOrders: 0, deliveredOrders: 0, deliveredRevenue: 0, lastOrderAt: null };
};
