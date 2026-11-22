import { SetupStep } from '../constants/setup.constants';

// ============================================================
// Setup Interfaces
// ============================================================

export interface ISetupStepStatus {
  step: SetupStep;
  done: boolean;
  /** A step is unlocked once every step before it is done. */
  unlocked: boolean;
}

export interface ISetupStatus {
  steps: ISetupStepStatus[];
  completedCount: number;
  totalSteps: number;
  isComplete: boolean;
  /** First step that is not done yet (null when setup is complete). */
  nextStep: SetupStep | null;
  counts: {
    dishes: number;
    tables: number;
  };
}
