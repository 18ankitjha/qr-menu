import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MESSAGES, ROUTES } from '../constants';
import './Dashboard.css';

// ============================================================
// Dashboard — Overview page with quick stats and actions
// ============================================================

const DASHBOARD_CONSTANTS = {
  TITLE: 'Dashboard',
  GREETING: (name: string) => `Welcome back, ${name}!`,
  SETUP_STEPS: [
    { label: 'Register Restaurant', route: ROUTES.RESTAURANT, icon: '🏪', field: 'restaurant' as const },
    { label: 'Create Menu', route: ROUTES.MENU, icon: '📋', field: 'menu' as const },
    { label: 'Add Tables', route: ROUTES.TABLES, icon: '🪑', field: 'tables' as const },
    { label: 'Customize Theme', route: ROUTES.SETTINGS, icon: '🎨', field: 'theme' as const },
  ],
  SETUP_TITLE: 'Quick Setup',
  SETUP_SUBTITLE: 'Complete these steps to get your QR ordering system running.',
  STAT_LABELS: {
    RESTAURANT: 'Restaurant',
    MENU: 'Menu',
    STATUS: 'Status',
  },
  ACTIVE: 'Active',
  INACTIVE: 'Not Set Up',
  KITCHEN_LINK: 'Open Kitchen View',
} as const;

const Dashboard = () => {
  const { user, restaurant, menu } = useAuth();
  const navigate = useNavigate();

  const completionStatus = {
    restaurant: !!restaurant,
    menu: !!menu,
    tables: false,
    theme: !!menu?.theme,
  };

  const completedCount = Object.values(completionStatus).filter(Boolean).length;
  const totalSteps = Object.values(completionStatus).length;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="page-title">{DASHBOARD_CONSTANTS.TITLE}</h1>
        <p className="page-subtitle">
          {DASHBOARD_CONSTANTS.GREETING(user?.name || '')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏪</div>
          <div className="stat-info">
            <span className="stat-label">{DASHBOARD_CONSTANTS.STAT_LABELS.RESTAURANT}</span>
            <span className="stat-value">{restaurant?.name || DASHBOARD_CONSTANTS.INACTIVE}</span>
          </div>
          <span className={`stat-badge ${restaurant ? 'stat-badge--active' : ''}`}>
            {restaurant ? DASHBOARD_CONSTANTS.ACTIVE : DASHBOARD_CONSTANTS.INACTIVE}
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-label">{DASHBOARD_CONSTANTS.STAT_LABELS.MENU}</span>
            <span className="stat-value">{menu?.name || DASHBOARD_CONSTANTS.INACTIVE}</span>
          </div>
          <span className={`stat-badge ${menu ? 'stat-badge--active' : ''}`}>
            {menu ? DASHBOARD_CONSTANTS.ACTIVE : DASHBOARD_CONSTANTS.INACTIVE}
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <span className="stat-label">{DASHBOARD_CONSTANTS.STAT_LABELS.STATUS}</span>
            <span className="stat-value">{completedCount}/{totalSteps}</span>
          </div>
          <span className={`stat-badge ${completedCount === totalSteps ? 'stat-badge--active' : ''}`}>
            {completedCount === totalSteps ? DASHBOARD_CONSTANTS.ACTIVE : `${completedCount}/${totalSteps}`}
          </span>
        </div>
      </div>

      {/* Setup Checklist */}
      <div className="setup-section">
        <h2 className="section-title">{DASHBOARD_CONSTANTS.SETUP_TITLE}</h2>
        <p className="section-subtitle">{DASHBOARD_CONSTANTS.SETUP_SUBTITLE}</p>

        <div className="setup-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(completedCount / totalSteps) * 100}%` }}
            />
          </div>
          <span className="progress-text">{completedCount}/{totalSteps}</span>
        </div>

        <div className="setup-grid">
          {DASHBOARD_CONSTANTS.SETUP_STEPS.map((step) => {
            const done = completionStatus[step.field];
            return (
              <button
                key={step.field}
                className={`setup-card ${done ? 'setup-card--done' : ''}`}
                onClick={() => navigate(step.route)}
              >
                <span className="setup-icon">{step.icon}</span>
                <span className="setup-label">{step.label}</span>
                <span className={`setup-check ${done ? 'setup-check--done' : ''}`}>
                  {done ? '✓' : '→'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { Dashboard };
