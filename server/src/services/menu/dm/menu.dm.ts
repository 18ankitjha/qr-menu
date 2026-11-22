import { MenuModel } from './menu.model';
import {
  IMenu,
  ICreateMenuInput,
  IUpdateMenuInput,
  ISetMenuThemeInput,
} from '../interfaces/menu.interface';
import { IMenuTheme } from '../../../interfaces/common.interface';
import { ERROR_MESSAGES } from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';
import { RestaurantDM } from '../../restaurant';

// ============================================================
// Menu DM Layer — Business logic + Data access
// ============================================================

/**
 * Create a menu for a restaurant.
 * Throws if the restaurant already has a menu.
 */
export const createMenu = async (
  ownerId: string,
  input: ICreateMenuInput
): Promise<IMenu> => {
  // Verify restaurant exists and belongs to the owner
  const restaurant = await RestaurantDM.getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }
  if (restaurant.ownerId.toString() !== ownerId) {
    throw createAppError(ERROR_MESSAGES.FORBIDDEN, 403);
  }

  // Check if menu already exists
  const existing = await MenuModel.findOne({ restaurantId: input.restaurantId }).lean();
  if (existing) {
    throw createAppError(ERROR_MESSAGES.MENU_ALREADY_EXISTS, 409);
  }

  const menu = await MenuModel.create({
    restaurantId: input.restaurantId,
    name: input.name,
  });

  return menu.toObject();
};

/**
 * Get menu by restaurant ID.
 */
export const getMenuByRestaurantId = async (
  restaurantId: string
): Promise<IMenu | null> => {
  return MenuModel.findOne({ restaurantId }).lean();
};

/**
 * Get menu by menu ID.
 */
export const getMenuById = async (menuId: string): Promise<IMenu | null> => {
  return MenuModel.findById(menuId).lean();
};

/**
 * Update menu name or active status.
 */
export const updateMenu = async (
  menuId: string,
  ownerId: string,
  input: IUpdateMenuInput
): Promise<IMenu | null> => {
  const menu = await MenuModel.findById(menuId).lean();
  if (!menu) {
    throw createAppError(ERROR_MESSAGES.MENU_NOT_FOUND, 404);
  }

  // Verify ownership through restaurant
  const restaurant = await RestaurantDM.getRestaurantById(menu.restaurantId.toString());
  if (!restaurant || restaurant.ownerId.toString() !== ownerId) {
    throw createAppError(ERROR_MESSAGES.FORBIDDEN, 403);
  }

  return MenuModel.findByIdAndUpdate(menuId, input, { new: true }).lean();
};

/**
 * Set menu theme (colors, font, layout).
 */
export const setMenuTheme = async (
  menuId: string,
  ownerId: string,
  themeInput: ISetMenuThemeInput
): Promise<IMenu | null> => {
  const menu = await MenuModel.findById(menuId).lean();
  if (!menu) {
    throw createAppError(ERROR_MESSAGES.MENU_NOT_FOUND, 404);
  }

  // Verify ownership
  const restaurant = await RestaurantDM.getRestaurantById(menu.restaurantId.toString());
  if (!restaurant || restaurant.ownerId.toString() !== ownerId) {
    throw createAppError(ERROR_MESSAGES.FORBIDDEN, 403);
  }

  // Merge with existing theme
  const updatedTheme: IMenuTheme = {
    ...menu.theme,
    ...themeInput,
  };

  return MenuModel.findByIdAndUpdate(
    menuId,
    { theme: updatedTheme, themeSavedAt: new Date() },
    { new: true }
  ).lean();
};
