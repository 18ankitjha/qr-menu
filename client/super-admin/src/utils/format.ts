import { CURRENCY } from '../constants';

// ============================================================
// Formatting helpers
// ============================================================

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const amountFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

const formatDate = (value: string) => dateFormatter.format(new Date(value));

const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));

const formatAmount = (value: number) => `${CURRENCY}${amountFormatter.format(value)}`;

export { formatDate, formatDateTime, formatAmount };
