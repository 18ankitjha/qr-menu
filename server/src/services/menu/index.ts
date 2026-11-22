// ============================================================
// Menu Service — public surface (used by other services)
// Owns menus, categories and dishes (menu items).
// ============================================================

export * as MenuDM from './dm/menu.dm';
export * as CategoryDM from './dm/category.dm';
export * as DishDM from './dm/dish.dm';
export * as PublicMenuDM from './dm/public-menu.dm';
export type { IPublicMenu } from './dm/public-menu.dm';
export { SpiceLevel } from './constants/menu.constants';
export type { IDish } from './interfaces/dish.interface';
export type { IMenu } from './interfaces/menu.interface';
export type { ICategory } from './interfaces/category.interface';
