// ============================================================
// Admin Dashboard Constants
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'; // same origin as the app (gateway / reverse proxy)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  RESTAURANT: '/restaurant',
  MENU: '/menu',
  TABLES: '/tables',
  ORDERS: '/orders',
  BILLS: '/bills',
  STAFF: '/staff',
  SETTINGS: '/settings',
};

const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_LOGIN: `${API_BASE_URL}/auth/google`,
    STAFF_LOGIN: `${API_BASE_URL}/auth/staffLogin`,
    GET_PROFILE: `${API_BASE_URL}/auth/getProfile`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
  RESTAURANT: {
    REGISTER: `${API_BASE_URL}/restaurant/register`,
    GET: (id: string) => `${API_BASE_URL}/restaurant/get/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/restaurant/update/${id}`,
    SET_GPS: (id: string) => `${API_BASE_URL}/restaurant/setGps/${id}`,
    SET_BILLING_SETTINGS: (id: string) => `${API_BASE_URL}/restaurant/setBillingSettings/${id}`,
    DEACTIVATE: (id: string) => `${API_BASE_URL}/restaurant/deactivate/${id}`,
  },
  MENU: {
    CREATE: `${API_BASE_URL}/menu/create`,
    GET: (restaurantId: string) => `${API_BASE_URL}/menu/get/${restaurantId}`,
    UPDATE: (menuId: string) => `${API_BASE_URL}/menu/update/${menuId}`,
    SET_THEME: (menuId: string) => `${API_BASE_URL}/menu/setTheme/${menuId}`,
    /** Customer-facing menu (active categories + available dishes); also used by staff to take orders. */
    GET_ORDERING_MENU: (restaurantId: string, tableId: string) =>
      `${API_BASE_URL}/menu/public/getMenu/${restaurantId}/${tableId}`,
  },
  SETUP: {
    GET_STATUS: (restaurantId: string) => `${API_BASE_URL}/setup/getStatus/${restaurantId}`,
  },
  CATEGORY: {
    ADD: `${API_BASE_URL}/menu/category/add`,
    GET_ALL: (menuId: string) => `${API_BASE_URL}/menu/category/getAll/${menuId}`,
    UPDATE: (id: string) => `${API_BASE_URL}/menu/category/update/${id}`,
    SET_ACTIVE: (id: string) => `${API_BASE_URL}/menu/category/setActive/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/menu/category/delete/${id}`,
    REORDER: `${API_BASE_URL}/menu/category/reorder`,
  },
  DISH: {
    ADD: `${API_BASE_URL}/menu/dish/add`,
    GET: (id: string) => `${API_BASE_URL}/menu/dish/get/${id}`,
    GET_ALL: (categoryId: string) => `${API_BASE_URL}/menu/dish/getAll/${categoryId}`,
    UPDATE: (id: string) => `${API_BASE_URL}/menu/dish/update/${id}`,
    SET_AVAILABILITY: (id: string) => `${API_BASE_URL}/menu/dish/setAvailability/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/menu/dish/delete/${id}`,
    REORDER: `${API_BASE_URL}/menu/dish/reorder`,
  },
  TABLE: {
    ADD: `${API_BASE_URL}/table/add`,
    ADD_BULK: `${API_BASE_URL}/table/addBulk`,
    GET_ALL: (restaurantId: string) => `${API_BASE_URL}/table/getAll/${restaurantId}`,
    DELETE: (id: string) => `${API_BASE_URL}/table/delete/${id}`,
  },
  QR: {
    GENERATE: (tableId: string) => `${API_BASE_URL}/table/generateQr/${tableId}`,
    GET: (tableId: string) => `${API_BASE_URL}/table/getQr/${tableId}`,
  },
  ORDER: {
    PLACE_BY_STAFF: `${API_BASE_URL}/order/placeByStaff`,
    GET_ALL: (restaurantId: string) => `${API_BASE_URL}/order/getAll/${restaurantId}`,
    GET_BY_TABLE: (tableId: string) => `${API_BASE_URL}/order/getByTable/${tableId}`,
    SET_STATUS: (orderId: string) => `${API_BASE_URL}/order/setStatus/${orderId}`,
    UPDATE_ITEMS: (orderId: string) => `${API_BASE_URL}/order/updateItems/${orderId}`,
  },
  TABLE_SESSION: {
    /** Tables with diners right now (signed in on the customer menu), with "bill requested" / "waiter called". */
    GET_OPEN: (restaurantId: string) => `${API_BASE_URL}/table-session/getOpen/${restaurantId}`,
    CLEAR_ALERT: (sessionId: string) => `${API_BASE_URL}/table-session/clearAlert/${sessionId}`,
    /** Clear a table whose diners left with nothing to bill (empty or abandoned cart only). */
    CLOSE: (sessionId: string) => `${API_BASE_URL}/table-session/close/${sessionId}`,
  },
  /** The customer menu link a table's QR encodes. */
  CUSTOMER_MENU: (qrToken: string) => `/menu/t/${qrToken}`,
  BILLING: {
    PREVIEW_TABLE_BILL: (tableId: string) => `${API_BASE_URL}/billing/previewTableBill/${tableId}`,
    GENERATE_TABLE_BILL: `${API_BASE_URL}/billing/generateTableBill`,
    GET_ALL: (restaurantId: string) => `${API_BASE_URL}/billing/getAll/${restaurantId}`,
    GET: (billId: string) => `${API_BASE_URL}/billing/get/${billId}`,
    GET_PDF: (billId: string) => `${API_BASE_URL}/billing/getPdf/${billId}`,
    MARK_PAID: (billId: string) => `${API_BASE_URL}/billing/markPaid/${billId}`,
    GET_ORDER_PDF: (orderId: string) => `${API_BASE_URL}/billing/getOrderPdf/${orderId}`,
  },
  STAFF: {
    ADD: `${API_BASE_URL}/staff/add`,
    GET_ALL: (restaurantId: string) => `${API_BASE_URL}/staff/getAll/${restaurantId}`,
    RESET_PIN: (id: string) => `${API_BASE_URL}/staff/resetPin/${id}`,
    GET_PIN: (id: string) => `${API_BASE_URL}/staff/getPin/${id}`,
    SET_ACTIVE: (id: string) => `${API_BASE_URL}/staff/setActive/${id}`,
    REMOVE: (id: string) => `${API_BASE_URL}/staff/remove/${id}`,
  },
  UPLOAD: {
    IMAGE: `${API_BASE_URL}/upload/image`,
  },
} ;

