import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as InvoiceController from '../controllers/invoice.controller';

const router = Router();

// All invoice routes require auth
router.use(authMiddleware);

// POST /invoice/generate
router.post('/generate', InvoiceController.generateInvoice);

// GET /invoice/getPdf/:orderId
router.get('/getPdf/:orderId', InvoiceController.getPdf);

// GET /invoice/getTablePdf/:tableId
router.get('/getTablePdf/:tableId', InvoiceController.getTablePdf);

export default router;
