const API_BASE = 'http://localhost:8081/API';

export function getToken() {
  return localStorage.getItem('finsight_token');
}

export function setToken(token) {
  localStorage.setItem('finsight_token', token);
  window.dispatchEvent(new Event('auth:change'));
}

export function clearToken() {
  localStorage.removeItem('finsight_token');
  window.dispatchEvent(new Event('auth:change'));
}

export function getUserErrorMessage(error) {
  const message = error && error.message ? error.message : 'Something went wrong.';
  const normalized = message.toLowerCase();

  if (normalized.includes('email is already registered')) {
    return 'This email is already registered. Please sign in or use a different email address.';
  }

  if (normalized.includes('user not found') || normalized.includes('invalid credentials')) {
    return 'We could not find an account with those details. Please check your email and password.';
  }

  if (normalized.includes('401') || normalized.includes('session') || normalized.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again.';
  }

  if (normalized.includes('403') || normalized.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }

  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Unable to reach the server. Please try again.';
  }

  if (normalized.includes('400') || normalized.includes('validation') || normalized.includes('required') || normalized.includes('at least') || normalized.includes('valid email') || normalized.includes('password')) {
    return 'Please review the details and try again.';
  }

  if (normalized.includes('500') || normalized.includes('unexpected')) {
    return 'Something went wrong on our side. Please try again later.';
  }

  return message.length > 110 ? 'Unable to complete this request right now.' : message;
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';

  if (response.status === 401 || response.status === 403) {
    if (response.status === 401) clearToken();
    throw new Error(response.status === 401 ? '401 Unauthorized' : '403 Forbidden');
  }

  if (!response.ok) {
    let message = 'Request failed';

    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => ({}));
      message = body.message || body.error || message;
    } else {
      const text = await response.text().catch(() => '');
      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export function formatCurrency(value) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: numeric >= 1000 ? 0 : 2
  }).format(numeric);
}

export function formatCompactCurrency(value) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(numeric);
}

export function formatPercent(value) {
  const numeric = Number(value || 0);
  return `${numeric.toFixed(1)}%`;
}

export function formatDate(date) {
  if (!date) return '—';
  const value = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
  return value.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatFullDate(date) {
  if (!date) return '—';
  const value = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
  return value.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildUrl(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export async function downloadTransactionsCsv(params = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${buildUrl('/reports/transactions.csv', params)}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error('Unable to download report.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'finsight-transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
}
