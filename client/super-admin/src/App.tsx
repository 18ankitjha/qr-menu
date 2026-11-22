import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AuthSuccess } from './pages/AuthSuccess';
import { Dashboard } from './pages/Dashboard';
import { Restaurants } from './pages/Restaurants';
import { RestaurantDetail } from './pages/RestaurantDetail';
import { MESSAGES, ROUTES } from './constants';

// ============================================================
// App — Super admin routes (all behind the allowlist check)
// ============================================================

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { status } = useAuth();

  if (status === 'loading') {
    return <div className="login-loading">{MESSAGES.LOADING}</div>;
  }

  if (status !== 'super-admin') {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AuthProvider>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.AUTH_SUCCESS} element={<AuthSuccess />} />
        <Route
          element={
            <SuperAdminRoute>
              <Layout />
            </SuperAdminRoute>
          }
        >
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.RESTAURANTS} element={<Restaurants />} />
          <Route path={ROUTES.RESTAURANT_DETAIL} element={<RestaurantDetail />} />
        </Route>
        <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
