import { TableModel } from './table.model';
import {
  ITable,
  IAddTableInput,
  IBulkAddTablesInput,
} from '../../interfaces/table.interface';
import { ERROR_MESSAGES } from '../../config/constants';
import { createAppError } from '../../middlewares/error.middleware';

// ============================================================
// Table DM Layer
// ============================================================

/**
 * Add a single table.
 */
export const addTable = async (input: IAddTableInput): Promise<ITable> => {
  // Check if table number already exists for this restaurant
  const existing = await TableModel.findOne({
    restaurantId: input.restaurantId,
    tableNumber: input.tableNumber,
  }).lean();

  if (existing) {
    throw createAppError(ERROR_MESSAGES.TABLE_NUMBER_EXISTS, 409);
  }

  const table = await TableModel.create(input);
  return table.toObject();
};

/**
 * Bulk create N tables starting from a given number.
 */
export const addBulkTables = async (input: IBulkAddTablesInput): Promise<ITable[]> => {
  const startNumber = input.startNumber || 1;

  // Find existing table numbers to avoid conflicts
  const existingTables = await TableModel
    .find({ restaurantId: input.restaurantId })
    .select('tableNumber')
    .lean();

  const existingNumbers = new Set(existingTables.map((t) => t.tableNumber));

  const tablesToCreate: { restaurantId: string; tableNumber: number }[] = [];
  let currentNum = startNumber;

  while (tablesToCreate.length < input.count) {
    if (!existingNumbers.has(currentNum)) {
      tablesToCreate.push({
        restaurantId: input.restaurantId,
        tableNumber: currentNum,
      });
    }
    currentNum++;
  }

  const tables = await TableModel.insertMany(tablesToCreate);
  return tables.map((t) => t.toObject());
};

/**
 * Get all tables for a restaurant.
 */
export const getTablesByRestaurantId = async (
  restaurantId: string
): Promise<ITable[]> => {
  return TableModel.find({ restaurantId }).sort({ tableNumber: 1 }).lean();
};

/**
 * Get table by ID.
 */
export const getTableById = async (id: string): Promise<ITable | null> => {
  return TableModel.findById(id).lean();
};

/**
 * Update table's QR code URL.
 */
export const setQrCodeUrl = async (
  id: string,
  qrCodeUrl: string
): Promise<ITable | null> => {
  return TableModel.findByIdAndUpdate(id, { qrCodeUrl }, { new: true }).lean();
};

/**
 * Delete a table.
 */
export const deleteTable = async (id: string): Promise<void> => {
  const table = await TableModel.findById(id).lean();
  if (!table) {
    throw createAppError(ERROR_MESSAGES.TABLE_NOT_FOUND, 404);
  }

  await TableModel.findByIdAndDelete(id);
};
