import { useEffect, useMemo, useState } from 'react';
import { getTables, getOrderingMenu, placeOrderByStaff, getErrorMessage } from '../services/api';
import { MESSAGES } from '../constants';
import type { IDish, IOrderingMenu, ITable } from '../types';
import './TakeOrder.css';

// ============================================================
// Take Order — a waiter/owner places an order on behalf of a table.
// Uses the same menu the customer sees (active categories, available dishes only).
// ============================================================

const TEXT = {
  TITLE: 'Take Order',
  TITLE_TABLE: (n: number, label?: string) => `Take Order · Table #${n}${label ? ` (${label})` : ''}`,
  SELECT_TABLE: 'Table',
  SELECT_TABLE_PLACEHOLDER: 'Select a table…',
  NO_TABLES: 'No active tables. Add a table first.',
  PICK_TABLE_FIRST: 'Pick a table to load the menu.',
  SEARCH: 'Search dishes…',
  ALL: 'All',
  NO_DISHES: 'No dishes match.',
  CART: 'Order',
  CART_EMPTY: 'Tap + on a dish to add it.',
  ITEM_NOTE: 'Note (e.g. less spicy)',
  CUSTOMER_NAME: 'Customer name (optional)',
  INSTRUCTIONS: 'Special instructions (optional)',
  TOTAL: 'Total',
  PLACE: (count: number) => `Place Order (${count} item${count === 1 ? '' : 's'})`,
  PLACING: 'Placing…',
  PLACED: (n: number) => `Order placed for Table #${n} and sent to the kitchen.`,
  MENU_ERROR: 'Could not load the menu for this table.',
} as const;

const CURRENCY = '₹';

interface ICartLine {
  dish: IDish;
  quantity: number;
  notes: string;
}

interface ITakeOrderModalProps {
  restaurantId: string;
  /** Preselected table (from the Tables page). Omit to let the user pick one. */
  table?: ITable;
  onClose: () => void;
  onPlaced: (message: string) => void;
}

