import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';
import { BillModel } from './bill.model';
import { nextSequence } from './counter.model';
import {
  IBill,
  IBillFilters,
  IBillItem,
  IBillPreview,
  IBillTotals,
} from '../interfaces/bill.interface';
import {
  BILL_NUMBER,
  BILLING_MESSAGES,
  BillStatus,
  PaymentMode,
} from '../constants/billing.constants';
import { ACTIVE_ORDER_STATUSES, ERROR_MESSAGES, OrderStatus } from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';
import { OrderDM, IOrder } from '../../order';
import { TableDM, ITable } from '../../table';
import { RestaurantDM, IBillingSettings } from '../../restaurant';
import { TableSessionDM } from '../../table-session';
import { LiveCartDM } from '../../live-cart';
import { logger } from '../../../utils/logger';

// ============================================================
// Bill DM Layer — table bills (all unbilled orders on a table → one bill)
// ============================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Merge order lines into bill lines (same dish + same price → one line) and apply
 * service charge, then GST on (subtotal + service charge).
 */
export const computeTotals = (orders: IOrder[], settings?: IBillingSettings): IBillTotals => {
  const lines = new Map<string, IBillItem>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = `${item.dishId.toString()}:${item.price}`;
      const line = lines.get(key);
      if (line) {
        line.quantity += item.quantity;
        line.amount = round2(line.price * line.quantity);
      } else {
        lines.set(key, {
          dishId: item.dishId,
          dishName: item.dishName,
          price: item.price,
          quantity: item.quantity,
          amount: round2(item.price * item.quantity),
        });
      }
    }
  }

  const items = [...lines.values()];
  const subtotal = round2(items.reduce((sum, i) => sum + i.amount, 0));
  const serviceChargePercent = settings?.serviceChargePercent ?? 0;
  const gstPercent = settings?.gstPercent ?? 0;
  const serviceChargeAmount = round2((subtotal * serviceChargePercent) / 100);
  const gstAmount = round2(((subtotal + serviceChargeAmount) * gstPercent) / 100);

  return {
    items,
    subtotal,
    serviceChargePercent,
    serviceChargeAmount,
    gstPercent,
    gstAmount,
    totalAmount: round2(subtotal + serviceChargeAmount + gstAmount),
  };
};

const loadTableContext = async (tableId: string) => {
  const table = await TableDM.getTableById(tableId);
  if (!table) {
    throw createAppError(ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
  }
  const restaurant = await RestaurantDM.getRestaurantById(table.restaurantId.toString());
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }
  const orders = await OrderDM.getUnbilledBillableOrders(tableId);
  return { table: table as ITable, restaurant, orders };
};

/**
 * What the next bill for this table would look like. Nothing is saved.
 */
export const previewTableBill = async (tableId: string): Promise<IBillPreview> => {
  const { table, restaurant, orders } = await loadTableContext(tableId);
  return {
    tableId,
    tableNumber: table.tableNumber,
    tableLabel: table.label,
    orderCount: orders.length,
    pendingOrders: orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status as OrderStatus)).length,
    ...computeTotals(orders, restaurant.billingSettings),
  };
};

/**
 * Create a bill for every unbilled, non-cancelled order on the table.
 * Orders are claimed first (billId set only where still null); if another bill claimed any
 * of them in the meantime, the claim is rolled back and a 409 is returned.
 */
export const generateTableBill = async (tableId: string, generatedBy: string): Promise<IBill> => {
  const startedAt = new Date();
  const { table, restaurant, orders } = await loadTableContext(tableId);
  if (orders.length === 0) {
    throw createAppError(BILLING_MESSAGES.NOTHING_TO_BILL, 400);
  }

  const billId = new Types.ObjectId();
  const orderIds = orders.map((o) => o._id.toString());

  const claimed = await OrderDM.markOrdersBilled(orderIds, billId.toString());
  if (claimed !== orders.length) {
    await OrderDM.unmarkOrdersBilled(billId.toString());
    throw createAppError(BILLING_MESSAGES.BILL_CONFLICT, 409);
  }

  try {
    const restaurantId = restaurant._id.toString();
    const seq = await nextSequence(`${BILL_NUMBER.COUNTER_KEY_PREFIX}${restaurantId}`);

    const bill = await BillModel.create({
      _id: billId,
      restaurantId,
      tableId,
      tableNumber: table.tableNumber,
      tableLabel: table.label,
      billNumber: `${BILL_NUMBER.PREFIX}${String(seq).padStart(BILL_NUMBER.PAD, '0')}`,
      orderIds,
      ...computeTotals(orders, restaurant.billingSettings),
      status: BillStatus.UNPAID,
      generatedBy,
    });
    // The customer's cancelled orders close with this bill (they are not in orderIds and not charged).
    // The bill is already saved, so a failure here must not fail the request.
    await OrderDM.closeNonBillableOrders(tableId, billId.toString(), startedAt).catch((error) =>
      logger.warn(`Could not close cancelled orders for bill ${billId.toString()}`, error)
    );
    // The diners' table session ends with this bill; the next scan of the QR starts a fresh cart.
    await TableSessionDM.closeForBill(tableId, billId.toString())
      .then((closed) => closed && LiveCartDM.drop(closed._id.toString()))
      .catch((error) =>
        logger.warn(`Could not close the table session for bill ${billId.toString()}`, error)
      );
    return bill.toObject() as unknown as IBill;
  } catch (error) {
    await OrderDM.unmarkOrdersBilled(billId.toString());
    throw error;
  }
};

