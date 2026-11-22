// ============================================================
// Common Interfaces — Shared types used across the application
// ============================================================

export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export interface IGpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IPaginatedResponse<T> {
  items: T[];
  pagination: IPagination;
}

export interface IMenuTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  backgroundImageUrl?: string;
  fontFamily: string;
  layout: 'grid' | 'list';
}

export interface IOrderItemInput {
  dishId: string;
  quantity: number;
  notes?: string;
}

export interface IReorderItem {
  id: string;
  displayOrder: number;
}
