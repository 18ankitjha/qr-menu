import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../../config/env';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, ClientApp, AuthKind, RestaurantRole } from '../../../config/constants';
import { sendSuccess, sendError } from '../../../utils/response.util';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { isSuperAdminEmail } from '../utils/access.util';
import {
  clearAuthCookie,
  clearCustomerCookie,
  setAuthCookie,
  setCustomerCookie,
  signCustomerToken,
  signStaffToken,
  signUserToken,
} from '../utils/token.util';
import { AUTH_MESSAGES, MENU_RETURN_PATH } from '../constants/auth.constants';
import { IStaffLoginInput, IStaffProfile } from '../interfaces/auth.interface';
import * as UserDM from '../dm/user.dm';
import * as CustomerDM from '../dm/customer.dm';
import { RestaurantDM } from '../../restaurant';
import { StaffDM, StaffLoginResult } from '../../staff';

// ============================================================
// Auth Controller — Google login (owners, super admins) and staff login (waiters)
// ============================================================

const googleClient = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_CALLBACK_URL,
});

/**
 * Where to send the browser after Google login, keyed by the app that started the flow.
 * Only these fixed URLs are allowed — the `state` value is never used as a URL itself.
 */
const getPostLoginRedirect = (state?: string): string => {
  const redirects: Record<Exclude<ClientApp, ClientApp.MENU>, string> = {
    [ClientApp.ADMIN]: env.CLIENT_ADMIN_URL,
    [ClientApp.SUPER_ADMIN]: env.CLIENT_SUPER_ADMIN_URL,
  };
  const app = state === ClientApp.SUPER_ADMIN ? ClientApp.SUPER_ADMIN : ClientApp.ADMIN;
  return `${redirects[app]}/auth/success`;
};

/** Customer menu logins carry `menu:<returnPath>` in `state`; the path must match MENU_RETURN_PATH. */
const MENU_STATE_PREFIX = `${ClientApp.MENU}:`;

const getMenuReturnUrl = (returnPath?: string): string =>
  `${env.CLIENT_MENU_URL}${returnPath && MENU_RETURN_PATH.test(returnPath) ? returnPath : '/'}`;

/**
 * GET /auth/google?app=admin|super-admin
 * GET /auth/google?app=menu&returnTo=/t/<qrToken>   (diner on the customer menu)
 * Redirect user to Google's OAuth consent screen.
 */
export const googleRedirect = (req: Request, res: Response): void => {
  const requestedApp = typeof req.query.app === 'string' ? req.query.app : ClientApp.ADMIN;
  let state = requestedApp;
  if (requestedApp === ClientApp.MENU) {
    const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '';
    state = `${MENU_STATE_PREFIX}${MENU_RETURN_PATH.test(returnTo) ? returnTo : ''}`;
  }
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state,
  });
  res.redirect(authUrl);
};

/**
 * GET /auth/google/callback
 * Google redirects here after user consents.
 * Exchange code for tokens; owners/super admins get the `token` cookie, diners get the customer cookie.
 */
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query as { code?: string; state?: string };

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

  const profile = {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    profilePicture: payload.picture,
  };

  if (state?.startsWith(MENU_STATE_PREFIX)) {
    const customer = await CustomerDM.upsertFromGoogle(profile);
    setCustomerCookie(res, signCustomerToken(customer._id.toString(), customer.email, customer.name));
    res.redirect(getMenuReturnUrl(state.slice(MENU_STATE_PREFIX.length)));
    return;
  }

  const { user } = await UserDM.findOrCreateFromGoogle(profile);

  setAuthCookie(res, signUserToken(user._id.toString(), user.email));

  // Redirect back to the app that started the login
  res.redirect(getPostLoginRedirect(state));
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

  const token = signUserToken(user._id.toString(), user.email);
  setAuthCookie(res, token);

  sendSuccess(res, { user, token, isNewUser }, AUTH_MESSAGES.LOGIN_SUCCESS, 200);
});

