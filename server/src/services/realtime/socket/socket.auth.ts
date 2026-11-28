import { Socket } from 'socket.io';
import { authContextFromToken } from '../../auth/middlewares/auth.middleware';
import { AUTH_COOKIE, CUSTOMER_COOKIE } from '../../auth/constants/auth.constants';
import { isCustomerPayload, verifyToken } from '../../auth/utils/token.util';
import { ISocketData } from '../interfaces/realtime.interface';

// ============================================================
// Socket handshake auth — reads the login cookies once, when the browser connects:
//   owner/staff cookie → socket.data.auth      (restaurant:<id> rooms)
//   diner cookie       → socket.data.customer  (cart:<sessionId> rooms)
// Never rejects the connection: guests and the kitchen board connect without either.
// Rooms that need a login check these when joining.
// ============================================================

const readCookie = (header: string | undefined, name: string): string | undefined => {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
};

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  const bearer = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : undefined;
  const token = bearer ?? readCookie(socket.handshake.headers.cookie, AUTH_COOKIE.NAME);
  const data = socket.data as ISocketData;
  data.auth = authContextFromToken(token);

  const diner = verifyToken(readCookie(socket.handshake.headers.cookie, CUSTOMER_COOKIE.NAME));
  data.customer = diner && isCustomerPayload(diner) ? { customerId: diner.customerId, name: diner.name } : null;
  next();
};
