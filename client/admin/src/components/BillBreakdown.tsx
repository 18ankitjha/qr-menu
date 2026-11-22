import type { IBillTotals } from '../types';
import { formatMoney } from '../utils/money';
import './Billing.css';

/** Item lines + subtotal / service charge / GST / total. */
const BillBreakdown = ({ totals }: { totals: IBillTotals }) => (
  <div className="bill-breakdown">
    {totals.items.map((item) => (
      <div key={`${item.dishId}-${item.price}`} className="bill-line">
        <span>{item.quantity} × {item.dishName}</span>
        <span>{formatMoney(item.amount)}</span>
      </div>
    ))}
    <div className="bill-line bill-line--sub bill-line--divider">
      <span>Subtotal</span>
      <span>{formatMoney(totals.subtotal)}</span>
    </div>
    {totals.serviceChargePercent > 0 && (
      <div className="bill-line bill-line--sub">
        <span>Service charge ({totals.serviceChargePercent}%)</span>
        <span>{formatMoney(totals.serviceChargeAmount)}</span>
      </div>
    )}
    {totals.gstPercent > 0 && (
      <div className="bill-line bill-line--sub">
        <span>GST ({totals.gstPercent}%)</span>
        <span>{formatMoney(totals.gstAmount)}</span>
      </div>
    )}
    <div className="bill-line bill-line--total">
      <span>Total</span>
      <span>{formatMoney(totals.totalAmount)}</span>
    </div>
  </div>
);

export { BillBreakdown };
