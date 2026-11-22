import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MESSAGES, ROUTES } from '../constants';

// ============================================================
// AuthSuccess — landing page after the Google OAuth redirect
// ============================================================

const AuthSuccess = () => {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Login decides between the dashboard and the access-denied screen
    refresh().then(() => navigate(ROUTES.LOGIN, { replace: true }));
  }, [refresh, navigate]);

  return <div className="login-loading">{MESSAGES.LOADING}</div>;
};

export { AuthSuccess };
