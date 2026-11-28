import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import * as TableSessionApi from './api/table-session.api';
import { messageOf, statusOf } from './api/http';
import { API_ENDPOINTS, MESSAGES } from './constants';
import type { ITableMenu, ITableSession, TabId } from './types';
import { parseTableLink, returnPathFor } from './utils/table-link.util';
import { useCustomer } from './hooks/useCustomer';
import { useTableSession } from './hooks/useTableSession';
import { myPlainLine, useCartDraft } from './hooks/useCartDraft';
import { useCooldown } from './hooks/useCooldown';
import { isTempLine, withMyPicks, withQuantity } from './utils/cart.util';
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
// Anyone can browse; ordering needs Google sign-in. Everyone at the table shares one live cart and bill.
// ============================================================

const ACTIVE_STATUSES = ['PLACED', 'CONFIRMED', 'COOKING', 'READY'];

const App = () => {
  const link = useMemo(() => parseTableLink(window.location.pathname), []);
  const [menu, setMenu] = useState<ITableMenu | null>(null);
  const [loadError, setLoadError] = useState(link ? '' : MESSAGES.ERROR_BAD_LINK);
  const { customer, signOut } = useCustomer();
  const [tab, setTab] = useState<TabId>('menu');
  const table = useTableSession(link, menu?.table._id, !!customer, tab !== 'menu', customer?._id);
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

  // ---------------- menu picks (local) → table cart (one call when the Cart tab opens)

  const draft = useCartDraft(session);
  const dishes = useMemo(
    () => new Map((menu?.categories ?? []).flatMap((c) => c.dishes.map((d) => [d._id, d] as const))),
    [menu]
  );

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

  const cartCount = draft.cartCount;
  const activeOrders = session?.orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length ?? 0;
  const orderingEnabled = menu.menu.customerOrderingEnabled !== false;
  const canOrder = orderingEnabled && !!customer && session?.status === 'OPEN';
  const currentTab: TabId = !orderingEnabled && tab === 'cart' ? 'menu' : tab;
  const callWaiter = () => void act((id) => TableSessionApi.callWaiter(id), MESSAGES.WAITER_CALLED);

  /** Menu −/+ : instant, local only. */
  const setMine = (dishId: string, quantity: number) => {
    if (!canOrder) {
      notify(customer ? MESSAGES.JOINING : MESSAGES.SIGN_IN_TITLE, !customer);
      return;
    }
    draft.setMyQuantity(dishId, quantity);
  };

  /** A change failed: say why and show the table as it really is. */
  const undo = async (e: unknown) => {
    notify(messageOf(e), true);
    await refresh();
  };

  /** Tabs. Opening Cart moves the menu picks into the table cart: on screen at once, one call in the background. */
  const openTab = (next: TabId) => {
    const picks = draft.pending;
    if (next === 'cart' && tab !== 'cart' && canOrder && customer && picks.length > 0) {
      table.markFresh(); // this call's response is the fresh table — no extra read
      table.optimistic((s) => withMyPicks(s, picks, dishes, customer.name));
      draft.clear();
      run((id) => TableSessionApi.setMyCart(id, picks))
        .then((saved) => {
          const leftOut = picks.some(
            (i) => i.quantity > 0 && myPlainLine(saved.cart, i.dishId)?.quantity !== i.quantity
          );
          if (leftOut) notify(MESSAGES.SOME_UNAVAILABLE, true);
        })
        .catch((e) => {
          picks.forEach((i) => draft.setMyQuantity(i.dishId, i.quantity)); // keep the picks for the next try
          void undo(e);
        });
    }
    setTab(next);
  };

  /** Cart −/+ : instant on screen; calls go out in tap order in the background. */
  const setQuantity = (lineId: string, quantity: number) => {
    const qty = Math.max(0, quantity);
    const dishId = session?.cart.find((l) => l._id === lineId)?.dishId;
    table.optimistic((s) => withQuantity(s, lineId, qty));
    run((id) => {
      // A line shown before the server gave it an id → look up its real id now
      const realId = isTempLine(lineId)
        ? dishId && myPlainLine(table.serverView()?.cart ?? [], dishId)?._id
        : lineId;
      return realId ? TableSessionApi.setCartQuantity(id, realId, qty) : TableSessionApi.getSession(id);
    }).catch(undo);
  };

  const placeOrder = async (instructions: string) => {
    // Queued after any −/+ still on its way, against the cart version those calls produced
    const ok = await act(
      (id) =>
        TableSessionApi.placeOrder(
          id,
          table.serverView()?.cartVersion ?? session!.cartVersion,
          instructions.trim() || undefined
        ),
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
                cart={session?.cart ?? []}
                canAdd={orderingEnabled}
                myQuantity={draft.myQuantity}
                onSetMine={setMine}
              />
            )}
            {currentTab === 'cart' &&
              (session ? (
                <CartTab session={session} busy={busy} onSetQuantity={setQuantity} onPlaceOrder={placeOrder} />
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
