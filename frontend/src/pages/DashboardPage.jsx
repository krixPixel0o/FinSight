import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react';
import { apiRequest, formatCurrency, formatDate, formatPercent, getUserErrorMessage, localDateInputValue } from '../services/api';

const emptyState = {
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

  useEffect(() => {
    loadDashboard();
    Promise.all([apiRequest('/categories'), apiRequest('/accounts')])
      .then(([categoryList, accountList]) => {
        setCategories(categoryList || []);
        setAccounts((accountList || []).filter((account) => account.active));
      })
      .catch(() => { setCategories([]); setAccounts([]); });
    const refreshListener = () => loadDashboard();
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
    } catch (addError) {
      setError(getUserErrorMessage(addError));
    } finally {
      setIsSaving(false);
    }
  }

  const topCategories = useMemo(() => Object.entries(data.categorySpending || {}).slice(0, 5), [data.categorySpending]);
  const monthlyChartData = useMemo(() => Object.entries(data.monthlySpending || {}), [data.monthlySpending]);
  const totalSpend = Number(data.monthlyExpenses || 0);

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
          <strong>{formatCurrency(data.currentBalance)}</strong>
          <small>Savings rate {formatPercent(data.savingsRate)}</small>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span>Total Income</span>
            <ArrowDownLeft size={18} />
          </div>
          <strong>{formatCurrency(data.totalIncome)}</strong>
          <small>All-time inflow</small>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span>Total Expenses</span>
            <ArrowUpRight size={18} />
          </div>
          <strong>{formatCurrency(data.totalExpenses)}</strong>
          <small>All-time outflow</small>
        </article>

        <article className="metric-card">
          <div className="metric-header">
            <span>This Month's Spending</span>
            <TrendingUp size={18} />
          </div>
          <strong>{formatCurrency(data.monthlyExpenses)}</strong>
          <small>Net cash flow {formatCurrency(data.netCashFlow)}</small>
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
                const maxValue = Math.max(...monthlyChartData.map(([, amount]) => Number(amount || 0)), 1);
                return (
                  <div key={`${label}-${index}`} className="chart-bar-wrap">
                    <div className="chart-bar" style={{ height: `${Math.max(8, (numericValue / maxValue) * 100)}%` }} />
                  </div>
                );
              })
            )}
          </div>
          <div className="chart-labels">
            {monthlyChartData.map(([label]) => (
              <span key={label}>{label}</span>
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
                      <strong>{formatCurrency(amount)}</strong>
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
                    {formatCurrency(item.amount)}
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
              <select value={transactionForm.category} onChange={(event) => setTransactionForm((prev) => ({ ...prev, category: event.target.value }))} required>
                <option value="">Choose a category</option>
                {categories.filter((category) => category.type === transactionForm.type).map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
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
            <select value={transactionForm.accountId} onChange={(event) => setTransactionForm((prev) => ({ ...prev, accountId: event.target.value }))}>
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
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Add transaction'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
