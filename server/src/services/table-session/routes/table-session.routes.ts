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
  addToCartSchema,
  setCartQuantitySchema,
  placeCartOrderSchema,
  clearAlertSchema,
} from '../validators/table-session.validator';
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

// POST /table-session/cart/add/:sessionId  { dishId, quantity, notes? }
router.post(
  '/cart/add/:sessionId',
  requireCustomer,
  validateParams(sessionIdParamSchema),
  validateBody(addToCartSchema),
  CustomerController.addToCart
);

// PATCH /table-session/cart/setQuantity/:sessionId  { itemId, quantity }
router.patch(
  '/cart/setQuantity/:sessionId',
  requireCustomer,
  validateParams(sessionIdParamSchema),
  validateBody(setCartQuantitySchema),
  CustomerController.setCartQuantity
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
