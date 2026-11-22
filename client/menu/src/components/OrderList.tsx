import { MESSAGES, ORDER_STATUS_LABELS } from '../constants';
import type { ISessionOrder } from '../types';
import { money, timeOf } from '../utils/format.util';

/** Every order on the table (from any phone, or taken by a waiter) with its live kitchen status. */
const OrderList = ({ orders }: { orders: ISessionOrder[] }) => {
  if (orders.length === 0) return <p className="empty-note">{MESSAGES.NO_ORDERS}</p>;

  return (
    <section className="panel">
      {[...orders].reverse().map((order) => (
        <article key={order._id} className="order-card">
          <div className="order-head">
            <span className="order-time">
              {timeOf(order.createdAt)}
              {order.placedByStaff ? ` · via ${MESSAGES.WAITER} ${order.placedByStaff}` : ''}
            </span>
            <span className={`status-chip status-chip--${order.status.toLowerCase()}`}>
              {ORDER_STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          {order.items.map((item, i) => (
            <div key={i} className="order-item">
              <span>
                {item.quantity} × {item.dishName}
                {item.notes ? <em> “{item.notes}”</em> : null}
              </span>
              {item.addedBy && <span className="order-item-by">{item.addedBy}</span>}
            </div>
          ))}
          {order.specialInstructions && <p className="order-note">📝 {order.specialInstructions}</p>}
          <div className="order-total">{money(order.totalAmount)}</div>
        </article>
      ))}
    </section>
  );
};

export default OrderList;
