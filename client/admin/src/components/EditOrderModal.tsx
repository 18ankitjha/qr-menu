import { useEffect, useMemo, useState } from 'react';
import { getOrderingMenu, updateOrderItems, getErrorMessage } from '../services/api';
import { MESSAGES } from '../constants';
import type { IDish, IOrder, IOrderingMenu } from '../types';
import { combineItems } from '../utils/order';
import './TakeOrder.css';

// ============================================================
// Edit Order — owner/waiter changes quantities, removes or adds dishes on an unbilled order.
// Lines already on the order keep their original price; new dishes use today's menu price.
// ============================================================

const TEXT = {
  TITLE: (id: string, table: number) => `Edit Order #${id.slice(-6)} · Table #${table}`,
  ITEMS: 'Items on this order',
  ADD: 'Add dishes',
  SEARCH: 'Search dishes…',
  NO_DISHES: 'No dishes match.',
  MENU_ERROR: 'Could not load the menu.',
  ITEM_NOTE: 'Note (e.g. less spicy)',
  INSTRUCTIONS: 'Special instructions (optional)',
  EMPTY: 'Every item is removed. To drop the whole order, cancel it instead.',
  TOTAL: 'New total',
  SAVE: 'Save changes',
  SAVING: 'Saving…',
  SAVED: (id: string) => `Order #${id.slice(-6)} updated. The kitchen and the table see the change.`,
  REMOVE: 'Remove',
} as const;

const CURRENCY = '₹';
/** Per line. A diner can add 50, and lines from several diners are combined — same cap as the server's edit. */
const MAX_LINE_QUANTITY = 200;

interface ILine {
  key: string;
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  notes: string;
  addedBy?: string;
}

interface IEditOrderModalProps {
  order: IOrder;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const EditOrderModal = ({ order, onClose, onSaved }: IEditOrderModalProps) => {
  const [lines, setLines] = useState<ILine[]>(() =>
    combineItems(order.items).map((item, i) => ({
      key: `old-${i}`,
      dishId: item.dishId,
      dishName: item.dishName,
      price: item.price,
      quantity: item.quantity,
      notes: item.notes ?? '',
      addedBy: item.addedBy,
    }))
  );
  const [instructions, setInstructions] = useState(order.specialInstructions ?? '');
  const [menu, setMenu] = useState<IOrderingMenu | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getOrderingMenu(order.restaurantId, order.tableId)
      .then(({ data }) => setMenu(data.data))
      .catch((err) => setError(getErrorMessage(err, TEXT.MENU_ERROR)));
  }, [order.restaurantId, order.tableId]);

  const dishes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (menu?.categories ?? []).flatMap((c) => c.dishes).filter((d) => !q || d.name.toLowerCase().includes(q));
  }, [menu, search]);

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const setQty = (key: string, quantity: number) =>
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(quantity, MAX_LINE_QUANTITY) } : l))
    );

  const setNote = (key: string, notes: string) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, notes } : l)));

  // Price shown for a dish: the order's snapshot if it is already on the order (server keeps it), else today's price
  const priceOf = (dish: IDish) => order.items.find((i) => i.dishId === dish._id)?.price ?? dish.price;

  const addDish = (dish: IDish) =>
    setLines((prev) => {
      const plain = prev.find((l) => l.dishId === dish._id && !l.notes);
      if (plain) return prev.map((l) => (l === plain ? { ...l, quantity: Math.min(l.quantity + 1, MAX_LINE_QUANTITY) } : l));
      return [
        ...prev,
        { key: `new-${dish._id}-${Date.now()}`, dishId: dish._id, dishName: dish.name, price: priceOf(dish), quantity: 1, notes: '' },
      ];
    });

  const handleSave = async () => {
    if (lines.length === 0) return;
    setSaving(true);
    setError('');
    try {
      await updateOrderItems(order._id, {
        items: lines.map((l) => ({
          dishId: l.dishId,
          quantity: l.quantity,
          notes: l.notes.trim() || undefined,
          addedBy: l.addedBy,
        })),
        specialInstructions: instructions.trim(),
      });
      onSaved(TEXT.SAVED(order._id));
    } catch (err) {
      setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card take-order" onClick={(e) => e.stopPropagation()}>
        <div className="take-order-header">
          <h2 className="card-title">{TEXT.TITLE(order._id, order.tableNumber)}</h2>
          <button className="btn-icon" onClick={onClose} aria-label={MESSAGES.CANCEL}>✕</button>
        </div>

        {error && <div className="form-message form-message--error">{error}</div>}

        <div className="take-order-body">
          <div className="take-order-cart">
            <h3 className="take-order-cart-title">{TEXT.ITEMS}</h3>
            {lines.length === 0 ? (
              <p className="take-order-muted">{TEXT.EMPTY}</p>
            ) : (
              <div className="take-order-lines">
                {lines.map((l) => (
                  <div key={l.key} className="take-order-line">
                    <div className="take-order-line-top">
                      <span>{l.dishName}</span>
                      <span>{CURRENCY}{l.price * l.quantity}</span>
                    </div>
                    <div className="edit-order-line-controls">
                      <div className="qty-stepper">
                        <button onClick={() => setQty(l.key, l.quantity - 1)} aria-label="Remove one">−</button>
                        <span>{l.quantity}</span>
                        <button onClick={() => setQty(l.key, l.quantity + 1)} aria-label="Add one">+</button>
                      </div>
                      <button className="btn-link-danger" onClick={() => setQty(l.key, 0)}>{TEXT.REMOVE}</button>
                    </div>
                    <input
                      className="form-input take-order-note"
                      placeholder={TEXT.ITEM_NOTE}
                      maxLength={200}
                      value={l.notes}
                      onChange={(e) => setNote(l.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
            <textarea
              className="form-input"
              placeholder={TEXT.INSTRUCTIONS}
              maxLength={500}
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <div className="take-order-total">
              <span>{TEXT.TOTAL}</span>
              <span>{CURRENCY}{total}</span>
            </div>
            <button className="btn-primary" disabled={saving || lines.length === 0} onClick={handleSave}>
              {saving ? TEXT.SAVING : TEXT.SAVE}
            </button>
          </div>

          <div className="take-order-menu">
            <h3 className="take-order-cart-title">{TEXT.ADD}</h3>
            <input className="form-input" placeholder={TEXT.SEARCH} value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="take-order-dishes">
              {!menu ? (
                <p className="take-order-muted">{MESSAGES.LOADING}</p>
              ) : dishes.length === 0 ? (
                <p className="take-order-muted">{TEXT.NO_DISHES}</p>
              ) : (
                dishes.map((dish) => (
                  <div key={dish._id} className="take-order-dish">
                    <span className={`veg-mark ${dish.isVeg ? 'veg-mark--veg' : 'veg-mark--nonveg'}`} />
                    <span className="take-order-dish-name">{dish.name}</span>
                    <span className="take-order-dish-price">{CURRENCY}{priceOf(dish)}</span>
                    <div className="qty-stepper">
                      <button onClick={() => addDish(dish)} aria-label={`Add ${dish.name}`}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { EditOrderModal };
