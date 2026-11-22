// ============================================================
// Customer Menu Constants
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'; // same origin as the app (gateway / reverse proxy)

const API_ENDPOINTS = {
  // Public — browse the menu before signing in
  RESOLVE_BY_TOKEN: (qrToken: string) => `/table-session/resolve/t/${qrToken}`,
  RESOLVE_LEGACY: (restaurantId: string, tableId: string) => `/table-session/resolve/${restaurantId}/${tableId}`,

  // Diner (Google sign-in, httpOnly cookie)
  GOOGLE_LOGIN: (returnTo: string) =>
    `${API_BASE_URL}/auth/google?app=menu&returnTo=${encodeURIComponent(returnTo)}`,
  PROFILE: '/auth/customer/getProfile',
  LOGOUT: '/auth/customer/logout',

  JOIN: '/table-session/join',
  GET_SESSION: (sessionId: string) => `/table-session/get/${sessionId}`,
  CART_ADD: (sessionId: string) => `/table-session/cart/add/${sessionId}`,
  CART_SET_QUANTITY: (sessionId: string) => `/table-session/cart/setQuantity/${sessionId}`,
  PLACE_ORDER: (sessionId: string) => `/table-session/placeOrder/${sessionId}`,
  REQUEST_BILL: (sessionId: string) => `/table-session/requestBill/${sessionId}`,
  CALL_WAITER: (sessionId: string) => `/table-session/callWaiter/${sessionId}`,

  GET_BILL: (sessionId: string) => `/billing/customer/getBill/${sessionId}`,
  BILL_PDF: (sessionId: string) => `${API_BASE_URL}/billing/customer/getPdf/${sessionId}`,
} as const;

const SOCKET_EVENTS = {
  JOIN_TABLE_ROOM: 'join_table_room',
  LEAVE_TABLE_ROOM: 'leave_table_room',
  TABLE_SESSION_UPDATED: 'table_session_updated',
} as const;

const SYNC = {
  /** Refetch this often when the live connection is down (and as a safety net when it's up). */
  POLL_OFFLINE_MS: 5000,
  POLL_ONLINE_MS: 30000,
  /** A billed table older than this isn't shown again — the next visit starts a new order. */
  SHOW_CLOSED_FOR_MS: 3 * 60 * 60 * 1000,
} as const;

const STORAGE_KEYS = {
  SESSION: (tableId: string) => `qr_menu_session:${tableId}`,
} as const;

const ORDER_STATUS_LABELS: Record<string, string> = {
  PLACED: 'Order placed',
  CONFIRMED: 'Confirmed',
  COOKING: 'Being prepared',
  READY: 'Ready',
  DELIVERED: 'Served',
  CANCELLED: 'Cancelled',
  CANNOT_DELIVER: 'Cannot be served',
};

const MESSAGES = {
  LOADING: 'Loading menu...',
  JOINING: 'Getting your table ready...',
  ERROR_LOAD: 'Could not load the menu. Please scan the QR code on your table again.',
  ERROR_BAD_LINK: 'This link is not a table QR code. Please scan the QR code on your table.',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  CART_CHANGED: 'Someone at your table just changed the cart — please review it and place the order again.',

  SIGN_IN_TITLE: 'Sign in to order',
  SIGN_IN_DESC: 'Sign in with Google so your table can share one cart and one bill.',
  SIGN_IN_BTN: 'Continue with Google',
  SIGN_OUT: 'Sign out',

  TAB_MENU: 'Menu',
  TAB_CART: 'Table cart',
  TAB_ORDERS: 'Orders & bill',

  BTN_ADD: 'Add',
  MENU_EMPTY: 'The menu is being updated. Please ask your waiter.',
  CATEGORIES: 'Categories',
  SEARCH: 'Search',
  SEARCH_PLACEHOLDER: 'Search dishes',
  CLOSE_SEARCH: 'Close search',
  VEG: 'Veg',
  NON_VEG: 'Non-veg',
  NO_MATCH: 'No dishes match your search.',
  ITEM_COUNT: (n: number) => `${n} item${n === 1 ? '' : 's'}`,
  CART_EMPTY: 'The table cart is empty. Add dishes from the menu — everyone at your table sees the same cart.',
  CART_SHARED_NOTE: 'Shared with everyone at this table. Anyone can place the order.',
  CART_INSTRUCTIONS: 'Instructions for the kitchen (optional)',
  BTN_PLACE_ORDER: 'Place order for the table',
  ORDER_SENT: 'Order sent to the kitchen 🎉',

  NO_ORDERS: 'Nothing ordered yet.',
  BTN_REQUEST_BILL: '🧾 Request bill',
  BTN_CALL_WAITER: '🙋 Call waiter',
  BILL_REQUESTED: 'Bill requested',
  WAITER_CALLED: 'Waiter called',
  RUNNING_BILL: 'Running bill',
  PENDING_ORDERS: (n: number) => `${n} order${n === 1 ? '' : 's'} still being prepared`,
  FINAL_BILL: 'Your bill',
  DOWNLOAD_PDF: 'Download PDF',
  PAID: 'Paid — thank you!',
  UNPAID: 'Please pay at the counter or to your waiter',

  CLOSED_BILLED: 'Your table has been billed',
  CLOSED_OTHER: 'This table was cleared',
  BTN_NEW_ORDER: 'Start a new order',

  CURRENCY: '₹',
  YOU: 'you',
  WAITER: 'waiter',
  ALL: 'All',
} as const;

export { API_BASE_URL, API_ENDPOINTS, SOCKET_EVENTS, SYNC, STORAGE_KEYS, ORDER_STATUS_LABELS, MESSAGES };