/**
 * POST /auth/staffLogin  { restaurantCode, username, pin }
 * Waiters log in with the restaurant's 6-digit code, the username the owner created, and their PIN.
 */
export const staffLogin = asyncHandler(async (req: Request, res: Response) => {
  const { restaurantCode, username, pin } = req.body as IStaffLoginInput;

  const restaurant = await RestaurantDM.getRestaurantByCode(restaurantCode);
  if (!restaurant) {
    sendError(res, AUTH_MESSAGES.INVALID_STAFF_CREDENTIALS, 401);
    return;
  }

  const result = await StaffDM.verifyLogin(restaurant._id.toString(), username, pin);
  if (result.status === StaffLoginResult.LOCKED) {
    sendError(res, AUTH_MESSAGES.STAFF_LOCKED, 429);
    return;
  }
  if (result.status === StaffLoginResult.INACTIVE) {
    sendError(res, AUTH_MESSAGES.STAFF_INACTIVE, 403);
    return;
  }
  if (result.status !== StaffLoginResult.OK || !result.staff) {
    sendError(res, AUTH_MESSAGES.INVALID_STAFF_CREDENTIALS, 401);
    return;
  }

  const { staff } = result;
  setAuthCookie(res, signStaffToken(staff._id.toString(), restaurant._id.toString(), staff.role));
  sendSuccess(res, StaffDM.toPublicStaff(staff), AUTH_MESSAGES.LOGIN_SUCCESS);
});

/**
 * GET /auth/getProfile
 * Owner / super admin: the user document (+ isSuperAdmin, role).
 * Staff: their staff profile with the restaurant they belong to.
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const auth = req.auth;
  if (!auth) {
    sendError(res, ERROR_MESSAGES.UNAUTHORIZED, 401);
    return;
  }

  if (auth.kind === AuthKind.STAFF) {
    const staff = await StaffDM.getStaffById(auth.staffId!);
    if (!staff || !staff.isActive) {
      clearAuthCookie(res);
      sendError(res, AUTH_MESSAGES.STAFF_INACTIVE, 401);
      return;
    }
    const profile: IStaffProfile = {
      kind: AuthKind.STAFF,
      _id: staff._id.toString(),
      name: staff.name,
      username: staff.username,
      role: staff.role,
      restaurantId: staff.restaurantId.toString(),
      isSuperAdmin: false,
    };
    sendSuccess(res, profile, AUTH_MESSAGES.PROFILE_FETCHED);
    return;
  }

  const user = await UserDM.getUserById(auth.userId!);
  if (!user) {
    sendError(res, ERROR_MESSAGES.USER_NOT_FOUND, 404);
    return;
  }

  sendSuccess(
    res,
    {
      ...user,
      kind: AuthKind.USER,
      role: user.restaurantId ? RestaurantRole.OWNER : undefined,
      isSuperAdmin: isSuperAdminEmail(user.email),
    },
    AUTH_MESSAGES.PROFILE_FETCHED
  );
});

/**
 * POST /auth/logout
 * Clear the auth cookie.
 */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  sendSuccess(res, null, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
});

/**
 * GET /auth/customer/getProfile — the diner signed in on the customer menu.
 */
export const getCustomerProfile = asyncHandler(async (req: Request, res: Response) => {
  const customer = await CustomerDM.getCustomerById(req.customer!.customerId);
  if (!customer) {
    clearCustomerCookie(res);
    sendError(res, AUTH_MESSAGES.CUSTOMER_LOGIN_REQUIRED, 401);
    return;
  }
  sendSuccess(res, CustomerDM.toProfile(customer), AUTH_MESSAGES.PROFILE_FETCHED);
});

/**
 * POST /auth/customer/logout — clears only the customer cookie.
 */
export const customerLogout = asyncHandler(async (_req: Request, res: Response) => {
  clearCustomerCookie(res);
  sendSuccess(res, null, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
});
