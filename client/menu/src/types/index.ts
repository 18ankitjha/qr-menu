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
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  dishes: IDish[];
}

/** GET /table-session/resolve/... — public, so the menu can be browsed before signing in. */
interface ITableMenu {
  restaurant: { _id: string; name: string; logoUrl?: string };
  menu: { _id: string; name: string; theme: IMenuTheme };
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

interface ICartLine {
  _id: string;
  dishId: string;
  dishName: string;
  price: number;
  quantity: number;
  notes?: string;
  addedBy: { name: string; isMe: boolean };
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
  members: { name: string; profilePicture?: string; isMe: boolean }[];
  cart: ICartLine[];
  cartVersion: number;
  cartTotal: number;
  billRequestedAt: string | null;
  waiterCalledAt: string | null;
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
