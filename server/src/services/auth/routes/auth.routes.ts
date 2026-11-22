import { Router } from 'express';
import { requireAuth, requireCustomer } from '../middlewares/auth.middleware';
import { validateBody } from '../../../middlewares/validate.middleware';
import { staffLoginSchema } from '../validators/auth.validator';
import * as AuthController from '../controllers/auth.controller';

// ============================================================
// Auth Routes — /api/v1/auth
// ============================================================

const router = Router();

// GET /auth/google — Redirect to Google OAuth consent screen
router.get('/google', AuthController.googleRedirect);

// GET /auth/google/callback — Google redirects here after consent
router.get('/google/callback', AuthController.googleCallback);

// POST /auth/google — Verify Google ID token (token-based flow for mobile/SPA)
router.post('/google', AuthController.googleLogin);

// POST /auth/staffLogin — Waiter login with restaurant code + username + PIN
router.post('/staffLogin', validateBody(staffLoginSchema), AuthController.staffLogin);

// GET /auth/getProfile — Current caller (owner/super admin or staff)
router.get('/getProfile', requireAuth, AuthController.getProfile);

// POST /auth/logout — Clear auth cookie
router.post('/logout', AuthController.logout);

// ---- Customer menu (diners) — Google sign-in starts at GET /auth/google?app=menu&returnTo=/t/<qrToken> ----

// GET /auth/customer/getProfile — signed-in diner
router.get('/customer/getProfile', requireCustomer, AuthController.getCustomerProfile);

// POST /auth/customer/logout — clear the customer cookie only
router.post('/customer/logout', AuthController.customerLogout);

export default router;
