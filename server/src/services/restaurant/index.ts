// ============================================================
// Restaurant Service — public surface (used by other services)
// ============================================================

export * as RestaurantDM from './dm/restaurant.dm';
export type {
  IRestaurant,
  IBillingSettings,
  IRestaurantStatusChange,
} from './interfaces/restaurant.interface';