const TakeOrderModal = ({ restaurantId, table, onClose, onPlaced }: ITakeOrderModalProps) => {
  const [tables, setTables] = useState<ITable[]>(table ? [table] : []);
  const [tableId, setTableId] = useState(table?._id ?? '');
  const [menu, setMenu] = useState<IOrderingMenu | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, ICartLine>>({});
  const [customerName, setCustomerName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  // Table picker (only when no table was preselected)
  useEffect(() => {
    if (table) return;
    getTables(restaurantId)
      .then(({ data }) => setTables(data.data.filter((t) => t.isActive)))
      .catch((err) => setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC)));
  }, [restaurantId, table]);

  useEffect(() => {
    if (!tableId) {
      setMenu(null);
      return;
    }
    setMenuLoading(true);
    setError('');
    getOrderingMenu(restaurantId, tableId)
      .then(({ data }) => setMenu(data.data))
      .catch((err) => {
        setMenu(null);
        setError(getErrorMessage(err, TEXT.MENU_ERROR));
      })
      .finally(() => setMenuLoading(false));
  }, [restaurantId, tableId]);

  const visibleDishes = useMemo(() => {
    if (!menu) return [];
    const q = search.trim().toLowerCase();
    return menu.categories
      .filter((c) => !categoryId || c._id === categoryId)
      .flatMap((c) => c.dishes)
      .filter((d) => !q || d.name.toLowerCase().includes(q));
  }, [menu, categoryId, search]);

  const lines = Object.values(cart);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const total = lines.reduce((sum, l) => sum + l.quantity * l.dish.price, 0);
  const selectedTable = tables.find((t) => t._id === tableId);

  const changeQty = (dish: IDish, delta: number) => {
    setCart((prev) => {
      const current = prev[dish._id];
      const quantity = (current?.quantity ?? 0) + delta;
      const next = { ...prev };
      if (quantity <= 0) delete next[dish._id];
      else next[dish._id] = { dish, quantity: Math.min(quantity, 50), notes: current?.notes ?? '' };
      return next;
    });
  };

  const setNote = (dishId: string, notes: string) => {
    setCart((prev) => ({ ...prev, [dishId]: { ...prev[dishId], notes } }));
  };

  const handleTableChange = (id: string) => {
    setTableId(id);
    setCart({});
    setCategoryId('');
  };

  const handlePlace = async () => {
    if (!tableId || lines.length === 0) return;
    setPlacing(true);
    setError('');
    try {
      await placeOrderByStaff({
        restaurantId,
        tableId,
        items: lines.map((l) => ({
          dishId: l.dish._id,
          quantity: l.quantity,
          notes: l.notes.trim() || undefined,
        })),
        customerName: customerName.trim() || undefined,
        specialInstructions: instructions.trim() || undefined,
      });
      onPlaced(TEXT.PLACED(selectedTable?.tableNumber ?? menu?.table.tableNumber ?? 0));
    } catch (err) {
      setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card take-order" onClick={(e) => e.stopPropagation()}>
        <div className="take-order-header">
          <h2 className="card-title">
            {table ? TEXT.TITLE_TABLE(table.tableNumber, table.label) : TEXT.TITLE}
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label={MESSAGES.CANCEL}>✕</button>
        </div>

        {!table && (
          <div className="form-group">
            <label className="form-label">{TEXT.SELECT_TABLE}</label>
            {tables.length === 0 ? (
              <p className="take-order-muted">{TEXT.NO_TABLES}</p>
            ) : (
              <select className="form-input" value={tableId} onChange={(e) => handleTableChange(e.target.value)}>
                <option value="">{TEXT.SELECT_TABLE_PLACEHOLDER}</option>
                {tables.map((t) => (
                  <option key={t._id} value={t._id}>
                    #{t.tableNumber}{t.label ? ` — ${t.label}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {error && <div className="form-message form-message--error">{error}</div>}

        {!tableId ? (
          tables.length > 0 && <p className="take-order-muted">{TEXT.PICK_TABLE_FIRST}</p>
        ) : menuLoading ? (
          <p className="take-order-muted">{MESSAGES.LOADING}</p>
        ) : menu && (
          <div className="take-order-body">
            {/* Menu */}
            <div className="take-order-menu">
              <input
                className="form-input"
                placeholder={TEXT.SEARCH}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="take-order-cats">
                <button
                  className={`filter-chip ${!categoryId ? 'filter-chip--active' : ''}`}
                  onClick={() => setCategoryId('')}
                >
                  {TEXT.ALL}
                </button>
                {menu.categories.map((c) => (
                  <button
                    key={c._id}
                    className={`filter-chip ${categoryId === c._id ? 'filter-chip--active' : ''}`}
                    onClick={() => setCategoryId(c._id)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="take-order-dishes">
                {visibleDishes.length === 0 ? (
                  <p className="take-order-muted">{TEXT.NO_DISHES}</p>
                ) : (
                  visibleDishes.map((dish) => {
                    const qty = cart[dish._id]?.quantity ?? 0;
                    return (
                      <div key={dish._id} className="take-order-dish">
                        <span className={`veg-mark ${dish.isVeg ? 'veg-mark--veg' : 'veg-mark--nonveg'}`} />
                        <span className="take-order-dish-name">{dish.name}</span>
                        <span className="take-order-dish-price">{CURRENCY}{dish.price}</span>
                        <div className="qty-stepper">
                          {qty > 0 && (
                            <>
                              <button onClick={() => changeQty(dish, -1)}>−</button>
                              <span>{qty}</span>
                            </>
                          )}
                          <button onClick={() => changeQty(dish, 1)}>+</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cart */}
            <div className="take-order-cart">
              <h3 className="take-order-cart-title">{TEXT.CART}</h3>
              {lines.length === 0 ? (
                <p className="take-order-muted">{TEXT.CART_EMPTY}</p>
              ) : (
                <div className="take-order-lines">
                  {lines.map((l) => (
                    <div key={l.dish._id} className="take-order-line">
                      <div className="take-order-line-top">
                        <span>{l.quantity} × {l.dish.name}</span>
                        <span>{CURRENCY}{l.quantity * l.dish.price}</span>
                      </div>
                      <input
                        className="form-input take-order-note"
                        placeholder={TEXT.ITEM_NOTE}
                        maxLength={200}
                        value={l.notes}
                        onChange={(e) => setNote(l.dish._id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
              <input
                className="form-input"
                placeholder={TEXT.CUSTOMER_NAME}
                maxLength={50}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
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
              <button
                className="btn-primary"
                disabled={placing || lines.length === 0}
                onClick={handlePlace}
              >
                {placing ? TEXT.PLACING : TEXT.PLACE(itemCount)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { TakeOrderModal };
