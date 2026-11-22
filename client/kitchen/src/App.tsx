import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import {
  API_ENDPOINTS,
  SOCKET_URL,
  SOCKET_EVENTS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  STATUS_COLUMNS,
  MESSAGES,
} from './constants';
import type { IOrder, IApiResponse } from './types';
import './index.css';

// ============================================================
// Kitchen Display — Read-only, real-time order board
// ============================================================

const App = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const restaurantId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('restaurant') || '';
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { data } = await axios.get<IApiResponse<IOrder[]>>(
        API_ENDPOINTS.KITCHEN_ORDERS(restaurantId)
      );
      setOrders(data.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, [restaurantId]);

  // Socket.IO connection
  useEffect(() => {
    if (!restaurantId) return;

    fetchOrders();

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit(SOCKET_EVENTS.JOIN_RESTAURANT_ROOM, restaurantId);
    });

    socket.on(SOCKET_EVENTS.NEW_ORDER, () => {
      fetchOrders();
      playNotification();
    });

    socket.on(SOCKET_EVENTS.ORDER_STATUS_UPDATED, () => {
      fetchOrders();
    });

    // Fallback polling every 15s
    const interval = setInterval(fetchOrders, 15000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [restaurantId, fetchOrders]);

  const playNotification = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        // Use Web Audio API beep as fallback
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = 800;
        gain.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          ctx.close();
        }, 300);
        return;
      }
      audioRef.current.play().catch(() => { /* user hasn't interacted yet */ });
    } catch { /* audio not supported */ }
  };

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<string, IOrder[]> = {};
    Object.values(ORDER_STATUS).forEach((status) => {
      grouped[status] = orders.filter((o) => o.status === status);
    });
    return grouped;
  }, [orders]);

  // Recently completed (delivered/cancelled within 30 min)
  const recentlyCompleted = useMemo(() => {
    return orders.filter((o) =>
      [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.CANNOT_DELIVER].includes(
        o.status as typeof ORDER_STATUS.DELIVERED
      )
    );
  }, [orders]);

  const getTimeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    return MESSAGES.TIME_AGO(mins);
  };

  if (!restaurantId) {
    return <div className="kitchen-error">{MESSAGES.ERROR_NO_RESTAURANT}</div>;
  }

  if (loading) {
    return <div className="kitchen-loading">{MESSAGES.LOADING}</div>;
  }

  return (
    <div className="kitchen-app">
      {/* Header */}
      <header className="kitchen-header">
        <div className="kitchen-header-left">
          <h1 className="kitchen-title">{MESSAGES.TITLE}</h1>
          <span className="kitchen-subtitle">{MESSAGES.SUBTITLE}</span>
        </div>
        <div className="kitchen-clock">
          <Clock />
        </div>
      </header>

      {/* Status Columns */}
      <div className="kitchen-board">
        {STATUS_COLUMNS.map((col) => {
          const colOrders = ordersByStatus[col.status] || [];
          return (
            <div key={col.status} className="kitchen-column">
              <div
                className="column-header"
                style={{ '--col-color': ORDER_STATUS_COLORS[col.status] } as React.CSSProperties}
              >
                <span className="column-icon">{col.icon}</span>
                <span className="column-label">{col.label}</span>
                <span className="column-count">{colOrders.length}</span>
              </div>
              <div className="column-body">
                {colOrders.length === 0 ? (
                  <div className="column-empty">{MESSAGES.NO_ORDERS}</div>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard key={order._id} order={order} getTimeAgo={getTimeAgo} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recently Completed */}
      {recentlyCompleted.length > 0 && (
        <div className="completed-section">
          <h2 className="completed-title">{MESSAGES.RECENTLY_COMPLETED}</h2>
          <div className="completed-grid">
            {recentlyCompleted.map((order) => (
              <div key={order._id} className="completed-card">
                <span className="completed-id">#{order._id.slice(-6)}</span>
                <span
                  className="completed-status"
                  style={{ color: ORDER_STATUS_COLORS[order.status] }}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className="completed-time">{getTimeAgo(order.updatedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Order Card Sub-component ---

const OrderCard = ({
  order,
  getTimeAgo,
}: {
  order: IOrder;
  getTimeAgo: (d: string) => string;
}) => {
  return (
    <div className="order-ticket">
      <div className="ticket-header">
        <span className="ticket-id">Table #{order.tableNumber ?? '?'}</span>
        <span className="ticket-time">{getTimeAgo(order.createdAt)}</span>
      </div>
      <div className="ticket-order-id">Order #{order._id.slice(-6)}</div>
      <div className="ticket-items">
        {order.items.map((item, i) => (
          <div key={i} className="ticket-item">
            <span className="ticket-qty">{item.quantity}{MESSAGES.ITEM_SEP}</span>
            <span className="ticket-name">{item.dishName}</span>
            {item.notes && <span className="ticket-note">({item.notes})</span>}
          </div>
        ))}
      </div>
      {order.specialInstructions && (
        <div className="ticket-instructions">💬 {order.specialInstructions}</div>
      )}
      {order.customerName && (
        <div className="ticket-customer">👤 {order.customerName}</div>
      )}
    </div>
  );
};

// --- Live Clock Sub-component ---

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{time.toLocaleTimeString()}</span>;
};

export default App;
