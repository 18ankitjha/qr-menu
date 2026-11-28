import { Socket } from 'socket.io';
import { authContextFromToken } from '../../auth/middlewares/auth.middleware';
import { AUTH_COOKIE } from '../../auth/constants/auth.constants';
import { ISocketData } from '../interfaces/realtime.interface';

// ============================================================
// Socket handshake auth — reads the owner/staff login cookie once, when the browser connects.
// Never rejects the connection: diners and the kitchen board connect without it.
// Rooms that need a login (restaurant:<id>) check `socket.data.auth` when joining.
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
  (socket.data as ISocketData).auth = authContextFromToken(token);
  next();
};
