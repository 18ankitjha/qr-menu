import axios from 'axios';
import { API_ENDPOINTS } from '../constants';
import type {
  IApiResponse,
  IUser,
  IRestaurant,
  IMenu,
  ICategory,
  IDish,
  ITable,
  IOrder,
} from '../types';

// ============================================================
// Axios Instance — preconfigured with credentials
// ============================================================

const api = axios.create({
  withCredentials: true,
});

// ============================================================
// Auth API
// ============================================================

const getProfile = () =>
  api.get<IApiResponse<IUser>>(API_ENDPOINTS.AUTH.GET_PROFILE);

// const googleLogin = (idToken: string) =>
//   api.post<IApiResponse<{ user: IUser; token: string; isNewUser: boolean }>>(
//     API_ENDPOINTS.AUTH.GOOGLE_LOGIN,
//     { idToken }
//   );

const logout = () =>
  api.post<IApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT);

// ============================================================
// Restaurant API
// ============================================================

const registerRestaurant = (data: Partial<IRestaurant>) =>
  api.post<IApiResponse<IRestaurant>>(API_ENDPOINTS.RESTAURANT.REGISTER, data);

const getRestaurant = (id: string) =>
  api.get<IApiResponse<IRestaurant>>(API_ENDPOINTS.RESTAURANT.GET(id));

const updateRestaurant = (id: string, data: Partial<IRestaurant>) =>
  api.put<IApiResponse<IRestaurant>>(API_ENDPOINTS.RESTAURANT.UPDATE(id), data);

const setRestaurantGps = (id: string, data: { latitude: number; longitude: number; gpsRadiusMeters?: number }) =>
  api.put<IApiResponse<IRestaurant>>(API_ENDPOINTS.RESTAURANT.SET_GPS(id), data);

// ============================================================
// Menu API
// ============================================================

const createMenu = (data: { restaurantId: string; name: string }) =>
  api.post<IApiResponse<IMenu>>(API_ENDPOINTS.MENU.CREATE, data);

const getMenu = (restaurantId: string) =>
  api.get<IApiResponse<IMenu>>(API_ENDPOINTS.MENU.GET(restaurantId));

const updateMenu = (menuId: string, data: Partial<IMenu>) =>
  api.put<IApiResponse<IMenu>>(API_ENDPOINTS.MENU.UPDATE(menuId), data);

const setMenuTheme = (menuId: string, theme: IMenu['theme']) =>
  api.put<IApiResponse<IMenu>>(API_ENDPOINTS.MENU.SET_THEME(menuId), theme);

// ============================================================
// Category API
// ============================================================

const addCategory = (data: Partial<ICategory>) =>
  api.post<IApiResponse<ICategory>>(API_ENDPOINTS.CATEGORY.ADD, data);

const getCategories = (menuId: string) =>
  api.get<IApiResponse<ICategory[]>>(API_ENDPOINTS.CATEGORY.GET_ALL(menuId));

const updateCategory = (id: string, data: Partial<ICategory>) =>
  api.put<IApiResponse<ICategory>>(API_ENDPOINTS.CATEGORY.UPDATE(id), data);

const setCategoryActive = (id: string, isActive: boolean) =>
  api.put<IApiResponse<ICategory>>(API_ENDPOINTS.CATEGORY.SET_ACTIVE(id), { isActive });

const deleteCategory = (id: string) =>
  api.delete<IApiResponse<null>>(API_ENDPOINTS.CATEGORY.DELETE(id));

const reorderCategories = (data: { menuId: string; orderedIds: string[] }) =>
  api.patch<IApiResponse<null>>(API_ENDPOINTS.CATEGORY.REORDER, data);

// ============================================================
// Dish API
// ============================================================

const addDish = (data: Partial<IDish>) =>
  api.post<IApiResponse<IDish>>(API_ENDPOINTS.DISH.ADD, data);

const getDishes = (categoryId: string) =>
  api.get<IApiResponse<IDish[]>>(API_ENDPOINTS.DISH.GET_ALL(categoryId));

