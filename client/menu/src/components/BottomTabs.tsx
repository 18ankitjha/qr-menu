import type { ReactNode } from 'react';
import { MESSAGES } from '../constants';
import type { TabId } from '../types';

interface Props {
  tab: TabId;
  cartCount: number;
  activeOrders: number;
  /** View-only menu: there is no cart to show. */
  showCart: boolean;
  onChange: (tab: TabId) => void;
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const TABS: { id: TabId; icon: ReactNode; label: string }[] = [
  {
    id: 'menu',
    label: MESSAGES.TAB_MENU,
    icon: (
      <Icon>
        <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6.5A2.5 2.5 0 0 0 4 21.5" />
        <path d="M8 7h7M8 11h5" />
      </Icon>
    ),
  },
  {
    id: 'cart',
    label: MESSAGES.TAB_CART,
    icon: (
      <Icon>
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </Icon>
    ),
  },
  {
    id: 'orders',
    label: MESSAGES.TAB_ORDERS,
    icon: (
      <Icon>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </Icon>
    ),
  },
];

const BottomTabs = ({ tab, cartCount, activeOrders, showCart, onChange }: Props) => {
  const tabs = TABS.filter((t) => showCart || t.id !== 'cart');
  return (
    <nav className="bottom-tabs" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map((t) => {
        const badge = t.id === 'cart' ? cartCount : t.id === 'orders' ? activeOrders : 0;
        return (
          <button key={t.id} className={`bottom-tab ${tab === t.id ? 'bottom-tab--active' : ''}`} onClick={() => onChange(t.id)}>
            <span className="bottom-tab-icon">
              {t.icon}
              {badge > 0 && <span className="bottom-tab-badge">{badge}</span>}
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomTabs;
