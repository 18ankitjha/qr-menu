import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStaff, addStaff, resetStaffPin, setStaffActive, removeStaff, getErrorMessage } from '../services/api';
import { MESSAGES } from '../constants';
import type { IStaff } from '../types';
import './FormPage.css';
import '../components/Billing.css';

// ============================================================
// Staff — owner adds waiters who log in with restaurant code + username + PIN
// ============================================================

const PAGE = {
  TITLE: 'Staff',
  SUBTITLE: 'Add waiters. They log in on the admin login page with the restaurant code, their username and PIN.',
  RESTAURANT_CODE: 'Restaurant code for staff login',
  ADD: 'Add Waiter',
  NAME: 'Name',
  USERNAME: 'Username',
  USERNAME_HINT: '3-30 chars: lowercase letters, numbers, . _ -',
  PIN: 'PIN (optional)',
  PIN_HINT: '4-6 digits. Leave empty to auto-generate.',
  NO_STAFF: 'No staff yet. Add your first waiter.',
  NO_RESTAURANT: 'Register a restaurant first.',
  ACTIVE: 'Active',
  DISABLED: 'Disabled',
  RESET_PIN: 'Reset PIN',
  ENABLE: 'Enable',
  DISABLE: 'Disable',
  REMOVE: 'Remove',
  CONFIRM_REMOVE: (name: string) => `Remove ${name}? They will no longer be able to log in.`,
  CONFIRM_RESET: (name: string) => `Generate a new PIN for ${name}? The old PIN stops working.`,
  PIN_TITLE: 'Share these login details',
  PIN_NOTE: 'Share these with the waiter. The PIN stays the same and is always shown in the Staff list.',
  PIN_LABEL: 'PIN',
  PIN_UNKNOWN: 'shown after their next login',
  LOGIN_LINK: 'Waiter login page',
  COPY: 'Copy link',
  COPIED: 'Copied!',
  DONE: 'Done',
  LAST_LOGIN: 'Last login',
  NEVER: 'never',
};

interface PinNotice {
  name: string;
  username: string;
  pin: string;
}

