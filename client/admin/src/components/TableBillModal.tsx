import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOrdersByTable, previewTableBill, generateTableBill, getBills, getBillPdfUrl, getErrorMessage } from '../services/api';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, MESSAGES } from '../constants';
import type { IBill, IBillPreview, IOrder, ITableOrders } from '../types';
import { formatMoney } from '../utils/money';
import { canEditOrder } from '../utils/order';
import { BillBreakdown } from './BillBreakdown';
import { EditOrderModal } from './EditOrderModal';
import { PayButtons } from './PayButtons';
import './Billing.css';

// ============================================================
// Table Bill Modal — orders on one table + bill preview / generation.
// Used from both the Tables page and the Orders page.
// ============================================================

const TEXT = {
  TITLE: (n: number, label?: string) => `Table #${n}${label ? ` · ${label}` : ''}`,
  ORDERS: "Current customer's orders",
  ORDERS_HINT: "Orders placed since this table's last bill. Earlier customers are under Previous bills.",
  NO_ORDERS: 'No open orders — the table is free.',
  PREVIOUS_BILLS: (n: number) => `Previous bills (${n})`,
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  CUSTOMERS: (names: string) => `👤 ${names}`,
  BILLED: 'Billed',
  UNBILLED_SUMMARY: (count: number, amount: number) => `${count} unbilled order${count !== 1 ? 's' : ''} · ₹${amount}`,
  BILL_PREVIEW: 'Bill preview (unbilled orders)',
  NOTHING_TO_BILL: 'Nothing to bill for the current customer.',
  PENDING_WARNING: (n: number) => `${n} order${n !== 1 ? 's are' : ' is'} still being prepared. They will be included in this bill.`,
  CONFIRM_PENDING: 'Some orders are not delivered yet. Generate the bill anyway?',
  GENERATE: 'Generate Bill',
  GENERATING: 'Generating...',
  GENERATED: (no: string) => `Bill ${no}`,
  OPEN_PDF: 'Open PDF',
  COLLECT_HINT: 'Collect payment — tap how the customer paid:',
  COLLECT_LATER: 'Collect later',
  PAID_VIA: (mode: string) => `Paid via ${mode}. Table is free for the next customer.`,
  DONE: 'Done',
  UNPAID_ALERT: (n: number) => `${n} earlier bill${n !== 1 ? 's' : ''} on this table still unpaid`,
  CLOSE: 'Close',
  EDIT: 'Edit',
};

interface TableBillModalProps {
  tableId: string;
  tableNumber: number;
  tableLabel?: string;
  onClose: () => void;
  /** Called after a bill is generated so the parent can refresh. */
  onBillGenerated?: (bill: IBill) => void;
}

