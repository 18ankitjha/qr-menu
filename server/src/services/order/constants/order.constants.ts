// ============================================================
// Order Service Constants
// ============================================================

export const ORDER_MESSAGES = {
  ALREADY_BILLED: 'This order is already on a bill and cannot be cancelled.',
  TABLE_ORDERS_FETCHED: 'Table orders fetched',
  DISH_NOT_IN_RESTAURANT: (name: string) => `Dish is not on this restaurant's menu: ${name}`,
  STAFF_ORDER_PLACED: (tableNumber: number) => `Order placed for table ${tableNumber}.`,
  ORDER_UPDATED: 'Order updated.',
  EDIT_BILLED: 'This order is already on a bill and cannot be edited.',
  EDIT_CLOSED: 'Cancelled orders cannot be edited.',
} as const;
