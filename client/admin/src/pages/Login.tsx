import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { MESSAGES, ROUTES } from '../constants';
import { getErrorMessage } from '../services/api';
import './Login.css';

// ============================================================
// Login Page — Google OAuth (owner) + staff login (waiter)
// ============================================================

const STAFF_TEXT = {
  DIVIDER: 'Waiter login',
  WAITER_HINT: 'Use the restaurant code, username and PIN given by your restaurant owner.',
  CODE: 'Restaurant code (6 digits)',
  USERNAME: 'Username',
  PIN: 'PIN',
  BUTTON: 'Sign in as waiter',
  SIGNING_IN: 'Signing in...',
  ERROR: 'Login failed. Check the code, username and PIN.',
};

const Login = () => {
  const { isAuthenticated, isLoading, login, staffLogin } = useAuth();
  const [searchParams] = useSearchParams();
  // ?code=123456 (link shared from the Staff page) prefills the restaurant code
  const codeFromLink = /^\d{6}$/.test(searchParams.get('code') ?? '') ? searchParams.get('code')! : '';
  const [form, setForm] = useState({ restaurantCode: codeFromLink, username: '', pin: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleStaffLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await staffLogin({
        restaurantCode: form.restaurantCode.trim(),
        username: form.username.trim().toLowerCase(),
        pin: form.pin.trim(),
      });
    } catch (err) {
      setError(getErrorMessage(err, STAFF_TEXT.ERROR));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="login-loading">{MESSAGES.LOADING}</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-visual">
          <div className="login-icon">🍽️</div>
          <div className="login-dots">
            <span /><span /><span />
          </div>
        </div>
        <h1 className="login-title">{MESSAGES.LOGIN_TITLE}</h1>
        <p className="login-subtitle">{MESSAGES.LOGIN_SUBTITLE}</p>
        <button onClick={login} className="btn-google">
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {MESSAGES.LOGIN_BUTTON}
        </button>

        <div className="login-divider"><span>{STAFF_TEXT.DIVIDER}</span></div>
        <p className="login-subtitle">{STAFF_TEXT.WAITER_HINT}</p>
        <form className="staff-login-form" onSubmit={handleStaffLogin}>
          <input
            className="staff-login-input"
            placeholder={STAFF_TEXT.CODE}
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={form.restaurantCode}
            onChange={(e) => setForm((p) => ({ ...p, restaurantCode: e.target.value }))}
          />
          <input
            className="staff-login-input"
            placeholder={STAFF_TEXT.USERNAME}
            autoComplete="username"
            autoFocus={!!codeFromLink}
            required
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
          />
          <input
            className="staff-login-input"
            placeholder={STAFF_TEXT.PIN}
            type="password"
            inputMode="numeric"
            pattern="\d{4,6}"
            maxLength={6}
            autoComplete="current-password"
            required
            value={form.pin}
            onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value }))}
          />
          {error && <div className="staff-login-error">{error}</div>}
          <button type="submit" className="btn-staff-login" disabled={submitting}>
            {submitting ? STAFF_TEXT.SIGNING_IN : STAFF_TEXT.BUTTON}
          </button>
        </form>
      </div>
    </div>
  );
};

export { Login };
