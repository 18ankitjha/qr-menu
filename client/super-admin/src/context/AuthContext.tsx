import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { getMe, getProfile, logout as logoutApi } from '../services/api';
import { API_ENDPOINTS } from '../constants';
import type { ISuperAdminProfile } from '../types';

// ============================================================
// Auth Context — Google session + super admin allowlist check
// ============================================================

type AuthStatus = 'loading' | 'signed-out' | 'forbidden' | 'super-admin';

interface IAuthContext {
  status: AuthStatus;
  profile: ISuperAdminProfile | null;
  /** Email of a signed-in user who is not a super admin. */
  deniedEmail: string | null;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<IAuthContext | null>(null);

interface IAuthState {
  status: AuthStatus;
  profile: ISuperAdminProfile | null;
  deniedEmail: string | null;
}

/** Ask the API who we are: super admin, signed in but not allowed (403), or signed out. */
const resolveAuth = async (): Promise<IAuthState> => {
  try {
    const { data } = await getMe();
    return { status: 'super-admin', profile: data.data, deniedEmail: null };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      const email = await getProfile()
        .then(({ data }) => data.data.email)
        .catch(() => null);
      return { status: 'forbidden', profile: null, deniedEmail: email };
    }
    return { status: 'signed-out', profile: null, deniedEmail: null };
  }
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState<IAuthState>({ status: 'loading', profile: null, deniedEmail: null });

  const refresh = useCallback(async () => {
    setAuth(await resolveAuth());
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveAuth().then((state) => {
      if (!cancelled) setAuth(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = () => {
    window.location.href = API_ENDPOINTS.AUTH.GOOGLE_LOGIN;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setAuth({ status: 'signed-out', profile: null, deniedEmail: null });
    }
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = (): IAuthContext => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { AuthProvider, useAuth };
