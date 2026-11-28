import { MESSAGES } from '../constants';
import type { ITableSession } from '../types';
import { timeOf } from '../utils/format.util';
import BillCard from './BillCard';
import OrderList from './OrderList';

interface Props {
  session: ITableSession;
  busy: boolean;
  /** Seconds before the table may ask again (server-enforced 5-minute gap). */
  billCooldown: number;
  waiterCooldown: number;
  onRequestBill: () => void;
  onCallWaiter: () => void;
}

const label = (done: string, at: string | null, cooldown: number, idle: string): string => {
  if (cooldown > 0) return `${done} · ${MESSAGES.ASK_AGAIN_IN(cooldown)}`;
  return at ? `${done} · ${timeOf(at)}` : idle;
};

/** Orders so far, the running bill, and buttons to ask for the bill / a waiter. */
const OrdersTab = ({ session, busy, billCooldown, waiterCooldown, onRequestBill, onCallWaiter }: Props) => (
  <>
    <div className="alert-actions">
      <button
        className="btn-secondary"
        disabled={busy || billCooldown > 0 || session.orders.length === 0}
        onClick={onRequestBill}
      >
        {label(MESSAGES.BILL_REQUESTED, session.billRequestedAt, billCooldown, MESSAGES.BTN_REQUEST_BILL)}
      </button>
      <button className="btn-secondary" disabled={busy || waiterCooldown > 0} onClick={onCallWaiter}>
        {label(MESSAGES.WAITER_CALLED, session.waiterCalledAt, waiterCooldown, MESSAGES.BTN_CALL_WAITER)}
      </button>
    </div>
    <OrderList orders={session.orders} />
    <BillCard session={session} />
  </>
);

export default OrdersTab;
