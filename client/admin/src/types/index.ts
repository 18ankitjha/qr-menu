// ============================================================
// Shared TypeScript Interfaces — Admin Dashboard
// ============================================================

interface IGpsCoordinates {
  latitude: number;
  longitude: number;
}

interface IUser {
  _id: string;
  googleId: string;
  email: string;
  name: string;
  profilePicture?: string;
  restaurantId?: string;
  createdAt: string;
  updatedAt: string;
}

type AuthKind = 'USER' | 'STAFF';
type RestaurantRole = 'OWNER' | 'WAITER';

/** What /auth/getProfile returns: an owner (Google user) or a staff member (waiter). */
interface IProfile {
  _id: string;
  kind: AuthKind;
  /** OWNER when the user owns a restaurant; WAITER for staff. */
  role?: RestaurantRole;
  name: string;
  email?: string;
  username?: string;
  profilePicture?: string;
  restaurantId?: string;
}

interface IBillingSettings {
  gstPercent: number;
  serviceChargePercent: number;
}

interface IRestaurant {
  _id: string;
  ownerId: string;
  name: string;
  address: string;
  gpsCoordinates: IGpsCoordinates;
  gpsRadiusMeters: number;
  logoUrl?: string;
  isActive: boolean;
  /** 6-digit code staff use to log in. */
  restaurantCode?: string;
  billingSettings?: IBillingSettings;
  /** Missing on restaurants registered before onboarding approval existed (treated as ACTIVE). */
  status?: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  statusReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface IMenuTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  backgroundImageUrl?: string;
  fontFamily: string;
  layout: 'grid' | 'list';
}

interface IMenu {
  _id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  theme: IMenuTheme;
  themeSavedAt?: string | null;
  /** false = view-only menu: customers browse and call a waiter; only staff place orders. */
  customerOrderingEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

type SetupStepKey = 'restaurant' | 'menu' | 'tables' | 'theme';

type SetupLockReason = 'PREVIOUS_STEP' | 'AWAITING_APPROVAL';

interface ISetupStepStatus {
  step: SetupStepKey;
  done: boolean;
  unlocked: boolean;
  lockedReason: SetupLockReason | null;
}

interface ISetupStatus {
  steps: ISetupStepStatus[];
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
  /** Restaurant registered but not yet approved by the super admin; steps 2+ stay locked. */
  awaitingApproval: boolean;
  restaurantStatus: NonNullable<IRestaurant['status']> | null;
  nextStep: SetupStepKey | null;
  counts: { dishes: number; tables: number };
}

/** Menu as served to customers / staff taking an order (active categories, available dishes). */
interface IOrderingMenu {
  restaurant: { _id: string; name: string; logoUrl?: string };
  table: { _id: string; tableNumber: number; label?: string };
  menu: { _id: string; name: string };
  categories: (ICategory & { dishes: IDish[] })[];
}

interface ICategory {
  _id: string;
  menuId: string;
  name: string;
  description?: string;
  displayOrder: number;
  imageUrl?: string;
  isActive: boolean;
}

interface IDish {
  _id: string;
  categoryId: string;
  menuId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  preparationTime?: number;
  tags?: string[];
  displayOrder: number;
  spiceLevel?: 'NONE' | 'MILD' | 'MEDIUM' | 'HOT';
  servingSize?: string;
  calories?: number;
  ingredients?: string;
  allergens?: string[];
}

interface ITable {
  _id: string;
  restaurantId: string;
  tableNumber: number;
  label?: string;
  qrCodeUrl?: string;
  /** Secret in the QR link (/menu/t/<qrToken>); absent on tables whose QR predates tokens. */
  qrToken?: string;
  isActive: boolean;
}

interface IOrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
  notes?: string;
  /** Which diner at the table added it (customer menu orders). */
  addedBy?: string;
}

interface ITableAlert {
  at: string;
  by: string;
}

