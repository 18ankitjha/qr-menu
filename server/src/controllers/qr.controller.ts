import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, CLOUDINARY_FOLDERS } from '../config/constants';
import { sendSuccess, sendError } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import { env } from '../config/env';
import { uploadQrToCloudinary } from '../utils/cloudinary.util';
import * as TableDM from '../dm/table/table.dm';
import * as RestaurantDM from '../dm/restaurant/restaurant.dm';

// ============================================================
// QR Controller
// ============================================================

/**
 * POST /qr/generate/:tableId
 */
export const generateQr = asyncHandler(async (req: Request, res: Response) => {
  const tableId = req.params.tableId as string;

  const table = await TableDM.getTableById(tableId);
  if (!table) {
    sendError(res, ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
    return;
  }

  const restaurant = await RestaurantDM.getRestaurantById(table.restaurantId.toString());
  if (!restaurant) {
    sendError(res, ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
    return;
  }

  // Build the URL that the QR code will encode
  const menuUrl = `${env.QR_BASE_URL}/menu/${restaurant._id.toString()}/${tableId}`;

  // Generate QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(menuUrl, {
    type: 'png',
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });

  // Upload to Cloudinary
  const publicId = `table-${tableId}`;
  const result = await uploadQrToCloudinary(qrBuffer, CLOUDINARY_FOLDERS.QR_CODES, publicId);

  // Save QR URL to table
  const updatedTable = await TableDM.setQrCodeUrl(tableId, result.secure_url);

  sendSuccess(
    res,
    { table: updatedTable, qrCodeUrl: result.secure_url, encodedUrl: menuUrl },
    SUCCESS_MESSAGES.QR_GENERATED
  );
});

/**
 * GET /qr/get/:tableId
 */
export const getQr = asyncHandler(async (req: Request, res: Response) => {
  const tableId = req.params.tableId as string;

  const table = await TableDM.getTableById(tableId);
  if (!table) {
    sendError(res, ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
    return;
  }

  if (!table.qrCodeUrl) {
    sendError(res, 'QR code has not been generated for this table', 404);
    return;
  }

  sendSuccess(res, { qrCodeUrl: table.qrCodeUrl }, 'QR code fetched');
});
