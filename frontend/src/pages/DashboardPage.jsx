import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react';
import { apiRequest, formatCompactCurrency, formatCurrency, formatDate, formatPercent, getUserErrorMessage, localDateInputValue } from '../services/api';

const emptyState = {
  currency: 'INR',
  currentBalance: 0,
  totalIncome: 0,
  totalExpenses: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  netCashFlow: 0,
  savingsRate: 0,
  categorySpending: {},
  monthlySpending: {},
  recentTransactions: [],
  insights: []
};

export default function DashboardPage() {
  const [data, setData] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transactionForm, setTransactionForm] = useState({
    type: 'EXPENSE',
    amount: '',
    category: '',
    description: '',
    transactionDate: localDateInputValue(),
    accountId: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [referenceDataError, setReferenceDataError] = useState('');
  const [referenceDataLoading, setReferenceDataLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);
      const result = await apiRequest('/dashboard/overview');
      setData(result || emptyState);
      setError('');
    } catch (loadError) {
      setError(getUserErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadReferenceData() {
    setReferenceDataLoading(true);
    const [categoryResult, accountResult] = await Promise.allSettled([
      apiRequest('/categories'),
      apiRequest('/accounts')
    ]);

    setCategories(categoryResult.status === 'fulfilled' ? categoryResult.value || [] : []);
    setAccounts(accountResult.status === 'fulfilled'
      ? (accountResult.value || []).filter((account) => account.active)
      : []);
    const unavailable = [];
    if (categoryResult.status === 'rejected') unavailable.push('categories');
    if (accountResult.status === 'rejected') unavailable.push('accounts');
    setReferenceDataError(unavailable.length
      ? `Could not load ${unavailable.join(' and ')}. Retry to enable quick entry.`
      : '');
    setReferenceDataLoading(false);
  }

  useEffect(() => {
    loadDashboard();
    loadReferenceData();
    const refreshListener = () => {
      loadDashboard();
      loadReferenceData();
    };
    window.addEventListener('finsight:dashboard:refresh', refreshListener);
    return () => window.removeEventListener('finsight:dashboard:refresh', refreshListener);
  }, []);

  async function handleAddTransaction(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...transactionForm,
          amount: Number(transactionForm.amount),
          category: transactionForm.category.trim(),
          accountId: transactionForm.accountId ? Number(transactionForm.accountId) : null,
          description: transactionForm.description.trim(),
          notes: transactionForm.notes.trim()
        })
      });
      setTransactionForm({
        type: 'EXPENSE',
        amount: '',
        category: '',
        description: '',
        transactionDate: localDateInputValue(),
        accountId: '',
        notes: ''
      });
      window.dispatchEvent(new Event('finsight:dashboard:refresh'));
      setError('');
    } catch (addError) {
      setError(getUserErrorMessage(addError));
    } finally {
      setIsSaving(false);
    }
  }

  const topCategories = useMemo(() => Object.entries(data.categorySpending || {}).slice(0, 5), [data.categorySpending]);
  const monthlyChartData = useMemo(() => Object.entries(data.monthlySpending || {}), [data.monthlySpending]);
  const totalSpend = Number(data.monthlyExpenses || 0);
  const maxMonthlySpend = Math.max(...monthlyChartData.map(([, amount]) => Number(amount || 0)), 0);
  const availableCategories = categories.filter((category) => category.type === transactionForm.type);
  const canQuickEnter = !referenceDataLoading && !referenceDataError && availableCategories.length > 0 && accounts.length > 0;

  if (loading) {
    return <div className="loading-card">Loading your financial overview…</div>;
  }

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <article className="metric-card accent-card">
          <div className="metric-header">
            <span>Current Balance</span>
            <Wallet size={18} />
          </div>
          <strong>{formatCurrency(data.currentBalance, data.currency)}</strong>
          <small>This month’s savings rate {formatPercent(data.savingsRate)}</small>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span>Total Income</span>
            <ArrowDownLeft size={18} />
          </div>
          <strong>{formatCurrency(data.totalIncome, data.currency)}</strong>
          <small>All-time inflow</small>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span>Total Expenses</span>
            <ArrowUpRight size={18} />
          </div>
          <strong>{formatCurrency(data.totalExpenses, data.currency)}</strong>
          <small>All-time outflow</small>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span>This Month's Spending</span>
            <TrendingUp size={18} />
          </div>
          <strong>{formatCurrency(data.monthlyExpenses, data.currency)}</strong>
          <small>Net cash flow this month {formatCurrency(data.netCashFlow, data.currency)}</small>
        </article>
      </section>

      {error && <div className="error-panel">{error}</div>}

      <section className="content-grid two-column">
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">SPENDING SIGNAL</p>
              <h3>Spending trend</h3>
            </div>
          </div>

          <div className="mini-chart" aria-label="Spending trend chart">
            {monthlyChartData.length === 0 ? (
              <div className="empty-card small">
                <p>No monthly data yet.</p>
              </div>
            ) : (
              monthlyChartData.map(([label, value], index) => {
                const numericValue = Number(value || 0);
                return (
                  <div key={`${label}-${index}`} className="chart-bar-wrap">
                    <div
                      className="chart-bar"
                      role="img"
                      aria-label={`${label}: ${formatCurrency(numericValue, data.currency)} spent`}
                      title={`${label}: ${formatCurrency(numericValue, data.currency)}`}
                      style={{ height: maxMonthlySpend === 0 ? '0%' : `${numericValue === 0 ? 0 : Math.max(2, (numericValue / maxMonthlySpend) * 100)}%` }}
                    />
                  </div>
                );
              })
            )}
          </div>
          <div className="chart-labels" aria-hidden="true">
            {monthlyChartData.map(([label, value]) => (
              <span key={label} title={`${label}: ${formatCurrency(value, data.currency)}`}>
                <strong>{formatCompactCurrency(value, data.currency)}</strong>
                <small>{label}</small>
              </span>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">CATEGORY BREAKDOWN</p>
              <h3>Category spending</h3>
            </div>
          </div>

          {topCategories.length === 0 ? (
            <div className="empty-card small">
              <p>No spending data yet.</p>
            </div>
          ) : (
            <div className="category-list">
              {topCategories.map(([category, amount]) => {
                const percent = totalSpend ? (Number(amount) / totalSpend) * 100 : 0;
                return (
                  <div key={category} className="category-stat">
                    <div className="category-row-top">
                      <span>{category}</span>
                      <strong>{formatCurrency(amount, data.currency)}</strong>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${Math.min(100, percent)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="content-grid two-column lower-row">
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">RECENT ACTIVITY</p>
              <h3>Recent transactions</h3>
            </div>
          </div>

          {(data.recentTransactions || []).length === 0 ? (
            <div className="empty-card">
              <Activity size={22} />
              <h4>No transactions yet</h4>
              <p>Add your first transaction to start seeing your financial picture.</p>
            </div>
          ) : (
            <div className="transaction-list compact">
              {data.recentTransactions.map((item) => (
                <div key={item.id} className="transaction-row">
                  <div className={`transaction-icon ${item.type === 'INCOME' ? 'income' : 'expense'}`}>
                    {item.type === 'INCOME' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="transaction-meta">
                    <strong>{item.description}</strong>
                    <small>
                      {item.category} • {formatDate(item.transactionDate)}
                    </small>
                  </div>
                  <div className={`transaction-amount ${item.type === 'INCOME' ? 'income' : 'expense'}`}>
                    {item.type === 'INCOME' ? '+' : '-'}
                    {formatCurrency(item.amount, data.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">SMART INSIGHTS</p>
              <h3>Financial insights</h3>
            </div>
          </div>

          {(data.insights || []).length === 0 ? (
            <div className="empty-card small">
              <p>Add a few transactions to unlock personalized insights.</p>
            </div>
          ) : (
            <div className="insights-list">
              {data.insights.map((insight, index) => (
                <div key={index} className="insight-item">
                  <span>{index + 1}</span>
                  <p>{insight}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel-card quick-entry">
        <div className="panel-header">
          <div>
            <p className="eyebrow">QUICK ENTRY</p>
            <h3>Add a transaction</h3>
          </div>
        </div>

        {referenceDataError && (
          <div className="error-panel" role="alert">
            {referenceDataError}{' '}
            <button type="button" className="secondary-button small" onClick={loadReferenceData}>
              Retry
            </button>
          </div>
        )}
        {!referenceDataLoading && !referenceDataError && accounts.length === 0 && (
          <div className="empty-card small">
            <p>Create an active account before adding transactions. <Link to="/app/accounts">Manage accounts</Link></p>
          </div>
        )}
        {!referenceDataLoading && !referenceDataError && availableCategories.length === 0 && (
          <div className="empty-card small">
            <p>Create a {transactionForm.type.toLowerCase()} category before adding this transaction. <Link to="/app/categories">Manage categories</Link></p>
          </div>
        )}

        <form className="transaction-form" onSubmit={handleAddTransaction}>
          <div className="form-grid">
            <label>
              <span>Type</span>
              <select value={transactionForm.type} onChange={(event) => setTransactionForm((prev) => ({ ...prev, type: event.target.value, category: '' }))}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </label>

            <label>
              <span>Amount</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={transactionForm.amount}
                onChange={(event) => setTransactionForm((prev) => ({ ...prev, amount: event.target.value }))}
                required
              />
            </label>

            <label>
              <span>Category</span>
              <select value={transactionForm.category} onChange={(event) => setTransactionForm((prev) => ({ ...prev, category: event.target.value }))} required disabled={!availableCategories.length}>
                <option value="">Choose a category</option>
                {availableCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
            </label>

            <label>
              <span>Date</span>
              <input
                type="date"
                value={transactionForm.transactionDate}
                onChange={(event) => setTransactionForm((prev) => ({ ...prev, transactionDate: event.target.value }))}
                required
              />
            </label>
          </div>

          <label>
            <span>Account</span>
            <select value={transactionForm.accountId} onChange={(event) => setTransactionForm((prev) => ({ ...prev, accountId: event.target.value }))} disabled={!accounts.length}>
              <option value="">Default account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>

          <label>
            <span>Description</span>
            <input
              type="text"
              value={transactionForm.description}
              onChange={(event) => setTransactionForm((prev) => ({ ...prev, description: event.target.value }))}
              required
            />
          </label>

          <label>
            <span>Notes</span>
            <textarea rows="3" value={transactionForm.notes} onChange={(event) => setTransactionForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          <div className="inline-actions">
            <button type="submit" className="primary-button" disabled={isSaving || !canQuickEnter}>
              {isSaving ? 'Saving...' : referenceDataLoading ? 'Loading…' : 'Add transaction'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
