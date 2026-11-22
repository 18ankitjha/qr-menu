import { Request, Response } from 'express';
import { SUCCESS_MESSAGES } from '../../../config/constants';
import { sendSuccess } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import * as TableDM from '../dm/table.dm';
import { generateQrForNewTables, deleteTableQr } from '../utils/qr.util';
import { TABLE_MESSAGES } from '../constants/table.constants';

// ============================================================
// Table Controller — new tables get their QR code automatically
// ============================================================

/**
 * POST /table/add — creates the table, then generates its QR.
 */
export const addTable = asyncHandler(async (req: Request, res: Response) => {
  const created = await TableDM.addTable(req.body);
  const { tables, failedCount } = await generateQrForNewTables([created]);
  sendSuccess(
    res,
    tables[0],
    failedCount ? TABLE_MESSAGES.CREATED_QR_FAILED : TABLE_MESSAGES.CREATED_WITH_QR,
    201
  );
});

/**
 * POST /table/addBulk — creates N tables, then generates a QR for each.
 */
export const addBulkTables = asyncHandler(async (req: Request, res: Response) => {
  const created = await TableDM.addBulkTables(req.body);
  const { tables, failedCount } = await generateQrForNewTables(created);
  sendSuccess(
    res,
    tables,
    failedCount
      ? TABLE_MESSAGES.BULK_CREATED_QR_FAILED(tables.length, failedCount)
      : TABLE_MESSAGES.BULK_CREATED_WITH_QR(tables.length),
    201
  );
});

export const getAllTables = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string;
  const tables = await TableDM.getTablesByRestaurantId(restaurantId);
  sendSuccess(res, tables, 'Tables fetched');
});

export const deleteTable = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await TableDM.deleteTable(id);
  deleteTableQr(id);
  sendSuccess(res, null, SUCCESS_MESSAGES.TABLE_DELETED);
});
