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

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'menu', icon: '📖', label: MESSAGES.TAB_MENU },
  { id: 'cart', icon: '🛒', label: MESSAGES.TAB_CART },
  { id: 'orders', icon: '🧾', label: MESSAGES.TAB_ORDERS },
];

const BottomTabs = ({ tab, cartCount, activeOrders, showCart, onChange }: Props) => (
  <nav className="bottom-tabs">
    {TABS.filter((t) => showCart || t.id !== 'cart').map((t) => {
      const badge = t.id === 'cart' ? cartCount : t.id === 'orders' ? activeOrders : 0;
      return (
        <button key={t.id} className={`bottom-tab ${tab === t.id ? 'bottom-tab--active' : ''}`} onClick={() => onChange(t.id)}>
          <span className="bottom-tab-icon">{t.icon}</span>
          {t.label}
          {badge > 0 && <span className="bottom-tab-badge">{badge}</span>}
        </button>
      );
    })}
  </nav>
);

export default BottomTabs;
