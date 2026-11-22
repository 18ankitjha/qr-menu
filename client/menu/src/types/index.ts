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

interface ICategory {
  _id: string;
  menuId: string;
  name: string;
  description?: string;
  displayOrder: number;
  imageUrl?: string;
  isActive: boolean;
}

interface ICategoryWithDishes extends ICategory {
  dishes: IDish[];
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

interface IMenu {
  _id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  theme: IMenuTheme;
}

interface IRestaurantPublic {
  _id: string;
  name: string;
  logoUrl?: string;
}

interface ICartItem {
  dish: IDish;
  quantity: number;
  notes?: string;
}

interface IPublicMenuData {
  restaurant: IRestaurantPublic;
  menu: IMenu;
  categories: ICategoryWithDishes[];
  table: { _id: string; tableNumber: number; label?: string };
}

interface IOrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface IPlaceOrderPayload {
  restaurantId: string;
  tableId: string;
  items: IOrderItem[];
  specialInstructions?: string;
  customerName?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type {
  IMenuTheme,
  ICategory,
  ICategoryWithDishes,
  IDish,
  IMenu,
  IRestaurantPublic,
  ICartItem,
  IPublicMenuData,
  IOrderItem,
  IPlaceOrderPayload,
  IApiResponse,
};