export const getBillById = async (billId: string): Promise<IBill | null> =>
  BillModel.findById(billId).lean<IBill>();

/**
 * Bills for a restaurant, newest first. Optional status / table / created-at range filters.
 */
export const getBillsByRestaurantId = async (
  restaurantId: string,
  filters: IBillFilters = {}
): Promise<IBill[]> => {
  const query: Record<string, unknown> = { restaurantId };
  if (filters.status) query.status = filters.status;
  if (filters.tableId) query.tableId = filters.tableId;
  if (filters.from || filters.to) {
    query.createdAt = {
      ...(filters.from && { $gte: filters.from }),
      ...(filters.to && { $lt: filters.to }),
    };
  }
  return BillModel.find(query).sort({ createdAt: -1 }).lean<IBill[]>();
};

/**
 * Mark an unpaid bill as paid.
 */
export const markPaid = async (
  billId: string,
  paymentMode: PaymentMode,
  paidBy: string
): Promise<IBill> => {
  const bill = await BillModel.findOneAndUpdate(
    { _id: billId, status: BillStatus.UNPAID },
    { status: BillStatus.PAID, paymentMode, paidAt: new Date(), paidBy },
    { new: true }
  ).lean<IBill>();

  if (bill) return bill;

  const existing = await BillModel.exists({ _id: billId });
  throw existing
    ? createAppError(BILLING_MESSAGES.BILL_ALREADY_PAID, 409)
    : createAppError(BILLING_MESSAGES.BILL_NOT_FOUND, 404);
};

const money = (n: number): string => `Rs. ${n.toFixed(2)}`;

/**
 * Printable PDF for a saved bill.
 */
export const generateBillPdf = async (billId: string): Promise<{ bill: IBill; pdf: Buffer }> => {
  const bill = await getBillById(billId);
  if (!bill) {
    throw createAppError(BILLING_MESSAGES.BILL_NOT_FOUND, 404);
  }
  const restaurant = await RestaurantDM.getRestaurantById(bill.restaurantId.toString());
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }

  const pdf = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).font('Helvetica-Bold').text(restaurant.name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(restaurant.address, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica-Bold').text('BILL', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Bill #: ${bill.billNumber}`);
    doc.text(`Date: ${new Date(bill.createdAt).toLocaleString()}`);
    doc.text(`Table: #${bill.tableNumber}${bill.tableLabel ? ` (${bill.tableLabel})` : ''}`);
    doc.text(`Orders: ${bill.orderIds.length}`);
    doc.text(`Status: ${bill.status}${bill.paymentMode ? ` (${bill.paymentMode})` : ''}`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    const headerY = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, headerY, { width: 220 });
    doc.text('Qty', 280, headerY, { width: 50, align: 'center' });
    doc.text('Price', 340, headerY, { width: 90, align: 'right' });
    doc.text('Amount', 440, headerY, { width: 105, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica');
    for (const item of bill.items) {
      const y = doc.y;
      doc.text(item.dishName, 50, y, { width: 220 });
      doc.text(String(item.quantity), 280, y, { width: 50, align: 'center' });
      doc.text(money(item.price), 340, y, { width: 90, align: 'right' });
      doc.text(money(item.amount), 440, y, { width: 105, align: 'right' });
      doc.moveDown(0.5);
    }

    doc.moveDown(0.3);
    doc.moveTo(300, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    const totalLine = (label: string, value: string, bold = false) => {
      const y = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10);
      doc.text(label, 280, y, { width: 150, align: 'right' });
      doc.text(value, 440, y, { width: 105, align: 'right' });
      doc.moveDown(0.4);
    };

    totalLine('Subtotal', money(bill.subtotal));
    if (bill.serviceChargePercent > 0) {
      totalLine(`Service charge (${bill.serviceChargePercent}%)`, money(bill.serviceChargeAmount));
    }
    if (bill.gstPercent > 0) {
      totalLine(`GST (${bill.gstPercent}%)`, money(bill.gstAmount));
    }
    totalLine('TOTAL', money(bill.totalAmount), true);

    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').text('Thank you for dining with us!', 50, doc.y, {
      width: 495,
      align: 'center',
    });
    doc.end();
  });

  return { bill, pdf };
};
