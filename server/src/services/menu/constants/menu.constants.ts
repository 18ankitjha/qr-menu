// ============================================================
// Menu Service Constants
// ============================================================

export enum SpiceLevel {
  NONE = 'NONE',
  MILD = 'MILD',
  MEDIUM = 'MEDIUM',
  HOT = 'HOT',
}

export const MENU_MESSAGES = {
  DISH_FETCHED: 'Dish fetched',
  CATEGORY_NOT_IN_MENU: 'Category does not belong to this menu.',
} as const;
