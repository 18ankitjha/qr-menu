// ============================================================
// Staff Service — public surface (used by auth for staff login + access checks)
// ============================================================

export * as StaffDM from './dm/staff.dm';
export { StaffLoginResult } from './constants/staff.constants';
export type { IStaff, IPublicStaff } from './interfaces/staff.interface';
