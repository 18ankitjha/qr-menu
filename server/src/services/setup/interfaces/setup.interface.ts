import { RestaurantStatus } from '../../../config/constants';
import { SetupLockReason, SetupStep } from '../constants/setup.constants';

// ============================================================
// Setup Interfaces
// ============================================================

export interface ISetupStepStatus {
  step: SetupStep;
  done: boolean;
  /** Step 1 is always open; later steps need super admin approval and every earlier step done. */
  unlocked: boolean;
  lockedReason: SetupLockReason | null;
}

export interface ISetupStatus {
  steps: ISetupStepStatus[];
  completedCount: number;
  totalSteps: number;
  /** All steps done and the restaurant is approved. */
  isComplete: boolean;
  /** Restaurant registered but not yet approved by the super admin. */
  awaitingApproval: boolean;
  /** Onboarding status, so the admin app notices approval/rejection without a reload. */
  restaurantStatus: RestaurantStatus | null;
  /** First step that is not done yet (null when setup is complete). */
  nextStep: SetupStep | null;
  counts: {
    dishes: number;
    tables: number;
  };
}
