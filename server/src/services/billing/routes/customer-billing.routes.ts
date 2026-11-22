import { Router } from 'express';
import { requireCustomer } from '../../auth/middlewares/auth.middleware';
import { validateParams } from '../../../middlewares/validate.middleware';
import { sessionIdParamSchema } from '../validators/billing.validator';
import * as CustomerBillingController from '../controllers/customer-billing.controller';

// ============================================================
// Customer Billing Routes — /api/v1/billing/customer  (diner signed in with Google)
// ============================================================

const router = Router();

router.use(requireCustomer);

// GET /billing/customer/getBill/:sessionId
router.get('/getBill/:sessionId', validateParams(sessionIdParamSchema), CustomerBillingController.getBill);

// GET /billing/customer/getPdf/:sessionId
router.get('/getPdf/:sessionId', validateParams(sessionIdParamSchema), CustomerBillingController.getBillPdf);

export default router;
