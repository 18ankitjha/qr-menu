import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { ERROR_MESSAGES } from '../../../config/constants';
import * as PublicMenuDM from '../dm/public-menu.dm';
import { TableDM } from '../../table';

const router = Router();

// ============================================================
// Public Menu Routes — /api/v1/menu/public (no auth)
// Used by the admin "preview menu". Diners now enter through /table-session/resolve (QR token).
// ============================================================

/**
 * GET /menu/public/getMenu/:restaurantId/:tableId
 * Returns the full menu with categories, dishes, theme, and table info.
 */
router.get(
  '/getMenu/:restaurantId/:tableId',
  asyncHandler(async (req: Request, res: Response) => {
    const restaurantId = req.params.restaurantId as string;
    const tableId = req.params.tableId as string;

    const publicMenu = await PublicMenuDM.getPublicMenu(restaurantId);

    const table = await TableDM.getTableById(tableId);
    if (!table || !table.isActive) {
      sendError(res, ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
      return;
    }
    if (table.restaurantId.toString() !== restaurantId) {
      sendError(res, ERROR_MESSAGES.TABLE_RESTAURANT_MISMATCH, 400);
      return;
    }

    sendSuccess(
      res,
      {
        ...publicMenu,
        table: { _id: table._id, tableNumber: table.tableNumber, label: table.label },
      },
      'Menu fetched successfully'
    );
  })
);

export default router;
