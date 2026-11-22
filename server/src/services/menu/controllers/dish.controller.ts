import { Request, Response } from 'express';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../../config/constants';
import { sendSuccess, sendError } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import * as DishDM from '../dm/dish.dm';
import { MENU_MESSAGES } from '../constants/menu.constants';

// ============================================================
// Dish Controller
// ============================================================

export const addDish = asyncHandler(async (req: Request, res: Response) => {
  const dish = await DishDM.addDish(req.body);
  sendSuccess(res, dish, SUCCESS_MESSAGES.DISH_ADDED, 201);
});

export const getAllDishes = asyncHandler(async (req: Request, res: Response) => {
  const categoryId = req.params.categoryId as string;
  const dishes = await DishDM.getDishesByCategoryId(categoryId);
  sendSuccess(res, dishes, 'Dishes fetched');
});

/**
 * GET /menu/dish/get/:id — one menu item with all its details.
 */
export const getDish = asyncHandler(async (req: Request, res: Response) => {
  const dish = await DishDM.getDishById(req.params.id as string);
  if (!dish) {
    sendError(res, ERROR_MESSAGES.DISH_NOT_FOUND, 404);
    return;
  }
  sendSuccess(res, dish, MENU_MESSAGES.DISH_FETCHED);
});

export const updateDish = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const dish = await DishDM.updateDish(id, req.body);
  sendSuccess(res, dish, SUCCESS_MESSAGES.DISH_UPDATED);
});

export const setAvailability = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { isAvailable } = req.body;
  const dish = await DishDM.setAvailability(id, isAvailable);
  sendSuccess(res, dish, SUCCESS_MESSAGES.AVAILABILITY_UPDATED);
});

export const deleteDish = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await DishDM.deleteDish(id);
  sendSuccess(res, null, SUCCESS_MESSAGES.DISH_DELETED);
});

export const reorderDishes = asyncHandler(async (req: Request, res: Response) => {
  await DishDM.reorderDishes(req.body.items);
  sendSuccess(res, null, SUCCESS_MESSAGES.DISHES_REORDERED);
});
