import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import { ERROR_MESSAGES } from '../config/constants';
import * as MenuDM from '../dm/menu/menu.dm';
import * as CategoryDM from '../dm/category/category.dm';
import * as DishDM from '../dm/dish/dish.dm';
import * as RestaurantDM from '../dm/restaurant/restaurant.dm';
import * as TableDM from '../dm/table/table.dm';

const router = Router();

// ============================================================
// Public Routes — No Auth Required (QR scan entry point)
// ============================================================

/**
 * GET /public/getMenu/:restaurantId/:tableId
 * Returns the full menu with categories, dishes, theme, and table info.
 * This is the primary endpoint called when a customer scans a QR code.
 */
router.get(
  '/getMenu/:restaurantId/:tableId',
  asyncHandler(async (req: Request, res: Response) => {
    const restaurantId = req.params.restaurantId as string;
    const tableId = req.params.tableId as string;

    // Fetch restaurant
    const restaurant = await RestaurantDM.getRestaurantById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      sendError(res, ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
      return;
    }

    // Fetch table
    const table = await TableDM.getTableById(tableId);
    if (!table || !table.isActive) {
      sendError(res, ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
      return;
    }

    // Verify table belongs to restaurant
    if (table.restaurantId.toString() !== restaurantId) {
      sendError(res, 'Table does not belong to this restaurant', 400);
      return;
    }

    // Fetch menu for restaurant
    const menu = await MenuDM.getMenuByRestaurantId(restaurantId);
    if (!menu || !menu.isActive) {
      sendError(res, ERROR_MESSAGES.MENU_NOT_FOUND, 404);
      return;
    }

    // Fetch active categories
    const allCategories = await CategoryDM.getCategoriesByMenuId(menu._id.toString());
    const activeCategories = allCategories.filter((c) => c.isActive);

    // Fetch available dishes for menu
    const allDishes = await DishDM.getDishesByMenuId(menu._id.toString());

    // Group dishes by category
    const categoriesWithDishes = activeCategories.map((category) => ({
      ...category,
      dishes: allDishes.filter(
        (d) => d.categoryId.toString() === category._id.toString()
      ),
    }));

    sendSuccess(
      res,
      {
        restaurant: {
          _id: restaurant._id,
          name: restaurant.name,
          logoUrl: restaurant.logoUrl,
        },
        table: {
          _id: table._id,
          tableNumber: table.tableNumber,
          label: table.label,
        },
        menu: {
          _id: menu._id,
          name: menu.name,
          theme: menu.theme,
        },
        categories: categoriesWithDishes,
      },
      'Menu fetched successfully'
    );
  })
);

export default router;
