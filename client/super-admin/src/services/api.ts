import axios from 'axios';
import { API_ENDPOINTS } from '../constants';
import type { RestaurantStatus, StatusAction } from '../constants';
import type {
  IApiResponse,
  IPlatformStats,
  IRestaurant,
  IRestaurantDetails,
  IRestaurantList,
  ISuperAdminProfile,
} from '../types';

// ============================================================
// Super Admin API — cookie-based auth shared with the API server
// ============================================================

const api = axios.create({ withCredentials: true });

const getMe = () => api.get<IApiResponse<ISuperAdminProfile>>(API_ENDPOINTS.SUPER_ADMIN.GET_ME);

/** Regular (non-super-admin) profile, used only to show who was denied access. */
const getProfile = () => api.get<IApiResponse<{ email: string }>>(API_ENDPOINTS.AUTH.GET_PROFILE);

const logout = () => api.post<IApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT);

const getStats = () => api.get<IApiResponse<IPlatformStats>>(API_ENDPOINTS.SUPER_ADMIN.GET_STATS);

const getRestaurants = (params: { status?: RestaurantStatus; search?: string; page: number; limit: number }) =>
  api.get<IApiResponse<IRestaurantList>>(API_ENDPOINTS.SUPER_ADMIN.GET_RESTAURANTS, {
    params: {
      ...params,
      status: params.status || undefined,
      search: params.search || undefined,
    },
  });

const getRestaurant = (id: string) =>
  api.get<IApiResponse<IRestaurantDetails>>(API_ENDPOINTS.SUPER_ADMIN.GET_RESTAURANT(id));

const ACTION_ENDPOINTS: Record<StatusAction, (id: string) => string> = {
  approve: API_ENDPOINTS.SUPER_ADMIN.APPROVE,
  reject: API_ENDPOINTS.SUPER_ADMIN.REJECT,
  suspend: API_ENDPOINTS.SUPER_ADMIN.SUSPEND,
  reactivate: API_ENDPOINTS.SUPER_ADMIN.REACTIVATE,
};

const changeRestaurantStatus = (id: string, action: StatusAction, reason?: string) =>
  api.patch<IApiResponse<IRestaurant>>(ACTION_ENDPOINTS[action](id), reason ? { reason } : {});

/** Permanently deletes the restaurant, its data and its owner. `confirmName` must match the restaurant name. */
const deleteRestaurant = (id: string, confirmName: string) =>
  api.delete<IApiResponse<unknown>>(API_ENDPOINTS.SUPER_ADMIN.DELETE(id), { data: { confirmName } });

/** Pull a readable message out of an API error. */
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<IApiResponse<null>>(error)) {
    const data = error.response?.data;
    const fieldError = data?.errors?.[0]?.message;
    return fieldError || data?.message || fallback;
  }
  return fallback;
};

export {
  api,
  getMe,
  getProfile,
  logout,
  getStats,
  getRestaurants,
  getRestaurant,
  changeRestaurantStatus,
  deleteRestaurant,
  getErrorMessage,
};
