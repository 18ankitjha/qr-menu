import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES, MESSAGES } from '../constants';

// ============================================================
// AuthSuccess — Called after Google OAuth redirect
// Refreshes the user profile from the cookie and navigates to dashboard
// ============================================================

export const AuthSuccess = () => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshProfile().then(() => {
      navigate(ROUTES.DASHBOARD, { replace: true });
    });
  }, [refreshProfile, navigate]);

  return <div className="login-loading">{MESSAGES.LOADING}</div>;
};
