import { useEffect, useMemo, useState } from 'react';
import { Pencil, Search, Trash2, Wallet } from 'lucide-react';
import { apiRequest, buildUrl, formatCurrency, formatDate, getUserErrorMessage, localDateInputValue } from '../services/api';

const defaultForm = {
  type: 'EXPENSE',
  amount: '',
  category: '',
  description: '',
  transactionDate: localDateInputValue(),
  notes: '',
  accountId: ''
};

export default function TransactionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', type: '', category: '', from: '', to: '', accountId: '', minAmount: '', maxAmount: '' });
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages: 1, totalElements: 0 });
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const loadAccounts = () => apiRequest('/accounts').then(result => setAccounts((result || []).filter(account => account.active))).catch(() => setAccounts([]));
    loadAccounts();
    window.addEventListener('finsight:accounts:refresh', loadAccounts);
    return () => window.removeEventListener('finsight:accounts:refresh', loadAccounts);
  }, []);

  useEffect(() => {
    apiRequest('/categories').then(result => setCategories(result || [])).catch(() => setCategories([]));
  }, []);

  async function loadTransactions(nextPage = page) {
    try {
      setLoading(true);
      const params = {
        page: nextPage,
        size: 8,
        search: filters.search,
        type: filters.type,
        category: filters.category,
        from: filters.from,
        to: filters.to,
        accountId: filters.accountId,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount
      };
      const response = await apiRequest(buildUrl('/transactions', params));
      setItems(response.content || []);
      setPageInfo({ totalPages: response.totalPages || 1, totalElements: response.totalElements || 0 });
      setError('');
    } catch (loadError) {
      setError(getUserErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions(page);
  }, [page, filters.search, filters.type, filters.category, filters.from, filters.to, filters.accountId, filters.minAmount, filters.maxAmount]);

  const categoryOptions = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))], [items]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        category: form.category.trim(),
        description: form.description.trim(),
        transactionDate: form.transactionDate,
        notes: form.notes.trim(),
        accountId: form.accountId ? Number(form.accountId) : null
      };

      if (editingId) {
        await apiRequest(`/transactions/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiRequest('/transactions', { method: 'POST', body: JSON.stringify(payload) });
      }

      window.dispatchEvent(new Event('finsight:dashboard:refresh'));
      setForm(defaultForm);
      setEditingId(null);
      await loadTransactions(page);
    } catch (submitError) {
      setError(getUserErrorMessage(submitError));
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      type: item.type,
      amount: String(item.amount),
      category: item.category,
      description: item.description,
      transactionDate: item.transactionDate,
      notes: item.notes || '',
      accountId: item.accountId ? String(item.accountId) : ''
    });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm('Delete this transaction? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
      window.dispatchEvent(new Event('finsight:dashboard:refresh'));
      await loadTransactions(page);
    } catch (deleteError) {
      setError(getUserErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  const cleared = () => {
    setFilters({ search: '', type: '', category: '', from: '', to: '', accountId: '', minAmount: '', maxAmount: '' });
    setPage(0);
  };

  return (
    <div className="page-stack">
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">TRANSACTION LOG</p>
            <h3>Manage transactions</h3>
          </div>
        </div>

        <form className="transaction-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>Type</span>
              <select value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value, category: '' }))}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </label>

            <label>
              <span>Amount</span>
              <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} required />
            </label>

            <label>
              <span>Category</span>
            <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} required>
              <option value="">Choose a category</option>
              {categories.filter(category => category.type === form.type).map(category => <option key={category.id} value={category.name}>{category.name}</option>)}
            </select>
            </label>

          <label>
            <span>Date</span>
              <input type="date" value={form.transactionDate} onChange={(event) => setForm((prev) => ({ ...prev, transactionDate: event.target.value }))} required />
            </label>
          </div>

          <label>
            <span>Description</span>
            <input type="text" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} required />
          </label>
          <label>
            <span>Account</span>
            <select value={form.accountId} onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))}>
              <option value="">Default account</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </label>

          <label>
            <span>Notes</span>
            <textarea rows="3" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>

          <div className="inline-actions">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Update transaction' : 'Add transaction'}
            </button>
            {editingId && (
              <button type="button" className="secondary-button small" onClick={() => { setEditingId(null); setForm(defaultForm); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel-card">
        <div className="panel-header space-between">
          <div>
            <p className="eyebrow">FILTERS</p>
            <h3>Search & narrow results</h3>
          </div>
          <button type="button" className="secondary-button small" onClick={cleared}>Clear</button>
        </div>

        <div className="filter-grid">
          <label className="search-field">
            <Search size={16} />
            <input type="text" value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search by description, category, or notes" />
          </label>

          <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}>
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>

          <select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}>
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select value={filters.accountId} onChange={(event) => setFilters((prev) => ({ ...prev, accountId: event.target.value }))}>
            <option value="">All accounts</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>

          <input type="number" min="0" step="0.01" value={filters.minAmount} onChange={(event) => setFilters((prev) => ({ ...prev, minAmount: event.target.value }))} placeholder="Min amount" aria-label="Minimum amount" />
          <input type="number" min="0" step="0.01" value={filters.maxAmount} onChange={(event) => setFilters((prev) => ({ ...prev, maxAmount: event.target.value }))} placeholder="Max amount" aria-label="Maximum amount" />

          <input type="date" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} />
          <input type="date" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} />
        </div>
      </section>

      {error && <div className="error-panel">{error}</div>}

      <section className="panel-card">
        <div className="panel-header space-between">
          <div>
            <p className="eyebrow">RESULTS</p>
            <h3>{pageInfo.totalElements} transactions</h3>
          </div>
        </div>

        {loading ? (
          <div className="loading-card">Loading transactions…</div>
        ) : items.length === 0 ? (
          <div className="empty-card">
            <Wallet size={22} />
            <h4>No transactions found</h4>
            <p>Try changing your filters or create a new transaction.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Account</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><span className={`pill ${item.type === 'INCOME' ? 'income' : 'expense'}`}>{item.type}</span></td>
                    <td>{item.description}</td>
                    <td>{item.category}</td>
                    <td>{item.accountName || '—'}</td>
                    <td>{formatDate(item.transactionDate)}</td>
                    <td className={item.type === 'INCOME' ? 'income-text' : 'expense-text'}>{item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount)}</td>
                    <td className="row-actions">
                      <button type="button" className="icon-button" onClick={() => startEdit(item)} aria-label="Edit transaction">
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="icon-button danger" onClick={() => handleDelete(item.id)} aria-label="Delete transaction" disabled={deletingId === item.id}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageInfo.totalPages > 1 && (
          <div className="pagination">
            <button type="button" onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={page === 0}>
              Previous
            </button>
            <span>Page {page + 1} of {pageInfo.totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(current + 1, pageInfo.totalPages - 1))} disabled={page >= pageInfo.totalPages - 1}>
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

