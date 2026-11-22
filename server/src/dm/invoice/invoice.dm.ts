import PDFDocument from 'pdfkit';
import { IInvoiceData, IGenerateInvoiceInput } from '../../interfaces/invoice.interface';
import { ERROR_MESSAGES } from '../../config/constants';
import { createAppError } from '../../middlewares/error.middleware';
import * as OrderDM from '../order/order.dm';
import * as RestaurantDM from '../restaurant/restaurant.dm';
import * as TableDM from '../table/table.dm';
import { IOrder } from '../../interfaces/order.interface';

// ============================================================
// Invoice DM Layer — PDF generation on-the-fly
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
      doc.text(`₹${item.price.toFixed(2)}`, 350, y, { width: 80, align: 'right' });
      doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, y, {
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
    doc.text(`₹${data.totalAmount.toFixed(2)}`, 450, doc.y - 14, {
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

/**
 * Generate a combined PDF invoice for all orders at a table.
 */
export const generateTableInvoicePdf = async (tableId: string): Promise<Buffer> => {
  const table = await TableDM.getTableById(tableId);
  if (!table) {
    throw createAppError(ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
  }

  const orders = await OrderDM.getAllOrdersByTableId(tableId);
  if (orders.length === 0) {
    throw createAppError('No orders found for this table', 404);
  }

  const restaurant = await RestaurantDM.getRestaurantById(orders[0].restaurantId.toString());
  if (!restaurant) {
    throw createAppError(ERROR_MESSAGES.RESTAURANT_NOT_FOUND, 404);
  }

  const grandTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Header ---
    doc.fontSize(24).font('Helvetica-Bold').text(restaurant.name, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(restaurant.address, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).font('Helvetica-Bold').text('TABLE INVOICE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Table: #${table.tableNumber}${table.label ? ` (${table.label})` : ''}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.text(`Total Orders: ${orders.length}`, { align: 'center' });
    doc.moveDown(1);

    // --- Each Order ---
    orders.forEach((order: IOrder, idx: number) => {
      // Order section header
      doc
        .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.4);

      doc.fontSize(11).font('Helvetica-Bold');
      doc.text(
        `Order ${idx + 1}  •  #${order._id.toString().slice(-6).toUpperCase()}`,
        50, doc.y, { continued: true }
      );
      doc.font('Helvetica').fontSize(10)
        .text(`  ${new Date(order.createdAt).toLocaleTimeString()}`, { align: 'right' });
      doc.moveDown(0.4);

      // Items
      doc.fontSize(10).font('Helvetica');
      order.items.forEach((item) => {
        const y = doc.y;
        doc.text(`${item.quantity} × ${item.dishName}`, 60, y, { width: 300 });
        doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 450, y, { width: 95, align: 'right' });
        doc.moveDown(0.4);
      });

      if (order.specialInstructions) {
        doc.fontSize(9).fillColor('#666666')
          .text(`Note: ${order.specialInstructions}`, 60)
          .fillColor('#000000');
        doc.moveDown(0.3);
      }

      // Order subtotal
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Subtotal:`, 350, doc.y, { width: 80, align: 'right' });
      doc.text(`₹${order.totalAmount.toFixed(2)}`, 450, doc.y - 12, { width: 95, align: 'right' });
      doc.moveDown(0.8);
    });

    // --- Grand Total ---
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(2).stroke();
    doc.lineWidth(1);
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('GRAND TOTAL:', 300, doc.y, { width: 140, align: 'right' });
    doc.text(`₹${grandTotal.toFixed(2)}`, 450, doc.y - 16, { width: 95, align: 'right' });
    doc.moveDown(2);

    doc.fontSize(8).font('Helvetica').text('Thank you for dining with us!', { align: 'center' });

    doc.end();
  });
};
