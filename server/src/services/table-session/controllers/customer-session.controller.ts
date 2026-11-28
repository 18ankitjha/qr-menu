import { Request, Response } from 'express';
import { ERROR_MESSAGES } from '../../../config/constants';
import { sendSuccess } from '../../../utils/response.util';
import { asyncHandler, createAppError } from '../../../middlewares/error.middleware';
import { OrderPublisher, TablePublisher } from '../../realtime';
import { CustomerDM } from '../../auth';
import { MenuDM, PublicMenuDM } from '../../menu';
import { RestaurantDM } from '../../restaurant';
import { StaffDM } from '../../staff';
import { ITable } from '../../table';
import * as TableSessionDM from '../dm/table-session.dm';
import { IDiner, ITableRef, ITableSession } from '../interfaces/table-session.interface';
import { AlertAudience, TABLE_SESSION_MESSAGES, TableAlertType } from '../constants/table-session.constants';
import { assertNearRestaurant } from '../utils/proximity.util';
import { toDinerView } from '../utils/session-view.util';

// ============================================================
// Customer Session Controller — what a diner's phone calls after scanning a table QR
// ============================================================

const sessionId = (req: Request): string => req.params.sessionId as string;

const dinerOf = (req: Request): IDiner => ({ customerId: req.customer!.customerId, name: req.customer!.name });

const sendView = async (res: Response, session: ITableSession, customerId: string, message: string, status = 200) => {
  const orders = await TableSessionDM.getSessionOrders(session);
  sendSuccess(res, toDinerView(session, orders, customerId), message, status);
};

const menuForTable = async (table: ITable) => ({
  ...(await PublicMenuDM.getPublicMenu(table.restaurantId.toString())),
  table: { _id: table._id.toString(), tableNumber: table.tableNumber, label: table.label },
});

/** GET /table-session/resolve/t/:qrToken — public: the menu + which table this QR is for (browse before login). */
export const resolveByToken = asyncHandler(async (req: Request, res: Response) => {
  const table = await TableSessionDM.resolveTable({ qrToken: req.params.qrToken as string });
  sendSuccess(res, await menuForTable(table), TABLE_SESSION_MESSAGES.MENU_FETCHED);
});

/** GET /table-session/resolve/:restaurantId/:tableId — public, QR codes printed before tokens. */
export const resolveLegacy = asyncHandler(async (req: Request, res: Response) => {
  const table = await TableSessionDM.resolveTable({
    restaurantId: req.params.restaurantId as string,
    tableId: req.params.tableId as string,
  });
  sendSuccess(res, await menuForTable(table), TABLE_SESSION_MESSAGES.MENU_FETCHED);
});

/** POST /table-session/join — signed-in diner sits at the table (joins its open session or opens one). */
export const join = asyncHandler(async (req: Request, res: Response) => {
  const { gpsCoordinates, ...ref } = req.body as ITableRef & { gpsCoordinates?: { latitude: number; longitude: number } };
  const table = await TableSessionDM.resolveTable(ref);

  const restaurant = await RestaurantDM.getRestaurantById(table.restaurantId.toString());
  if (!restaurant) throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  if (!RestaurantDM.isRestaurantOperational(restaurant)) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_OPERATIONAL, 403);
  }
  assertNearRestaurant(restaurant, gpsCoordinates);

  const customer = await CustomerDM.getCustomerById(req.customer!.customerId);
  const diner: IDiner = { ...dinerOf(req), profilePicture: customer?.profilePicture };
  const session = await TableSessionDM.joinTable(table, diner);

  TablePublisher.tableChanged(table.restaurantId.toString(), table._id.toString());
  await sendView(res, session, diner.customerId, TABLE_SESSION_MESSAGES.JOINED);
});

/** GET /table-session/get/:sessionId — the diner's table: members, shared cart, orders. */
export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.customer!.customerId;
  const session = await TableSessionDM.getSessionForMember(sessionId(req), customerId);
  await sendView(res, session, customerId, TABLE_SESSION_MESSAGES.SESSION_FETCHED);
});

const afterCartChange = async (req: Request, res: Response) => {
  const customerId = req.customer!.customerId;
  const session = await TableSessionDM.getSessionForMember(sessionId(req), customerId);
  TablePublisher.cartChanged(session.tableId.toString());
  await sendView(res, session, customerId, TABLE_SESSION_MESSAGES.CART_UPDATED);
};

/** "View only" menus (owner turned customer ordering off): diners can browse and call a waiter, not order. */
const assertCustomerOrderingOn = async (req: Request): Promise<void> => {
  const session = await TableSessionDM.getSessionForMember(sessionId(req), req.customer!.customerId);
  if (!(await MenuDM.isCustomerOrderingEnabled(session.restaurantId.toString()))) {
    throw createAppError(TABLE_SESSION_MESSAGES.ORDERING_DISABLED, 403);
  }
};

/** POST /table-session/cart/add/:sessionId — add a dish to the shared cart. */
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerOrderingOn(req);
  await TableSessionDM.addToCart(sessionId(req), dinerOf(req), req.body);
  await afterCartChange(req, res);
});

/** PATCH /table-session/cart/setQuantity/:sessionId — change (0 = remove) any line of the shared cart. */
export const setCartQuantity = asyncHandler(async (req: Request, res: Response) => {
  await TableSessionDM.setCartLineQuantity(sessionId(req), dinerOf(req), req.body.itemId, req.body.quantity);
  await afterCartChange(req, res);
});

/** PUT /table-session/cart/setMine/:sessionId — the diner's menu-page picks, sent in one call. */
export const setMyCart = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerOrderingOn(req);
  await TableSessionDM.setMyCartQuantities(sessionId(req), dinerOf(req), req.body.items);
  await afterCartChange(req, res);
});

/** POST /table-session/placeOrder/:sessionId — send the shared cart (at `cartVersion`) to the kitchen. */
export const placeOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerOrderingOn(req);
  const diner = dinerOf(req);
  const order = await TableSessionDM.placeCartOrder(
    sessionId(req),
    diner,
    req.body.cartVersion,
    req.body.specialInstructions
  );
  OrderPublisher.orderPlaced(order);

  const session = await TableSessionDM.getSessionForMember(sessionId(req), diner.customerId);
  await sendView(res, session, diner.customerId, TABLE_SESSION_MESSAGES.ORDER_PLACED, 201);
});

const raise = (type: TableAlertType, message: string) =>
  asyncHandler(async (req: Request, res: Response) => {
    const diner = dinerOf(req);
    const session = await TableSessionDM.raiseAlert(sessionId(req), diner, type);
    const restaurantId = session.restaurantId.toString();
    const activeWaiters = await StaffDM.countActiveStaff(restaurantId);
    TablePublisher.tableAlert(restaurantId, {
      type,
      notify: activeWaiters > 0 ? AlertAudience.WAITERS : AlertAudience.OWNER,
      sessionId: session._id.toString(),
      tableId: session.tableId.toString(),
      tableNumber: session.tableNumber,
      by: diner.name,
      at: new Date(),
    });
    await sendView(res, session, diner.customerId, message);
  });

/** POST /table-session/requestBill/:sessionId */
export const requestBill = raise(TableAlertType.BILL, TABLE_SESSION_MESSAGES.BILL_REQUESTED);

/** POST /table-session/callWaiter/:sessionId */
export const callWaiter = raise(TableAlertType.WAITER, TABLE_SESSION_MESSAGES.WAITER_CALLED);
