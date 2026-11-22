// ============================================================
// Super Admin Constants
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'; // same origin as the app (gateway / reverse proxy)

const ROUTES = {
  LOGIN: '/login',
  AUTH_SUCCESS: '/auth/success',
  DASHBOARD: '/',
  RESTAURANTS: '/restaurants',
  RESTAURANT_DETAIL: '/restaurants/:id',
  restaurantDetail: (id: string) => `/restaurants/${id}`,
};

const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_LOGIN: `${API_BASE_URL}/auth/google?app=super-admin`,
    GET_PROFILE: `${API_BASE_URL}/auth/getProfile`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },
  SUPER_ADMIN: {
    GET_ME: `${API_BASE_URL}/super-admin/getMe`,
    GET_STATS: `${API_BASE_URL}/super-admin/getStats`,
    GET_RESTAURANTS: `${API_BASE_URL}/super-admin/getRestaurants`,
    GET_RESTAURANT: (id: string) => `${API_BASE_URL}/super-admin/getRestaurant/${id}`,
    APPROVE: (id: string) => `${API_BASE_URL}/super-admin/approveRestaurant/${id}`,
    REJECT: (id: string) => `${API_BASE_URL}/super-admin/rejectRestaurant/${id}`,
    SUSPEND: (id: string) => `${API_BASE_URL}/super-admin/suspendRestaurant/${id}`,
    REACTIVATE: (id: string) => `${API_BASE_URL}/super-admin/reactivateRestaurant/${id}`,
  },
};

const RESTAURANT_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
} as const;

type RestaurantStatus = (typeof RESTAURANT_STATUS)[keyof typeof RESTAURANT_STATUS];

const STATUS_LABELS: Record<RestaurantStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  REJECTED: 'Rejected',
};

const STATUS_COLORS: Record<RestaurantStatus, { bg: string; fg: string }> = {
  PENDING_APPROVAL: { bg: '#fef3c7', fg: '#92400e' },
  ACTIVE: { bg: '#d1fae5', fg: '#065f46' },
  SUSPENDED: { bg: '#fee2e2', fg: '#991b1b' },
  REJECTED: { bg: '#e5e7eb', fg: '#374151' },
};

/** Order of the filter tabs on the restaurants page. */
const STATUS_FILTERS: { value: RestaurantStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: RESTAURANT_STATUS.PENDING_APPROVAL, label: 'Pending' },
  { value: RESTAURANT_STATUS.ACTIVE, label: 'Active' },
  { value: RESTAURANT_STATUS.SUSPENDED, label: 'Suspended' },
  { value: RESTAURANT_STATUS.REJECTED, label: 'Rejected' },
];

type StatusAction = 'approve' | 'reject' | 'suspend' | 'reactivate';

/** Mirrors the server's allowed transitions so we only show buttons that will work. */
const STATUS_ACTIONS: Record<RestaurantStatus, StatusAction[]> = {
  PENDING_APPROVAL: ['approve', 'reject'],
  ACTIVE: ['suspend'],
  SUSPENDED: ['reactivate'],
  REJECTED: ['approve'],
};

const ACTION_CONFIG: Record<
  StatusAction,
  { label: string; title: string; description: string; reasonRequired: boolean; tone: 'primary' | 'danger' }
> = {
  approve: {
    label: 'Approve',
    title: 'Approve restaurant',
    description: 'The restaurant goes live: customers can scan its QR codes and place orders.',
    reasonRequired: false,
    tone: 'primary',
  },
  reject: {
    label: 'Reject',
    title: 'Reject onboarding request',
    description: 'The owner will see this reason in their admin dashboard.',
    reasonRequired: true,
    tone: 'danger',
  },
  suspend: {
    label: 'Suspend',
    title: 'Suspend restaurant',
    description: 'Customers immediately stop being able to open the menu or order. The owner sees this reason.',
    reasonRequired: true,
    tone: 'danger',
  },
  reactivate: {
    label: 'Reactivate',
    title: 'Reactivate restaurant',
    description: 'The restaurant goes live again.',
    reasonRequired: false,
    tone: 'primary',
  },
};

const PAGE_SIZE = 20;
const REASON_MIN_LENGTH = 3;

const NAV_ITEMS = [
  { path: ROUTES.DASHBOARD, label: 'Overview', icon: '📊' },
  { path: ROUTES.RESTAURANTS, label: 'Restaurants', icon: '🏪' },
];

const CURRENCY = '₹';

const MESSAGES = {
  APP_TITLE: 'Super Admin',
  LOGIN_TITLE: 'QR Menu — Platform Console',
  LOGIN_SUBTITLE: 'Review restaurant onboarding, approve requests and manage suspensions.',
  LOGIN_BUTTON: 'Sign in with Google',
  ACCESS_DENIED_TITLE: 'Access denied',
  ACCESS_DENIED_DESC: (email: string) =>
    `${email} is not a platform super admin. Ask the team to add it to SUPER_ADMIN_EMAILS on the server.`,
  LOGOUT: 'Logout',
  LOADING: 'Loading...',
  CANCEL: 'Cancel',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  REASON_LABEL: (required: boolean) => (required ? 'Reason (required)' : 'Note (optional)'),
  REASON_PLACEHOLDER: 'e.g. FSSAI licence verified on call',
};

export {
  API_BASE_URL,
  ROUTES,
  API_ENDPOINTS,
  RESTAURANT_STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_FILTERS,
  STATUS_ACTIONS,
  ACTION_CONFIG,
  PAGE_SIZE,
  REASON_MIN_LENGTH,
  NAV_ITEMS,
  CURRENCY,
  MESSAGES,
};
export type { RestaurantStatus, StatusAction };
