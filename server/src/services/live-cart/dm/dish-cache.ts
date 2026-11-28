import { DishDM, MenuDM } from '../../menu';
import { LIVE_CART_LIMITS } from '../constants/live-cart.constants';

// ============================================================
// Dish cache — what diners of a restaurant may add to a cart, cached briefly so taps don't hit the DB.
// Placing the order re-checks every dish against the DB, so a stale entry can never put a sold-out dish
// on an order — at worst it sits in the cart a minute longer.
// ============================================================

export interface IOrderableMenu {
  orderingEnabled: boolean;
  dishes: Map<string, { name: string; price: number }>;
}

const cache = new Map<string, { at: number; menu: Promise<IOrderableMenu> }>();

const load = async (restaurantId: string): Promise<IOrderableMenu> => {
  const menu = await MenuDM.getMenuByRestaurantId(restaurantId);
  const dishes = menu ? await DishDM.getDishesByMenuId(menu._id.toString()) : [];
  return {
    orderingEnabled: menu?.customerOrderingEnabled !== false,
    dishes: new Map(dishes.map((d) => [d._id.toString(), { name: d.name, price: d.price }])),
  };
};

export const getOrderableMenu = (restaurantId: string): Promise<IOrderableMenu> => {
  const hit = cache.get(restaurantId);
  if (hit && Date.now() - hit.at < LIVE_CART_LIMITS.DISH_CACHE_MS) return hit.menu;
  const menu = load(restaurantId);
  cache.set(restaurantId, { at: Date.now(), menu });
  menu.catch(() => cache.delete(restaurantId));
  return menu;
};

/** Forget expired entries (called by the live cart's sweeper). */
export const pruneDishCache = (): void => {
  const cutoff = Date.now() - LIVE_CART_LIMITS.DISH_CACHE_MS;
  for (const [id, entry] of cache) if (entry.at < cutoff) cache.delete(id);
};
