// ============================================================
// Kitchen Display Constants
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'; // same origin as the app (gateway / reverse proxy)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const API_ENDPOINTS = {
  KITCHEN_ORDERS: (restaurantId: string) =>
    `${API_BASE_URL}/order/getKitchenOrders/${restaurantId}`,
} as const;

const SOCKET_EVENTS = {
  NEW_ORDER: 'new_order',
  ORDER_STATUS_UPDATED: 'order_status_updated',
  JOIN_RESTAURANT_ROOM: 'join_restaurant_room',
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
  [ORDER_STATUS.PLACED]: 'New Order',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.COOKING]: 'Cooking',
  [ORDER_STATUS.READY]: 'Ready',
  [ORDER_STATUS.DELIVERED]: 'Delivered',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
  [ORDER_STATUS.CANNOT_DELIVER]: 'Cannot Deliver',
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  [ORDER_STATUS.PLACED]: '#f59e0b',
  [ORDER_STATUS.CONFIRMED]: '#3b82f6',
  [ORDER_STATUS.COOKING]: '#ef4444',
  [ORDER_STATUS.READY]: '#10b981',
  [ORDER_STATUS.DELIVERED]: '#6b7280',
  [ORDER_STATUS.CANCELLED]: '#991b1b',
  [ORDER_STATUS.CANNOT_DELIVER]: '#7c3aed',
};

const STATUS_COLUMNS = [
  { status: ORDER_STATUS.PLACED, label: 'New', icon: '🆕' },
  { status: ORDER_STATUS.CONFIRMED, label: 'Confirmed', icon: '✅' },
  { status: ORDER_STATUS.COOKING, label: 'Cooking', icon: '🔥' },
  { status: ORDER_STATUS.READY, label: 'Ready', icon: '🔔' },
] as const;

const MESSAGES = {
  TITLE: 'Kitchen Display',
  SUBTITLE: 'Real-time order board',
  NO_ORDERS: 'No orders',
  LOADING: 'Connecting...',
  CURRENCY: '₹',
  TABLE: 'Table',
  ITEM_SEP: '×',
  TIME_AGO: (mins: number) => `${mins}m ago`,
  AUDIO_NEW_ORDER: '/notification.mp3',
  RECENTLY_COMPLETED: 'Recently Completed',
  ERROR_NO_RESTAURANT: 'Restaurant ID required. Add ?restaurant=<id> to URL.',
} as const;

export {
  API_BASE_URL,
  SOCKET_URL,
  API_ENDPOINTS,
  SOCKET_EVENTS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  STATUS_COLUMNS,
  MESSAGES,
};
