import { DEFAULT_MENU_THEME } from '../../../config/constants';
import { MenuDM, DishDM, IMenu } from '../../menu';
import { TableDM } from '../../table';
import { RestaurantDM } from '../../restaurant';
import { SETUP_STEP_ORDER, SetupLockReason, SetupStep } from '../constants/setup.constants';
import { ISetupStatus } from '../interfaces/setup.interface';

// ============================================================
// Setup DM — works out which Quick Setup steps a restaurant has finished.
// Reads other services; owns no data of its own.
// ============================================================

/** Menus created before `themeSavedAt` existed count as done if their theme was changed from the default. */
const isThemeCustomized = (menu: IMenu): boolean => {
  if (menu.themeSavedAt) return true;
  const theme = menu.theme as unknown as Record<string, unknown> | undefined;
  if (!theme) return false;
  return (Object.keys(DEFAULT_MENU_THEME) as (keyof typeof DEFAULT_MENU_THEME)[]).some(
    (key) => theme[key] !== undefined && theme[key] !== DEFAULT_MENU_THEME[key]
  ) || !!theme.backgroundImageUrl;
};

export const getSetupStatus = async (restaurantId: string): Promise<ISetupStatus> => {
  const [restaurant, menu, tables] = await Promise.all([
    RestaurantDM.getRestaurantById(restaurantId),
    MenuDM.getMenuByRestaurantId(restaurantId),
    TableDM.countTablesByRestaurantId(restaurantId),
  ]);
  const dishes = menu ? await DishDM.countDishesByMenuId(menu._id.toString()) : 0;

  const done: Record<SetupStep, boolean> = {
    [SetupStep.RESTAURANT]: !!restaurant,
    [SetupStep.MENU]: dishes > 0,
    [SetupStep.TABLES]: tables > 0,
    [SetupStep.THEME]: !!menu && isThemeCustomized(menu),
  };

  // Step 1 (restaurant details) is always open; everything after it waits for super admin approval
  const approved = !!restaurant && RestaurantDM.isRestaurantApproved(restaurant);
  const awaitingApproval = !!restaurant && !approved;

  let allPreviousDone = true;
  const steps = SETUP_STEP_ORDER.map((step, index) => {
    const unlocked = allPreviousDone && (index === 0 || approved);
    const lockedReason: SetupLockReason | null = unlocked
      ? null
      : awaitingApproval
        ? SetupLockReason.AWAITING_APPROVAL
        : SetupLockReason.PREVIOUS_STEP;
    const status = { step, done: done[step], unlocked, lockedReason };
    allPreviousDone = allPreviousDone && done[step];
    return status;
  });

  const completedCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done)?.step ?? null;

  return {
    steps,
    completedCount,
    totalSteps: steps.length,
    isComplete: nextStep === null && approved,
    awaitingApproval,
    restaurantStatus: restaurant ? RestaurantDM.getEffectiveStatus(restaurant) : null,
    nextStep,
    counts: { dishes, tables },
  };
};
