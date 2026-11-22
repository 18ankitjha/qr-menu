import type { IOrderItem } from '../../order';

// ============================================================
// Invoice Interface — Generated on-the-fly (not stored in DB)
// ============================================================

export interface IInvoiceData {
  invoiceNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  tableNumber: number;
  tableLabel?: string;
  customerName?: string;
  items: IOrderItem[];
  totalAmount: number;
  orderId: string;
  orderDate: Date;
  generatedAt: Date;
}

export interface IGenerateInvoiceInput {
  orderId: string;
}
