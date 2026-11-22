import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Restaurant } from './pages/Restaurant';
import { MenuBuilder } from './pages/MenuBuilder';
import { Tables } from './pages/Tables';
import { Orders } from './pages/Orders';
import { Settings } from './pages/Settings';
import { AuthSuccess } from './pages/AuthSuccess';
import { ROUTES, MESSAGES } from './constants';

// ============================================================
// App — Root component with routing
// ============================================================

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="login-loading">{MESSAGES.LOADING}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.RESTAURANT} element={<Restaurant />} />
            <Route path={ROUTES.MENU} element={<MenuBuilder />} />
            <Route path={ROUTES.TABLES} element={<Tables />} />
            <Route path={ROUTES.ORDERS} element={<Orders />} />
            <Route path={ROUTES.SETTINGS} element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
