import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES, SETUP_STEPS } from '../constants';
import './SetupStepBanner.css';

// ============================================================
// Setup Step Banner — on a Quick Setup page (while setup is incomplete) shows which step this is,
// what to do, and a "Next" button that only enables once this step is done.
// ============================================================

const TEXT = {
  STEP_OF: (n: number, total: number) => `Step ${n} of ${total}`,
  BACK: '← Quick Setup',
  NEXT: (label: string) => `Next: ${label} →`,
  DONE: '✓ Done',
  TODO: 'To do',
} as const;

const SetupStepBanner = () => {
  const { isSetupComplete, setup } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isSetupComplete || !setup) return null;

  const index = SETUP_STEPS.findIndex((s) => s.route === location.pathname);
  if (index === -1) return null;

  const step = SETUP_STEPS[index];
  const next = SETUP_STEPS[index + 1];
  const done = setup.steps.find((s) => s.step === step.step)?.done ?? false;

  return (
    <div className={`setup-step-banner ${done ? 'setup-step-banner--done' : ''}`}>
      <div className="setup-step-banner-info">
        <span className="setup-step-banner-count">{TEXT.STEP_OF(index + 1, SETUP_STEPS.length)}</span>
        <span className="setup-step-banner-title">
          {step.icon} {step.label}
          <span className={`setup-step-banner-state ${done ? 'setup-step-banner-state--done' : ''}`}>
            {done ? TEXT.DONE : TEXT.TODO}
          </span>
        </span>
        <span className="setup-step-banner-hint">{step.hint}</span>
      </div>
      <div className="setup-step-banner-actions">
        <button className="btn-secondary btn-sm" onClick={() => navigate(ROUTES.DASHBOARD)}>
          {TEXT.BACK}
        </button>
        {next && (
          <button className="btn-primary btn-sm" disabled={!done} onClick={() => navigate(next.route)}>
            {TEXT.NEXT(next.label)}
          </button>
        )}
      </div>
    </div>
  );
};

export { SetupStepBanner };