const updateDish = (id: string, data: Partial<IDish>) =>
  api.put<IApiResponse<IDish>>(API_ENDPOINTS.DISH.UPDATE(id), data);

const setDishAvailability = (id: string, isAvailable: boolean) =>
  api.put<IApiResponse<IDish>>(API_ENDPOINTS.DISH.SET_AVAILABILITY(id), { isAvailable });

const deleteDish = (id: string) =>
  api.delete<IApiResponse<null>>(API_ENDPOINTS.DISH.DELETE(id));

const reorderDishes = (data: { categoryId: string; orderedIds: string[] }) =>
  api.patch<IApiResponse<null>>(API_ENDPOINTS.DISH.REORDER, data);

// ============================================================
// Table API
// ============================================================

const addTable = (data: { restaurantId: string; tableNumber: number; label?: string }) =>
  api.post<IApiResponse<ITable>>(API_ENDPOINTS.TABLE.ADD, data);

const addBulkTables = (data: { restaurantId: string; count: number }) =>
  api.post<IApiResponse<ITable[]>>(API_ENDPOINTS.TABLE.ADD_BULK, data);

const getTables = (restaurantId: string) =>
  api.get<IApiResponse<ITable[]>>(API_ENDPOINTS.TABLE.GET_ALL(restaurantId));

const deleteTable = (id: string) =>
  api.delete<IApiResponse<null>>(API_ENDPOINTS.TABLE.DELETE(id));

// ============================================================
// QR API
// ============================================================

const generateQr = (tableId: string) =>
  api.post<IApiResponse<{ qrCodeUrl: string }>>(API_ENDPOINTS.QR.GENERATE(tableId));

const getQr = (tableId: string) =>
  api.get<IApiResponse<{ qrCodeUrl: string }>>(API_ENDPOINTS.QR.GET(tableId));

// ============================================================
// Order API
// ============================================================

const getAllOrders = (restaurantId: string) =>
  api.get<IApiResponse<IOrder[]>>(API_ENDPOINTS.ORDER.GET_ALL(restaurantId));

const setOrderStatus = (orderId: string, status: string) =>
  api.patch<IApiResponse<IOrder>>(API_ENDPOINTS.ORDER.SET_STATUS(orderId), { status });

// ============================================================
// Invoice API
// ============================================================

const generateInvoice = (orderId: string) =>
  api.post<IApiResponse<{ url: string }>>(API_ENDPOINTS.INVOICE.GENERATE, { orderId });

const getInvoicePdf = (orderId: string) =>
  API_ENDPOINTS.INVOICE.GET_PDF(orderId);

const getTableInvoicePdf = (tableId: string) =>
  API_ENDPOINTS.INVOICE.GET_TABLE_PDF(tableId);

// ============================================================
// Upload API
// ============================================================

const uploadImage = (file: File, folder: string) => {
  const formData = new FormData();
  formData.append('image', file);

  return api.post<IApiResponse<{ url: string; publicId: string }>>(
    `${API_ENDPOINTS.UPLOAD.IMAGE}?folder=${folder}`,
    formData,
    {
      headers: { 'Content-Type': undefined },
      timeout: 30000,
    }
  );
};

export {
  api,
  getProfile,
  logout,
  registerRestaurant,
  getRestaurant,
  updateRestaurant,
  setRestaurantGps,
  createMenu,
  getMenu,
  updateMenu,
  setMenuTheme,
  addCategory,
  getCategories,
  updateCategory,
  setCategoryActive,
  deleteCategory,
  reorderCategories,
  addDish,
  getDishes,
  updateDish,
  setDishAvailability,
  deleteDish,
  reorderDishes,
  addTable,
  addBulkTables,
  getTables,
  deleteTable,
  generateQr,
  getQr,
  getAllOrders,
  setOrderStatus,
  generateInvoice,
  getInvoicePdf,
  getTableInvoicePdf,
  uploadImage,
};
