// ============================================================
// Kitchen Display Types
// ============================================================

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
  createdAt: string;
  updatedAt: string;
}

interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type { IOrderItem, IOrder, IApiResponse };
