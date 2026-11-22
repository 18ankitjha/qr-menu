import { MESSAGES } from '../constants';
import type { ICustomer, ITableMenu, ITableSession } from '../types';
import { thumbUrl } from '../utils/image.util';

interface Props {
  menu: ITableMenu;
  customer: ICustomer | null | undefined;
  session: ITableSession | null;
  onSignOut: () => void;
}

/** Restaurant, which table this is, and who else is at it. */
const Header = ({ menu, customer, session, onSignOut }: Props) => {
  const { restaurant, table } = menu;
  return (
    <header className="menu-header">
      {customer && (
        <button className="link-btn header-signout" onClick={onSignOut} title={customer.email}>
          {MESSAGES.SIGN_OUT}
        </button>
      )}
      {restaurant.logoUrl && <img src={thumbUrl(restaurant.logoUrl)} alt={restaurant.name} className="restaurant-logo" />}
      <h1 className="restaurant-name">{restaurant.name}</h1>
      <p className="table-chip">
        Table {table.tableNumber}
        {table.label ? ` · ${table.label}` : ''}
      </p>
      {session && session.members.length > 0 && (
        <div className="members">
          {session.members.map((m, i) => (
            <span key={i} className={`member ${m.isMe ? 'member--me' : ''}`}>
              {m.profilePicture ? (
                <img src={m.profilePicture} alt="" className="member-avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="member-avatar member-avatar--initial">{m.name.charAt(0).toUpperCase()}</span>
              )}
              {m.isMe ? `${m.name.split(' ')[0]} (${MESSAGES.YOU})` : m.name.split(' ')[0]}
            </span>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;
