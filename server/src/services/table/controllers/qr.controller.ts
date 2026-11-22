import { Request, Response } from 'express';
import { ERROR_MESSAGES } from '../../../config/constants';
import { sendSuccess, sendError } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import * as TableDM from '../dm/table.dm';
import { generateTableQr } from '../utils/qr.util';
import { TABLE_MESSAGES } from '../constants/table.constants';

// ============================================================
// QR Controller — QRs are created automatically when tables are added;
// this regenerates one (retry after a failed upload, or for older tables).
// ============================================================

/**
 * POST /table/generateQr/:tableId — issues a NEW QR token (old printed QR / link stops working),
 * then renders and uploads the QR. Also the retry path after a failed upload, and how older tables
 * (id-based links) move to token links.
 */
export const generateQr = asyncHandler(async (req: Request, res: Response) => {
  const tableId = req.params.tableId as string;

  const table = await TableDM.getTableById(tableId);
  if (!table) {
    sendError(res, ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
    return;
  }

  const result = await generateTableQr(table, { rotateToken: true });
  sendSuccess(res, result, TABLE_MESSAGES.QR_REGENERATED);
});

/**
 * GET /table/getQr/:tableId
 */
export const getQr = asyncHandler(async (req: Request, res: Response) => {
  const tableId = req.params.tableId as string;

  const table = await TableDM.getTableById(tableId);
  if (!table) {
    sendError(res, ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
    return;
  }

  if (!table.qrCodeUrl) {
    sendError(res, TABLE_MESSAGES.QR_NOT_GENERATED, 404);
    return;
  }

  sendSuccess(res, { qrCodeUrl: table.qrCodeUrl }, 'QR code fetched');
});
