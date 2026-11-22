import { MESSAGES } from '../constants';
import type { ITableSession } from '../types';
import { timeOf } from '../utils/format.util';
import BillCard from './BillCard';
import OrderList from './OrderList';

interface Props {
  session: ITableSession;
  busy: boolean;
  onRequestBill: () => void;
  onCallWaiter: () => void;
}

/** Orders so far, the running bill, and buttons to ask for the bill / a waiter. */
const OrdersTab = ({ session, busy, onRequestBill, onCallWaiter }: Props) => (
  <>
    <div className="alert-actions">
      <button className="btn-secondary" disabled={busy || session.orders.length === 0} onClick={onRequestBill}>
        {session.billRequestedAt
          ? `${MESSAGES.BILL_REQUESTED} · ${timeOf(session.billRequestedAt)}`
          : MESSAGES.BTN_REQUEST_BILL}
      </button>
      <button className="btn-secondary" disabled={busy} onClick={onCallWaiter}>
        {session.waiterCalledAt ? `${MESSAGES.WAITER_CALLED} · ${timeOf(session.waiterCalledAt)}` : MESSAGES.BTN_CALL_WAITER}
      </button>
    </div>
    <OrderList orders={session.orders} />
    <BillCard session={session} />
  </>
);

export default OrdersTab;
