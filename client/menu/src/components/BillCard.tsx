import { useEffect, useState } from 'react';
import * as TableSessionApi from '../api/table-session.api';
import { API_ENDPOINTS, MESSAGES } from '../constants';
import type { IBillTotals, IDinerBill, ITableSession } from '../types';
import { money } from '../utils/format.util';

interface Props {
  session: ITableSession;
}

const Totals = ({ bill }: { bill: IBillTotals }) => (
  <>
    {bill.items.map((item, i) => (
      <div key={i} className="bill-row">
        <span>
          {item.dishName} × {item.quantity}
        </span>
        <span>{money(item.amount)}</span>
      </div>
    ))}
    <div className="bill-row bill-row--sub">
      <span>Subtotal</span>
      <span>{money(bill.subtotal)}</span>
    </div>
    {bill.serviceChargeAmount > 0 && (
      <div className="bill-row bill-row--sub">
        <span>Service charge ({bill.serviceChargePercent}%)</span>
        <span>{money(bill.serviceChargeAmount)}</span>
      </div>
    )}
    {bill.gstAmount > 0 && (
      <div className="bill-row bill-row--sub">
        <span>GST ({bill.gstPercent}%)</span>
        <span>{money(bill.gstAmount)}</span>
      </div>
    )}
    <div className="bill-row bill-row--total">
      <span>Total</span>
      <span>{money(bill.totalAmount)}</span>
    </div>
  </>
);

/** Running bill while eating; the real bill (with PDF) once staff generate it. Refetched on every table update. */
const BillCard = ({ session }: Props) => {
  const [bill, setBill] = useState<IDinerBill | null>(null);

  useEffect(() => {
    let cancelled = false;
    TableSessionApi.getBill(session._id)
      .then((b) => !cancelled && setBill(b))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (bill?.final) {
    const final = bill.final;
    return (
      <section className="panel bill">
        <div className="bill-head">
          <h2>{MESSAGES.FINAL_BILL}</h2>
          <span className="bill-number">{final.billNumber}</span>
        </div>
        <Totals bill={final} />
        <p className={`bill-status ${final.status === 'PAID' ? 'bill-status--paid' : ''}`}>
          {final.status === 'PAID' ? MESSAGES.PAID : MESSAGES.UNPAID}
        </p>
        <a className="btn-secondary" href={API_ENDPOINTS.BILL_PDF(session._id)}>
          {MESSAGES.DOWNLOAD_PDF}
        </a>
      </section>
    );
  }

  if (bill?.preview && bill.preview.items.length > 0) {
    return (
      <section className="panel bill">
        <div className="bill-head">
          <h2>{MESSAGES.RUNNING_BILL}</h2>
        </div>
        <Totals bill={bill.preview} />
        {bill.preview.pendingOrders > 0 && (
          <p className="panel-note">{MESSAGES.PENDING_ORDERS(bill.preview.pendingOrders)}</p>
        )}
      </section>
    );
  }

  return null;
};

export default BillCard;
