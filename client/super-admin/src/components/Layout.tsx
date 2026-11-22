import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MESSAGES, NAV_ITEMS, ROUTES } from '../constants';
import './Layout.css';
import './ui.css';

// ============================================================
// Super Admin Layout — Sidebar + Content Area
// (on small screens the sidebar becomes an off-canvas drawer)
// ============================================================

const DRAWER_LABELS = {
  OPEN: 'Open menu',
  CLOSE: 'Close menu',
};

const Layout = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The drawer remembers the route it was opened on, so any navigation closes it
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const closeDrawer = () => setDrawerPath(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerPath(null);
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className={`admin-layout ${drawerOpen ? 'admin-layout--drawer-open' : ''}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={drawerOpen ? DRAWER_LABELS.CLOSE : DRAWER_LABELS.OPEN}
          aria-expanded={drawerOpen}
          aria-controls="admin-sidebar"
          onClick={() => setDrawerPath(drawerOpen ? null : pathname)}
        >
          ☰
        </button>
        <span className="mobile-topbar-logo">🛡️</span>
        <span className="mobile-topbar-title">{MESSAGES.APP_TITLE}</span>
      </header>

      <div className="sidebar-overlay" onClick={closeDrawer} aria-hidden="true" />

      <aside id="admin-sidebar" className={`sidebar ${drawerOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">🛡️</div>
          <h1 className="sidebar-title">{MESSAGES.APP_TITLE}</h1>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
              end={item.path === ROUTES.DASHBOARD}
              onClick={closeDrawer}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {profile && (
            <div className="user-info">
              {profile.profilePicture && (
                <img src={profile.profilePicture} alt={profile.name} className="user-avatar" referrerPolicy="no-referrer" />
              )}
              <div className="user-details">
                <span className="user-name">{profile.name || profile.email}</span>
                {profile.name && <span className="user-email">{profile.email}</span>}
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="btn-logout">
            {MESSAGES.LOGOUT}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export { Layout };
