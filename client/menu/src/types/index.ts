// ============================================================
// Customer Menu Types
// ============================================================

interface IMenuTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  backgroundImageUrl?: string;
  fontFamily: string;
  layout: 'grid' | 'list';
}

interface IDish {
  _id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  tags?: string[];
  spiceLevel?: 'NONE' | 'MILD' | 'MEDIUM' | 'HOT';
  servingSize?: string;
  calories?: number;
  ingredients?: string;
  allergens?: string[];
}

interface ICategoryWithDishes {
  _id: string;
  /** null / missing = top level (categories nest up to 3 levels) */
  parentId?: string | null;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  dishes: IDish[];
}

/** GET /table-session/resolve/... — public, so the menu can be browsed before signing in. */
interface ITableMenu {
  restaurant: { _id: string; name: string; logoUrl?: string };
  menu: { _id: string; name: string; theme: IMenuTheme; customerOrderingEnabled?: boolean };
  categories: ICategoryWithDishes[];
  table: { _id: string; tableNumber: number; label?: string };
}

/** Which table the QR pointed at: `/menu/t/<token>` or (old printed QR codes) `/menu/<restaurantId>/<tableId>`. */
type ITableLink = { qrToken: string } | { restaurantId: string; tableId: string };

interface ICustomer {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

type SessionStatus = 'OPEN' | 'CLOSED';

/** A line of the live table cart. key = `<member key of who added it>.<dishId>` — one line per diner per dish. */
interface ICartLine {
  key: string;
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  notes?: string;
  /** Name of the diner who added it. */
  by: string;
}

/** The live cart as the server pushes it (socket `cart_updated`). Newer version wins. */
interface ICartState {
  sessionId: string;
  version: number;
  lines: ICartLine[];
  total: number;
  /** Member key of whoever made this change. */
  changedBy?: string;
}

/** Set a cart line to `quantity` (0 removes it). */
interface ICartChange {
  key: string;
  quantity: number;
}

interface ISessionOrder {
  _id: string;
  status: string;
  items: { dishName: string; quantity: number; price: number; notes?: string; addedBy?: string }[];
  totalAmount: number;
  customerName?: string;
  placedByStaff: string | null;
  specialInstructions?: string;
  billed: boolean;
  createdAt: string;
}

/** The diner's table: who's here, the shared cart, and everything ordered so far. */
interface ITableSession {
  _id: string;
  status: SessionStatus;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  /** This diner's member key: cart lines whose key starts with `<me>.` are theirs. */
  me: string;
  members: { name: string; profilePicture?: string; isMe: boolean }[];
  cart: ICartLine[];
  cartVersion: number;
  cartTotal: number;
  /** Only on PUT cart/sync: dishes that could not be added (no longer available). */
  cartSkipped?: string[];
  billRequestedAt: string | null;
  waiterCalledAt: string | null;
  /** Time left (ms, at response time) before the table can ask again. */
  billRequestCooldownMs: number;
  waiterCallCooldownMs: number;
  billId: string | null;
  closedAt: string | null;
  closedReason: 'BILLED' | 'IDLE' | 'STAFF' | null;
  orders: ISessionOrder[];
}

interface IBillTotals {
  items: { dishName: string; price: number; quantity: number; amount: number }[];
  subtotal: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
}

interface IFinalBill extends IBillTotals {
  _id: string;
  billNumber: string;
  status: 'UNPAID' | 'PAID';
  paymentMode?: string;
  paidAt?: string;
  createdAt: string;
}

interface IBillPreview extends IBillTotals {
  orderCount: number;
  pendingOrders: number;
}

interface IDinerBill {
  final: IFinalBill | null;
  preview: IBillPreview | null;
}

interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface IGpsCoordinates {
  latitude: number;
  longitude: number;
}

type TabId = 'menu' | 'cart' | 'orders';

export type {
  IMenuTheme,
  IDish,
  ICategoryWithDishes,
  ITableMenu,
  ITableLink,
  ICustomer,
  SessionStatus,
  ICartLine,
  ICartState,
  ICartChange,
  ISessionOrder,
  ITableSession,
  IBillTotals,
  IFinalBill,
  IBillPreview,
  IDinerBill,
  IApiResponse,
  IGpsCoordinates,
  TabId,
};
