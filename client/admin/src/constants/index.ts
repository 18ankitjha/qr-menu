// ============================================================
// Admin Dashboard Constants
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  RESTAURANT: '/restaurant',
  MENU: '/menu',
  TABLES: '/tables',
  ORDERS: '/orders',
  SETTINGS: '/settings',
};

const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_LOGIN: `${API_BASE_URL}/auth/google`,
    GET_PROFILE: `${API_BASE_URL}/auth/getProfile`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
  RESTAURANT: {
    REGISTER: `${API_BASE_URL}/restaurant/register`,
    GET: (id: string) => `${API_BASE_URL}/restaurant/get/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/restaurant/update/${id}`,
    SET_GPS: (id: string) => `${API_BASE_URL}/restaurant/setGps/${id}`,
    DEACTIVATE: (id: string) => `${API_BASE_URL}/restaurant/deactivate/${id}`,
  },
  MENU: {
    CREATE: `${API_BASE_URL}/menu/create`,
    GET: (restaurantId: string) => `${API_BASE_URL}/menu/get/${restaurantId}`,
    UPDATE: (menuId: string) => `${API_BASE_URL}/menu/update/${menuId}`,
    SET_THEME: (menuId: string) => `${API_BASE_URL}/menu/setTheme/${menuId}`,
  },
  CATEGORY: {
    ADD: `${API_BASE_URL}/category/add`,
    GET_ALL: (menuId: string) => `${API_BASE_URL}/category/getAll/${menuId}`,
    UPDATE: (id: string) => `${API_BASE_URL}/category/update/${id}`,
    SET_ACTIVE: (id: string) => `${API_BASE_URL}/category/setActive/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/category/delete/${id}`,
    REORDER: `${API_BASE_URL}/category/reorder`,
  },
  DISH: {
    ADD: `${API_BASE_URL}/dish/add`,
    GET_ALL: (categoryId: string) => `${API_BASE_URL}/dish/getAll/${categoryId}`,
    UPDATE: (id: string) => `${API_BASE_URL}/dish/update/${id}`,
    SET_AVAILABILITY: (id: string) => `${API_BASE_URL}/dish/setAvailability/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/dish/delete/${id}`,
    REORDER: `${API_BASE_URL}/dish/reorder`,
  },
  TABLE: {
    ADD: `${API_BASE_URL}/table/add`,
    ADD_BULK: `${API_BASE_URL}/table/addBulk`,
    GET_ALL: (restaurantId: string) => `${API_BASE_URL}/table/getAll/${restaurantId}`,
    DELETE: (id: string) => `${API_BASE_URL}/table/delete/${id}`,
  },
  QR: {
    GENERATE: (tableId: string) => `${API_BASE_URL}/qr/generate/${tableId}`,
    GET: (tableId: string) => `${API_BASE_URL}/qr/get/${tableId}`,
  },
  ORDER: {
    GET_ALL: (restaurantId: string) => `${API_BASE_URL}/order/getAll/${restaurantId}`,
    SET_STATUS: (orderId: string) => `${API_BASE_URL}/order/setStatus/${orderId}`,
  },
  INVOICE: {
    GENERATE: `${API_BASE_URL}/invoice/generate`,
    GET_PDF: (orderId: string) => `${API_BASE_URL}/invoice/getPdf/${orderId}`,
    GET_TABLE_PDF: (tableId: string) => `${API_BASE_URL}/invoice/getTablePdf/${tableId}`,
  },
  UPLOAD: {
    IMAGE: `${API_BASE_URL}/upload/image`,
  },
} ;

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

const NAV_ITEMS = [
  { path: ROUTES.DASHBOARD, label: 'Dashboard', icon: '📊' },
  { path: ROUTES.RESTAURANT, label: 'Restaurant', icon: '🏪' },
  { path: ROUTES.MENU, label: 'Menu Builder', icon: '📋' },
  { path: ROUTES.TABLES, label: 'Tables & QR', icon: '🪑' },
  { path: ROUTES.ORDERS, label: 'Orders', icon: '📦' },
  { path: ROUTES.SETTINGS, label: 'Theme', icon: '🎨' },
] ;

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
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  NAV_ITEMS,
  MESSAGES,
};
