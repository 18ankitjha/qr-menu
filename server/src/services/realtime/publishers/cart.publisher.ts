import { CART_EVENTS, ROOMS } from '../constants/realtime.constants';
import { ICartState } from '../interfaces/realtime.interface';
import { publish } from './publish';

// ============================================================
// Cart publisher — the live shared cart, to the diners of one table session only.
// Unlike other pushes this carries the data itself: phones apply it directly, no REST refetch.
// Staff never hear cart changes; they see food once it is ordered.
// ============================================================

export const cartUpdated = (state: ICartState): void =>
  publish(ROOMS.cart(state.sessionId), CART_EVENTS.CART_UPDATED, state);
