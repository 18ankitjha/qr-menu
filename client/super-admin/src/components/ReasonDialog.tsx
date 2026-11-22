import { useState } from 'react';
import { ACTION_CONFIG, MESSAGES, REASON_MIN_LENGTH } from '../constants';
import type { StatusAction } from '../constants';

// ============================================================
// ReasonDialog — confirm an onboarding action, with a reason when required
// ============================================================

interface IReasonDialogProps {
  action: StatusAction;
  restaurantName: string;
  busy: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const ReasonDialog = ({ action, restaurantName, busy, error, onConfirm, onCancel }: IReasonDialogProps) => {
  const config = ACTION_CONFIG[action];
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const reasonTooShort = trimmed.length > 0 && trimmed.length < REASON_MIN_LENGTH;
  const canSubmit = !busy && !reasonTooShort && (!config.reasonRequired || trimmed.length >= REASON_MIN_LENGTH);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onConfirm(trimmed);
  };

  return (
    <div className="dialog-overlay" onClick={busy ? undefined : onCancel}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reason-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="reason-dialog-title" className="dialog-title">
          {config.title}
        </h2>
        <p className="dialog-subject">{restaurantName}</p>
        <p className="dialog-desc">{config.description}</p>

        <label className="form-label" htmlFor="reason-input">
          {MESSAGES.REASON_LABEL(config.reasonRequired)}
        </label>
        <textarea
          id="reason-input"
          className="form-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={MESSAGES.REASON_PLACEHOLDER}
          rows={3}
          maxLength={500}
          autoFocus
        />
        {reasonTooShort && (
          <p className="form-hint form-hint--error">At least {REASON_MIN_LENGTH} characters.</p>
        )}
        {error && <p className="form-hint form-hint--error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            {MESSAGES.CANCEL}
          </button>
          <button
            type="submit"
            className={`btn ${config.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            disabled={!canSubmit}
          >
            {busy ? MESSAGES.LOADING : config.label}
          </button>
        </div>
      </form>
    </div>
  );
};

export { ReasonDialog };