const Staff = () => {
  const { restaurant } = useAuth();
  const [staff, setStaff] = useState<IStaff[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', pin: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [pinNotice, setPinNotice] = useState<PinNotice | null>(null);
  const [copied, setCopied] = useState(false);

  // Waiters sign in on the admin login page; the code is prefilled from the link
  const waiterLoginUrl = restaurant?.restaurantCode
    ? `${window.location.origin}${import.meta.env.BASE_URL}login?code=${restaurant.restaurantCode}`
    : '';

  const showMessage = (text: string, error = false) => {
    setMessage(text);
    setIsError(error);
  };

  const fetchStaff = useCallback(async () => {
    if (!restaurant) return;
    try {
      const { data } = await getStaff(restaurant._id);
      setStaff(data.data);
    } catch (err) {
      showMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC), true);
    }
  }, [restaurant]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    setLoading(true);
    try {
      const { data } = await addStaff({
        restaurantId: restaurant._id,
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        pin: form.pin.trim() || undefined,
      });
      setPinNotice({ name: data.data.staff.name, username: data.data.staff.username, pin: data.data.pin });
      setShowForm(false);
      setForm({ name: '', username: '', pin: '' });
      showMessage('');
      await fetchStaff();
    } catch (err) {
      showMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC), true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async (member: IStaff) => {
    if (!confirm(PAGE.CONFIRM_RESET(member.name))) return;
    try {
      const { data } = await resetStaffPin(member._id);
      setPinNotice({ name: member.name, username: member.username, pin: data.data.pin });
      await fetchStaff();
    } catch (err) {
      showMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC), true);
    }
  };

  const copyLoginLink = async () => {
    await navigator.clipboard.writeText(waiterLoginUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleToggleActive = async (member: IStaff) => {
    try {
      await setStaffActive(member._id, !member.isActive);
      await fetchStaff();
    } catch (err) {
      showMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC), true);
    }
  };

  const handleRemove = async (member: IStaff) => {
    if (!confirm(PAGE.CONFIRM_REMOVE(member.name))) return;
    try {
      await removeStaff(member._id);
      await fetchStaff();
    } catch (err) {
      showMessage(getErrorMessage(err, MESSAGES.ERROR_GENERIC), true);
    }
  };

  if (!restaurant) {
    return (
      <div className="form-page">
        <div className="empty-state">
          <div className="empty-icon">🏪</div>
          <p className="empty-text">{PAGE.NO_RESTAURANT}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bills-page">
      <div className="page-header">
        <h1 className="page-title">{PAGE.TITLE}</h1>
        <p className="page-subtitle">{PAGE.SUBTITLE}</p>
      </div>

      {message && <div className={`form-message ${isError ? 'form-message--error' : ''}`}>{message}</div>}

      <div className="bill-card" style={{ marginBottom: 20 }}>
        <div className="bill-card-main">
          <span className="bill-card-meta">{PAGE.RESTAURANT_CODE}</span>
          <span className="bill-card-amount" style={{ letterSpacing: 4 }}>{restaurant.restaurantCode ?? '—'}</span>
          {waiterLoginUrl && (
            <span className="bill-card-meta">
              {PAGE.LOGIN_LINK}: <a href={waiterLoginUrl} target="_blank" rel="noopener noreferrer">{waiterLoginUrl}</a>{' '}
              <button type="button" className="btn-secondary btn-sm" onClick={copyLoginLink}>
                {copied ? PAGE.COPIED : PAGE.COPY}
              </button>
            </span>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ {PAGE.ADD}</button>
      </div>

      {staff.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧑‍🍳</div>
          <p className="empty-text">{PAGE.NO_STAFF}</p>
        </div>
      ) : (
        <div className="bills-list">
          {staff.map((member) => (
            <div key={member._id} className="bill-card">
              <div className="bill-card-main">
                <span className="bill-card-number">
                  {member.name}{' '}
                  <span className={`bill-chip ${member.isActive ? '' : 'bill-chip--unpaid'}`}>
                    {member.isActive ? PAGE.ACTIVE : PAGE.DISABLED}
                  </span>
                </span>
                <span className="bill-card-meta">
                  @{member.username} · {member.role} · {PAGE.LAST_LOGIN}:{' '}
                  {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : PAGE.NEVER}
                </span>
                <span className="bill-card-meta">
                  {PAGE.PIN_LABEL}:{' '}
                  {member.pin ? (
                    <strong style={{ letterSpacing: 3 }}>{member.pin}</strong>
                  ) : (
                    <em title="Older waiter: the PIN becomes visible once they log in again, or reset it now">{PAGE.PIN_UNKNOWN}</em>
                  )}
                </span>
              </div>
              <div className="bill-card-actions">
                <button className="btn-secondary btn-sm" onClick={() => handleResetPin(member)}>🔑 {PAGE.RESET_PIN}</button>
                <button className="btn-secondary btn-sm" onClick={() => handleToggleActive(member)}>
                  {member.isActive ? PAGE.DISABLE : PAGE.ENABLE}
                </button>
                <button className="btn-icon btn-icon--danger" title={PAGE.REMOVE} onClick={() => handleRemove(member)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleAdd}>
            <h2 className="card-title">{PAGE.ADD}</h2>
            <div className="form-group">
              <label className="form-label">{PAGE.NAME}</label>
              <input className="form-input" minLength={2} maxLength={60} required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE.USERNAME}</label>
              <input className="form-input" pattern="[a-zA-Z0-9._\-]{3,30}" title={PAGE.USERNAME_HINT} required value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} placeholder="e.g. ravi" />
              <span className="bill-muted">{PAGE.USERNAME_HINT}</span>
            </div>
            <div className="form-group">
              <label className="form-label">{PAGE.PIN}</label>
              <input className="form-input" inputMode="numeric" pattern="\d{4,6}" maxLength={6} value={form.pin} onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value }))} />
              <span className="bill-muted">{PAGE.PIN_HINT}</span>
            </div>
            <div className="btn-row">
              <button className="btn-primary" disabled={loading}>{loading ? MESSAGES.LOADING : PAGE.ADD}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>{MESSAGES.CANCEL}</button>
            </div>
          </form>
        </div>
      )}

      {pinNotice && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2 className="card-title">{PAGE.PIN_TITLE}</h2>
            <p className="bill-muted">{PAGE.PIN_NOTE}</p>
            <div className="bill-breakdown" style={{ margin: '12px 0' }}>
              <div className="bill-line"><span>Waiter</span><strong>{pinNotice.name}</strong></div>
              <div className="bill-line"><span>Restaurant code</span><strong>{restaurant.restaurantCode}</strong></div>
              <div className="bill-line"><span>Username</span><strong>{pinNotice.username}</strong></div>
              <div className="bill-line bill-line--total"><span>PIN</span><span style={{ letterSpacing: 4 }}>{pinNotice.pin}</span></div>
            </div>
            <button className="btn-primary" onClick={() => setPinNotice(null)}>{PAGE.DONE}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export { Staff };
