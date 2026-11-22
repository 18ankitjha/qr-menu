import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as QrController from '../controllers/qr.controller';

const router = Router();

// All QR routes require auth
router.use(authMiddleware);

// POST /qr/generate/:tableId
router.post('/generate/:tableId', QrController.generateQr);

// GET /qr/get/:tableId
router.get('/get/:tableId', QrController.getQr);

export default router;
