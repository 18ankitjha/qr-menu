import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { FALLBACK_POLL_MS, RESTAURANT_EVENTS, restaurantRoom, useLiveRefresh, useSocketEvent } from '../realtime';
import { getOpenTableSessions, getStaff } from '../services/api';
import type { IOpenTableSession, ITableAlertEvent } from '../types';
import { isAlertSoundReady, onAlertSoundChange, playAlertSound, unlockAlertSound } from '../utils/alert-sound';
import './TableAlertNotifier.css';

// ============================================================
// Table Alert Notifier — rings (sound + pop-up + phone vibration + system notification when the tab
// is in the background) when a diner taps "Call waiter" or "Request bill", on every admin page.
//
// Who hears it: waiters always; the owner only when the restaurant has no active waiters
// (the server decides and sends it as `notify`). The owner still sees every alert in the on-page lists.
//
// Phones pause background tabs and drop the live connection, so a push can be missed.
// We catch up from the open-tables API when the page opens, the connection (re)joins and the tab comes
// back — a missed call still pops up (and rings) as soon as the waiter looks. While the connection is
// down we also check every 30s (fallback only).
// ============================================================

const TEXT = {
  WAITER: (n: number) => `Table #${n} is calling a waiter`,
  BILL: (n: number) => `Table #${n} asked for the bill`,
  BY: (name: string, at: string) =>
    `${name} · ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
  BTN_VIEW: 'View',
  BTN_DISMISS: 'Dismiss',
  SOUND_OFF: '🔕 Tap to turn on alert sound',
  SOUND_HINT: 'Your browser needs one tap before it can ring for table alerts.',
} as const;

const MAX_POPUPS = 5;
/** Alerts arrive through useSocketEvent; catch-up itself isn't triggered by pushes. */
const NO_PUSHES = [] as const;
/** Older pending calls are left to the on-page lists instead of popping up. */
const CATCH_UP_WINDOW_MS = 10 * 60 * 1000;

type AlertType = ITableAlertEvent['type'];

interface Popup {
  key: string;
  type: AlertType;
  tableNumber: number;
  by: string;
  at: string;
}

interface Props {
  restaurantId: string;
  isOwner: boolean;
}

const keyOf = (sessionId: string, type: AlertType) => `${sessionId}:${type}`;

const showSystemNotification = (p: Popup) => {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    new Notification(p.type === 'BILL' ? TEXT.BILL(p.tableNumber) : TEXT.WAITER(p.tableNumber), {
      body: TEXT.BY(p.by, p.at),
      tag: p.key,
    });
  } catch { /* some mobile browsers only allow notifications from a service worker */ }
};

const pendingAlerts = (sessions: IOpenTableSession[]): Popup[] =>
  sessions.flatMap((s) =>
    (
      [
        ['WAITER', s.waiterCalled],
        ['BILL', s.billRequested],
      ] as const
    )
      .filter(([, alert]) => !!alert)
      .map(([type, alert]) => ({
        key: keyOf(s._id, type),
        type,
        tableNumber: s.tableNumber,
        by: alert!.by,
        at: alert!.at,
      }))
  );

const TableAlertNotifier = ({ restaurantId, isOwner }: Props) => {
  const navigate = useNavigate();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [soundReady, setSoundReady] = useState(isAlertSoundReady());
  /** Latest alert time we've already shown per session+type, so the same call never pops twice. */
  const seenRef = useRef(new Map<string, number>());

  useEffect(() => onAlertSoundChange(setSoundReady), []);

  // Ask once (on the first tap) for system notifications, used when the tab is in the background
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    const ask = () => void Notification.requestPermission();
    window.addEventListener('click', ask, { once: true });
    return () => window.removeEventListener('click', ask);
  }, []);

  /** Show + ring for alerts not seen yet. Returns nothing; rings at most once per batch. */
  const announce = useCallback((alerts: Popup[]) => {
    const fresh = alerts.filter((a) => {
      const at = new Date(a.at).getTime();
      const seen = seenRef.current.get(a.key);
      // Socket and DB timestamps differ by a few ms; a real new call is seconds apart
      if (seen !== undefined && at <= seen + 5000) return false;
      seenRef.current.set(a.key, at);
      return true;
    });
    if (fresh.length === 0) return;
    setPopups((prev) => {
      const keys = new Set(fresh.map((f) => f.key));
      return [...fresh, ...prev.filter((p) => !keys.has(p.key))].slice(0, MAX_POPUPS);
    });
    playAlertSound();
    navigator.vibrate?.([300, 150, 300]);
    fresh.forEach(showSystemNotification);
  }, []);

  const catchUp = useCallback(async () => {
    try {
      const [{ data: open }, staff] = await Promise.all([
        getOpenTableSessions(restaurantId),
        isOwner ? getStaff(restaurantId).then((r) => r.data.data) : Promise.resolve(null),
      ]);
      // Owner rings only when nobody else will: same rule the server uses for live pushes
      if (staff && staff.some((s) => s.isActive)) return;
      const cutoff = Date.now() - CATCH_UP_WINDOW_MS;
      announce(pendingAlerts(open.data).filter((a) => new Date(a.at).getTime() >= cutoff));
    } catch { /* offline — the next catch-up retries */ }
  }, [restaurantId, isOwner, announce]);

  const onAlert = (alert: ITableAlertEvent) => {
    if (isOwner && alert.notify !== 'OWNER') return;
    announce([
      {
        key: keyOf(alert.sessionId, alert.type),
        type: alert.type,
        tableNumber: alert.tableNumber,
        by: alert.by,
        at: alert.at,
      },
    ]);
  };

  // Live: the push rings at once. Catch-up runs on open, on every (re)join and when the tab comes back;
  // the timer only runs while the live connection is down.
  useSocketEvent(RESTAURANT_EVENTS.TABLE_ALERT, onAlert);
  useLiveRefresh(catchUp, {
    room: restaurantRoom(restaurantId),
    events: NO_PUSHES,
    fallbackMs: FALLBACK_POLL_MS.ALERTS,
  });

  const dismiss = (key: string) => setPopups((prev) => prev.filter((p) => p.key !== key));

  const view = (key: string) => {
    dismiss(key);
    navigate(ROUTES.ORDERS);
  };

  return (
    <>
      {popups.length > 0 && (
        <div className="alert-popups" role="alert" aria-live="assertive">
          {popups.map((p) => (
            <div key={p.key} className={`alert-popup alert-popup--${p.type.toLowerCase()}`}>
              <span className="alert-popup-icon">{p.type === 'BILL' ? '🧾' : '🙋'}</span>
              <div className="alert-popup-text">
                <strong>{p.type === 'BILL' ? TEXT.BILL(p.tableNumber) : TEXT.WAITER(p.tableNumber)}</strong>
                <span>{TEXT.BY(p.by, p.at)}</span>
              </div>
              <div className="alert-popup-actions">
                <button className="btn-primary btn-sm" onClick={() => view(p.key)}>{TEXT.BTN_VIEW}</button>
                <button className="btn-secondary btn-sm" onClick={() => dismiss(p.key)}>{TEXT.BTN_DISMISS}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!soundReady && (
        <button className="alert-sound-pill" title={TEXT.SOUND_HINT} onClick={() => void unlockAlertSound().then((ok) => ok && playAlertSound())}>
          {TEXT.SOUND_OFF}
        </button>
      )}
    </>
  );
};

export { TableAlertNotifier };
