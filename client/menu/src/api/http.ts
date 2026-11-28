import axios from 'axios';
import { API_BASE_URL, MESSAGES } from '../constants';
import type { IApiResponse } from '../types';

// ============================================================
// HTTP client — same origin, the diner's login travels in an httpOnly cookie
// ============================================================

export const http = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

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
  MESSAGES.ERROR_GENERIC;
