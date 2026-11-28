import { ROOMS, RESTAURANT_EVENTS } from '../constants/realtime.constants';
import { IRestaurantSignal } from '../interfaces/realtime.interface';
import { publish } from './publish';

// ============================================================
// Restaurant publisher — account-level changes the owner's screens should notice at once.
// ============================================================

/** The super admin approved / rejected / suspended / reactivated the restaurant. */
export const restaurantStatusChanged = (restaurantId: string, status: string): void => {
  const signal: IRestaurantSignal = { restaurantId, status };
  publish(ROOMS.restaurant(restaurantId), RESTAURANT_EVENTS.RESTAURANT_UPDATED, signal);
};
