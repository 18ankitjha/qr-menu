import { MESSAGES } from '../constants';
import type { ICustomer, ITableMenu, ITableSession } from '../types';
import { clock } from '../utils/format.util';
import { thumbUrl } from '../utils/image.util';

interface WaiterButton {
  /** Seconds before the table may call again (server-enforced 5-minute gap). */
  cooldown: number;
  busy: boolean;
  onCall: () => void;
}

interface Props {
  menu: ITableMenu;
  customer: ICustomer | null | undefined;
  session: ITableSession | null;
  /** Shown once the diner is seated at an open table. */
  waiter?: WaiterButton;
  onSignOut: () => void;
}

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const MAX_AVATARS = 4;

/**
 * Restaurant, table and a small "Call waiter" button on one row; who's at the table below it.
 * The menu's background image (if any) is the header's cover photo.
 */
const Header = ({ menu, customer, session, waiter, onSignOut }: Props) => {
  const { restaurant, table, menu: { theme } } = menu;
  const members = session?.members ?? [];
  const names = members.map((m) => (m.isMe ? MESSAGES.YOU_CAPITAL : m.name.split(' ')[0]));
  const calling = !!waiter && waiter.cooldown > 0;

  return (
    <header className={`menu-header ${theme.backgroundImageUrl ? 'menu-header--cover' : ''}`}>
      <div className="menu-header-bar">
        {restaurant.logoUrl && <img src={thumbUrl(restaurant.logoUrl)} alt="" className="restaurant-logo" />}
        <div className="menu-header-text">
          <h1 className="restaurant-name">{restaurant.name}</h1>
          <p className="menu-header-sub">
            {MESSAGES.TABLE(table.tableNumber)}
            {table.label ? ` · ${table.label}` : ''}
          </p>
        </div>
        {waiter && (
          <button
            className={`waiter-btn ${calling ? 'waiter-btn--called' : ''}`}
            disabled={waiter.busy || calling}
            onClick={waiter.onCall}
          >
            <BellIcon />
            {calling ? `${MESSAGES.WAITER_CALLED_SHORT} · ${clock(waiter.cooldown)}` : MESSAGES.BTN_CALL_WAITER}
          </button>
        )}
      </div>

      {customer && (
        <div className="members-row">
          {members.length > 0 && (
            <span className="avatar-stack" aria-hidden>
              {members.slice(0, MAX_AVATARS).map((m, i) =>
                m.profilePicture ? (
                  <img key={i} src={m.profilePicture} alt="" className="member-avatar" referrerPolicy="no-referrer" />
                ) : (
                  <span key={i} className="member-avatar member-avatar--initial">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                )
              )}
            </span>
          )}
          <span className="members-names">{names.length > 0 ? names.join(', ') : customer.name}</span>
          <button className="link-btn" onClick={onSignOut} title={customer.email}>
            {MESSAGES.SIGN_OUT}
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
