import { Express } from 'express';
import { APP_CONSTANTS, ROUTE_PATHS } from '../config/constants';
import authRoutes from '../services/auth/routes/auth.routes';
import restaurantRoutes from '../services/restaurant/routes/restaurant.routes';
import menuRoutes from '../services/menu/routes';
import tableRoutes from '../services/table/routes/table.routes';
import orderRoutes from '../services/order/routes/order.routes';
import billingRoutes from '../services/billing/routes/billing.routes';
import tableSessionRoutes from '../services/table-session/routes/table-session.routes';
import staffRoutes from '../services/staff/routes/staff.routes';
import setupRoutes from '../services/setup/routes/setup.routes';
import uploadRoutes from '../services/upload/routes/upload.routes';
import { superAdminRouter } from '../services/super-admin';

// ============================================================
// Route Aggregator — one prefix per service (services/<name>/)
//   /api/v1/auth         login (Google owners, staff PIN), profile, logout
//   /api/v1/restaurant   restaurant profile, GPS, billing settings
//   /api/v1/menu         menus, /category, /dish, /public (customer menu)
//   /api/v1/table        tables + QR codes
//   /api/v1/order        staff ordering for a table, kitchen feed, admin order views
//   /api/v1/table-session diners at a table: QR resolve, join (Google), shared cart, place order, bill/waiter alerts
//   /api/v1/billing      table bills + order receipts (+ /customer: a diner's own bill)
//   /api/v1/staff        waiters (owner-managed)
//   /api/v1/setup        Quick Setup progress (onboarding steps)
//   /api/v1/upload       image uploads
//   /api/v1/super-admin  platform administration
// ============================================================

const registerRoutes = (app: Express): void => {
  const prefix = APP_CONSTANTS.API_PREFIX;

  app.use(`${prefix}${ROUTE_PATHS.AUTH}`, authRoutes);
  app.use(`${prefix}${ROUTE_PATHS.RESTAURANT}`, restaurantRoutes);
  app.use(`${prefix}${ROUTE_PATHS.MENU}`, menuRoutes);
  app.use(`${prefix}${ROUTE_PATHS.TABLE}`, tableRoutes);
  app.use(`${prefix}${ROUTE_PATHS.ORDER}`, orderRoutes);
  app.use(`${prefix}${ROUTE_PATHS.TABLE_SESSION}`, tableSessionRoutes);
  app.use(`${prefix}${ROUTE_PATHS.BILLING}`, billingRoutes);
  app.use(`${prefix}${ROUTE_PATHS.STAFF}`, staffRoutes);
  app.use(`${prefix}${ROUTE_PATHS.SETUP}`, setupRoutes);
  app.use(`${prefix}${ROUTE_PATHS.UPLOAD}`, uploadRoutes);
  app.use(`${prefix}${ROUTE_PATHS.SUPER_ADMIN}`, superAdminRouter);
};

export { registerRoutes };
