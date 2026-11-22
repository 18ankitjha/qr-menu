import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as TableSessionApi from './api/table-session.api';
import { messageOf, statusOf } from './api/http';
import { API_ENDPOINTS, MESSAGES } from './constants';
import type { ITableMenu, ITableSession, TabId } from './types';
import { parseTableLink, returnPathFor } from './utils/table-link.util';
import { useCustomer } from './hooks/useCustomer';
import { useTableSession } from './hooks/useTableSession';
import Header from './components/Header';
import SignInCard from './components/SignInCard';
import MenuTab from './components/MenuTab';
import CartTab from './components/CartTab';
import OrdersTab from './components/OrdersTab';
import ClosedSession from './components/ClosedSession';
import BottomTabs from './components/BottomTabs';
import './index.css';

// ============================================================
// Customer Menu — opened by scanning a table's QR (/menu/t/<token>).
// Anyone can browse; ordering needs Google sign-in. Everyone at the table shares one live cart and bill.
// ============================================================

const ACTIVE_STATUSES = ['PLACED', 'CONFIRMED', 'COOKING', 'READY'];

const App = () => {
  const link = useMemo(() => parseTableLink(window.location.pathname), []);
  const [menu, setMenu] = useState<ITableMenu | null>(null);
  const [loadError, setLoadError] = useState(link ? '' : MESSAGES.ERROR_BAD_LINK);
  const { customer, signOut } = useCustomer();
  const [tab, setTab] = useState<TabId>('menu');
  const table = useTableSession(link, menu?.table._id, !!customer, tab !== 'menu');
  const { session, run, refresh } = table;
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!link) return;
    TableSessionApi.resolveTable(link)
      .then(setMenu)
      .catch((e) => setLoadError(statusOf(e) && statusOf(e)! < 500 ? messageOf(e) : MESSAGES.ERROR_LOAD));
  }, [link]);

  const notify = useCallback((text: string, error = false) => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, error });
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  /** Run a table action with a busy flag; errors become a toast and the table is refetched. */
  const act = useCallback(
    async (action: (sessionId: string) => Promise<ITableSession>, success?: string): Promise<boolean> => {
      setBusy(true);
      try {
        await run(action);
        if (success) notify(success);
        return true;
      } catch (e) {
        notify(messageOf(e), true);
        await refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [run, refresh, notify]
  );

  const googleUrl = link ? API_ENDPOINTS.GOOGLE_LOGIN(returnPathFor(link)) : '#';

  // ---------------- render

  if (loadError) return <div className="error-screen">{loadError}</div>;
  if (!menu) return <div className="loading-screen">{MESSAGES.LOADING}</div>;

  const { theme } = menu.menu;
  const themeVars = {
    '--primary': theme.primaryColor,
    '--secondary': theme.secondaryColor,
    '--bg': theme.backgroundColor,
    '--bg-image': theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl})` : 'none',
    fontFamily: theme.fontFamily,
  } as CSSProperties;

  const cartCount = session?.cart.reduce((sum, l) => sum + l.quantity, 0) ?? 0;
  const activeOrders = session?.orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length ?? 0;
  const canOrder = !!customer && session?.status === 'OPEN';

  const addDish = (dishId: string) => {
    if (!canOrder) {
      notify(customer ? MESSAGES.JOINING : MESSAGES.SIGN_IN_TITLE, !customer);
      return;
    }
    void act((id) => TableSessionApi.addToCart(id, dishId));
  };
  const setQuantity = (lineId: string, quantity: number) =>
    void act((id) => TableSessionApi.setCartQuantity(id, lineId, Math.max(0, quantity)));

  const placeOrder = async (instructions: string) => {
    const ok = await act(
      (id) => TableSessionApi.placeOrder(id, session!.cartVersion, instructions.trim() || undefined),
      MESSAGES.ORDER_SENT
    );
    if (ok) setTab('orders');
    return ok;
  };

  const handleSignOut = async () => {
    await signOut();
    table.reset();
    setTab('menu');
  };

  const startNew = async () => {
    setBusy(true);
    await table.join();
    setBusy(false);
    setTab('menu');
  };

  return (
    <div className="menu-app" style={themeVars}>
      <div className="menu-shell">
        <Header menu={menu} customer={customer} session={session} onSignOut={handleSignOut} />

        {customer === null && <SignInCard googleUrl={googleUrl} />}
        {customer && !session && (
          <div className="info-card">
            {table.error ? (
              <>
                <span className="menu-error-text">{table.error}</span>
                <button className="btn-secondary" disabled={table.joining} onClick={() => void table.join()}>
                  Try again
                </button>
              </>
            ) : (
              MESSAGES.JOINING
            )}
          </div>
        )}

        {session?.status === 'CLOSED' ? (
          <ClosedSession session={session} busy={busy || table.joining} onStartNew={startNew} />
        ) : (
          <>
            {tab === 'menu' && (
              <MenuTab menu={menu} cart={session?.cart ?? []} busy={busy} onAdd={addDish} onSetQuantity={setQuantity} />
            )}
            {tab === 'cart' &&
              (session ? (
                <CartTab session={session} busy={busy} onSetQuantity={setQuantity} onPlaceOrder={placeOrder} />
              ) : (
                <SignInCard googleUrl={googleUrl} compact />
              ))}
            {tab === 'orders' &&
              (session ? (
                <OrdersTab
                  session={session}
                  busy={busy}
                  onRequestBill={() =>
                    void act((id) => TableSessionApi.requestBill(id), MESSAGES.BILL_REQUESTED)
                  }
                  onCallWaiter={() => void act((id) => TableSessionApi.callWaiter(id), MESSAGES.WAITER_CALLED)}
                />
              ) : (
                <SignInCard googleUrl={googleUrl} compact />
              ))}
            <BottomTabs tab={tab} cartCount={cartCount} activeOrders={activeOrders} onChange={setTab} />
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.error ? 'toast--error' : ''}`}>{toast.text}</div>}
    </div>
  );
};

export default App;
