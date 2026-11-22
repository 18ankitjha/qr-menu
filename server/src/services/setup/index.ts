// ============================================================
// Setup Service — public surface
// Restaurant onboarding ("Quick Setup"): restaurant → menu → tables → theme.
// ============================================================

export * as SetupDM from './dm/setup.dm';
export { SetupStep, SETUP_STEP_ORDER } from './constants/setup.constants';
export type { ISetupStatus, ISetupStepStatus } from './interfaces/setup.interface';
