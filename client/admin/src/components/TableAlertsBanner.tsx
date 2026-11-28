import { useCallback, useState } from 'react';
import { getOpenTableSessions, clearTableAlert, closeTableSession, getErrorMessage } from '../services/api';
import { MESSAGES } from '../constants';
import { FALLBACK_POLL_MS, RESTAURANT_EVENTS, restaurantRoom, useLiveRefresh } from '../realtime';
import type { IOpenTableSession } from '../types';
import './TableAlertsBanner.css';

// ============================================================
// Table alerts — diners on the QR menu asked for the bill or called a waiter.
// Refreshed by the restaurant room's `tables_updated` push (diners join, orders, alerts, bill — not
// cart edits: staff see food once it is ordered). Polls only while the live connection is down.
// ============================================================

const TABLE_PUSHES = [RESTAURANT_EVENTS.TABLES_UPDATED] as const;

const TEXT = {
  BILL: (n: number) => `Table #${n} asked for the bill`,
  WAITER: (n: number) => `Table #${n} called a waiter`,
  BY: (name: string, at: string) => `${name} · ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
  BTN_OPEN_BILL: 'Orders & Bill',
  BTN_DONE: 'Done',
  BTN_CLEAR: 'Clear table',
  OCCUPIED: 'Tables with diners on the menu',
  TABLE_SUMMARY: (s: IOpenTableSession) =>
    [
      `👤 ${s.members.join(', ')}`,
      s.unbilledOrders ? `${s.unbilledOrders} order${s.unbilledOrders === 1 ? '' : 's'} to bill` : '',
    ].filter(Boolean).join(' · '),
  CLEAR_HINT: 'Nothing to bill — clear the table when the guests have left',
  CONFIRM_CLEAR: (n: number) =>
    `Clear table #${n}?\n\nUse this when the guests left without ordering. Their cart is discarded and the next people who scan start fresh.`,
  CLEARED: (n: number) => `Table #${n} cleared.`,
} as const;

interface Props {
  restaurantId: string;
  /** Opens the table's Orders & Bill modal. */
  onOpenBill: (tableId: string, tableNumber: number) => void;
}

type AlertType = 'BILL' | 'WAITER';

const TableAlertsBanner = ({ restaurantId, onOpenBill }: Props) => {
  const [sessions, setSessions] = useState<IOpenTableSession[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await getOpenTableSessions(restaurantId);
      setSessions(data.data);
    } catch { /* keep the last list; the next push / fallback poll retries */ }
  }, [restaurantId]);

  useLiveRefresh(fetchSessions, {
    room: restaurantRoom(restaurantId),
    events: TABLE_PUSHES,
    fallbackMs: FALLBACK_POLL_MS.TABLES,
  });

  const dismiss = async (sessionId: string, type: AlertType) => {
    try {
      await clearTableAlert(sessionId, type);
      setError('');
      setNotice('');
      await fetchSessions();
    } catch (err) {
      setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    }
  };

  const clearTable = async (s: IOpenTableSession) => {
    if (!confirm(TEXT.CONFIRM_CLEAR(s.tableNumber))) return;
    try {
      await closeTableSession(s._id);
      setError('');
      setNotice(TEXT.CLEARED(s.tableNumber));
    } catch (err) {
      setNotice('');
      setError(getErrorMessage(err, MESSAGES.ERROR_GENERIC));
    }
    await fetchSessions();
  };

  const alerts = sessions.flatMap((s) => [
    ...(s.billRequested ? [{ s, type: 'BILL' as const, alert: s.billRequested }] : []),
    ...(s.waiterCalled ? [{ s, type: 'WAITER' as const, alert: s.waiterCalled }] : []),
  ]).sort((a, b) => Date.parse(a.alert.at) - Date.parse(b.alert.at));

  if (sessions.length === 0) return null;

  return (
    <div className="table-alerts">
      {alerts.map(({ s, type, alert }) => (
        <div key={`${s._id}:${type}`} className={`table-alert table-alert--${type.toLowerCase()}`}>
          <span className="table-alert-icon">{type === 'BILL' ? '🧾' : '🙋'}</span>
          <div className="table-alert-text">
            <strong>{type === 'BILL' ? TEXT.BILL(s.tableNumber) : TEXT.WAITER(s.tableNumber)}</strong>
            <span>{TEXT.BY(alert.by, alert.at)}</span>
          </div>
          <div className="table-alert-actions">
            {type === 'BILL' && (
              <button className="btn-primary btn-sm" onClick={() => onOpenBill(s.tableId, s.tableNumber)}>
                {TEXT.BTN_OPEN_BILL}
              </button>
            )}
            <button className="btn-secondary btn-sm" onClick={() => dismiss(s._id, type)}>
              {TEXT.BTN_DONE}
            </button>
          </div>
        </div>
      ))}
      {error && <div className="form-message form-message--error">{error}</div>}
      {notice && <div className="form-message">{notice}</div>}
      <div className="table-alerts-occupied">
        <div className="table-alerts-occupied-title">{TEXT.OCCUPIED}</div>
        {sessions.map((s) => (
          <div key={s._id} className="occupied-row">
            <strong>#{s.tableNumber}</strong>
            <span className="occupied-row-text">{TEXT.TABLE_SUMMARY(s)}</span>
            {s.unbilledOrders > 0 ? (
              <button className="btn-secondary btn-sm" onClick={() => onOpenBill(s.tableId, s.tableNumber)}>
                {TEXT.BTN_OPEN_BILL}
              </button>
            ) : (
              <button className="btn-secondary btn-sm" title={TEXT.CLEAR_HINT} onClick={() => clearTable(s)}>
                🧹 {TEXT.BTN_CLEAR}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { TableAlertsBanner };
