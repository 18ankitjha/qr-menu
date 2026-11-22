import { Express } from 'express';
import { APP_CONSTANTS, ROUTE_PATHS } from '../config/constants';
import authRoutes from './auth.routes';
import restaurantRoutes from './restaurant.routes';
import menuRoutes from './menu.routes';
import categoryRoutes from './category.routes';
import dishRoutes from './dish.routes';
import tableRoutes from './table.routes';
import qrRoutes from './qr.routes';
import orderRoutes from './order.routes';
import uploadRoutes from './upload.routes';
import invoiceRoutes from './invoice.routes';
import publicRoutes from './public.routes';

// ============================================================
// Route Aggregator — Mounts all route modules
// ============================================================

const registerRoutes = (app: Express): void => {
  const prefix = APP_CONSTANTS.API_PREFIX;

  app.use(`${prefix}${ROUTE_PATHS.AUTH}`, authRoutes);
  app.use(`${prefix}${ROUTE_PATHS.RESTAURANT}`, restaurantRoutes);
  app.use(`${prefix}${ROUTE_PATHS.MENU}`, menuRoutes);
  app.use(`${prefix}${ROUTE_PATHS.CATEGORY}`, categoryRoutes);
  app.use(`${prefix}${ROUTE_PATHS.DISH}`, dishRoutes);
  app.use(`${prefix}${ROUTE_PATHS.TABLE}`, tableRoutes);
  app.use(`${prefix}${ROUTE_PATHS.QR}`, qrRoutes);
  app.use(`${prefix}${ROUTE_PATHS.ORDER}`, orderRoutes);
  app.use(`${prefix}${ROUTE_PATHS.UPLOAD}`, uploadRoutes);
  app.use(`${prefix}${ROUTE_PATHS.INVOICE}`, invoiceRoutes);
  app.use(`${prefix}${ROUTE_PATHS.PUBLIC}`, publicRoutes);
};

export { registerRoutes };
