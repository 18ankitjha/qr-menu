import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NAV_ITEMS, MESSAGES, ROUTES } from '../constants';
import { RestaurantStatusBanner } from './RestaurantStatusBanner';
import { SetupStepBanner } from './SetupStepBanner';
import './Layout.css';

// ============================================================
// Admin Layout — Sidebar + Content Area
// Until the owner finishes Quick Setup the sidebar shows only the Dashboard, so it's obvious
// where to go next; the Dashboard (and the step banner) walk them through the steps.
// ============================================================

const LAYOUT_TEXT = {
  SETUP_LOCKED_TITLE: 'Finish Quick Setup',
  SETUP_LOCKED_BODY: (done: number, total: number) =>
    `${done}/${total} steps done. The other sections unlock once setup is complete.`,
  APPROVAL_LOCKED_TITLE: 'Waiting for approval',
  APPROVAL_LOCKED_BODY: 'The next setup steps unlock once our team approves your restaurant.',
  OPEN_MENU: 'Open menu',
  CLOSE_MENU: 'Close menu',
} as const;

const Layout = () => {
  const { user, isOwner, isSetupComplete, setup, refreshSetup, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Keep setup progress fresh while the owner moves between setup pages
  useEffect(() => {
    if (!isSetupComplete) refreshSetup();
  }, [location.pathname, isSetupComplete, refreshSetup]);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const navItems = NAV_ITEMS
    .filter((item) => isOwner || !item.ownerOnly)
    .filter((item) => isSetupComplete || item.path === ROUTES.DASHBOARD);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="admin-layout">
      {/* Phones / small tablets: top bar with a menu button; the sidebar becomes a slide-in drawer */}
      <header className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label={LAYOUT_TEXT.OPEN_MENU}
          aria-expanded={drawerOpen}
        >
          ☰
        </button>
        <span className="mobile-topbar-title">🍽️ {MESSAGES.APP_TITLE}</span>
      </header>
      {drawerOpen && <div className="sidebar-backdrop" onClick={closeDrawer} />}

      <aside className={`sidebar ${drawerOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">🍽️</div>
          <h1 className="sidebar-title">{MESSAGES.APP_TITLE}</h1>
          <button className="sidebar-close" onClick={closeDrawer} aria-label={LAYOUT_TEXT.CLOSE_MENU}>
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
              end={item.path === '/'}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}

          {!isSetupComplete && setup && (
            <div className="nav-setup-locked">
              <span className="nav-setup-locked-title">
                {setup.awaitingApproval ? `⏳ ${LAYOUT_TEXT.APPROVAL_LOCKED_TITLE}` : `🔒 ${LAYOUT_TEXT.SETUP_LOCKED_TITLE}`}
              </span>
              <span className="nav-setup-locked-body">
                {setup.awaitingApproval
                  ? LAYOUT_TEXT.APPROVAL_LOCKED_BODY
                  : LAYOUT_TEXT.SETUP_LOCKED_BODY(setup.completedCount, setup.totalSteps)}
              </span>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              {user.profilePicture && (
                <img src={user.profilePicture} alt={user.name} className="user-avatar" />
              )}
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.kind === 'STAFF' ? `Waiter · @${user.username}` : user.email}</span>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="btn-logout">
            {MESSAGES.LOGOUT}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <RestaurantStatusBanner />
        <SetupStepBanner />
        <Outlet />
      </main>
    </div>
  );
};

export { Layout };
