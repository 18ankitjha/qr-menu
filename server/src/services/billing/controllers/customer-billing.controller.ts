import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response.util';
import { asyncHandler, createAppError } from '../../../middlewares/error.middleware';
import { TableSessionDM, TableSessionStatus } from '../../table-session';
import { BILLING_MESSAGES } from '../constants/billing.constants';
import * as BillDM from '../dm/bill.dm';

// ============================================================
// Customer Billing Controller — a diner sees the bill for their own table session only
// ============================================================

const toDinerBill = (bill: Awaited<ReturnType<typeof BillDM.getBillById>> & object) => ({
  _id: bill._id.toString(),
  billNumber: bill.billNumber,
  tableNumber: bill.tableNumber,
  tableLabel: bill.tableLabel,
  items: bill.items.map((i) => ({ dishName: i.dishName, price: i.price, quantity: i.quantity, amount: i.amount })),
  subtotal: bill.subtotal,
  serviceChargePercent: bill.serviceChargePercent,
  serviceChargeAmount: bill.serviceChargeAmount,
  gstPercent: bill.gstPercent,
  gstAmount: bill.gstAmount,
  totalAmount: bill.totalAmount,
  status: bill.status,
  paymentMode: bill.paymentMode,
  paidAt: bill.paidAt,
  createdAt: bill.createdAt,
});

/**
 * GET /billing/customer/getBill/:sessionId
 * Billed table → `{ final }` (the real bill, paid or not). Still eating → `{ preview }` (running total so far).
 */
export const getBill = asyncHandler(async (req: Request, res: Response) => {
  const session = await TableSessionDM.getSessionForMember(req.params.sessionId as string, req.customer!.customerId);

  if (session.billId) {
    const bill = await BillDM.getBillById(session.billId.toString());
    if (!bill) throw createAppError(BILLING_MESSAGES.BILL_NOT_FOUND, 404);
    sendSuccess(res, { final: toDinerBill(bill), preview: null }, BILLING_MESSAGES.BILL_FETCHED);
    return;
  }
  if (session.status === TableSessionStatus.OPEN) {
    const preview = await BillDM.previewTableBill(session.tableId.toString());
    sendSuccess(res, { final: null, preview }, BILLING_MESSAGES.BILL_PREVIEWED);
    return;
  }
  sendSuccess(res, { final: null, preview: null }, BILLING_MESSAGES.BILL_FETCHED);
});

/** GET /billing/customer/getPdf/:sessionId — the diner's final bill as a PDF. */
export const getBillPdf = asyncHandler(async (req: Request, res: Response) => {
  const session = await TableSessionDM.getSessionForMember(req.params.sessionId as string, req.customer!.customerId);
  if (!session.billId) throw createAppError(BILLING_MESSAGES.BILL_NOT_FOUND, 404);

  const { bill, pdf } = await BillDM.generateBillPdf(session.billId.toString());
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=bill-${bill.billNumber}.pdf`,
    'Content-Length': pdf.length.toString(),
  });
  res.send(pdf);
});
