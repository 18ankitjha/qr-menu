import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllOrders, getBills, setOrderStatus, getOrderPdfUrl, getBillPdfUrl, getErrorMessage } from '../services/api';
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUSES_IN_USE, MESSAGES } from '../constants';
import type { IBill, IOrder } from '../types';
import { formatMoney } from '../utils/money';
import './FormPage.css';
import './Orders.css';
import '../components/Billing.css';
import { TableBillModal } from '../components/TableBillModal';
import { TakeOrderModal } from '../components/TakeOrderModal';
import { TableAlertsBanner } from '../components/TableAlertsBanner';
import { EditOrderModal } from '../components/EditOrderModal';
import { PayButtons } from '../components/PayButtons';
import { canEditOrder, combineItems } from '../utils/order';
import { FALLBACK_POLL_MS, RESTAURANT_EVENTS, restaurantRoom, useLiveRefresh } from '../realtime';

/** Pushes that change the orders / bills on this page. */
const ORDER_PUSHES = [
  RESTAURANT_EVENTS.NEW_ORDER,
  RESTAURANT_EVENTS.ORDER_STATUS_UPDATED,
  RESTAURANT_EVENTS.BILL_UPDATED,
] as const;

// ============================================================
// Orders — current customers per table, and completed (billed) customers per bill
// ============================================================

const PAGE = {
  TITLE: 'Orders',
  SUBTITLE: 'Current → generate bill → Billed → mark paid → Completed.',
  NEW_ORDER: 'New Order',
  PLACED_BY: (name: string) => `by ${name}`,
  EDITED_BY: (name: string) => `edited by ${name}`,
  EDIT: 'Edit',
  NO_CURRENT: 'No open orders. Orders for a table appear here until its bill is generated.',
  NO_BILLED: 'No bills waiting for payment.',
  NO_COMPLETED: 'No paid bills yet.',
  NO_RESTAURANT: 'Register a restaurant first.',
  TAB_CURRENT: 'Current',
  TAB_BILLED: 'Billed',
  TAB_COMPLETED: 'Completed',
  FILTER_ALL: 'All',
  ITEM_SEPARATOR: ' × ',
  CURRENCY: '₹',
  STATUS_UPDATED: 'Order status updated!',
  TABLE_BILL: 'Orders & Bill',
  TABLE: (n: number) => `Table #${n}`,
  ORDER_COUNT: (n: number) => `${n} order${n !== 1 ? 's' : ''}`,
  CUSTOMERS: (names: string) => `👤 ${names}`,
  WALK_IN: '👤 Guest',
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  BILL_PDF: 'Bill PDF',
  NOT_CHARGED: 'not charged',
  MARK_PAID: 'Mark paid:',
  PAID_SUCCESS: (no: string, mode: string) => `Bill ${no} marked paid (${mode}) — moved to Completed.`,
} as const;

/** Same as the server: PLACED → DELIVERED | CANCELLED (older in-between statuses can be closed the same way). */
const CLOSE_ORDER = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];
const STATUS_TRANSITIONS: Record<string, string[]> = {
  [ORDER_STATUS.PLACED]: CLOSE_ORDER,
  [ORDER_STATUS.CONFIRMED]: CLOSE_ORDER,
  [ORDER_STATUS.COOKING]: CLOSE_ORDER,
  [ORDER_STATUS.READY]: CLOSE_ORDER,
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.CANNOT_DELIVER]: [],
};
// Full kitchen flow (paused):
// [PLACED]: [CONFIRMED, CANCELLED], [CONFIRMED]: [COOKING, CANCELLED],
// [COOKING]: [READY, CANNOT_DELIVER], [READY]: [DELIVERED, CANNOT_DELIVER]

const NOT_CHARGED_STATUSES: string[] = [ORDER_STATUS.CANCELLED, ORDER_STATUS.CANNOT_DELIVER];

type View = 'current' | 'billed' | 'completed';
const VIEWS: View[] = ['current', 'billed', 'completed'];

interface OrderGroup {
  key: string;
  tableId: string;
  tableNumber: number;
  orders: IOrder[];
  total: number;
  customers: string;
  lastActivity: number;
  bill?: IBill;
}

const customerNames = (orders: IOrder[]): string =>
  [...new Set(orders.map((o) => o.customerName?.trim()).filter(Boolean))].join(', ');

