import { Router, Request } from 'express';
import { requireAuth, requireCustomer } from '../../auth/middlewares/auth.middleware';
import {
  ALL_RESTAURANT_ROLES,
  fromParam,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import { validateBody, validateParams } from '../../../middlewares/validate.middleware';
import {
  qrTokenParamSchema,
  legacyTableParamSchema,
  joinSessionSchema,
  sessionIdParamSchema,
  restaurantIdParamSchema,
  placeCartOrderSchema,
  clearAlertSchema,
} from '../validators/table-session.validator';
import { cartSyncSchema } from '../../live-cart';
import * as TableSessionDM from '../dm/table-session.dm';
import * as CustomerController from '../controllers/customer-session.controller';
import * as StaffController from '../controllers/staff-session.controller';

// ============================================================
// Table Session Routes — /api/v1/table-session
// A "table session" = the diners currently at one table: a shared live cart, their orders, and the bill.
// ============================================================

const router = Router();

const restaurantOfSession = async (req: Request) =>
  (await TableSessionDM.getSessionById(req.params.sessionId as string))?.restaurantId.toString();

// ---- Public: scanning a QR shows the menu before signing in ----

// GET /table-session/resolve/t/:qrToken
router.get('/resolve/t/:qrToken', validateParams(qrTokenParamSchema), CustomerController.resolveByToken);

// GET /table-session/resolve/:restaurantId/:tableId — QR codes printed before tokens
router.get('/resolve/:restaurantId/:tableId', validateParams(legacyTableParamSchema), CustomerController.resolveLegacy);

// ---- Diner (Google sign-in) ----

// POST /table-session/join  { qrToken | restaurantId+tableId, gpsCoordinates? }
router.post('/join', requireCustomer, validateBody(joinSessionSchema), CustomerController.join);

// GET /table-session/get/:sessionId
router.get('/get/:sessionId', requireCustomer, validateParams(sessionIdParamSchema), CustomerController.getSession);

// Cart taps travel over the socket (live-cart service: join_cart_room / cart_set). REST is used when the
// Cart tab opens, and as the fallback when the phone's socket is down.

// PUT /table-session/cart/sync/:sessionId  { changes: [{ key: "<memberKey>.<dishId>", quantity }] }
router.put(
  '/cart/sync/:sessionId',
  requireCustomer,
  validateParams(sessionIdParamSchema),
  validateBody(cartSyncSchema),
  CustomerController.syncCart
);

// POST /table-session/placeOrder/:sessionId  { cartVersion, specialInstructions? }
router.post(
  '/placeOrder/:sessionId',
  requireCustomer,
  validateParams(sessionIdParamSchema),
  validateBody(placeCartOrderSchema),
  CustomerController.placeOrder
);

// POST /table-session/requestBill/:sessionId
router.post('/requestBill/:sessionId', requireCustomer, validateParams(sessionIdParamSchema), CustomerController.requestBill);

// POST /table-session/callWaiter/:sessionId
router.post('/callWaiter/:sessionId', requireCustomer, validateParams(sessionIdParamSchema), CustomerController.callWaiter);

// ---- Restaurant staff (owner or waiter) ----

// GET /table-session/getOpen/:restaurantId
router.get(
  '/getOpen/:restaurantId',
  requireAuth,
  validateParams(restaurantIdParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, fromParam('restaurantId')),
  StaffController.getOpen
);

// PATCH /table-session/clearAlert/:sessionId  { type: BILL | WAITER }
router.patch(
  '/clearAlert/:sessionId',
  requireAuth,
  validateParams(sessionIdParamSchema),
  validateBody(clearAlertSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, restaurantOfSession),
  StaffController.clearAlert
);

// POST /table-session/close/:sessionId
router.post(
  '/close/:sessionId',
  requireAuth,
  validateParams(sessionIdParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, restaurantOfSession),
  StaffController.close
);

export default router;
