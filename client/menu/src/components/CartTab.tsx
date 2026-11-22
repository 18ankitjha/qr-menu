import { useState } from 'react';
import { MESSAGES } from '../constants';
import type { ICartLine, ITableSession } from '../types';
import { money } from '../utils/format.util';

interface Props {
  session: ITableSession;
  busy: boolean;
  onSetQuantity: (lineId: string, quantity: number) => void;
  onPlaceOrder: (specialInstructions: string) => Promise<boolean>;
}

/** The table's shared cart, grouped by who added what. Anyone can change any line or send it. */
const CartTab = ({ session, busy, onSetQuantity, onPlaceOrder }: Props) => {
  const [instructions, setInstructions] = useState('');

  if (session.cart.length === 0) return <p className="empty-note">{MESSAGES.CART_EMPTY}</p>;

  const byPerson = session.cart.reduce<Map<string, ICartLine[]>>((groups, line) => {
    const key = line.addedBy.isMe ? `${line.addedBy.name} (${MESSAGES.YOU})` : line.addedBy.name;
    groups.set(key, [...(groups.get(key) ?? []), line]);
    return groups;
  }, new Map());

  const place = async () => {
    if (await onPlaceOrder(instructions)) setInstructions('');
  };

  return (
    <section className="panel">
      <p className="panel-note">{MESSAGES.CART_SHARED_NOTE}</p>
      {[...byPerson.entries()].map(([person, lines]) => (
        <div key={person} className="cart-group">
          <h3 className="cart-group-title">{person}</h3>
          {lines.map((line) => (
            <div key={line._id} className="cart-item">
              <div className="cart-item-info">
                <span className="cart-item-name">{line.dishName}</span>
                {line.notes && <span className="cart-item-notes">“{line.notes}”</span>}
                <span className="cart-item-price">{money(line.price * line.quantity)}</span>
              </div>
              <div className="qty-control qty-control--sm">
                <button className="qty-btn" disabled={busy} onClick={() => onSetQuantity(line._id, line.quantity - 1)}>
                  −
                </button>
                <span className="qty-value">{line.quantity}</span>
                <button className="qty-btn" disabled={busy} onClick={() => onSetQuantity(line._id, line.quantity + 1)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
      <textarea
        className="cart-input cart-textarea"
        value={instructions}
        maxLength={500}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder={MESSAGES.CART_INSTRUCTIONS}
      />
      <div className="cart-total">
        <span>Total</span>
        <span className="cart-total-amount">{money(session.cartTotal)}</span>
      </div>
      <button className="btn-primary" onClick={place} disabled={busy}>
        {MESSAGES.BTN_PLACE_ORDER}
      </button>
    </section>
  );
};

export default CartTab;
