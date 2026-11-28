import axios from 'axios';
import { API_BASE_URL, MESSAGES } from '../constants';
import type { IApiResponse } from '../types';

// ============================================================
// HTTP client — same origin, the diner's login travels in an httpOnly cookie
// ============================================================

export const http = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 20000 });

/** Server restarting / deploying, or the phone's network blinked. */
const isTransient = (error: unknown): boolean =>
  axios.isAxiosError(error) && (!error.response || [502, 503, 504].includes(error.response.status));

// One quiet retry for calls that are safe to repeat (reads, and cart edits that SET a quantity).
// POSTs (join, place order, call waiter…) are never repeated automatically.
const RETRY_AFTER_MS = 800;
http.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || !error.config || !isTransient(error)) throw error;
  const config = error.config as typeof error.config & { retried?: boolean };
  const method = (config.method ?? 'get').toLowerCase();
  if (config.retried || !['get', 'put', 'patch'].includes(method)) throw error;
  config.retried = true;
  await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS));
  return http.request(config);
});

export const getData = async <T>(url: string): Promise<T> => (await http.get<IApiResponse<T>>(url)).data.data;

export const postData = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.post<IApiResponse<T>>(url, body)).data.data;

export const patchData = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.patch<IApiResponse<T>>(url, body)).data.data;

export const putData = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.put<IApiResponse<T>>(url, body)).data.data;

export const statusOf = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

/** The server's message for a failed request (it is always written for the diner), or a generic one. */
export const messageOf = (error: unknown): string =>
  (axios.isAxiosError(error) && (error.response?.data as { message?: string } | undefined)?.message) ||
  (isTransient(error) ? MESSAGES.ERROR_NETWORK : MESSAGES.ERROR_GENERIC);
