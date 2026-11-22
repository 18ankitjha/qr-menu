import PDFDocument from 'pdfkit';
import { IInvoiceData, IGenerateInvoiceInput } from '../interfaces/invoice.interface';
import { ERROR_MESSAGES } from '../../../config/constants';
import { createAppError } from '../../../middlewares/error.middleware';
import { OrderDM } from '../../order';
import { RestaurantDM } from '../../restaurant';
import { TableDM } from '../../table';

// ============================================================
// Invoice DM Layer — single-order receipt PDF, generated on-the-fly
// ============================================================

/**
 * Build invoice data from an order.
 */
export const buildInvoiceData = async (
  input: IGenerateInvoiceInput
): Promise<IInvoiceData> => {
  const order = await OrderDM.getOrderById(input.orderId);
  if (!order) {
    throw createAppError(ERROR_MESSAGES.ORDER_NOT_FOUND, 404);
  }

  const restaurant = await RestaurantDM.getRestaurantById(order.restaurantId.toString());
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }

  const table = await TableDM.getTableById(order.tableId.toString());
  if (!table) {
    throw createAppError(ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
  }

  return {
    invoiceNumber: `INV-${order._id.toString().slice(-8).toUpperCase()}`,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    tableNumber: table.tableNumber,
    tableLabel: table.label,
    customerName: order.customerName,
    items: order.items,
    totalAmount: order.totalAmount,
    orderId: order._id.toString(),
    orderDate: order.createdAt,
    generatedAt: new Date(),
  };
};

/**
 * Generate a PDF invoice and return it as a Buffer.
 */
export const generateInvoicePdf = async (
  input: IGenerateInvoiceInput
): Promise<Buffer> => {
  const data = await buildInvoiceData(input);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Header ---
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(data.restaurantName, { align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(data.restaurantAddress, { align: 'center' });

    doc.moveDown(0.5);

    // --- Invoice Details ---
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('INVOICE', { align: 'center' });

    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice #: ${data.invoiceNumber}`);
    doc.text(`Order Date: ${data.orderDate.toLocaleDateString()} ${data.orderDate.toLocaleTimeString()}`);
    doc.text(`Table: #${data.tableNumber}${data.tableLabel ? ` (${data.tableLabel})` : ''}`);
    if (data.customerName) {
      doc.text(`Customer: ${data.customerName}`);
    }
    doc.text(`Generated: ${data.generatedAt.toLocaleString()}`);

    doc.moveDown(1);

    // --- Divider ---
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.5);

    // --- Items Header ---
    const tableTop = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', 50, tableTop, { width: 200 });
    doc.text('Qty', 280, tableTop, { width: 50, align: 'center' });
    doc.text('Price', 350, tableTop, { width: 80, align: 'right' });
    doc.text('Total', 450, tableTop, { width: 95, align: 'right' });

    doc.moveDown(0.5);

    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.3);

    // --- Items ---
    doc.fontSize(10).font('Helvetica');
    for (const item of data.items) {
      const y = doc.y;
      doc.text(item.dishName, 50, y, { width: 200 });
      doc.text(item.quantity.toString(), 280, y, { width: 50, align: 'center' });
      doc.text(`Rs. ${item.price.toFixed(2)}`, 350, y, { width: 80, align: 'right' });
      doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, 450, y, {
        width: 95,
        align: 'right',
      });
      doc.moveDown(0.5);
    }

    // --- Total ---
    doc.moveDown(0.5);
    doc
      .moveTo(350, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('TOTAL:', 350, doc.y, { width: 80, align: 'right' });
    doc.text(`Rs. ${data.totalAmount.toFixed(2)}`, 450, doc.y - 14, {
      width: 95,
      align: 'right',
    });

    doc.moveDown(2);

    // --- Footer ---
    doc
      .fontSize(8)
      .font('Helvetica')
      .text('Thank you for your order!', { align: 'center' });

    doc.end();
  });
};
