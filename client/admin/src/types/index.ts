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

interface IRestaurant {
  _id: string;
  ownerId: string;
  name: string;
  address: string;
  gpsCoordinates: IGpsCoordinates;
  gpsRadiusMeters: number;
  logoUrl?: string;
  isActive: boolean;
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
  createdAt: string;
  updatedAt: string;
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
}

interface ITable {
  _id: string;
  restaurantId: string;
  tableNumber: number;
  label?: string;
  qrCodeUrl?: string;
  isActive: boolean;
}

interface IOrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
  notes?: string;
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
  createdAt: string;
  updatedAt: string;
}

interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface IAuthContext {
  user: IUser | null;
  restaurant: IRestaurant | null;
  menu: IMenu | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  setRestaurant: (r: IRestaurant) => void;
  setMenu: (m: IMenu) => void;
  refreshProfile: () => Promise<void>;
}

export type {
  IGpsCoordinates,
  IUser,
  IRestaurant,
  IMenuTheme,
  IMenu,
  ICategory,
  IDish,
  ITable,
  IOrderItem,
  IOrder,
  IApiResponse,
  IAuthContext,
};
