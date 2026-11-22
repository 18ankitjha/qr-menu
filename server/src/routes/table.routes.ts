import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateParams } from '../middlewares/validate.middleware';
import {
  addTableSchema,
  bulkAddTablesSchema,
  tableIdParamSchema,
  restaurantIdParamSchema,
} from '../validators/table.validator';
import * as TableController from '../controllers/table.controller';

const router = Router();

// All table routes require auth
router.use(authMiddleware);

// POST /table/add
router.post(
  '/add',
  validateBody(addTableSchema),
  TableController.addTable
);

// POST /table/addBulk
router.post(
  '/addBulk',
  validateBody(bulkAddTablesSchema),
  TableController.addBulkTables
);

// GET /table/getAll/:restaurantId
router.get(
  '/getAll/:restaurantId',
  validateParams(restaurantIdParamSchema),
  TableController.getAllTables
);

// DELETE /table/delete/:id
router.delete(
  '/delete/:id',
  validateParams(tableIdParamSchema),
  TableController.deleteTable
);

export default router;
