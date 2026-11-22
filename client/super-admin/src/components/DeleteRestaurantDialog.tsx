import { useState } from 'react';
import { MESSAGES } from '../constants';

// ============================================================
// DeleteRestaurantDialog — type the restaurant name to confirm a permanent delete
// ============================================================

const TEXT = {
  TITLE: 'Delete restaurant permanently',
  INTRO: 'This cannot be undone. The following will be deleted:',
  WHAT: [
    'Restaurant profile, menu, categories and dishes',
    'Tables and their QR codes',
    'Waiters, orders, bills and table sessions',
    'Uploaded images (logo, dish photos, backgrounds)',
  ],
  OWNER: (email?: string) =>
    `The owner's account${email ? ` (${email})` : ''} — they can sign up again with Google to start fresh.`,
  LABEL: (name: string) => `Type "${name}" to confirm`,
  CONFIRM: 'Delete permanently',
};

interface IDeleteRestaurantDialogProps {
  restaurantName: string;
  ownerEmail?: string;
  busy: boolean;
  error?: string;
  onConfirm: (confirmName: string) => void;
  onCancel: () => void;
}

const DeleteRestaurantDialog = ({
  restaurantName,
  ownerEmail,
  busy,
  error,
  onConfirm,
  onCancel,
}: IDeleteRestaurantDialogProps) => {
  const [typed, setTyped] = useState('');
  const expected = restaurantName.trim();
  const canSubmit = !busy && typed.trim() === expected;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onConfirm(typed.trim());
  };

  return (
    <div className="dialog-overlay" onClick={busy ? undefined : onCancel}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="delete-dialog-title" className="dialog-title">
          {TEXT.TITLE}
        </h2>
        <p className="dialog-subject">{restaurantName}</p>
        <p className="dialog-desc">{TEXT.INTRO}</p>
        <ul className="danger-list">
          {TEXT.WHAT.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>{TEXT.OWNER(ownerEmail)}</li>
        </ul>

        <label className="form-label" htmlFor="delete-confirm-input">
          {TEXT.LABEL(expected)}
        </label>
        <input
          id="delete-confirm-input"
          className="form-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoFocus
        />
        {error && <p className="form-hint form-hint--error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            {MESSAGES.CANCEL}
          </button>
          <button type="submit" className="btn btn-danger" disabled={!canSubmit}>
            {busy ? MESSAGES.LOADING : TEXT.CONFIRM}
          </button>
        </div>
      </form>
    </div>
  );
};

export { DeleteRestaurantDialog };