const buildGroups = (orders: IOrder[], keyOf: (o: IOrder) => string): OrderGroup[] => {
  const map = new Map<string, IOrder[]>();
  orders.forEach((o) => {
    const key = keyOf(o);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  });
  return Array.from(map.entries()).map(([key, groupOrders]) => ({
    key,
    tableId: groupOrders[0].tableId,
    tableNumber: groupOrders[0].tableNumber,
    orders: groupOrders,
    total: groupOrders
      .filter((o) => !NOT_CHARGED_STATUSES.includes(o.status))
      .reduce((s, o) => s + o.totalAmount, 0),
    customers: customerNames(groupOrders),
    lastActivity: Math.max(...groupOrders.map((o) => Date.parse(o.createdAt))),
  }));
};

const Orders = () => {
  const { restaurant } = useAuth();
  const [showTakeOrder, setShowTakeOrder] = useState(false);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [bills, setBills] = useState<IBill[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const view: View = VIEWS.includes(tabParam as View) ? (tabParam as View) : 'current';
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [billTable, setBillTable] = useState<{ tableId: string; tableNumber: number } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingOrder, setEditingOrder] = useState<IOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!restaurant) return;
    try {
      const [ordersRes, billsRes] = await Promise.all([getAllOrders(restaurant._id), getBills(restaurant._id)]);
      setOrders(ordersRes.data.data);
      setBills(billsRes.data.data);
    } catch { /* empty */ }
  }, [restaurant]);

  useLiveRefresh(fetchOrders, {
    room: restaurantRoom(restaurant?._id),
    events: ORDER_PUSHES,
    fallbackMs: FALLBACK_POLL_MS.ORDERS,
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await setOrderStatus(orderId, newStatus);
      await fetchOrders();
      setIsError(false);
      setMessage(PAGE.STATUS_UPDATED);
    } catch (err) {
      setIsError(true);
      setMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const switchView = (next: View) => {
    setSearchParams(next === 'current' ? {} : { tab: next }, { replace: true });
    setFilter('');
  };

  const openPdf = (url: string) => window.open(url, '_blank');

  // A bill closes a table's session: the current customer's orders are the unbilled ones placed
  // after the table's last billed order. Older unbilled ones are cancelled leftovers of a past customer.
  // Billed orders split by their bill: UNPAID → Billed tab, PAID → Completed tab.
  const { currentOrders, unpaidOrders, paidOrders } = useMemo(() => {
    const lastBilledAt = new Map<string, number>();
    orders.forEach((o) => {
      if (!o.billId) return;
      const t = Date.parse(o.createdAt);
      if (t > (lastBilledAt.get(o.tableId) ?? 0)) lastBilledAt.set(o.tableId, t);
    });
    const billStatus = new Map(bills.map((b) => [b._id, b.status]));
    const billed = orders.filter((o) => !!o.billId);
    return {
      currentOrders: orders.filter((o) => !o.billId && Date.parse(o.createdAt) > (lastBilledAt.get(o.tableId) ?? 0)),
      unpaidOrders: billed.filter((o) => billStatus.get(o.billId as string) === 'UNPAID'),
      paidOrders: billed.filter((o) => billStatus.get(o.billId as string) !== 'UNPAID'),
    };
  }, [orders, bills]);

  const viewOrders = view === 'current' ? currentOrders : view === 'billed' ? unpaidOrders : paidOrders;

  const groups = useMemo(() => {
    const filtered = filter ? viewOrders.filter((o) => o.status === filter) : viewOrders;
    if (view === 'current') {
      return buildGroups(filtered, (o) => o.tableId).sort((a, b) => b.lastActivity - a.lastActivity);
    }
    const billMap = new Map(bills.map((b) => [b._id, b]));
    return buildGroups(filtered, (o) => o.billId as string)
      .map((g) => ({ ...g, bill: billMap.get(g.key) }))
      .sort((a, b) => Date.parse(b.bill?.createdAt ?? '') - Date.parse(a.bill?.createdAt ?? '') || b.lastActivity - a.lastActivity);
  }, [viewOrders, view, filter, bills]);

  const currentTableCount = useMemo(() => new Set(currentOrders.map((o) => o.tableId)).size, [currentOrders]);
  const billedCount = useMemo(() => new Set(unpaidOrders.map((o) => o.billId)).size, [unpaidOrders]);
  const completedCount = useMemo(() => new Set(paidOrders.map((o) => o.billId)).size, [paidOrders]);

  const handlePaid = (bill: IBill) => {
    setIsError(false);
    setMessage(PAGE.PAID_SUCCESS(bill.billNumber, bill.paymentMode ?? ''));
    fetchOrders();
  };

  if (!restaurant) {
    return (
      <div className="form-page">
        <div className="empty-state">
          <div className="empty-icon">🏪</div>
          <p className="empty-text">{PAGE.NO_RESTAURANT}</p>
        </div>
      </div>
    );
  }

  // Paused statuses only get a filter chip while some older order still has them
  const allStatuses = Object.values(ORDER_STATUS).filter(
    (status) => ORDER_STATUSES_IN_USE.includes(status) || viewOrders.some((o) => o.status === status)
  );

  const renderOrder = (order: IOrder) => {
    // Billed or paid: the order is settled — no status buttons (the kitchen board can still move it along).
    const transitions = view === 'completed' || order.billId ? [] : STATUS_TRANSITIONS[order.status] || [];
    return (
      <div key={order._id} className="order-card">
        <div className="order-header">
          <span className="order-id">Order #{order._id.slice(-6)}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn-invoice-sm"
              onClick={() => openPdf(getOrderPdfUrl(order._id))}
              title="Download invoice for this order"
            >
              🧾
            </button>
            <span className="order-status-badge" style={{ background: ORDER_STATUS_COLORS[order.status] }}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>

        <div className="order-body">
          <div className="order-items">
            {combineItems(order.items).map((item) => (
              <div key={`${item.dishId}|${item.notes ?? ''}|${item.price}`} className="order-item-row">
                <span>
                  {item.quantity}{PAGE.ITEM_SEPARATOR}{item.dishName}
                  {item.notes && <span className="order-time"> · “{item.notes}”</span>}
                </span>
                <span>{PAGE.CURRENCY}{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          {order.specialInstructions && <div className="order-notes">💬 {order.specialInstructions}</div>}
        </div>

        <div className="order-footer">
          <div className="order-meta">
            <span className="order-total">
              {PAGE.CURRENCY}{order.totalAmount}
              {NOT_CHARGED_STATUSES.includes(order.status) && <span className="order-time"> ({PAGE.NOT_CHARGED})</span>}
            </span>
            <span className="order-time">{formatTime(order.createdAt)}</span>
            {order.customerName && <span className="order-customer">👤 {order.customerName}</span>}
            {order.placedBy && <span className="order-customer">🧑‍🍳 {PAGE.PLACED_BY(order.placedBy.name)}</span>}
            {order.editedBy && <span className="order-customer">✏️ {PAGE.EDITED_BY(order.editedBy.name)}</span>}
          </div>
          {(transitions.length > 0 || canEditOrder(order)) && (
            <div className="order-actions">
              {canEditOrder(order) && (
                <button className="btn-status btn-status--edit" onClick={() => setEditingOrder(order)}>
                  ✏️ {PAGE.EDIT}
                </button>
              )}
              {transitions.map((status) => (
                <button
                  key={status}
                  className="btn-status"
                  style={{ '--btn-color': ORDER_STATUS_COLORS[status] } as React.CSSProperties}
                  onClick={() => handleStatusChange(order._id, status)}
                >
                  {ORDER_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="orders-page">
      <div className="page-header page-header--with-action">
        <div>
          <h1 className="page-title">{PAGE.TITLE}</h1>
          <p className="page-subtitle">{PAGE.SUBTITLE}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowTakeOrder(true)}>
          + {PAGE.NEW_ORDER}
        </button>
      </div>

      {showTakeOrder && (
        <TakeOrderModal
          restaurantId={restaurant._id}
          onClose={() => setShowTakeOrder(false)}
          onPlaced={(msg) => {
            setShowTakeOrder(false);
            setIsError(false);
            setMessage(msg);
            fetchOrders();
          }}
        />
      )}

      {message && <div className={`form-message ${isError ? 'form-message--error' : ''}`}>{message}</div>}

      <TableAlertsBanner
        restaurantId={restaurant._id}
        onOpenBill={(tableId, tableNumber) => setBillTable({ tableId, tableNumber })}
      />

      <div className="orders-tabs">
        <button
          className={`orders-tab ${view === 'current' ? 'orders-tab--active' : ''}`}
          onClick={() => switchView('current')}
        >
          {PAGE.TAB_CURRENT} ({currentTableCount})
        </button>
        <button
          className={`orders-tab ${view === 'billed' ? 'orders-tab--active' : ''}`}
          onClick={() => switchView('billed')}
        >
          {PAGE.TAB_BILLED} ({billedCount})
        </button>
        <button
          className={`orders-tab ${view === 'completed' ? 'orders-tab--active' : ''}`}
          onClick={() => switchView('completed')}
        >
          {PAGE.TAB_COMPLETED} ({completedCount})
        </button>
      </div>

      <div className="filter-bar">
        <button className={`filter-chip ${!filter ? 'filter-chip--active' : ''}`} onClick={() => setFilter('')}>
          {PAGE.FILTER_ALL} ({viewOrders.length})
        </button>
        {allStatuses.map((status) => {
          const count = viewOrders.filter((o) => o.status === status).length;
          return (
            <button
              key={status}
              className={`filter-chip ${filter === status ? 'filter-chip--active' : ''}`}
              onClick={() => setFilter(filter === status ? '' : status)}
              style={{ '--chip-color': ORDER_STATUS_COLORS[status] } as React.CSSProperties}
            >
              {ORDER_STATUS_LABELS[status]} ({count})
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p className="empty-text">{view === 'current' ? PAGE.NO_CURRENT : view === 'billed' ? PAGE.NO_BILLED : PAGE.NO_COMPLETED}</p>
        </div>
      ) : (
        <div className="table-groups">
          {groups.map((group) => {
            const groupKey = `${view}:${group.key}`;
            const isExpanded = expanded.has(groupKey);
            const { bill } = group;
            return (
              <div key={groupKey} className="table-group">
                <div className="table-group-header" onClick={() => toggleGroup(groupKey)}>
                  <div className="table-group-left">
                    {bill && <span className="table-group-name">🧾 {bill.billNumber}</span>}
                    <span className="table-group-name">{PAGE.TABLE(group.tableNumber)}</span>
                    <span className="table-group-count">{PAGE.ORDER_COUNT(group.orders.length)}</span>
                    <span className="table-group-total">
                      {bill ? formatMoney(bill.totalAmount) : `${PAGE.CURRENCY}${group.total}`}
                    </span>
                    {bill && (
                      <span className={`bill-chip ${bill.status === 'PAID' ? '' : 'bill-chip--unpaid'}`}>
                        {bill.status === 'PAID' ? `${PAGE.PAID} · ${bill.paymentMode ?? ''}` : PAGE.UNPAID}
                      </span>
                    )}
                    <span className="table-group-customers">
                      {group.customers ? PAGE.CUSTOMERS(group.customers) : PAGE.WALK_IN}
                    </span>
                    {bill && <span className="order-time">{formatTime(bill.createdAt)}</span>}
                  </div>
                  <div className="table-group-actions" onClick={(e) => e.stopPropagation()}>
                    {view === 'current' ? (
                      <button
                        className="btn-invoice"
                        onClick={() => setBillTable({ tableId: group.tableId, tableNumber: group.tableNumber })}
                        title="See this table's current orders and generate the bill"
                      >
                        🧾 {PAGE.TABLE_BILL}
                      </button>
                    ) : (
                      bill && (
                        <>
                          {bill.status === 'UNPAID' && (
                            <div className="mark-paid">
                              <span className="mark-paid-label">{PAGE.MARK_PAID}</span>
                              <PayButtons bill={bill} onPaid={handlePaid} />
                            </div>
                          )}
                          <button className="btn-invoice" onClick={() => openPdf(getBillPdfUrl(bill._id))}>
                            🧾 {PAGE.BILL_PDF}
                          </button>
                        </>
                      )
                    )}
                    <span className="table-group-toggle">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && <div className="table-group-orders">{group.orders.map(renderOrder)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {billTable && (
        <TableBillModal
          tableId={billTable.tableId}
          tableNumber={billTable.tableNumber}
          onClose={() => setBillTable(null)}
          onBillGenerated={() => {
            fetchOrders();
            switchView('billed');
          }}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={(msg) => {
            setEditingOrder(null);
            setIsError(false);
            setMessage(msg);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export { Orders };
