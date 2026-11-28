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
  onRequestBill: () => void;
}

const billLabel = (at: string | null, cooldown: number): string => {
  if (cooldown > 0) return `${MESSAGES.BILL_REQUESTED} · ${MESSAGES.ASK_AGAIN_IN(cooldown)}`;
  return at ? `${MESSAGES.BILL_REQUESTED} · ${timeOf(at)}` : MESSAGES.BTN_REQUEST_BILL;
};

/** Orders so far, the running bill, and a button to ask for the bill (Call waiter is in the header). */
const OrdersTab = ({ session, busy, billCooldown, onRequestBill }: Props) => (
  <>
    <OrderList orders={session.orders} />
    <BillCard session={session} />
    <div className="alert-actions">
      <button
        className="btn-secondary"
        disabled={busy || billCooldown > 0 || session.orders.length === 0}
        onClick={onRequestBill}
      >
        {billLabel(session.billRequestedAt, billCooldown)}
      </button>
    </div>
  </>
);

export default OrdersTab;
