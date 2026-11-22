import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import { gpsMiddleware } from '../middlewares/gps.middleware';
import {
  placeOrderSchema,
  updateOrderStatusSchema,
  orderIdParamSchema,
  tableIdParamSchema,
  restaurantIdParamSchema,
} from '../validators/order.validator';
import * as OrderController from '../controllers/order.controller';

const router = Router();

// ---- Customer routes (no auth) ----

// POST /order/place — GPS validated
router.post(
  '/place',
  validateBody(placeOrderSchema),
  gpsMiddleware,
  OrderController.placeOrder
);

// GET /order/getStatus/:orderId
router.get(
  '/getStatus/:orderId',
  validateParams(orderIdParamSchema),
  OrderController.getOrderStatus
);

// GET /order/getActiveByTable/:tableId
router.get(
  '/getActiveByTable/:tableId',
  validateParams(tableIdParamSchema),
  OrderController.getActiveByTable
);

// ---- Kitchen route (no auth, scoped by restaurantId) ----

// GET /order/getKitchenOrders/:restaurantId
router.get(
  '/getKitchenOrders/:restaurantId',
  validateParams(restaurantIdParamSchema),
  OrderController.getKitchenOrders
);

// ---- Admin routes (auth required) ----

// GET /order/getAll/:restaurantId
router.get(
  '/getAll/:restaurantId',
  authMiddleware,
  validateParams(restaurantIdParamSchema),
  OrderController.getAllOrders
);

// PATCH /order/setStatus/:orderId
router.patch(
  '/setStatus/:orderId',
  authMiddleware,
  validateParams(orderIdParamSchema),
  validateBody(updateOrderStatusSchema),
  OrderController.setStatus
);

export default router;