/** Socket push when a diner taps "Call waiter" / "Request bill". `notify` says who should hear it ring. */
interface ITableAlertEvent {
  type: 'BILL' | 'WAITER';
  notify: 'WAITERS' | 'OWNER';
  sessionId: string;
  tableId: string;
  tableNumber: number;
  by: string;
  at: string;
}

/** A table with diners signed in on the customer menu. */
interface IOpenTableSession {
  _id: string;
  tableId: string;
  tableNumber: number;
  members: string[];
  cartLines: number;
  cartTotal: number;
  /** Orders waiting to be billed — the table can only be cleared (without a bill) when this is 0. */
  unbilledOrders: number;
  billRequested: ITableAlert | null;
  waiterCalled: ITableAlert | null;
  openedAt: string;
  lastActivityAt: string;
}

interface IOrder {
  _id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  items: IOrderItem[];
  status: string;
  specialInstructions?: string;
  customerName?: string;
  totalAmount: number;
  gpsCoordinates?: IGpsCoordinates;
  /** Set once the order is on a table bill. */
  billId?: string | null;
  /** Set when a waiter/owner took the order for the table (absent for customer QR orders). */
  placedBy?: { role: RestaurantRole; actorId: string; name: string };
  editedBy?: { role: RestaurantRole; actorId: string; name: string; at: string };
  createdAt: string;
  updatedAt: string;
}

interface ITableOrders {
  orders: IOrder[];
  unbilledCount: number;
  unbilledAmount: number;
}

interface IStaff {
  _id: string;
  restaurantId: string;
  name: string;
  username: string;
  role: RestaurantRole;
  isActive: boolean;
  lastLoginAt?: string;
  /** False for older waiters whose PIN isn't known yet (after their next login or a reset it is). */
  hasViewablePin: boolean;
  /** Current PIN — included in the owner's staff list. */
  pin?: string | null;
  createdAt: string;
}

type BillStatus = 'UNPAID' | 'PAID';
type PaymentMode = 'CASH' | 'UPI' | 'CARD';

interface IBillItem {
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  amount: number;
}

interface IBillTotals {
  items: IBillItem[];
  subtotal: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

interface IBillPreview extends IBillTotals {
  tableId: string;
  tableNumber: number;
  tableLabel?: string;
  orderCount: number;
  pendingOrders: number;
}

interface IBill extends IBillTotals {
  _id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  tableLabel?: string;
  billNumber: string;
  orderIds: string[];
  status: BillStatus;
  paymentMode?: PaymentMode;
  paidAt?: string;
  generatedBy: string;
  paidBy?: string;
  createdAt: string;
}

interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface IAuthContext {
  user: IProfile | null;
  restaurant: IRestaurant | null;
  menu: IMenu | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True for the restaurant owner (Google login); false for waiters. */
  isOwner: boolean;
  /** Owner's Quick Setup progress (null for waiters, or before it loads). */
  setup: ISetupStatus | null;
  /** Waiters, and owners who finished Quick Setup, see the full app. */
  isSetupComplete: boolean;
  refreshSetup: () => Promise<ISetupStatus | null>;
  login: () => void;
  staffLogin: (input: { restaurantCode: string; username: string; pin: string }) => Promise<void>;
  logout: () => Promise<void>;
  setRestaurant: (r: IRestaurant) => void;
  setMenu: (m: IMenu) => void;
  refreshProfile: () => Promise<void>;
}

export type {
  IGpsCoordinates,
  IUser,
  AuthKind,
  RestaurantRole,
  IProfile,
  IBillingSettings,
  IRestaurant,
  IMenuTheme,
  IMenu,
  SetupStepKey,
  ISetupStepStatus,
  ISetupStatus,
  IOrderingMenu,
  ICategory,
  IDish,
  ITable,
  IOrderItem,
  ITableAlert,
  ITableAlertEvent,
  IOpenTableSession,
  IOrder,
  ITableOrders,
  IStaff,
  BillStatus,
  PaymentMode,
  IBillItem,
  IBillTotals,
  IBillPreview,
  IBill,
  IApiResponse,
  IAuthContext,
};
