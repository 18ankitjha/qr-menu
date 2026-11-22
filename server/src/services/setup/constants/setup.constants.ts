// ============================================================
// Setup Service Constants — restaurant onboarding ("Quick Setup")
// ============================================================

/** Steps in the order the owner must complete them. Each unlocks the next. */
export enum SetupStep {
  RESTAURANT = 'restaurant',
  MENU = 'menu',
  TABLES = 'tables',
  THEME = 'theme',
}

export const SETUP_STEP_ORDER: SetupStep[] = [
  SetupStep.RESTAURANT,
  SetupStep.MENU,
  SetupStep.TABLES,
  SetupStep.THEME,
];

export const SETUP_MESSAGES = {
  FETCHED: 'Setup status fetched',
} as const;
