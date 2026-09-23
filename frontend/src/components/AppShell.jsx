import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Landmark,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MoonStar,
  PiggyBank,
  Settings,
  SunMedium,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest, clearToken, formatFullDate, getToken } from '../services/api';

function ThemeToggle() {
  const getInitialTheme = () => {
    const saved = localStorage.getItem('finsight-theme');
    return saved || 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('finsight-theme', theme);
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <MoonStar size={16} /> : <SunMedium size={16} />}
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}

const navigation = [
  { label: 'Overview', path: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Transactions', path: '/app/transactions', icon: CreditCard },
  { label: 'Accounts', path: '/app/accounts', icon: Landmark },
  { label: 'Budgets', path: '/app/budgets', icon: PiggyBank },
  { label: 'Categories', path: '/app/categories', icon: FolderKanban },
  { label: 'Insights', path: '/app/insights', icon: TrendingUp },
  { label: 'Reports', path: '/app/reports', icon: BarChart3 },
  { label: 'Settings/Profile', path: '/app/settings', icon: Settings },
];

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentPage = useMemo(() => {
    const match = navigation.find((item) => location.pathname.startsWith(item.path));
    return match ? match.label : 'Overview';
  }, [location.pathname]);

  useEffect(() => {
    const loadUser = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }

      try {
        const profile = await apiRequest('/auth/me');
        setUser(profile);
      } catch (error) {
        clearToken();
        navigate('/', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = () => {
    clearToken();
    navigate('/', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">Fin<span>•</span>Sight</div>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/app/dashboard'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="nav-item logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">FINANCIAL INTELLIGENCE</p>
            <h1>{currentPage}</h1>
          </div>

          <div className="topbar-right">
            <div className="date-pill">{formatFullDate(new Date())}</div>
            <ThemeToggle />
            <div className="profile-pill">
              <div className="avatar-circle">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
              <div>
                <strong>{user?.name || 'User'}</strong>
                <small>{user?.email || 'Loading profile...'}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="page-content">
          {!loading ? <Outlet /> : <div className="loading-card">Loading your workspace…</div>}
        </div>
      </main>
    </div>
  );
}
