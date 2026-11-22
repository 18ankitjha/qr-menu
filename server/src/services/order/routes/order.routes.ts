import { Router, Request } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  ALL_RESTAURANT_ROLES,
  fromBody,
  fromParam,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import { validateBody, validateParams, validateQuery } from '../../../middlewares/validate.middleware';
import {
  staffPlaceOrderSchema,
  updateOrderStatusSchema,
  updateOrderItemsSchema,
  orderIdParamSchema,
  tableIdParamSchema,
  restaurantIdParamSchema,
  getAllOrdersQuerySchema,
} from '../validators/order.validator';
import { TableDM } from '../../table';
import * as OrderDM from '../dm/order.dm';
import * as OrderController from '../controllers/order.controller';

// ============================================================
// Order Routes — /api/v1/order
// ============================================================

const router = Router();

const restaurantOfTable = async (req: Request) =>
  (await TableDM.getTableById(req.params.tableId as string))?.restaurantId.toString();

const restaurantOfOrder = async (req: Request) =>
  (await OrderDM.getOrderById(req.params.orderId as string))?.restaurantId.toString();

// Customers order through /table-session (Google sign-in + shared table cart); there is no anonymous order route.

// ---- Kitchen route (no auth, scoped by restaurantId) ----

// GET /order/getKitchenOrders/:restaurantId
router.get(
  '/getKitchenOrders/:restaurantId',
  validateParams(restaurantIdParamSchema),
  OrderController.getKitchenOrders
);

// ---- Restaurant routes (owner or waiter) ----

// POST /order/placeByStaff — waiter/owner takes an order for a table
router.post(
  '/placeByStaff',
  requireAuth,
  validateBody(staffPlaceOrderSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, fromBody('restaurantId')),
  OrderController.placeOrderByStaff
);

// GET /order/getAll/:restaurantId?tableId=&status=
router.get(
  '/getAll/:restaurantId',
  requireAuth,
  validateParams(restaurantIdParamSchema),
  validateQuery(getAllOrdersQuerySchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, fromParam('restaurantId')),
  OrderController.getAllOrders
);

// GET /order/getByTable/:tableId
router.get(
  '/getByTable/:tableId',
  requireAuth,
  validateParams(tableIdParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, restaurantOfTable),
  OrderController.getByTable
);

// PATCH /order/setStatus/:orderId
router.patch(
  '/setStatus/:orderId',
  requireAuth,
  validateParams(orderIdParamSchema),
  validateBody(updateOrderStatusSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, restaurantOfOrder),
  OrderController.setStatus
);

// PATCH /order/updateItems/:orderId — owner/waiter edits an unbilled order
router.patch(
  '/updateItems/:orderId',
  requireAuth,
  validateParams(orderIdParamSchema),
  validateBody(updateOrderItemsSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, restaurantOfOrder),
  OrderController.updateItems
);

export default router;