/** Socket.IO events from the API server (same names as server config/constants.ts). */
const SOCKET_EVENTS = {
  JOIN_RESTAURANT_ROOM: 'join_restaurant_room',
  LEAVE_RESTAURANT_ROOM: 'leave_restaurant_room',
  NEW_ORDER: 'new_order',
  TABLE_ALERT: 'table_alert',
} as const;

const ORDER_STATUS = {
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  COOKING: 'COOKING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  CANNOT_DELIVER: 'CANNOT_DELIVER',
} ;

const ORDER_STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUS.PLACED]: 'Placed',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.COOKING]: 'Cooking',
  [ORDER_STATUS.READY]: 'Ready',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
  [ORDER_STATUS.CANNOT_DELIVER]: 'Cannot Deliver',
} ;

const ORDER_STATUS_COLORS: Record<string, string> = {
  [ORDER_STATUS.PLACED]: '#f59e0b',
  [ORDER_STATUS.CONFIRMED]: '#3b82f6',
  [ORDER_STATUS.COOKING]: '#ef4444',
  [ORDER_STATUS.READY]: '#10b981',
  [ORDER_STATUS.DELIVERED]: '#6b7280',
  [ORDER_STATUS.CANCELLED]: '#991b1b',
  [ORDER_STATUS.CANNOT_DELIVER]: '#7c3aed',
};

/** ownerOnly items are hidden from waiters (and their routes are blocked). */
const NAV_ITEMS = [
  { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: '📊', ownerOnly: true },
  { path: ROUTES.RESTAURANT, label: 'Restaurant', icon: '🏪', ownerOnly: true },
  { path: ROUTES.MENU, label: 'Menu Builder', icon: '📋', ownerOnly: true },
  { path: ROUTES.TABLES, label: 'Tables & QR', icon: '🪑', ownerOnly: false },
  { path: ROUTES.ORDERS, label: 'Orders', icon: '📦', ownerOnly: false },
  { path: ROUTES.BILLS, label: 'Bills', icon: '🧾', ownerOnly: false },
  { path: ROUTES.STAFF, label: 'Staff', icon: '🧑‍🍳', ownerOnly: true },
  { path: ROUTES.SETTINGS, label: 'Theme', icon: '🎨', ownerOnly: true },
] ;

const PAYMENT_MODES = ['CASH', 'UPI', 'CARD'] as const;

/**
 * Quick Setup, in order. Each step unlocks only after the previous one is done, and the rest of the
 * app (sidebar + other pages) stays hidden until all are done. `step` matches the server's SetupStep.
 */
const SETUP_STEPS = [
  {
    step: 'restaurant',
    label: 'Register Restaurant',
    hint: 'Add your restaurant name, address and location.',
    route: ROUTES.RESTAURANT,
    icon: '🏪',
  },
  {
    step: 'menu',
    label: 'Create Menu',
    hint: 'Create your menu, add a category and at least one dish.',
    route: ROUTES.MENU,
    icon: '📋',
  },
  {
    step: 'tables',
    label: 'Add Tables',
    hint: 'Add your tables — QR codes are generated automatically.',
    route: ROUTES.TABLES,
    icon: '🪑',
  },
  {
    step: 'theme',
    label: 'Customize Theme',
    hint: 'Pick colours and layout for the customer menu, then press Save.',
    route: ROUTES.SETTINGS,
    icon: '🎨',
  },
] as const;

const MESSAGES = {
  APP_TITLE: 'QR Menu Admin',
  LOGIN_TITLE: 'Welcome to QR Menu',
  LOGIN_SUBTITLE: 'Manage your restaurant, menu, and orders — all in one place.',
  LOGIN_BUTTON: 'Sign in with Google',
  NO_RESTAURANT_TITLE: 'Register Your Restaurant',
  NO_RESTAURANT_DESC: 'Get started by registering your restaurant details.',
  LOGOUT: 'Logout',
  LOADING: 'Loading...',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  ADD: 'Add',
  EDIT: 'Edit',
  CONFIRM_DELETE: 'Are you sure you want to delete this?',
  NO_DATA: 'No data available.',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
} ;

export {
  API_BASE_URL,
  GOOGLE_CLIENT_ID,
  ROUTES,
  API_ENDPOINTS,
  SOCKET_EVENTS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  NAV_ITEMS,
  PAYMENT_MODES,
  SETUP_STEPS,
  MESSAGES,
};
