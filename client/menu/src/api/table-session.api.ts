import { API_ENDPOINTS } from '../constants';
import type { ICartChange, ICustomer, IDinerBill, IGpsCoordinates, ITableLink, ITableMenu, ITableSession } from '../types';
import { getData, postData, putData } from './http';

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

/** Cart tab opened (or no live connection): apply edits still on this phone and save the cart. Taps use the socket. */
export const syncCart = (sessionId: string, changes: ICartChange[]) =>
  putData<ITableSession>(API_ENDPOINTS.CART_SYNC(sessionId), { changes });

export const placeOrder = (sessionId: string, cartVersion: number, specialInstructions?: string) =>
  postData<ITableSession>(API_ENDPOINTS.PLACE_ORDER(sessionId), { cartVersion, specialInstructions });

export const requestBill = (sessionId: string) => postData<ITableSession>(API_ENDPOINTS.REQUEST_BILL(sessionId));

export const callWaiter = (sessionId: string) => postData<ITableSession>(API_ENDPOINTS.CALL_WAITER(sessionId));

export const getBill = (sessionId: string) => getData<IDinerBill>(API_ENDPOINTS.GET_BILL(sessionId));
