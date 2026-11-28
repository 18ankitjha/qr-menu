import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES, SETUP_STEPS } from '../constants';
import { FALLBACK_POLL_MS, RESTAURANT_EVENTS, restaurantRoom, useLiveRefresh } from '../realtime';
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
  STEP_AWAITING_APPROVAL: '⏳ Unlocks after approval',
  APPROVAL_NOTE: 'Step 1 is done. Our team is reviewing your restaurant — the remaining steps unlock automatically once it is approved.',
  REJECTED_NOTE: 'Your restaurant was not approved, so the remaining steps are locked. You can update your details in step 1.',
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
  JUST_DONE_TITLE: '🎉 Your setup is complete!',
  JUST_DONE_BODY: 'Customers can now scan your table QRs and order. A few more things you can configure:',
  JUST_DONE_DISMISS: 'Go to Orders',
} as const;

/** Shown once, right after the last Quick Setup step is saved. */
const NEXT_THINGS = [
  { route: ROUTES.STAFF, icon: '🧑‍🍳', label: 'Add waiters', hint: 'Give staff a username + PIN to take orders' },
  { route: ROUTES.RESTAURANT, icon: '🧾', label: 'Billing settings', hint: 'Set GST and service charge for bills' },
  { route: ROUTES.TABLES, icon: '🖨️', label: 'Print table QRs', hint: 'Download and place QR codes on tables' },
  { route: ROUTES.ORDERS, icon: '📦', label: 'Watch orders', hint: 'Live orders, billing and payments' },
] as const;

const APPROVAL_PUSHES = [RESTAURANT_EVENTS.RESTAURANT_UPDATED] as const;

const Dashboard = () => {
  const { user, restaurant, menu, setup, isSetupComplete, refreshSetup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justCompleted = !!(location.state as { setupJustCompleted?: boolean } | null)?.setupJustCompleted;
  const dismissJustCompleted = () => navigate(ROUTES.ORDERS, { replace: true });

  useEffect(() => {
    refreshSetup();
  }, [refreshSetup]);

  // While waiting for the super admin: the approval push unlocks the steps at once (no reload).
  // Polls only while the live connection is down.
  const awaitingApproval = !!setup?.awaitingApproval;
  useLiveRefresh(refreshSetup, {
    room: restaurantRoom(awaitingApproval ? restaurant?._id : undefined),
    events: APPROVAL_PUSHES,
    fallbackMs: FALLBACK_POLL_MS.APPROVAL,
  });

  const allDone = !!setup?.isComplete;
  const completedCount = setup?.completedCount ?? 0;
  const totalSteps = setup?.totalSteps ?? SETUP_STEPS.length;
  // Restaurants registered before onboarding approval have no status and are live
  const restaurantStatus = restaurant ? restaurant.status ?? 'ACTIVE' : null;

  // After setup the Dashboard is only the one-time 'setup complete' screen; otherwise go to Orders
  if (isSetupComplete && !justCompleted) {
    return <Navigate to={ROUTES.ORDERS} replace />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="page-title">{DASHBOARD_CONSTANTS.TITLE}</h1>
        <p className="page-subtitle">
          {DASHBOARD_CONSTANTS.GREETING(user?.name || '')}
        </p>
      </div>

      {justCompleted && allDone && (
        <div className="setup-celebrate" role="status">
          <div className="setup-celebrate-head">
            <div>
              <h2 className="setup-celebrate-title">{DASHBOARD_CONSTANTS.JUST_DONE_TITLE}</h2>
              <p className="setup-celebrate-body">{DASHBOARD_CONSTANTS.JUST_DONE_BODY}</p>
            </div>
            <button className="btn-secondary btn-sm" onClick={dismissJustCompleted}>
              {DASHBOARD_CONSTANTS.JUST_DONE_DISMISS}
            </button>
          </div>
          <div className="setup-celebrate-grid">
            {NEXT_THINGS.map((item) => (
              <button key={item.route} className="setup-celebrate-item" onClick={() => navigate(item.route)}>
                <span className="setup-icon">{item.icon}</span>
                <span className="setup-text">
                  <span className="setup-label">{item.label}</span>
                  <span className="setup-hint">{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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

            {awaitingApproval && (
              <p className="setup-approval-note" role="status">
                {setup.restaurantStatus === 'REJECTED'
                  ? DASHBOARD_CONSTANTS.REJECTED_NOTE
                  : DASHBOARD_CONSTANTS.APPROVAL_NOTE}
              </p>
            )}

            <div className="setup-grid">
              {SETUP_STEPS.map((step, i) => {
                const status = setup.steps.find((s) => s.step === step.step);
                const done = !!status?.done;
                const locked = !status?.unlocked;
                const lockedText = status?.lockedReason === 'AWAITING_APPROVAL'
                  ? DASHBOARD_CONSTANTS.STEP_AWAITING_APPROVAL
                  : DASHBOARD_CONSTANTS.STEP_LOCKED(SETUP_STEPS[i - 1]?.label ?? '');
                const isCurrent = !locked && setup.nextStep === step.step;
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
                    title={locked ? lockedText : step.hint}
                  >
                    <span className="setup-icon">{locked ? '🔒' : step.icon}</span>
                    <span className="setup-text">
                      <span className="setup-step-number">{DASHBOARD_CONSTANTS.STEP_NUMBER(i + 1)}</span>
                      <span className="setup-label">{step.label}</span>
                      <span className="setup-hint">
                        {locked
                          ? lockedText
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
