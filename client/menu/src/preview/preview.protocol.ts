// ============================================================
// Admin <-> customer-menu preview contract (postMessage, same origin only).
// Identical copies: client/menu/src/preview/preview.protocol.ts and
//                   client/admin/src/components/menu-preview/preview.protocol.ts
//   1. admin shows PREVIEW_PATH in an iframe
//   2. the preview posts READY to its parent
//   3. admin answers with DATA { menu } (the same shape as GET /table-session/resolve) and again on every change
// ============================================================

export const PREVIEW_PATH = '/menu/preview';

export const PREVIEW_MESSAGE = {
  READY: 'qr-menu-preview:ready',
  DATA: 'qr-menu-preview:data',
} as const;
