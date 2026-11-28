import type { ICartLine, IDish, IMyCartItem, ITableSession } from '../types';

// ============================================================
// Optimistic cart edits — what the screen shows while the matching call is on its way.
// The call's response (the server's table view) replaces this a moment later.
// ============================================================

/** Lines shown before the server has given them an id. */
const TEMP_PREFIX = 'draft:';

export const isTempLine = (lineId: string): boolean => lineId.startsWith(TEMP_PREFIX);

const isMyPlainLine = (line: ICartLine, dishId: string): boolean =>
  line.dishId === dishId && line.addedBy.isMe && !line.notes;

const withCart = (session: ITableSession, cart: ICartLine[]): ITableSession => ({
  ...session,
  cart,
  cartTotal: cart.reduce((sum, l) => sum + l.price * l.quantity, 0),
});

/** The diner's menu picks applied to their own plain lines (0 removes the line). */
export const withMyPicks = (
  session: ITableSession,
  picks: IMyCartItem[],
  dishes: Map<string, IDish>,
  myName: string
): ITableSession => {
  let cart = [...session.cart];
  for (const { dishId, quantity } of picks) {
    const index = cart.findIndex((l) => isMyPlainLine(l, dishId));
    if (quantity <= 0) {
      if (index >= 0) cart = cart.filter((_, i) => i !== index);
    } else if (index >= 0) {
      cart[index] = { ...cart[index], quantity };
    } else {
      const dish = dishes.get(dishId);
      if (!dish) continue;
      cart.push({
        _id: `${TEMP_PREFIX}${dishId}`,
        dishId,
        dishName: dish.name,
        price: dish.price,
        quantity,
        addedBy: { name: myName, isMe: true },
      });
    }
  }
  return withCart(session, cart);
};

/** One cart line set to `quantity` (0 removes it). */
export const withQuantity = (session: ITableSession, lineId: string, quantity: number): ITableSession =>
  withCart(
    session,
    quantity <= 0
      ? session.cart.filter((l) => l._id !== lineId)
      : session.cart.map((l) => (l._id === lineId ? { ...l, quantity } : l))
  );
