// ============================================================
// Super Admin Service — public surface
// Platform owners (us) review and control restaurant onboarding.
// Reads/writes domain data only through the DM layer (src/dm/*).
// ============================================================

export { default as superAdminRouter } from './routes/super-admin.routes';
