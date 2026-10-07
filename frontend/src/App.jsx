import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import BudgetPage from './pages/BudgetsPage';
import CategoriesPage from './pages/CategoriesPage';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import TransactionsPage from './pages/TransactionsPage';
import AccountsPage from './pages/AccountsPage';
import PlanningPage from './pages/PlanningPage';
import { getToken } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getToken()));

  useEffect(() => {
    const syncAuthState = () => setIsAuthenticated(Boolean(getToken()));
    window.addEventListener('auth:change', syncAuthState);
    window.addEventListener('storage', syncAuthState);
    return () => {
      window.removeEventListener('auth:change', syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <AuthPage />
          }
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="budgets" element={<BudgetPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={isAuthenticated ? '/app/dashboard' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
