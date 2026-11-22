import { Request, Response } from 'express';
import { SUCCESS_MESSAGES } from '../config/constants';
import { sendSuccess } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import * as InvoiceDM from '../dm/invoice/invoice.dm';

// ============================================================
// Invoice Controller
// ============================================================

/**
 * POST /invoice/generate
 */
export const generateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.body;
  const invoiceData = await InvoiceDM.buildInvoiceData({ orderId });
  sendSuccess(res, invoiceData, SUCCESS_MESSAGES.INVOICE_GENERATED);
});

/**
 * GET /invoice/getPdf/:orderId
 */
export const getPdf = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const pdfBuffer = await InvoiceDM.generateInvoicePdf({ orderId });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=invoice-${orderId}.pdf`,
    'Content-Length': pdfBuffer.length.toString(),
  });

  res.send(pdfBuffer);
});

/**
 * GET /invoice/getTablePdf/:tableId
 * Combined invoice for all orders at a table.
 */
export const getTablePdf = asyncHandler(async (req: Request, res: Response) => {
  const tableId = req.params.tableId as string;
  const pdfBuffer = await InvoiceDM.generateTableInvoicePdf(tableId);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=table-invoice-${tableId}.pdf`,
    'Content-Length': pdfBuffer.length.toString(),
  });

  res.send(pdfBuffer);
});
