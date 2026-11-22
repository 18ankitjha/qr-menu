import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllOrders, setOrderStatus, getTableInvoicePdf, getInvoicePdf } from '../services/api';
import { ORDER_STATUS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, MESSAGES } from '../constants';
import type { IOrder } from '../types';
import './FormPage.css';
import './Orders.css';

// ============================================================
// Orders — Full order history with status management
// ============================================================

const PAGE = {
  TITLE: 'Orders',
  SUBTITLE: 'View all orders and update their status.',
  NO_ORDERS: 'No orders yet.',
  NO_RESTAURANT: 'Register a restaurant first.',
  FILTER_ALL: 'All',
  TABLE_HEADER: {
    ORDER_ID: 'Order',
    TABLE: 'Table',
    ITEMS: 'Items',
    TOTAL: 'Total',
    STATUS: 'Status',
    TIME: 'Time',
    ACTIONS: 'Actions',
  },
  ITEM_SEPARATOR: ' × ',
  CURRENCY: '₹',
  STATUS_UPDATED: 'Order status updated!',
} as const;

const STATUS_TRANSITIONS: Record<string, string[]> = {
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.COOKING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.COOKING]: [ORDER_STATUS.READY, ORDER_STATUS.CANNOT_DELIVER],
  [ORDER_STATUS.READY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANNOT_DELIVER],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
  [ORDER_STATUS.CANNOT_DELIVER]: [],
};

const Orders = () => {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    if (!restaurant) return;
    try {
      const { data } = await getAllOrders(restaurant._id);
      setOrders(data.data);
    } catch { /* empty */ }
  }, [restaurant]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await setOrderStatus(orderId, newStatus);
      await fetchOrders();
      setMessage(PAGE.STATUS_UPDATED);
    } catch {
      setMessage(MESSAGES.ERROR_GENERIC);
    }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleString();

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) { next.delete(tableId); } else { next.add(tableId); }
      return next;
    });
  };

  const openPdf = (url: string) => window.open(url, '_blank');

  // Group orders by tableId, sorted by most recent activity
  const tableGroups = useMemo(() => {
    const filtered = filter ? orders.filter((o) => o.status === filter) : orders;
    const map = new Map<string, IOrder[]>();
    filtered.forEach((o) => {
      const key = o.tableId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return Array.from(map.entries()).map(([tableId, tableOrders]) => ({
      tableId,
      tableNumber: tableOrders[0].tableNumber,
      orders: tableOrders,
      total: tableOrders.reduce((s, o) => s + o.totalAmount, 0),
    })).sort((a, b) => b.tableNumber - a.tableNumber);
  }, [orders, filter]);

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

  const allStatuses = Object.values(ORDER_STATUS);

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1 className="page-title">{PAGE.TITLE}</h1>
        <p className="page-subtitle">{PAGE.SUBTITLE}</p>
      </div>

      {message && <div className="form-message">{message}</div>}

      {/* Filter Bar */}
      <div className="filter-bar">
        <button
          className={`filter-chip ${!filter ? 'filter-chip--active' : ''}`}
          onClick={() => setFilter('')}
        >
          {PAGE.FILTER_ALL} ({orders.length})
        </button>
        {allStatuses.map((status) => {
          const count = orders.filter((o) => o.status === status).length;
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

      {tableGroups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p className="empty-text">{PAGE.NO_ORDERS}</p>
        </div>
      ) : (
        <div className="table-groups">
          {tableGroups.map(({ tableId, tableNumber, orders: tableOrders, total }) => {
            const isExpanded = expandedTables.has(tableId);
            return (
              <div key={tableId} className="table-group">
                {/* Table Header */}
                <div className="table-group-header" onClick={() => toggleTable(tableId)}>
                  <div className="table-group-left">
                    <span className="table-group-name">Table #{tableNumber}</span>
                    <span className="table-group-count">{tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''}</span>
                    <span className="table-group-total">{PAGE.CURRENCY}{total}</span>
                  </div>
                  <div className="table-group-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-invoice"
                      onClick={() => openPdf(getTableInvoicePdf(tableId))}
                      title="Download combined invoice for this table"
                    >
                      🧾 Table Invoice
                    </button>
                    <span className="table-group-toggle">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Orders under this table */}
                {isExpanded && (
                  <div className="table-group-orders">
                    {tableOrders.map((order) => {
                      const transitions = STATUS_TRANSITIONS[order.status] || [];
                      return (
                        <div key={order._id} className="order-card">
                          <div className="order-header">
                            <span className="order-id">Order #{order._id.slice(-6)}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <button
                                className="btn-invoice-sm"
                                onClick={() => openPdf(getInvoicePdf(order._id))}
                                title="Download invoice for this order"
                              >
                                🧾
                              </button>
                              <span
                                className="order-status-badge"
                                style={{ background: ORDER_STATUS_COLORS[order.status] }}
                              >
                                {ORDER_STATUS_LABELS[order.status]}
                              </span>
                            </div>
                          </div>

                          <div className="order-body">
                            <div className="order-items">
                              {order.items.map((item, i) => (
                                <div key={i} className="order-item-row">
                                  <span>{item.quantity}{PAGE.ITEM_SEPARATOR}{item.dishName}</span>
                                  <span>{PAGE.CURRENCY}{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                            {order.specialInstructions && (
                              <div className="order-notes">💬 {order.specialInstructions}</div>
                            )}
                          </div>

                          <div className="order-footer">
                            <div className="order-meta">
                              <span className="order-total">{PAGE.CURRENCY}{order.totalAmount}</span>
                              <span className="order-time">{formatTime(order.createdAt)}</span>
                              {order.customerName && <span className="order-customer">👤 {order.customerName}</span>}
                            </div>
                            {transitions.length > 0 && (
                              <div className="order-actions">
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
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { Orders };
