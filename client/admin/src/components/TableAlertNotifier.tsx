import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ROUTES, SOCKET_EVENTS } from '../constants';
import type { ITableAlertEvent } from '../types';
import { isAlertSoundReady, playAlertSound, unlockAlertSound } from '../utils/alert-sound';
import './TableAlertNotifier.css';

// ============================================================
// Table Alert Notifier — rings (sound + pop-up + phone vibration + system notification when the tab
// is in the background) when a diner taps "Call waiter" or "Request bill", on every admin page.
//
// Who hears it: waiters always; the owner only when the restaurant has no active waiters
// (the server decides and sends it as `notify`). The owner still sees every alert in the on-page lists.
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

/** Unanswered pop-ups ring again this often, a few times, so a busy waiter doesn't miss them. */
const REPEAT_RING_MS = 15000;
const MAX_RINGS = 3;
const MAX_POPUPS = 5;

interface Popup extends ITableAlertEvent {
  key: string;
  rings: number;
}

interface Props {
  restaurantId: string;
  isOwner: boolean;
}

const shouldRing = (alert: ITableAlertEvent, isOwner: boolean) =>
  isOwner ? alert.notify === 'OWNER' : true;

const showSystemNotification = (alert: ITableAlertEvent) => {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  try {
    new Notification(alert.type === 'BILL' ? TEXT.BILL(alert.tableNumber) : TEXT.WAITER(alert.tableNumber), {
      body: TEXT.BY(alert.by, alert.at),
      tag: `${alert.sessionId}:${alert.type}`,
    });
  } catch { /* some mobile browsers only allow notifications from a service worker */ }
};

const TableAlertNotifier = ({ restaurantId, isOwner }: Props) => {
  const navigate = useNavigate();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [soundReady, setSoundReady] = useState(isAlertSoundReady());
  const popupsRef = useRef<Popup[]>([]);
  useEffect(() => {
    popupsRef.current = popups;
  }, [popups]);

  const enableSound = useCallback(async () => {
    const ok = await unlockAlertSound();
    setSoundReady(ok);
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    return ok;
  }, []);

  // Browsers allow sound only after a tap: unlock on the first one anywhere on the page
  useEffect(() => {
    if (soundReady) return;
    const onGesture = () => void enableSound();
    window.addEventListener('pointerdown', onGesture, { once: true });
    window.addEventListener('keydown', onGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [soundReady, enableSound]);

  useEffect(() => {
    const socket = io({ withCredentials: true });
    const join = () => socket.emit(SOCKET_EVENTS.JOIN_RESTAURANT_ROOM, restaurantId);
    const onAlert = (alert: ITableAlertEvent) => {
      if (!shouldRing(alert, isOwner)) return;
      const key = `${alert.sessionId}:${alert.type}`;
      setPopups((prev) => [{ ...alert, key, rings: 1 }, ...prev.filter((p) => p.key !== key)].slice(0, MAX_POPUPS));
      playAlertSound();
      navigator.vibrate?.([300, 150, 300]);
      showSystemNotification(alert);
    };
    socket.on('connect', join);
    socket.on(SOCKET_EVENTS.TABLE_ALERT, onAlert);
    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_RESTAURANT_ROOM, restaurantId);
      socket.disconnect();
    };
  }, [restaurantId, isOwner]);

  // Ring again for pop-ups nobody has answered yet
  useEffect(() => {
    if (popups.length === 0) return;
    const timer = window.setInterval(() => {
      const pending = popupsRef.current.filter((p) => p.rings < MAX_RINGS);
      if (pending.length === 0) return;
      playAlertSound();
      setPopups((prev) => prev.map((p) => (p.rings < MAX_RINGS ? { ...p, rings: p.rings + 1 } : p)));
    }, REPEAT_RING_MS);
    return () => window.clearInterval(timer);
  }, [popups.length]);

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
        <button className="alert-sound-pill" title={TEXT.SOUND_HINT} onClick={() => void enableSound().then((ok) => ok && playAlertSound())}>
          {TEXT.SOUND_OFF}
        </button>
      )}
    </>
  );
};

export { TableAlertNotifier };
