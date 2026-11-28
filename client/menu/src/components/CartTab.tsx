import { useState } from 'react';
import { MESSAGES } from '../constants';
import type { ICartLine } from '../types';
import { money } from '../utils/format.util';

interface Props {
  /** The live table cart (everyone's lines, with this phone's taps on top). */
  lines: ICartLine[];
  total: number;
  /** This diner's member key — their lines are `<me>.<dishId>`. */
  me?: string;
  busy: boolean;
  onSetQuantity: (key: string, quantity: number) => void;
  onPlaceOrder: (specialInstructions: string) => Promise<boolean>;
}

/** Who added a line: the member-key part of `<memberKey>.<dishId>`. */
const ownerOf = (line: ICartLine): string => line.key.split('.')[0];

/** The table's shared cart, grouped by who added what. Anyone can change any line or send it. */
const CartTab = ({ lines, total, me, busy, onSetQuantity, onPlaceOrder }: Props) => {
  const [instructions, setInstructions] = useState('');

  if (lines.length === 0) return <p className="empty-note">{MESSAGES.CART_EMPTY}</p>;

  // Grouped by member (not name — two diners can share a name); this diner first
  const groups = lines.reduce<Map<string, { title: string; lines: ICartLine[] }>>((byOwner, line) => {
    const owner = ownerOf(line);
    const group = byOwner.get(owner) ?? {
      title: owner === me ? `${line.by} (${MESSAGES.YOU})` : line.by,
      lines: [],
    };
    group.lines.push(line);
    byOwner.set(owner, group);
    return byOwner;
  }, new Map());
  const ordered = [...groups.entries()].sort(([a], [b]) => Number(b === me) - Number(a === me));

  const place = async () => {
    if (await onPlaceOrder(instructions)) setInstructions('');
  };

  return (
    <section className="panel">
      <p className="panel-note">{MESSAGES.CART_SHARED_NOTE}</p>
      {ordered.map(([owner, group]) => (
        <div key={owner} className="cart-group">
          <h3 className="cart-group-title">{group.title}</h3>
          {group.lines.map((line) => (
            <div key={line.key} className="cart-item">
              <div className="cart-item-info">
                <span className="cart-item-name">{line.dishName}</span>
                {line.notes && <span className="cart-item-notes">“{line.notes}”</span>}
                <span className="cart-item-price">{money(line.price * line.quantity)}</span>
              </div>
              <div className="qty-control qty-control--sm">
                <button
                  className="qty-btn"
                  disabled={busy}
                  onClick={() => onSetQuantity(line.key, line.quantity - 1)}
                  aria-label="Remove one"
                >
                  −
                </button>
                <span className="qty-value">{line.quantity}</span>
                <button
                  className="qty-btn"
                  disabled={busy}
                  onClick={() => onSetQuantity(line.key, line.quantity + 1)}
                  aria-label="Add one"
                >
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
        <span className="cart-total-amount">{money(total)}</span>
      </div>
      <button className="btn-primary" onClick={place} disabled={busy}>
        {MESSAGES.BTN_PLACE_ORDER}
      </button>
    </section>
  );
};

export default CartTab;
