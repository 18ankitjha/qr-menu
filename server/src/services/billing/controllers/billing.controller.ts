import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { getActorName } from '../../auth/utils/actor.util';
import { BillPublisher } from '../../realtime';
import { BILLING_MESSAGES } from '../constants/billing.constants';
import { IBillFilters } from '../interfaces/bill.interface';
import * as BillDM from '../dm/bill.dm';
import * as InvoiceDM from '../dm/invoice.dm';

// ============================================================
// Billing Controller — table bills + single-order receipts
// ============================================================

const sendPdf = (res: Response, pdf: Buffer, filename: string): void => {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=${filename}`,
    'Content-Length': pdf.length.toString(),
  });
  res.send(pdf);
};

/** GET /billing/previewTableBill/:tableId */
export const previewTableBill = asyncHandler(async (req: Request, res: Response) => {
  const preview = await BillDM.previewTableBill(req.params.tableId as string);
  sendSuccess(res, preview, BILLING_MESSAGES.BILL_PREVIEWED);
});

/** POST /billing/generateTableBill  { tableId } */
export const generateTableBill = asyncHandler(async (req: Request, res: Response) => {
  const generatedBy = await getActorName(req.auth);
  const bill = await BillDM.generateTableBill(req.body.tableId, generatedBy);
  // Staff screens and the diners at the table see the bill immediately
  BillPublisher.billChanged(bill);
  sendSuccess(res, bill, BILLING_MESSAGES.BILL_GENERATED, 201);
});

/** GET /billing/getAll/:restaurantId?status=&tableId=&from=&to= */
export const getAllBills = asyncHandler(async (req: Request, res: Response) => {
  const bills = await BillDM.getBillsByRestaurantId(
    req.params.restaurantId as string,
    req.query as IBillFilters
  );
  sendSuccess(res, bills, BILLING_MESSAGES.BILLS_FETCHED);
});

/** GET /billing/get/:billId */
export const getBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await BillDM.getBillById(req.params.billId as string);
  if (!bill) {
    sendError(res, BILLING_MESSAGES.BILL_NOT_FOUND, 404);
    return;
  }
  sendSuccess(res, bill, BILLING_MESSAGES.BILL_FETCHED);
});

/** GET /billing/getPdf/:billId */
export const getBillPdf = asyncHandler(async (req: Request, res: Response) => {
  const { bill, pdf } = await BillDM.generateBillPdf(req.params.billId as string);
  sendPdf(res, pdf, `bill-${bill.billNumber}.pdf`);
});

/** PATCH /billing/markPaid/:billId  { paymentMode } */
export const markPaid = asyncHandler(async (req: Request, res: Response) => {
  const paidBy = await getActorName(req.auth);
  const bill = await BillDM.markPaid(req.params.billId as string, req.body.paymentMode, paidBy);
  BillPublisher.billChanged(bill);
  sendSuccess(res, bill, BILLING_MESSAGES.BILL_PAID);
});

/** GET /billing/getOrderPdf/:orderId — receipt for a single order */
export const getOrderPdf = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const pdf = await InvoiceDM.generateInvoicePdf({ orderId });
  sendPdf(res, pdf, `order-${orderId}.pdf`);
});
