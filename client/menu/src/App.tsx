import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as TableSessionApi from './api/table-session.api';
import { messageOf, statusOf } from './api/http';
import { API_ENDPOINTS, MAX_DISH_QUANTITY, MESSAGES } from './constants';
import type { ICartChange, ITableMenu, ITableSession, TabId } from './types';
import { parseTableLink, returnPathFor } from './utils/table-link.util';
import { useCustomer } from './hooks/useCustomer';
import { useTableSession } from './hooks/useTableSession';
import { useCooldown } from './hooks/useCooldown';
import { useLiveCart } from './live-cart';
import Header from './components/Header';
import SignInCard from './components/SignInCard';
import LocationCard from './components/LocationCard';
import MenuTab from './components/MenuTab';
import CartTab from './components/CartTab';
import OrdersTab from './components/OrdersTab';
import ClosedSession from './components/ClosedSession';
import BottomTabs from './components/BottomTabs';
import './index.css';

// ============================================================
// Customer Menu — opened by scanning a table's QR (/menu/t/<token>).
// Anyone can browse; ordering needs Google sign-in. Everyone at the table shares one live cart and bill:
// cart taps travel over the socket (live-cart/), everything else is a REST call (useTableSession).
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

  // ---------------- the live table cart (socket); REST only when Cart opens and to place the order

  const dishes = useMemo(
    () => new Map((menu?.categories ?? []).flatMap((c) => c.dishes.map((d) => [d._id, d] as const))),
    [menu]
  );
  const restSync = useCallback(
    (changes: ICartChange[]) => run((id) => TableSessionApi.syncCart(id, changes)),
    [run]
  );
  const cart = useLiveCart({
    session,
    dishes,
    myName: customer?.name ?? '',
    cartOpen: tab === 'cart',
    restSync,
    onError: (text) => notify(text, true),
    onSkipped: () => notify(MESSAGES.SOME_UNAVAILABLE, true),
  });

  const waiterCooldown = useCooldown(session?.waiterCallCooldownMs);
  const billCooldown = useCooldown(session?.billRequestCooldownMs);

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

  const cartCount = cart.count;
  const activeOrders = session?.orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length ?? 0;
  const orderingEnabled = menu.menu.customerOrderingEnabled !== false;
  const canOrder = orderingEnabled && !!customer && session?.status === 'OPEN';
  const currentTab: TabId = !orderingEnabled && tab === 'cart' ? 'menu' : tab;
  const callWaiter = () => void act((id) => TableSessionApi.callWaiter(id), MESSAGES.WAITER_CALLED);

  /** Any −/+ (menu or cart): instant on this phone, on everyone's phone a moment later. */
  const setLine = (key: string, quantity: number) => {
    if (!canOrder) {
      notify(customer ? MESSAGES.JOINING : MESSAGES.SIGN_IN_TITLE, !customer);
      return;
    }
    cart.set(key, Math.min(MAX_DISH_QUANTITY, Math.max(0, quantity)));
  };

  /** Menu −/+ edit this diner's own line for the dish. */
  const setMine = (dishId: string, quantity: number) => {
    if (cart.me) setLine(`${cart.me}.${dishId}`, quantity);
    else setLine('', quantity); // not seated yet → explains why
  };

  /** Tabs. Opening Cart saves the cart (one call, in the background) — the screen doesn't wait for it. */
  const openTab = (next: TabId) => {
    if (next === 'cart' && tab !== 'cart' && canOrder) void cart.syncNow();
    setTab(next);
  };

  const placeOrder = async (instructions: string) => {
    setBusy(true);
    try {
      const cartVersion = await cart.settle(); // every tap delivered first; the order is for exactly this cart
      await run((id) => TableSessionApi.placeOrder(id, cartVersion, instructions.trim() || undefined));
      notify(MESSAGES.ORDER_SENT);
      setTab('orders');
      return true;
    } catch (e) {
      notify(messageOf(e), true);
      return false;
    } finally {
      setBusy(false);
    }
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

        {customer === null && <SignInCard googleUrl={googleUrl} viewOnly={!orderingEnabled} />}
        {customer && !session && table.locationProblem && (
          <LocationCard problem={table.locationProblem} busy={table.joining} onRetry={() => void table.join()} />
        )}
        {customer && !session && !table.locationProblem && (
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
            {currentTab === 'menu' && !orderingEnabled && (
              <div className="info-card view-only-card">
                <strong>{MESSAGES.VIEW_ONLY_TITLE}</strong>
                <span>{MESSAGES.VIEW_ONLY_DESC}</span>
                {session?.status === 'OPEN' && (
                  <button className="btn-secondary" disabled={busy || waiterCooldown > 0} onClick={callWaiter}>
                    {waiterCooldown > 0
                      ? `${MESSAGES.WAITER_CALLED} · ${MESSAGES.ASK_AGAIN_IN(waiterCooldown)}`
                      : MESSAGES.BTN_CALL_WAITER}
                  </button>
                )}
              </div>
            )}
            {currentTab === 'menu' && (
              <MenuTab
                menu={menu}
                lines={cart.lines}
                me={cart.me}
                canAdd={orderingEnabled}
                onSetMine={setMine}
              />
            )}
            {currentTab === 'cart' &&
              (session ? (
                <CartTab
                  lines={cart.lines}
                  total={cart.total}
                  me={cart.me}
                  busy={busy}
                  onSetQuantity={setLine}
                  onPlaceOrder={placeOrder}
                />
              ) : (
                <SignInCard googleUrl={googleUrl} compact />
              ))}
            {currentTab === 'orders' &&
              (session ? (
                <OrdersTab
                  session={session}
                  busy={busy}
                  billCooldown={billCooldown}
                  waiterCooldown={waiterCooldown}
                  onRequestBill={() =>
                    void act((id) => TableSessionApi.requestBill(id), MESSAGES.BILL_REQUESTED)
                  }
                  onCallWaiter={callWaiter}
                />
              ) : (
                <SignInCard googleUrl={googleUrl} compact viewOnly={!orderingEnabled} />
              ))}
            <BottomTabs
              tab={currentTab}
              cartCount={cartCount}
              activeOrders={activeOrders}
              showCart={orderingEnabled}
              onChange={openTab}
            />
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.error ? 'toast--error' : ''}`}>{toast.text}</div>}
    </div>
  );
};

export default App;
