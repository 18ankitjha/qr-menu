import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { IProfile, IRestaurant, IMenu, IAuthContext, ISetupStatus } from '../types';
import {
  getProfile,
  logout as logoutApi,
  getRestaurant,
  getMenu,
  getSetupStatus,
  staffLogin as staffLoginApi,
} from '../services/api';
import { API_ENDPOINTS, SETUP_STEPS } from '../constants';

// ============================================================
// Auth Context — manages user session, restaurant, menu and Quick Setup progress
// ============================================================

const AuthContext = createContext<IAuthContext | null>(null);

/** Owner without a restaurant yet: only the first step is open. */
const NO_RESTAURANT_SETUP: ISetupStatus = {
  steps: SETUP_STEPS.map((s, i) => ({
    step: s.step,
    done: false,
    unlocked: i === 0,
    lockedReason: i === 0 ? null : 'PREVIOUS_STEP',
  })),
  completedCount: 0,
  totalSteps: SETUP_STEPS.length,
  isComplete: false,
  awaitingApproval: false,
  restaurantStatus: null,
  nextStep: SETUP_STEPS[0].step,
  counts: { dishes: 0, tables: 0 },
};

/** Loads the owner's setup status; null if it can't be loaded (the app then stays unlocked). */
const fetchSetup = async (restaurantId?: string): Promise<ISetupStatus | null> => {
  if (!restaurantId) return NO_RESTAURANT_SETUP;
  try {
    const { data } = await getSetupStatus(restaurantId);
    return data.data;
  } catch {
    return null;
  }
};

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<IProfile | null>(null);
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menu, setMenu] = useState<IMenu | null>(null);
  const [setup, setSetup] = useState<ISetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await getProfile();
      const userData = data.data;

      // Waiters: no menu management and no Quick Setup
      if (userData.kind === 'STAFF') {
        if (userData.restaurantId) {
          const { data: restData } = await getRestaurant(userData.restaurantId);
          setRestaurant(restData.data);
        }
        setMenu(null);
        setSetup(null);
        setUser(userData);
        return;
      }

      if (userData.restaurantId) {
        const { data: restData } = await getRestaurant(userData.restaurantId);
        setRestaurant(restData.data);
        try {
          const { data: menuData } = await getMenu(userData.restaurantId);
          setMenu(menuData.data);
        } catch {
          setMenu(null);
        }
      }
      // Load setup before exposing the user so the sidebar never flashes unlocked
      setSetup(await fetchSetup(userData.restaurantId));
      setUser(userData);
    } catch {
      setUser(null);
      setRestaurant(null);
      setMenu(null);
      setSetup(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const isOwner = !!user && user.kind !== 'STAFF';

  /** Call after anything that can finish a setup step (dish added, tables added, theme saved...). */
  const refreshSetup = useCallback(async () => {
    if (!isOwner) return;
    const restaurantId = restaurant?._id ?? user?.restaurantId;
    const next = await fetchSetup(restaurantId);
    if (!next) return;
    setSetup(next);
    // The super admin approved/rejected since we last loaded the restaurant: refresh its status too
    const knownStatus = restaurant ? restaurant.status ?? 'ACTIVE' : null;
    if (restaurantId && restaurant && next.restaurantStatus && knownStatus !== next.restaurantStatus) {
      try {
        const { data } = await getRestaurant(restaurantId);
        setRestaurant(data.data);
      } catch {
        // keep the old copy; the next refresh will try again
      }
    }
  }, [isOwner, restaurant, user]);

  const login = () => {
    window.location.href = API_ENDPOINTS.AUTH.GOOGLE_LOGIN;
  };

  /** Waiter login. Throws on bad credentials so the form can show the server message. */
  const staffLogin: IAuthContext['staffLogin'] = async (input) => {
    await staffLoginApi(input);
    await refreshProfile();
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setRestaurant(null);
      setMenu(null);
      setSetup(null);
    }
  };

  const contextValue: IAuthContext = {
    user,
    restaurant,
    menu,
    isLoading,
    isAuthenticated: !!user,
    isOwner,
    setup,
    isSetupComplete: !isOwner || !setup || setup.isComplete,
    refreshSetup,
    login,
    staffLogin,
    logout,
    setRestaurant,
    setMenu,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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

export { AuthProvider, useAuth };
