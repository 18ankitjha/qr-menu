// ============================================================
// Customer Menu Constants
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

const API_ENDPOINTS = {
  PUBLIC_MENU: (restaurantId: string, tableId: string) =>
    `${API_BASE_URL}/public/getMenu/${restaurantId}/${tableId}`,
  PLACE_ORDER: `${API_BASE_URL}/order/place`,
  ORDER_STATUS: (orderId: string) =>
    `${API_BASE_URL}/order/getStatus/${orderId}`,
} as const;

const ORDER_STATUS = {
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  COOKING: 'COOKING',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  CANNOT_DELIVER: 'CANNOT_DELIVER',
} as const;

const ORDER_STATUS_LABELS: Record<string, string> = {
  [ORDER_STATUS.PLACED]: 'Order Placed',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.COOKING]: 'Being Prepared',
  [ORDER_STATUS.READY]: 'Ready!',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
  [ORDER_STATUS.CANNOT_DELIVER]: 'Cannot Deliver',
};

const MESSAGES = {
  LOADING: 'Loading menu...',
  ERROR_LOAD: 'Could not load the menu. Please scan the QR code again.',
  ERROR_GPS: 'We need your location to place an order. Please enable GPS.',
  ERROR_TOO_FAR: 'You seem to be too far from the restaurant.',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  CART_TITLE: 'Your Order',
  CART_EMPTY: 'Your cart is empty',
  CART_TOTAL: 'Total',
  CART_INSTRUCTIONS: 'Special instructions (optional)',
  CART_NAME: 'Your name (optional)',
  BTN_PLACE_ORDER: 'Place Order',
  BTN_VIEW_CART: 'View Cart',
  BTN_ADD: 'Add',
  BTN_TRACK: 'Track Order',
  ORDER_PLACED_TITLE: 'Order Placed! 🎉',
  ORDER_PLACED_DESC: 'Your order has been sent to the kitchen.',
  ORDER_TRACKING: 'Order Status',
  CURRENCY: '₹',
  VEG: 'VEG',
  NONVEG: 'NON-VEG',
  ALL: 'All',
} as const;

export {
  API_BASE_URL,
  API_ENDPOINTS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  MESSAGES,
};
