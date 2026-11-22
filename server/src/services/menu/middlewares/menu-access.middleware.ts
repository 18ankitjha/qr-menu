import { Request } from 'express';
import { RestaurantIdResolver } from '../../auth/middlewares/restaurant-access.middleware';
import * as MenuDM from '../dm/menu.dm';
import * as CategoryDM from '../dm/category.dm';
import * as DishDM from '../dm/dish.dm';

// ============================================================
// Menu Access Resolvers — find which restaurant a menu / category / dish belongs to,
// so requireRestaurantAccess can check the caller's role there.
// ============================================================

const restaurantOfMenu = async (menuId?: string): Promise<string | undefined> =>
  menuId ? (await MenuDM.getMenuById(menuId))?.restaurantId.toString() : undefined;

const restaurantOfCategory = async (categoryId?: string): Promise<string | undefined> => {
  const category = categoryId ? await CategoryDM.getCategoryById(categoryId) : null;
  return category ? restaurantOfMenu(category.menuId.toString()) : undefined;
};

const restaurantOfDish = async (dishId?: string): Promise<string | undefined> => {
  const dish = dishId ? await DishDM.getDishById(dishId) : null;
  return dish ? restaurantOfMenu(dish.menuId.toString()) : undefined;
};

export const menuFromParam = (name: string): RestaurantIdResolver => (req: Request) =>
  restaurantOfMenu(req.params[name] as string);

export const menuFromBody = (name: string): RestaurantIdResolver => (req: Request) =>
  restaurantOfMenu(req.body?.[name]);

export const categoryFromParam = (name: string): RestaurantIdResolver => (req: Request) =>
  restaurantOfCategory(req.params[name] as string);

export const dishFromParam = (name: string): RestaurantIdResolver => (req: Request) =>
  restaurantOfDish(req.params[name] as string);

/** Reorder bodies: `{ items: [{ id }] }`. The DM only reorders items in the first item's menu. */
export const categoryFromReorderItems: RestaurantIdResolver = (req: Request) =>
  restaurantOfCategory(req.body?.items?.[0]?.id);

export const dishFromReorderItems: RestaurantIdResolver = (req: Request) =>
  restaurantOfDish(req.body?.items?.[0]?.id);
