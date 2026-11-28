import { ERROR_MESSAGES } from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';
import { RestaurantDM } from '../../restaurant';
import * as MenuDM from './menu.dm';
import * as CategoryDM from './category.dm';
import * as DishDM from './dish.dm';
import { MAX_CATEGORY_DEPTH } from '../constants/menu.constants';

// ============================================================
// Public Menu DM — what a diner sees: restaurant, theme, active categories with their dishes.
// Used by the customer menu (table-session resolve) and the admin "preview menu".
// ============================================================

export const getPublicMenu = async (restaurantId: string) => {
  // Only approved (ACTIVE) restaurants serve their menu
  const restaurant = await RestaurantDM.getRestaurantById(restaurantId);
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }
  if (!RestaurantDM.isRestaurantOperational(restaurant)) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_OPERATIONAL, 403);
  }

  const menu = await MenuDM.getMenuByRestaurantId(restaurantId);
  if (!menu || !menu.isActive) {
    throw createAppError(ERROR_MESSAGES.MENU_NOT_FOUND, 404);
  }

  const [allCategories, allDishes] = await Promise.all([
    CategoryDM.getCategoriesByMenuId(menu._id.toString()),
    DishDM.getDishesByMenuId(menu._id.toString()),
  ]);

  // A hidden category hides its whole branch (sub-categories too)
  const byId = new Map(allCategories.map((c) => [c._id.toString(), c]));
  const isVisible = (c: (typeof allCategories)[number]): boolean => {
    let cur: typeof c | undefined = c;
    for (let hops = 0; cur && hops <= MAX_CATEGORY_DEPTH; hops++) {
      if (!cur.isActive) return false;
      cur = cur.parentId ? byId.get(cur.parentId.toString()) : undefined;
    }
    return true;
  };

  const categories = allCategories
    .filter(isVisible)
    .map((category) => ({
      ...category,
      dishes: allDishes.filter((d) => d.categoryId.toString() === category._id.toString()),
    }));

  return {
    restaurant: {
      _id: restaurant._id,
      name: restaurant.name,
      logoUrl: restaurant.logoUrl,
      billingSettings: restaurant.billingSettings,
    },
    menu: {
      _id: menu._id,
      name: menu.name,
      theme: menu.theme,
      customerOrderingEnabled: menu.customerOrderingEnabled !== false,
    },
    categories,
  };
};

export type IPublicMenu = Awaited<ReturnType<typeof getPublicMenu>>;
