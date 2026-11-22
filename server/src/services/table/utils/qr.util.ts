import QRCode from 'qrcode';
import { CLOUDINARY_FOLDERS } from '../../../config/constants';
import { env } from '../../../config/env';
import { uploadQrToCloudinary } from '../../../utils/cloudinary.util';
import { logger } from '../../../utils/logger';
import { ITable } from '../interfaces/table.interface';
import { TABLE_QR } from '../constants/table.constants';
import * as TableDM from '../dm/table.dm';

// ============================================================
// Table QR — builds the menu URL for a table, renders the QR, uploads it and saves the URL.
// ============================================================

/**
 * The URL a table's QR encodes: {QR_BASE_URL}/menu/t/{qrToken}.
 * The token is random (not the table id), so a link can't be guessed and can be revoked by regenerating.
 */
export const getTableMenuUrl = (table: ITable & { qrToken: string }): string =>
  `${env.QR_BASE_URL}/menu/t/${table.qrToken}`;

/**
 * Generate + upload + save the QR for one table. Throws on failure.
 * `rotateToken` issues a new token first (owner pressed "Regenerate QR"); tables without a token always get one.
 */
export const generateTableQr = async (
  table: ITable,
  options: { rotateToken?: boolean } = {}
): Promise<{ table: ITable; qrCodeUrl: string; encodedUrl: string }> => {
  const tableId = table._id.toString();
  let current = table;
  if (options.rotateToken || !current.qrToken) {
    const rotated = await TableDM.rotateQrToken(tableId);
    if (!rotated) throw new Error(`Table ${tableId} not found while issuing its QR token`);
    current = rotated;
  }

  const encodedUrl = getTableMenuUrl(current as ITable & { qrToken: string });
  const qrBuffer = await QRCode.toBuffer(encodedUrl, {
    type: 'png',
    width: TABLE_QR.WIDTH,
    margin: TABLE_QR.MARGIN,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });

  const result = await uploadQrToCloudinary(qrBuffer, CLOUDINARY_FOLDERS.QR_CODES, `table-${tableId}`);
  const updated = await TableDM.setQrCodeUrl(tableId, result.secure_url);

  return {
    table: updated ?? { ...current, qrCodeUrl: result.secure_url },
    qrCodeUrl: result.secure_url,
    encodedUrl,
  };
};

/**
 * Best-effort QR for newly created tables. A failed upload never undoes the table —
 * the table is returned without `qrCodeUrl` and the owner can retry from the UI.
 */
export const generateQrForNewTables = async (
  tables: ITable[]
): Promise<{ tables: ITable[]; failedCount: number }> => {
  const results: ITable[] = new Array(tables.length);
  let failedCount = 0;

  for (let i = 0; i < tables.length; i += TABLE_QR.BULK_CONCURRENCY) {
    const batch = tables.slice(i, i + TABLE_QR.BULK_CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((t) => generateTableQr(t)));
    settled.forEach((outcome, j) => {
      if (outcome.status === 'fulfilled') {
        results[i + j] = outcome.value.table;
      } else {
        failedCount++;
        results[i + j] = batch[j];
        logger.warn(`Auto QR generation failed for table ${batch[j]._id.toString()}: ${String(outcome.reason)}`);
      }
    });
  }

  return { tables: results, failedCount };
};
