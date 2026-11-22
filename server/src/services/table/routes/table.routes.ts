import { Router, Request } from 'express';
import { requireAuth } from '../../auth/middlewares/auth.middleware';
import {
  ALL_RESTAURANT_ROLES,
  OWNER_ONLY,
  fromBody,
  fromParam,
  requireRestaurantAccess,
} from '../../auth/middlewares/restaurant-access.middleware';
import { validateBody, validateParams } from '../../../middlewares/validate.middleware';
import {
  addTableSchema,
  bulkAddTablesSchema,
  tableIdParamSchema,
  tableIdQrParamSchema,
  restaurantIdParamSchema,
} from '../validators/table.validator';
import * as TableDM from '../dm/table.dm';
import * as TableController from '../controllers/table.controller';
import * as QrController from '../controllers/qr.controller';

// ============================================================
// Table Routes — /api/v1/table (tables + their QR codes)
// ============================================================

const router = Router();

const tableFromParam = (name: string) => async (req: Request) =>
  (await TableDM.getTableById(req.params[name] as string))?.restaurantId.toString();

router.use(requireAuth);

// POST /table/add
router.post(
  '/add',
  validateBody(addTableSchema),
  requireRestaurantAccess(OWNER_ONLY, fromBody('restaurantId')),
  TableController.addTable
);

// POST /table/addBulk
router.post(
  '/addBulk',
  validateBody(bulkAddTablesSchema),
  requireRestaurantAccess(OWNER_ONLY, fromBody('restaurantId')),
  TableController.addBulkTables
);

// GET /table/getAll/:restaurantId — owner or staff
router.get(
  '/getAll/:restaurantId',
  validateParams(restaurantIdParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, fromParam('restaurantId')),
  TableController.getAllTables
);

// DELETE /table/delete/:id
router.delete(
  '/delete/:id',
  validateParams(tableIdParamSchema),
  requireRestaurantAccess(OWNER_ONLY, tableFromParam('id')),
  TableController.deleteTable
);

// POST /table/generateQr/:tableId — new QR token + QR image; QR encodes {QR_BASE_URL}/menu/t/{qrToken}
router.post(
  '/generateQr/:tableId',
  validateParams(tableIdQrParamSchema),
  requireRestaurantAccess(OWNER_ONLY, tableFromParam('tableId')),
  QrController.generateQr
);

// GET /table/getQr/:tableId — owner or staff
router.get(
  '/getQr/:tableId',
  validateParams(tableIdQrParamSchema),
  requireRestaurantAccess(ALL_RESTAURANT_ROLES, tableFromParam('tableId')),
  QrController.getQr
);

export default router;
