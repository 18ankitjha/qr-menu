import type { ITableLink } from '../types';

// ============================================================
// Table link — what the scanned QR points at
//   /menu/t/<qrToken>                 current QR codes
//   /menu/<restaurantId>/<tableId>    QR codes printed before tokens (until the owner regenerates them)
// ============================================================

const TOKEN = /^[A-Za-z0-9_-]{8,64}$/;
const OBJECT_ID = /^[a-f0-9]{24}$/;

/** The table in the current URL, or null if this isn't a table link. */
export const parseTableLink = (pathname: string): ITableLink | null => {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'menu') parts.shift();

  if (parts.length === 2 && parts[0] === 't' && TOKEN.test(parts[1])) return { qrToken: parts[1] };
  if (parts.length === 2 && OBJECT_ID.test(parts[0]) && OBJECT_ID.test(parts[1])) {
    return { restaurantId: parts[0], tableId: parts[1] };
  }
  return null;
};

/** Where Google sign-in should bring the diner back to (path inside the menu app). */
export const returnPathFor = (link: ITableLink): string =>
  'qrToken' in link ? `/t/${link.qrToken}` : `/${link.restaurantId}/${link.tableId}`;
