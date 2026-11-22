import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as AuthController from '../controllers/auth.controller';

const router = Router();

// GET /auth/google — Redirect to Google OAuth consent screen
router.get('/google', AuthController.googleRedirect);

// GET /auth/google/callback — Google redirects here after consent
router.get('/google/callback', AuthController.googleCallback);

// POST /auth/google — Verify Google ID token (token-based flow for mobile/SPA)
router.post('/google', AuthController.googleLogin);

// GET /auth/getProfile — Get current user (auth required)
router.get('/getProfile', authMiddleware, AuthController.getProfile);

// POST /auth/logout — Clear auth cookie
router.post('/logout', AuthController.logout);

export default router;
