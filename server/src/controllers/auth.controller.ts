import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../config/constants';
import { sendSuccess, sendError } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import * as UserDM from '../dm/user/user.dm';

// ============================================================
// Auth Controller
// ============================================================

const googleClient = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_CALLBACK_URL,
});

/**
 * Generate a JWT token for a user.
 */
const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
};

/**
 * GET /auth/google
 * Redirect user to Google's OAuth consent screen.
 */
export const googleRedirect = (_req: Request, res: Response): void => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });
  res.redirect(authUrl);
};

/**
 * GET /auth/google/callback
 * Google redirects here after user consents.
 * Exchange code for tokens, find/create user, set JWT cookie.
 */
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.query as { code?: string };

  if (!code) {
    sendError(res, 'Authorization code missing', 400);
    return;
  }

  const { tokens } = await googleClient.getToken(code);

  if (!tokens.id_token) {
    sendError(res, 'Failed to retrieve ID token from Google', 401);
    return;
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    sendError(res, 'Invalid Google token payload', 401);
    return;
  }

  const { user } = await UserDM.findOrCreateFromGoogle({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    profilePicture: payload.picture,
  });

  const token = generateToken(user._id.toString(), user.email);

  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Redirect to the admin frontend after successful login
  res.redirect(`${env.CLIENT_ADMIN_URL}/auth/success`);
});

/**
 * POST /auth/google
 * Verify Google ID token and login/register user.
 * Expects { idToken } in request body.
 */
export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    sendError(res, 'Google ID token is required', 400);
    return;
  }

  // Verify Google ID token
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    sendError(res, 'Invalid Google token', 401);
    return;
  }

  // Find or create user
  const { user, isNewUser } = await UserDM.findOrCreateFromGoogle({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    profilePicture: payload.picture,
  });

  // Generate JWT
  const token = generateToken(user._id.toString(), user.email);

  // Set cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  sendSuccess(res, { user, token, isNewUser }, 'Login successful', 200);
});

/**
 * GET /auth/getProfile
 * Get the current logged-in user's profile.
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
    return;
  }

  const user = await UserDM.getUserById(req.user.userId);
  if (!user) {
    sendError(res, ERROR_MESSAGES.USER_NOT_FOUND, 404);
    return;
  }

  sendSuccess(res, user, 'Profile fetched');
});

/**
 * POST /auth/logout
 * Clear the auth cookie.
 */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('token');
  sendSuccess(res, null, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
});
