import { useLocation, useNavigate } from 'react-router-dom';
import { MoonStar, SunMedium } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest, getUserErrorMessage, setToken } from '../services/api';

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
      className="theme-toggle auth-theme-toggle"
      onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <MoonStar size={16} /> : <SunMedium size={16} />}
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}

const emptyForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

function validateRegister(form) {
  const nextErrors = {};

  if (!form.name.trim()) {
    nextErrors.name = 'Name is required.';
  } else if (form.name.trim().length < 2) {
    nextErrors.name = 'Name must be at least 2 characters.';
  }

  if (!form.email.trim()) {
    nextErrors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    nextErrors.email = 'Please enter a valid email address.';
  }

  if (!form.password) {
    nextErrors.password = 'Password is required.';
  } else if (form.password.length < 8) {
    nextErrors.password = 'Password must be at least 8 characters.';
  }

  if (!form.confirmPassword) {
    nextErrors.confirmPassword = 'Please confirm your password.';
  } else if (form.password !== form.confirmPassword) {
    nextErrors.confirmPassword = 'Passwords do not match.';
  }

  return nextErrors;
}

function validateLogin(form) {
  const nextErrors = {};

  if (!form.email.trim()) {
    nextErrors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    nextErrors.email = 'Enter a valid email.';
  }

  if (!form.password) {
    nextErrors.password = 'Password is required.';
  }

  return nextErrors;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: 'info', message: location.state?.success || '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeTitle = useMemo(
    () => (mode === 'login' ? 'Welcome back' : 'Create your account'),
    [mode]
  );

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: '' }));
  }

  async function handleRegister(event) {
    event.preventDefault();
    const nextErrors = validateRegister(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'info', message: '' });

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password
        })
      });

      setMode('login');
      setForm({ ...emptyForm, email: form.email.trim() });
      setStatus({
        type: 'success',
        message: 'Registration successful. Please sign in to continue.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getUserErrorMessage(error) || 'Unable to create your account right now.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const nextErrors = validateLogin(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: 'info', message: '' });

    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email.trim(),
          pwd: form.password
        })
      });

      setToken(result.token);
      navigate('/app/dashboard', { replace: true });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getUserErrorMessage(error) || 'Unable to sign in right now.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setErrors({});
    setStatus({ type: 'info', message: '' });
    setForm({ ...emptyForm, email: form.email });
  }

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <span className="eyebrow soft">PERSONAL FINANCIAL INTELLIGENCE</span>
        <h1>See your money with sharper clarity.</h1>
        <p>
          FinSight brings everyday transactions, budgets, and spending signals into one calm, practical view of your financial health.
        </p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="brand-mark">Fin<span>•</span>Sight</div>
            <ThemeToggle />
          </div>
          <h2>{activeTitle}</h2>

          {status.message && (
            <div className={`status-banner ${status.type}`}>
              {status.message}
            </div>
          )}

          <form onSubmit={mode === 'register' ? handleRegister : handleLogin} noValidate>
            {mode === 'register' && (
              <div className="field-group">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  className={errors.name ? 'invalid' : ''}
                  placeholder="Your full name"
                />
                {errors.name && <small className="error-text">{errors.name}</small>}
              </div>
            )}

            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                className={errors.email ? 'invalid' : ''}
                placeholder="you@example.com"
              />
              {errors.email && <small className="error-text">{errors.email}</small>}
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                className={errors.password ? 'invalid' : ''}
                placeholder="Minimum 8 characters"
              />
              {errors.password && <small className="error-text">{errors.password}</small>}
            </div>

            {mode === 'register' && (
              <div className="field-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  className={errors.confirmPassword ? 'invalid' : ''}
                  placeholder="Re-enter your password"
                />
                {errors.confirmPassword && <small className="error-text">{errors.confirmPassword}</small>}
              </div>
            )}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}
            </button>
          </form>

          <button type="button" className="secondary-button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
          </button>
        </div>
      </section>
    </main>
  );
}
