import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SETUP_STEPS } from '../constants';
import './Dashboard.css';

// ============================================================
// Dashboard — overview + Quick Setup. Steps are done in order: each card unlocks only when the
// previous step is complete, and the rest of the app unlocks when all are done.
// ============================================================

const DASHBOARD_CONSTANTS = {
  TITLE: 'Dashboard',
  GREETING: (name: string) => `Welcome back, ${name}!`,
  SETUP_TITLE: 'Quick Setup',
  SETUP_SUBTITLE: 'Complete these steps in order to get your QR ordering system running.',
  SETUP_DONE_TITLE: 'Setup complete 🎉',
  SETUP_DONE_SUBTITLE: 'All sections are now unlocked in the sidebar. You can revisit any step to make changes.',
  SETUP_ERROR: 'Could not load setup progress.',
  STEP_NUMBER: (n: number) => `Step ${n}`,
  STEP_LOCKED: (prev: string) => `Complete "${prev}" first`,
  STEP_START: 'Start',
  STEP_DONE: 'Done — edit',
  STAT_LABELS: {
    RESTAURANT: 'Restaurant',
    MENU: 'Menu',
    STATUS: 'Setup',
  },
  ACTIVE: 'Active',
  INACTIVE: 'Not Set Up',
  COMPLETE: 'Complete',
  RESTAURANT_STATUS_LABELS: {
    PENDING_APPROVAL: 'Pending approval',
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    REJECTED: 'Rejected',
  },
} as const;

const Dashboard = () => {
  const { user, restaurant, menu, setup, refreshSetup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshSetup();
  }, [refreshSetup]);

  const allDone = !!setup?.isComplete;
  const completedCount = setup?.completedCount ?? 0;
  const totalSteps = setup?.totalSteps ?? SETUP_STEPS.length;
  // Restaurants registered before onboarding approval have no status and are live
  const restaurantStatus = restaurant ? restaurant.status ?? 'ACTIVE' : null;

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
          <span className={`stat-badge ${restaurantStatus === 'ACTIVE' ? 'stat-badge--active' : ''}`}>
            {restaurantStatus
              ? DASHBOARD_CONSTANTS.RESTAURANT_STATUS_LABELS[restaurantStatus]
              : DASHBOARD_CONSTANTS.INACTIVE}
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
          <span className={`stat-badge ${allDone ? 'stat-badge--active' : ''}`}>
            {allDone ? DASHBOARD_CONSTANTS.COMPLETE : `${completedCount}/${totalSteps}`}
          </span>
        </div>
      </div>

      {/* Setup Checklist */}
      <div className="setup-section">
        <h2 className="section-title">
          {allDone ? DASHBOARD_CONSTANTS.SETUP_DONE_TITLE : DASHBOARD_CONSTANTS.SETUP_TITLE}
        </h2>
        <p className="section-subtitle">
          {allDone ? DASHBOARD_CONSTANTS.SETUP_DONE_SUBTITLE : DASHBOARD_CONSTANTS.SETUP_SUBTITLE}
        </p>

        {!setup ? (
          <p className="section-subtitle">{DASHBOARD_CONSTANTS.SETUP_ERROR}</p>
        ) : (
          <>
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
              {SETUP_STEPS.map((step, i) => {
                const status = setup.steps.find((s) => s.step === step.step);
                const done = !!status?.done;
                const locked = !status?.unlocked;
                const isCurrent = setup.nextStep === step.step;
                const cardClass = [
                  'setup-card',
                  done && 'setup-card--done',
                  locked && 'setup-card--locked',
                  isCurrent && 'setup-card--current',
                ].filter(Boolean).join(' ');

                return (
                  <button
                    key={step.step}
                    className={cardClass}
                    disabled={locked}
                    onClick={() => navigate(step.route)}
                    title={locked ? DASHBOARD_CONSTANTS.STEP_LOCKED(SETUP_STEPS[i - 1]?.label ?? '') : step.hint}
                  >
                    <span className="setup-icon">{locked ? '🔒' : step.icon}</span>
                    <span className="setup-text">
                      <span className="setup-step-number">{DASHBOARD_CONSTANTS.STEP_NUMBER(i + 1)}</span>
                      <span className="setup-label">{step.label}</span>
                      <span className="setup-hint">
                        {locked
                          ? DASHBOARD_CONSTANTS.STEP_LOCKED(SETUP_STEPS[i - 1]?.label ?? '')
                          : done
                            ? DASHBOARD_CONSTANTS.STEP_DONE
                            : step.hint}
                      </span>
                    </span>
                    <span className={`setup-check ${done ? 'setup-check--done' : ''}`}>
                      {done ? '✓' : locked ? '' : '→'}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export { Dashboard };
