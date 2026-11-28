import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_DISH_QUANTITY, MESSAGES } from '../constants';
import type { ICartLine, ITableMenu, TabId } from '../types';
import { themeStyle } from '../utils/theme-style.util';
import Header from '../components/Header';
import MenuTab from '../components/MenuTab';
import CartTab from '../components/CartTab';
import BottomTabs from '../components/BottomTabs';
import { PREVIEW_MESSAGE } from './preview.protocol';

// ============================================================
// Preview mode (/menu/preview) — the real customer menu components, fed by the admin app over postMessage.
// No API calls, no socket, no sign-in: the cart lives in this page only and nothing is ever sent.
// ============================================================

const ME = 'preview';
const PREVIEW_TEXT = {
  WAITING: 'Loading preview...',
  NOT_SENT: 'Preview only — nothing is sent to the restaurant.',
  YOU: 'You',
} as const;

const PreviewApp = () => {
  const [menu, setMenu] = useState<ITableMenu | null>(null);
  const [tab, setTab] = useState<TabId>('menu');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onMessage = (e: MessageEvent<{ type?: string; menu?: ITableMenu }>) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type === PREVIEW_MESSAGE.DATA && e.data.menu) setMenu(e.data.menu);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: PREVIEW_MESSAGE.READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const notify = useCallback(() => {
    window.clearTimeout(toastTimer.current);
    setToast(PREVIEW_TEXT.NOT_SENT);
    toastTimer.current = window.setTimeout(() => setToast(''), 2500);
  }, []);

  const lines = useMemo<ICartLine[]>(() => {
    const dishes = new Map((menu?.categories ?? []).flatMap((c) => c.dishes.map((d) => [d._id, d] as const)));
    return Object.entries(quantities).flatMap(([dishId, quantity]) => {
      const dish = dishes.get(dishId);
      return dish && quantity > 0
        ? [{ key: `${ME}.${dishId}`, dishId, dishName: dish.name, price: dish.price, quantity, by: PREVIEW_TEXT.YOU }]
        : [];
    });
  }, [menu, quantities]);

  if (!menu) return <div className="loading-screen">{PREVIEW_TEXT.WAITING}</div>;

  const orderingEnabled = menu.menu.customerOrderingEnabled !== false;
  const currentTab: TabId = !orderingEnabled && tab === 'cart' ? 'menu' : tab;
  const setQuantity = (dishId: string, quantity: number) =>
    setQuantities((prev) => ({ ...prev, [dishId]: Math.min(MAX_DISH_QUANTITY, Math.max(0, quantity)) }));
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="menu-app" style={themeStyle(menu.menu.theme)}>
      <div className="menu-shell">
        <Header
          menu={menu}
          customer={undefined}
          session={null}
          waiter={{ cooldown: 0, busy: false, onCall: notify }}
          onSignOut={() => undefined}
        />

        {currentTab === 'menu' && !orderingEnabled && (
          <div className="info-card view-only-card">
            <strong>{MESSAGES.VIEW_ONLY_TITLE}</strong>
            <span>{MESSAGES.VIEW_ONLY_DESC}</span>
          </div>
        )}
        {currentTab === 'menu' && (
          <MenuTab menu={menu} lines={lines} me={ME} canAdd={orderingEnabled} onSetMine={setQuantity} />
        )}
        {currentTab === 'cart' && (
          <CartTab
            lines={lines}
            total={total}
            me={ME}
            busy={false}
            onSetQuantity={(key, quantity) => setQuantity(key.slice(ME.length + 1), quantity)}
            onPlaceOrder={async () => {
              notify();
              return false;
            }}
          />
        )}
        {currentTab === 'orders' && <p className="empty-note">{MESSAGES.NO_ORDERS}</p>}

        <BottomTabs tab={currentTab} cartCount={count} activeOrders={0} showCart={orderingEnabled} onChange={setTab} />
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

export default PreviewApp;
