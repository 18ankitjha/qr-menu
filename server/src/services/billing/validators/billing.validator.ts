import { z } from 'zod';
import { BillStatus, PaymentMode } from '../constants/billing.constants';

// ============================================================
// Billing Validators — Zod schemas
// ============================================================

const objectId = (label: string) => z.string().length(24, `Invalid ${label} ID`);

export const tableIdParamSchema = z.object({ tableId: objectId('table') });
export const billIdParamSchema = z.object({ billId: objectId('bill') });
export const orderIdParamSchema = z.object({ orderId: objectId('order') });
export const restaurantIdParamSchema = z.object({ restaurantId: objectId('restaurant') });
export const sessionIdParamSchema = z.object({ sessionId: objectId('session') });

export const generateTableBillSchema = z.object({ tableId: objectId('table') });

export const getBillsQuerySchema = z.object({
  status: z.nativeEnum(BillStatus).optional(),
  tableId: objectId('table').optional(),
});

export const markPaidSchema = z.object({
  paymentMode: z.nativeEnum(PaymentMode),
});
