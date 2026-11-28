// ============================================================
// Menu Service Constants
// ============================================================

export enum SpiceLevel {
  NONE = 'NONE',
  MILD = 'MILD',
  MEDIUM = 'MEDIUM',
  HOT = 'HOT',
}

/** Max category nesting: e.g. Food → Italian → Pastas. Dishes can sit at any level. */
export const MAX_CATEGORY_DEPTH = 3;

export const MENU_MESSAGES = {
  DISH_FETCHED: 'Dish fetched',
  CATEGORY_NOT_IN_MENU: 'Category does not belong to this menu.',
  PARENT_NOT_IN_MENU: 'Parent category not found in this menu.',
  CATEGORY_TOO_DEEP: `Categories can be nested at most ${MAX_CATEGORY_DEPTH} levels deep.`,
  CATEGORY_CYCLE: 'A category cannot be moved inside itself or its own sub-category.',
  CATEGORY_HAS_CHILDREN: 'This category has sub-categories. Delete or move them first.',
} as const;
