import dotenv from 'dotenv';
import path from 'path';

// server/.env takes precedence; the repo-root .env fills in anything not set there.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface IEnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  CLIENT_ADMIN_URL: string;
  CLIENT_MENU_URL: string;
  CLIENT_KITCHEN_URL: string;
  CLIENT_SUPER_ADMIN_URL: string;
  QR_BASE_URL: string;
  SUPER_ADMIN_EMAILS: string[];
  PIN_ENCRYPTION_KEY: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

/**
 * Public address of the whole site (all apps + API on one host). Render sets RENDER_EXTERNAL_URL automatically;
 * PUBLIC_URL overrides it (e.g. a custom domain). Locally it's the dev gateway.
 */
export const PUBLIC_URL = (
  process.env.PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'http://localhost:8080'
).replace(/\/+$/, '');

export const env: IEnvConfig = {
  PORT: parseInt(getEnvVar('PORT', '5000'), 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  MONGODB_URI: getEnvVar('MONGODB_URI'),
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: getEnvVar('GOOGLE_CLIENT_SECRET'),
  GOOGLE_CALLBACK_URL: getEnvVar('GOOGLE_CALLBACK_URL', `${PUBLIC_URL}/api/v1/auth/google/callback`),
  CLOUDINARY_CLOUD_NAME: getEnvVar('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: getEnvVar('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: getEnvVar('CLOUDINARY_API_SECRET'),
  // App URLs include their path on the shared host (dev gateway :8080 / reverse proxy in production)
  CLIENT_ADMIN_URL: getEnvVar('CLIENT_ADMIN_URL', `${PUBLIC_URL}/admin`),
  CLIENT_MENU_URL: getEnvVar('CLIENT_MENU_URL', `${PUBLIC_URL}/menu`),
  CLIENT_KITCHEN_URL: getEnvVar('CLIENT_KITCHEN_URL', `${PUBLIC_URL}/kitchen`),
  CLIENT_SUPER_ADMIN_URL: getEnvVar('CLIENT_SUPER_ADMIN_URL', `${PUBLIC_URL}/super-admin`),
  // Host only — QR codes encode `${QR_BASE_URL}/menu/t/<qrToken>`
  QR_BASE_URL: getEnvVar('QR_BASE_URL', PUBLIC_URL),
  // Comma-separated Google account emails allowed into the super admin app
  SUPER_ADMIN_EMAILS: getEnvVar('SUPER_ADMIN_EMAILS', '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  // Encrypts staff PINs so the owner can view them. Falls back to JWT_SECRET; changing it makes saved PINs unviewable (login still works).
  PIN_ENCRYPTION_KEY: getEnvVar('PIN_ENCRYPTION_KEY', ''),
};

/** Distinct origins (scheme + host + port) of the front-end apps, for CORS. Paths are not part of an origin. */
export const CLIENT_ORIGINS: string[] = [
  ...new Set(
    [env.CLIENT_ADMIN_URL, env.CLIENT_MENU_URL, env.CLIENT_KITCHEN_URL, env.CLIENT_SUPER_ADMIN_URL].map(
      (url) => new URL(url).origin
    )
  ),
];
