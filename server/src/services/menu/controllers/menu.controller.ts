import { Request, Response } from 'express';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../../config/constants';
import { sendSuccess, sendError } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import * as MenuDM from '../dm/menu.dm';

// ============================================================
// Menu Controller
// ============================================================

/**
 * POST /menu/create
 */
export const createMenu = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user!.userId;
  const menu = await MenuDM.createMenu(ownerId, req.body);
  sendSuccess(res, menu, SUCCESS_MESSAGES.MENU_CREATED, 201);
});

/**
 * GET /menu/get/:restaurantId
 */
export const getMenu = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string;
  const menu = await MenuDM.getMenuByRestaurantId(restaurantId);
  if (!menu) {
    sendError(res, ERROR_MESSAGES.MENU_NOT_FOUND, 404);
    return;
  }
  sendSuccess(res, menu, 'Menu fetched');
});

/**
 * PUT /menu/update/:menuId
 */
export const updateMenu = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user!.userId;
  const menuId = req.params.menuId as string;
  const menu = await MenuDM.updateMenu(menuId, ownerId, req.body);
  sendSuccess(res, menu, SUCCESS_MESSAGES.MENU_UPDATED);
});

/**
 * PUT /menu/setTheme/:menuId
 */
export const setTheme = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user!.userId;
  const menuId = req.params.menuId as string;
  const menu = await MenuDM.setMenuTheme(menuId, ownerId, req.body);
  sendSuccess(res, menu, SUCCESS_MESSAGES.THEME_UPDATED);
});
