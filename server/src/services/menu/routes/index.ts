import { Router } from 'express';
import menuRoutes from './menu.routes';
import categoryRoutes from './category.routes';
import dishRoutes from './dish.routes';
import publicMenuRoutes from './public-menu.routes';

// ============================================================
// Menu Service Router — mounted at /api/v1/menu
//   /menu/*           menu (create, get, update, theme)
//   /menu/category/*  categories
//   /menu/dish/*      dishes (menu items)
//   /menu/public/*    customer menu (no auth, QR scan entry point)
// ============================================================

const router = Router();

router.use('/category', categoryRoutes);
router.use('/dish', dishRoutes);
router.use('/public', publicMenuRoutes);
router.use('/', menuRoutes);

export default router;
