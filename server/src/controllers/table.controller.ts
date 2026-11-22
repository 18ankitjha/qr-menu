import { Request, Response } from 'express';
import { SUCCESS_MESSAGES } from '../config/constants';
import { sendSuccess } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import * as TableDM from '../dm/table/table.dm';

// ============================================================
// Table Controller
// ============================================================

export const addTable = asyncHandler(async (req: Request, res: Response) => {
  const table = await TableDM.addTable(req.body);
  sendSuccess(res, table, SUCCESS_MESSAGES.TABLE_CREATED, 201);
});

export const addBulkTables = asyncHandler(async (req: Request, res: Response) => {
  const tables = await TableDM.addBulkTables(req.body);
  sendSuccess(res, tables, SUCCESS_MESSAGES.TABLES_CREATED, 201);
});

export const getAllTables = asyncHandler(async (req: Request, res: Response) => {
  const restaurantId = req.params.restaurantId as string;
  const tables = await TableDM.getTablesByRestaurantId(restaurantId);
  sendSuccess(res, tables, 'Tables fetched');
});

export const deleteTable = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await TableDM.deleteTable(id);
  sendSuccess(res, null, SUCCESS_MESSAGES.TABLE_DELETED);
});
