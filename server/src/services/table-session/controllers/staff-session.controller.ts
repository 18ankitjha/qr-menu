import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { TablePublisher } from '../../realtime';
import { LiveCartDM } from '../../live-cart';
import * as TableSessionDM from '../dm/table-session.dm';
import { OrderDM } from '../../order';
import { TABLE_SESSION_MESSAGES } from '../constants/table-session.constants';
import { toStaffView } from '../utils/session-view.util';

// ============================================================
// Staff Session Controller — owners / waiters see occupied tables and diners' alerts
// ============================================================

/** GET /table-session/getOpen/:restaurantId — tables with diners right now (alerts first). */
export const getOpen = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await TableSessionDM.getOpenSessionsForRestaurant(req.params.restaurantId as string);
  const unbilled = await OrderDM.countUnbilledByTable(sessions.map((s) => s.tableId.toString()));
  sendSuccess(
    res,
    sessions.map((s) => toStaffView(s, unbilled.get(s.tableId.toString()) ?? 0)),
    TABLE_SESSION_MESSAGES.OPEN_SESSIONS_FETCHED
  );
});

/** PATCH /table-session/clearAlert/:sessionId — dismiss "bill requested" / "waiter called". */
export const clearAlert = asyncHandler(async (req: Request, res: Response) => {
  const session = await TableSessionDM.clearAlert(req.params.sessionId as string, req.body.type);
  TablePublisher.tableChanged(session.restaurantId.toString(), session.tableId.toString());
  sendSuccess(res, toStaffView(session), TABLE_SESSION_MESSAGES.ALERT_CLEARED);
});

/** POST /table-session/close/:sessionId — clear a table whose diners left with nothing to bill. */
export const close = asyncHandler(async (req: Request, res: Response) => {
  const session = await TableSessionDM.closeByStaff(req.params.sessionId as string);
  await LiveCartDM.drop(session._id.toString());
  TablePublisher.tableChanged(session.restaurantId.toString(), session.tableId.toString());
  sendSuccess(res, toStaffView(session), TABLE_SESSION_MESSAGES.SESSION_CLOSED_BY_STAFF);
});
