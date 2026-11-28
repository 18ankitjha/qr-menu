import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Restaurant } from './pages/Restaurant';
import { MenuBuilder } from './pages/MenuBuilder';
import { Tables } from './pages/Tables';
import { Orders } from './pages/Orders';
import { CustomerMenuSettings } from './pages/CustomerMenuSettings';
import { Staff } from './pages/Staff';
import { Bills } from './pages/Bills';
import { AuthSuccess } from './pages/AuthSuccess';
import { ROUTES, MESSAGES } from './constants';
import type { SetupStepKey } from './types';

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

/** Pages only the restaurant owner may open; waiters are sent to Orders. */
const OwnerRoute = ({ children }: { children: React.ReactNode }) => {
  const { isOwner } = useAuth();
  if (!isOwner) {
    return <Navigate to={ROUTES.ORDERS} replace />;
  }
  return <>{children}</>;
};

/**
 * Until the owner finishes Quick Setup, only the setup steps that are unlocked can be opened
 * (`step`), and every other page (`step` omitted) sends them back to the Dashboard.
 */
const SetupRoute = ({ step, children }: { step?: SetupStepKey; children: React.ReactNode }) => {
  const { isSetupComplete, setup } = useAuth();
  if (isSetupComplete) return <>{children}</>;
  const status = step && setup?.steps.find((s) => s.step === step);
  if (!status || !status.unlocked) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return <>{children}</>;
};

const App = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
            <Route path={ROUTES.DASHBOARD} element={<OwnerRoute><Dashboard /></OwnerRoute>} />
            <Route path={ROUTES.RESTAURANT} element={<OwnerRoute><SetupRoute step="restaurant"><Restaurant /></SetupRoute></OwnerRoute>} />
            <Route path={ROUTES.MENU} element={<OwnerRoute><SetupRoute step="menu"><MenuBuilder /></SetupRoute></OwnerRoute>} />
            <Route path={ROUTES.TABLES} element={<SetupRoute step="tables"><Tables /></SetupRoute>} />
            <Route path={ROUTES.ORDERS} element={<SetupRoute><Orders /></SetupRoute>} />
            <Route path={ROUTES.BILLS} element={<SetupRoute><Bills /></SetupRoute>} />
            <Route path={ROUTES.STAFF} element={<OwnerRoute><SetupRoute><Staff /></SetupRoute></OwnerRoute>} />
            <Route path={ROUTES.CUSTOMER_MENU} element={<OwnerRoute><SetupRoute step="theme"><CustomerMenuSettings /></SetupRoute></OwnerRoute>} />
            <Route path={ROUTES.LEGACY_SETTINGS} element={<Navigate to={ROUTES.CUSTOMER_MENU} replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
