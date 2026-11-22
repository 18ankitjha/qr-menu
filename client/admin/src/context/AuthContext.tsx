import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { IUser, IRestaurant, IMenu, IAuthContext } from '../types';
import { getProfile, logout as logoutApi, getRestaurant, getMenu } from '../services/api';
import { API_ENDPOINTS } from '../constants';

// ============================================================
// Auth Context — manages user session, restaurant, and menu
// ============================================================

const AuthContext = createContext<IAuthContext | null>(null);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menu, setMenu] = useState<IMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await getProfile();
      const userData = data.data;
      setUser(userData);

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
    } catch {
      setUser(null);
      setRestaurant(null);
      setMenu(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = () => {
    window.location.href = API_ENDPOINTS.AUTH.GOOGLE_LOGIN;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setRestaurant(null);
      setMenu(null);
    }
  };

  const contextValue: IAuthContext = {
    user,
    restaurant,
    menu,
    isLoading,
    isAuthenticated: !!user,
    login,
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
