// ============================================================
// Constants — Single source of truth for all app-wide constants
// ============================================================

export const APP_CONSTANTS = {
  API_PREFIX: '/api/v1',
  DEFAULT_PORT: 5000,
  DEFAULT_GPS_RADIUS_METERS: 200,
  KITCHEN_ORDER_VISIBILITY_MINUTES: 30,
  MAX_BULK_TABLES: 50,
  MAX_IMAGE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp', 'image/tiff', 'image/avif'],
} ;

export enum OrderStatus {
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  COOKING = 'COOKING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  CANNOT_DELIVER = 'CANNOT_DELIVER',
}

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.COOKING,
  OrderStatus.READY,
];

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.CANNOT_DELIVER,
];

export enum MenuLayout {
  GRID = 'grid',
  LIST = 'list',
}

export const DEFAULT_MENU_THEME = {
  primaryColor: '#FF6B35',
  secondaryColor: '#004E89',
  backgroundColor: '#FFFFFF',
  fontFamily: 'Inter',
  layout: MenuLayout.GRID,
} ;

export const CLOUDINARY_FOLDERS = {
  DISH_IMAGES: 'qr-menu/dishes',
  CATEGORY_IMAGES: 'qr-menu/categories',
  RESTAURANT_LOGOS: 'qr-menu/logos',
  QR_CODES: 'qr-menu/qr-codes',
  BACKGROUNDS: 'qr-menu/backgrounds',
} ;

export const SOCKET_EVENTS = {
  NEW_ORDER: 'new_order',
  ORDER_STATUS_UPDATED: 'order_status_updated',
  JOIN_RESTAURANT_ROOM: 'join_restaurant_room',
  LEAVE_RESTAURANT_ROOM: 'leave_restaurant_room',
} ;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required. Please log in.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Requested resource not found.',
  RESTAURANT_NOT_FOUND: 'Restaurant not found.',
  MENU_NOT_FOUND: 'Menu not found.',
  CATEGORY_NOT_FOUND: 'Category not found.',
  DISH_NOT_FOUND: 'Dish not found.',
  TABLE_NOT_FOUND: 'Table not found.',
  ORDER_NOT_FOUND: 'Order not found.',
  USER_NOT_FOUND: 'User not found.',
  RESTAURANT_ALREADY_EXISTS: 'You already have a registered restaurant.',
  MENU_ALREADY_EXISTS: 'This restaurant already has a menu.',
  GPS_OUT_OF_RANGE: 'You are too far from the restaurant to place an order.',
  GPS_REQUIRED: 'GPS coordinates are required to place an order.',
  INVALID_ORDER_STATUS_TRANSITION: 'Invalid order status transition.',
  TABLE_NUMBER_EXISTS: 'A table with this number already exists.',
  VALIDATION_ERROR: 'Validation failed. Please check your input.',
  INTERNAL_ERROR: 'An internal server error occurred.',
  INVALID_IMAGE_TYPE: 'Invalid image type. Allowed: JPEG, PNG, WebP.',
  IMAGE_TOO_LARGE: 'Image size exceeds the maximum allowed size.',
} ;

export const ROUTE_PATHS = {
  AUTH: '/auth',
  RESTAURANT: '/restaurant',
  MENU: '/menu',
  CATEGORY: '/category',
  DISH: '/dish',
  TABLE: '/table',
  QR: '/qr',
  ORDER: '/order',
  UPLOAD: '/upload',
  INVOICE: '/invoice',
  PUBLIC: '/public',
  HEALTH: '/health',
} ;

export const SERVER_MESSAGES = {
  SERVER_RUNNING: (port: number, nodeEnv: string) => `🚀 Server running on port ${port} [${nodeEnv}]`,
  HEALTH_CHECK_URL: (port: number) => `📡 Health check: http://localhost:${port}/health`,
  SOCKET_READY: '🔌 Socket.IO ready',
  GRACEFUL_SHUTDOWN: (signal: string) => `${signal} received. Shutting down gracefully...`,
  SERVER_CLOSED: 'Server closed.',
  SERVER_START_FAILED: 'Failed to start server:',
  HEALTH_STATUS: 'ok',
  DB_CONNECTED: 'MongoDB connected successfully',
  DB_CONNECT_FAILED: 'MongoDB connection failed:',
} ;

export const APP_SETTINGS = {
  BODY_LIMIT: '10mb',
  DEVELOPMENT: 'development',
} ;

export const SUCCESS_MESSAGES = {
  RESTAURANT_REGISTERED: 'Restaurant registered successfully.',
  RESTAURANT_UPDATED: 'Restaurant updated successfully.',
  RESTAURANT_DEACTIVATED: 'Restaurant deactivated successfully.',
  MENU_CREATED: 'Menu created successfully.',
  MENU_UPDATED: 'Menu updated successfully.',
  THEME_UPDATED: 'Menu theme updated successfully.',
  CATEGORY_ADDED: 'Category added successfully.',
  CATEGORY_UPDATED: 'Category updated successfully.',
  CATEGORY_DELETED: 'Category deleted successfully.',
  CATEGORIES_REORDERED: 'Categories reordered successfully.',
  DISH_ADDED: 'Dish added successfully.',
  DISH_UPDATED: 'Dish updated successfully.',
  DISH_DELETED: 'Dish deleted successfully.',
  DISHES_REORDERED: 'Dishes reordered successfully.',
  AVAILABILITY_UPDATED: 'Availability updated successfully.',
  TABLE_CREATED: 'Table created successfully.',
  TABLES_CREATED: 'Tables created successfully.',
  TABLE_DELETED: 'Table deleted successfully.',
  QR_GENERATED: 'QR code generated successfully.',
  ORDER_PLACED: 'Order placed successfully.',
  ORDER_STATUS_UPDATED: 'Order status updated successfully.',
  INVOICE_GENERATED: 'Invoice generated successfully.',
  IMAGE_UPLOADED: 'Image uploaded successfully.',
  LOGOUT_SUCCESS: 'Logged out successfully.',
} ;
