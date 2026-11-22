import axios from 'axios';
import { API_ENDPOINTS } from '../constants';
import type {
  IApiResponse,
  IProfile,
  IRestaurant,
  IBillingSettings,
  IMenu,
  ICategory,
  IDish,
  ITable,
  IOrder,
  ITableOrders,
  IStaff,
  IBill,
  IBillPreview,
  BillStatus,
  PaymentMode,
  ISetupStatus,
  IOrderingMenu,
  IOpenTableSession,
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
  api.get<IApiResponse<IProfile>>(API_ENDPOINTS.AUTH.GET_PROFILE);

/** Waiter login: 6-digit restaurant code + username + PIN. Sets the auth cookie. */
const staffLogin = (data: { restaurantCode: string; username: string; pin: string }) =>
  api.post<IApiResponse<unknown>>(API_ENDPOINTS.AUTH.STAFF_LOGIN, data);

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

const setBillingSettings = (id: string, data: IBillingSettings) =>
  api.put<IApiResponse<IRestaurant>>(API_ENDPOINTS.RESTAURANT.SET_BILLING_SETTINGS(id), data);

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

const getAllOrders = (restaurantId: string, filters: { tableId?: string; status?: string } = {}) =>
  api.get<IApiResponse<IOrder[]>>(API_ENDPOINTS.ORDER.GET_ALL(restaurantId), { params: filters });

/** Waiter/owner takes an order for a table (no GPS check). */
const placeOrderByStaff = (data: {
  restaurantId: string;
  tableId: string;
  items: { dishId: string; quantity: number; notes?: string }[];
  specialInstructions?: string;
  customerName?: string;
}) => api.post<IApiResponse<IOrder>>(API_ENDPOINTS.ORDER.PLACE_BY_STAFF, data);

/** Active categories + available dishes, for taking an order. */
const getOrderingMenu = (restaurantId: string, tableId: string) =>
  api.get<IApiResponse<IOrderingMenu>>(API_ENDPOINTS.MENU.GET_ORDERING_MENU(restaurantId, tableId));

// ============================================================
// Table Session API (diners at tables — alerts for staff)
// ============================================================

const getOpenTableSessions = (restaurantId: string) =>
  api.get<IApiResponse<IOpenTableSession[]>>(API_ENDPOINTS.TABLE_SESSION.GET_OPEN(restaurantId));

const clearTableAlert = (sessionId: string, type: 'BILL' | 'WAITER') =>
  api.patch<IApiResponse<IOpenTableSession>>(API_ENDPOINTS.TABLE_SESSION.CLEAR_ALERT(sessionId), { type });

const closeTableSession = (sessionId: string) =>
  api.post<IApiResponse<IOpenTableSession>>(API_ENDPOINTS.TABLE_SESSION.CLOSE(sessionId));

// ============================================================
// Setup API (owner Quick Setup)
// ============================================================

const getSetupStatus = (restaurantId: string) =>
  api.get<IApiResponse<ISetupStatus>>(API_ENDPOINTS.SETUP.GET_STATUS(restaurantId));

const getOrdersByTable = (tableId: string) =>
  api.get<IApiResponse<ITableOrders>>(API_ENDPOINTS.ORDER.GET_BY_TABLE(tableId));

const setOrderStatus = (orderId: string, status: string) =>
  api.patch<IApiResponse<IOrder>>(API_ENDPOINTS.ORDER.SET_STATUS(orderId), { status });

/** Full new item list for an unbilled order (owner or waiter). */
const updateOrderItems = (
  orderId: string,
  data: {
    items: { dishId: string; quantity: number; notes?: string; addedBy?: string }[];
    specialInstructions?: string;
  }
) => api.patch<IApiResponse<IOrder>>(API_ENDPOINTS.ORDER.UPDATE_ITEMS(orderId), data);

// ============================================================
// Billing API
// ============================================================

const previewTableBill = (tableId: string) =>
  api.get<IApiResponse<IBillPreview>>(API_ENDPOINTS.BILLING.PREVIEW_TABLE_BILL(tableId));

const generateTableBill = (tableId: string) =>
  api.post<IApiResponse<IBill>>(API_ENDPOINTS.BILLING.GENERATE_TABLE_BILL, { tableId });

const getBills = (restaurantId: string, filters: { status?: BillStatus; tableId?: string } = {}) =>
  api.get<IApiResponse<IBill[]>>(API_ENDPOINTS.BILLING.GET_ALL(restaurantId), { params: filters });

const markBillPaid = (billId: string, paymentMode: PaymentMode) =>
  api.patch<IApiResponse<IBill>>(API_ENDPOINTS.BILLING.MARK_PAID(billId), { paymentMode });

/** PDF URLs are opened directly in a new tab; the auth cookie is sent (same origin). */
const getBillPdfUrl = (billId: string) => API_ENDPOINTS.BILLING.GET_PDF(billId);

const getOrderPdfUrl = (orderId: string) => API_ENDPOINTS.BILLING.GET_ORDER_PDF(orderId);

// ============================================================
// Staff API (owner only)
// ============================================================

const addStaff = (data: { restaurantId: string; name: string; username: string; pin?: string }) =>
  api.post<IApiResponse<{ staff: IStaff; pin: string }>>(API_ENDPOINTS.STAFF.ADD, data);

const getStaff = (restaurantId: string) =>
  api.get<IApiResponse<IStaff[]>>(API_ENDPOINTS.STAFF.GET_ALL(restaurantId));

const resetStaffPin = (id: string, pin?: string) =>
  api.post<IApiResponse<{ staff: IStaff; pin: string }>>(API_ENDPOINTS.STAFF.RESET_PIN(id), pin ? { pin } : {});

/** Owner only. 409 for older waiters whose PIN must be reset before it can be viewed. */
const getStaffPin = (id: string) =>
  api.get<IApiResponse<{ pin: string }>>(API_ENDPOINTS.STAFF.GET_PIN(id));

const setStaffActive = (id: string, isActive: boolean) =>
  api.patch<IApiResponse<IStaff>>(API_ENDPOINTS.STAFF.SET_ACTIVE(id), { isActive });

const removeStaff = (id: string) =>
  api.delete<IApiResponse<null>>(API_ENDPOINTS.STAFF.REMOVE(id));

/** Pulls the server's error message out of an axios error. */
const getErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return data?.message || data?.error || fallback;
};

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

/** Delete an uploaded image that was never saved (server keeps it if anything uses it). Best-effort. */
const discardImage = (url: string) =>
  api.delete(API_ENDPOINTS.UPLOAD.IMAGE, { data: { url } }).catch(() => undefined);

export {
  api,
  getProfile,
  staffLogin,
  logout,
  registerRestaurant,
  getRestaurant,
  updateRestaurant,
  setRestaurantGps,
  setBillingSettings,
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
  placeOrderByStaff,
  getOrderingMenu,
  getOpenTableSessions,
  clearTableAlert,
  closeTableSession,
  getSetupStatus,
  getOrdersByTable,
  setOrderStatus,
  updateOrderItems,
  previewTableBill,
  generateTableBill,
  getBills,
  markBillPaid,
  getBillPdfUrl,
  getOrderPdfUrl,
  addStaff,
  getStaff,
  resetStaffPin,
  getStaffPin,
  setStaffActive,
  removeStaff,
  getErrorMessage,
  uploadImage,
  discardImage,
};
