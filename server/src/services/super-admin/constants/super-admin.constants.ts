// ============================================================
// Super Admin Service — Constants
// ============================================================

export const SUPER_ADMIN_ROUTES = {
  GET_ME: '/getMe',
  GET_STATS: '/getStats',
  GET_RESTAURANTS: '/getRestaurants',
  GET_RESTAURANT: '/getRestaurant/:id',
  APPROVE_RESTAURANT: '/approveRestaurant/:id',
  REJECT_RESTAURANT: '/rejectRestaurant/:id',
  SUSPEND_RESTAURANT: '/suspendRestaurant/:id',
  REACTIVATE_RESTAURANT: '/reactivateRestaurant/:id',
} ;

export const SUPER_ADMIN_MESSAGES = {
  PROFILE_FETCHED: 'Super admin profile fetched.',
  STATS_FETCHED: 'Platform stats fetched.',
  RESTAURANTS_FETCHED: 'Restaurants fetched.',
  RESTAURANT_FETCHED: 'Restaurant details fetched.',
} ;

export const SUPER_ADMIN_LIMITS = {
  RECENT_PENDING: 5,
  REASON_MIN: 3,
  REASON_MAX: 500,
  SEARCH_MAX: 100,
} ;
