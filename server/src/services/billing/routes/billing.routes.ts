import { Router, Request } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  ALL_RESTAURANT_ROLES,
  fromBody,
  fromParam,
  requireRestaurantAccess,
  RestaurantIdResolver,
} from '../../auth/middlewares/restaurant-access.middleware';
import { validateBody, validateParams, validateQuery } from '../../../middlewares/validate.middleware';
import {
  billIdParamSchema,
  generateTableBillSchema,
  getBillsQuerySchema,
  markPaidSchema,
  orderIdParamSchema,
  restaurantIdParamSchema,
  tableIdParamSchema,
} from '../validators/billing.validator';
import { TableDM } from '../../table';
import { OrderDM } from '../../order';
import * as BillDM from '../dm/bill.dm';
import * as BillingController from '../controllers/billing.controller';
import customerBillingRoutes from './customer-billing.routes';

// ============================================================
// Billing Routes — /api/v1/billing  (owner or waiter; /customer for diners)
// ============================================================

const router = Router();

const restaurantOfTable =
  (get: (req: Request) => string): RestaurantIdResolver =>
  async (req) =>
    (await TableDM.getTableById(get(req)))?.restaurantId.toString();

const restaurantOfBill: RestaurantIdResolver = async (req) =>
  (await BillDM.getBillById(req.params.billId as string))?.restaurantId.toString();

const restaurantOfOrder: RestaurantIdResolver = async (req) =>
  (await OrderDM.getOrderById(req.params.orderId as string))?.restaurantId.toString();

const canBill = (resolver: RestaurantIdResolver) =>
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, resolver);

// Diners (Google sign-in) see their own table's bill — before the staff-only auth below
router.use('/customer', customerBillingRoutes);

router.use(requireAuth);

// GET /billing/previewTableBill/:tableId
router.get(
  '/previewTableBill/:tableId',
  validateParams(tableIdParamSchema),
  canBill(restaurantOfTable((req) => req.params.tableId as string)),
  BillingController.previewTableBill
);

// POST /billing/generateTableBill
router.post(
  '/generateTableBill',
  validateBody(generateTableBillSchema),
  canBill(restaurantOfTable((req) => req.body.tableId)),
  BillingController.generateTableBill
);

// GET /billing/getAll/:restaurantId?status=&tableId=&from=&to=
router.get(
  '/getAll/:restaurantId',
  validateParams(restaurantIdParamSchema),
  validateQuery(getBillsQuerySchema),
  canBill(fromParam('restaurantId')),
  BillingController.getAllBills
);

// GET /billing/get/:billId
router.get(
  '/get/:billId',
  validateParams(billIdParamSchema),
  canBill(restaurantOfBill),
  BillingController.getBill
);

// GET /billing/getPdf/:billId
router.get(
  '/getPdf/:billId',
  validateParams(billIdParamSchema),
  canBill(restaurantOfBill),
  BillingController.getBillPdf
);

// PATCH /billing/markPaid/:billId
router.patch(
  '/markPaid/:billId',
  validateParams(billIdParamSchema),
  validateBody(markPaidSchema),
  canBill(restaurantOfBill),
  BillingController.markPaid
);

// GET /billing/getOrderPdf/:orderId
router.get(
  '/getOrderPdf/:orderId',
  validateParams(orderIdParamSchema),
  canBill(restaurantOfOrder),
  BillingController.getOrderPdf
);

export default router;
