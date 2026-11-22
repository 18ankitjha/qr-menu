import { MESSAGES } from '../constants';
import type { ITableSession } from '../types';
import BillCard from './BillCard';
import OrderList from './OrderList';

interface Props {
  session: ITableSession;
  busy: boolean;
  onStartNew: () => void;
}

/** The table was billed (or cleared by staff): show the bill and what was ordered; a new visit starts fresh. */
const ClosedSession = ({ session, busy, onStartNew }: Props) => (
  <>
    <div className="closed-banner">
      <h2>{session.closedReason === 'BILLED' ? MESSAGES.CLOSED_BILLED : MESSAGES.CLOSED_OTHER}</h2>
      <button className="btn-primary" disabled={busy} onClick={onStartNew}>
        {MESSAGES.BTN_NEW_ORDER}
      </button>
    </div>
    <BillCard session={session} />
    {session.orders.length > 0 && <OrderList orders={session.orders} />}
  </>
);

export default ClosedSession;