const TableBillModal = ({ tableId, tableNumber, tableLabel, onClose, onBillGenerated }: TableBillModalProps) => {
  const { restaurant } = useAuth();
  const [pastBills, setPastBills] = useState<IBill[]>([]);
  const [showPastBills, setShowPastBills] = useState(false);
  const [tableOrders, setTableOrders] = useState<ITableOrders | null>(null);
  const [preview, setPreview] = useState<IBillPreview | null>(null);
  const [generatedBill, setGeneratedBill] = useState<IBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<IOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersRes, previewRes] = await Promise.all([getOrdersByTable(tableId), previewTableBill(tableId)]);
      setTableOrders(ordersRes.data.data);
      setPreview(previewRes.data.data);
      if (restaurant) {
        const billsRes = await getBills(restaurant._id, { tableId });
        setPastBills(billsRes.data.data);
      }
    } catch (err) {
      setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setLoading(false);
    }
  }, [tableId, restaurant]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    if (preview && preview.pendingOrders > 0 && !confirm(TEXT.CONFIRM_PENDING)) return;
    setGenerating(true);
    setError('');
    try {
      const { data } = await generateTableBill(tableId);
      setGeneratedBill(data.data);
      onBillGenerated?.(data.data);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
      await load();
    } finally {
      setGenerating(false);
    }
  };

  const handlePaid = (paid: IBill) => {
    setGeneratedBill((b) => (b && b._id === paid._id ? paid : b));
    setPastBills((bills) => bills.map((b) => (b._id === paid._id ? paid : b)));
    onBillGenerated?.(paid);
  };

  const hasItemsToBill = !!preview && preview.items.length > 0;
  const unpaidPastBills = pastBills.filter((b) => b.status !== 'PAID' && b._id !== generatedBill?._id);

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide bill-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bill-modal-header">
          <h2 className="card-title">{TEXT.TITLE(tableNumber, tableLabel)}</h2>
          <button className="btn-icon" onClick={onClose} title={TEXT.CLOSE}>✕</button>
        </div>

        {error && <div className="form-message form-message--error">{error}</div>}

        {generatedBill && (
          <div className={`bill-collect ${generatedBill.status === 'PAID' ? 'bill-collect--paid' : ''}`}>
            <div className="bill-collect-head">
              <span>{TEXT.GENERATED(generatedBill.billNumber)}</span>
              <button className="btn-secondary btn-sm" onClick={() => window.open(getBillPdfUrl(generatedBill._id), '_blank')}>
                🧾 {TEXT.OPEN_PDF}
              </button>
            </div>
            <div className="bill-collect-amount">{formatMoney(generatedBill.totalAmount)}</div>
            {generatedBill.status === 'PAID' ? (
              <>
                <p className="bill-collect-done">✅ {TEXT.PAID_VIA(generatedBill.paymentMode ?? '')}</p>
                <button className="btn-primary" onClick={onClose}>{TEXT.DONE}</button>
              </>
            ) : (
              <>
                <p className="bill-muted">{TEXT.COLLECT_HINT}</p>
                <PayButtons bill={generatedBill} size="lg" onPaid={handlePaid} />
                <button className="btn-link" onClick={onClose}>{TEXT.COLLECT_LATER}</button>
              </>
            )}
          </div>
        )}

        {unpaidPastBills.length > 0 && (
          <div className="bill-warning bill-unpaid-list">
            <strong>⚠️ {TEXT.UNPAID_ALERT(unpaidPastBills.length)}</strong>
            {unpaidPastBills.map((bill) => (
              <div key={bill._id} className="bill-unpaid-row">
                <span>{bill.billNumber} · {formatMoney(bill.totalAmount)}</span>
                <PayButtons bill={bill} onPaid={handlePaid} />
              </div>
            ))}
          </div>
        )}

        {loading && !tableOrders ? (
          <p className="bill-muted">{MESSAGES.LOADING}</p>
        ) : (
          <>
            <h3 className="bill-section-title">{TEXT.ORDERS}</h3>
            {tableOrders && tableOrders.orders.length > 0 ? (
              <>
                <p className="bill-muted">{TEXT.UNBILLED_SUMMARY(tableOrders.unbilledCount, tableOrders.unbilledAmount)} · {TEXT.ORDERS_HINT}</p>
                <div className="bill-orders">
                  {tableOrders.orders.map((order) => (
                    <div key={order._id} className="bill-order-row">
                      <div className="bill-order-main">
                        <span className="bill-order-id">#{order._id.slice(-6)}</span>
                        <span className="bill-order-items">
                          {order.items.map((i) => `${i.quantity}× ${i.dishName}`).join(', ')}
                          {order.customerName && <> · {TEXT.CUSTOMERS(order.customerName)}</>}
                        </span>
                      </div>
                      <div className="bill-order-side">
                        <span>₹{order.totalAmount}</span>
                        <span className="order-status-badge" style={{ background: ORDER_STATUS_COLORS[order.status] }}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        {order.billId && <span className="bill-chip">{TEXT.BILLED}</span>}
                        {canEditOrder(order) && (
                          <button className="btn-secondary btn-sm" onClick={() => setEditing(order)}>
                            ✏️ {TEXT.EDIT}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="bill-muted">{TEXT.NO_ORDERS}</p>
            )}

            <h3 className="bill-section-title">{TEXT.BILL_PREVIEW}</h3>
            {hasItemsToBill && preview ? (
              <>
                {preview.pendingOrders > 0 && (
                  <div className="bill-warning">⚠️ {TEXT.PENDING_WARNING(preview.pendingOrders)}</div>
                )}
                <BillBreakdown totals={preview} />
                <div className="btn-row" style={{ marginTop: 16 }}>
                  <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
                    {generating ? TEXT.GENERATING : `🧾 ${TEXT.GENERATE} · ${formatMoney(preview.totalAmount)}`}
                  </button>
                </div>
              </>
            ) : (
              <p className="bill-muted">{TEXT.NOTHING_TO_BILL}</p>
            )}

            {pastBills.length > 0 && (
              <>
                <h3 className="bill-section-title" style={{ cursor: 'pointer' }} onClick={() => setShowPastBills((v) => !v)}>
                  {TEXT.PREVIOUS_BILLS(pastBills.length)} {showPastBills ? '▲' : '▼'}
                </h3>
                {showPastBills && (
                  <div className="bill-orders">
                    {pastBills.map((bill) => (
                      <div key={bill._id} className="bill-order-row">
                        <div className="bill-order-main">
                          <span className="bill-order-id">{bill.billNumber}</span>
                          <span className="bill-order-items">
                            {new Date(bill.createdAt).toLocaleString()} · {bill.orderIds.length} order{bill.orderIds.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="bill-order-side">
                          <span>{formatMoney(bill.totalAmount)}</span>
                          <span className={`bill-chip ${bill.status === 'PAID' ? '' : 'bill-chip--unpaid'}`}>
                            {bill.status === 'PAID' ? `${TEXT.PAID} · ${bill.paymentMode ?? ''}` : TEXT.UNPAID}
                          </span>
                          <button className="btn-secondary btn-sm" onClick={() => window.open(getBillPdfUrl(bill._id), '_blank')}>
                            🧾
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
    {editing && (
      <EditOrderModal
        order={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    )}
    </>
  );
};

export { TableBillModal };
