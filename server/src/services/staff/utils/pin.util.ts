import crypto from 'crypto';
import { env } from '../../../config/env';
import { STAFF_LIMITS } from '../constants/staff.constants';

// ============================================================
// Staff PIN — hashing (used for login) and reversible encryption (so the owner can view the PIN).
// ============================================================

const SCRYPT_KEY_LENGTH = 32;
const CIPHER = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_INFO = 'qr-menu:staff-pin:v1';

/** 32-byte key from PIN_ENCRYPTION_KEY (or JWT_SECRET if not set), domain-separated with HKDF. */
const encryptionKey = Buffer.from(
  crypto.hkdfSync('sha256', env.PIN_ENCRYPTION_KEY || env.JWT_SECRET, '', KEY_INFO, 32)
);

export const hashPin = (pin: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
};

export const isPinMatch = (pin: string, pinHash: string): boolean => {
  const [salt, hash] = pinHash.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(pin, salt, SCRYPT_KEY_LENGTH);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
};

export const generatePin = (): string =>
  crypto.randomInt(0, 10 ** STAFF_LIMITS.PIN_LENGTH).toString().padStart(STAFF_LIMITS.PIN_LENGTH, '0');

/** `iv:authTag:ciphertext` (hex). */
export const encryptPin = (pin: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(CIPHER, encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(pin, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('hex')).join(':');
};

/** Returns null if the value can't be decrypted (e.g. the key changed). */
export const decryptPin = (value: string): string | null => {
  try {
    const [iv, tag, data] = value.split(':').map((part) => Buffer.from(part, 'hex'));
    const decipher = crypto.createDecipheriv(CIPHER, encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
};
