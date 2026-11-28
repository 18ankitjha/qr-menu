import { createHash } from 'crypto';

/**
 * A short, stable stand-in for a diner inside one table session. Phones use it to tell "my lines" from
 * "theirs" without ever seeing other diners' customer ids (the table room is open to anyone with the table id).
 */
export const memberKey = (sessionId: string, customerId: string): string =>
  createHash('sha256').update(`${sessionId}:${customerId}`).digest('hex').slice(0, 12);

export const lineKey = (sessionId: string, customerId: string, dishId: string): string =>
  `${memberKey(sessionId, customerId)}.${dishId}`;
