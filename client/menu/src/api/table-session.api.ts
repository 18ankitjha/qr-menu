import { API_ENDPOINTS } from '../constants';
import type { ICustomer, IDinerBill, IGpsCoordinates, ITableLink, ITableMenu, ITableSession } from '../types';
import { getData, patchData, postData } from './http';

// ============================================================
// Table Session API — the menu, joining the table, the shared cart, ordering, alerts and the bill
// ============================================================

export const resolveTable = (link: ITableLink) =>
  getData<ITableMenu>(
    'qrToken' in link
      ? API_ENDPOINTS.RESOLVE_BY_TOKEN(link.qrToken)
      : API_ENDPOINTS.RESOLVE_LEGACY(link.restaurantId, link.tableId)
  );

export const getProfile = () => getData<ICustomer>(API_ENDPOINTS.PROFILE);

export const logout = () => postData<null>(API_ENDPOINTS.LOGOUT);

export const joinTable = (link: ITableLink, gpsCoordinates?: IGpsCoordinates) =>
  postData<ITableSession>(API_ENDPOINTS.JOIN, { ...link, gpsCoordinates });

export const getSession = (sessionId: string) => getData<ITableSession>(API_ENDPOINTS.GET_SESSION(sessionId));

export const addToCart = (sessionId: string, dishId: string, quantity = 1) =>
  postData<ITableSession>(API_ENDPOINTS.CART_ADD(sessionId), { dishId, quantity });

export const setCartQuantity = (sessionId: string, itemId: string, quantity: number) =>
  patchData<ITableSession>(API_ENDPOINTS.CART_SET_QUANTITY(sessionId), { itemId, quantity });

export const placeOrder = (sessionId: string, cartVersion: number, specialInstructions?: string) =>
  postData<ITableSession>(API_ENDPOINTS.PLACE_ORDER(sessionId), { cartVersion, specialInstructions });

export const requestBill = (sessionId: string) => postData<ITableSession>(API_ENDPOINTS.REQUEST_BILL(sessionId));

export const callWaiter = (sessionId: string) => postData<ITableSession>(API_ENDPOINTS.CALL_WAITER(sessionId));

export const getBill = (sessionId: string) => getData<IDinerBill>(API_ENDPOINTS.GET_BILL(sessionId));
