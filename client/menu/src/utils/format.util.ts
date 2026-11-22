import { MESSAGES } from '../constants';

export const money = (amount: number): string =>
  `${MESSAGES.CURRENCY}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

export const timeOf = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
