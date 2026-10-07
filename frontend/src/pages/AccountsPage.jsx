import { useEffect, useState } from 'react';
import { Landmark, Pencil, Trash2, Wallet } from 'lucide-react';
import { apiRequest, getUserErrorMessage } from '../services/api';

const blank = () => ({ name: '', type: 'BANK', currency: localStorage.getItem('finsight_currency') || 'INR', openingBalance: '0', active: true });

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadAccounts() {
    try { setLoading(true); setAccounts((await apiRequest('/accounts')) || []); setError(''); }
    catch (e) { setError(getUserErrorMessage(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadAccounts(); }, []);

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try {
      const body = { ...form, name: form.name.trim(), currency: form.currency.trim().toUpperCase(), openingBalance: Number(form.openingBalance) };
      await apiRequest(editingId ? `/accounts/${editingId}` : '/accounts', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(body) });
      setForm(blank()); setEditingId(null); setSuccess(editingId ? 'Account updated.' : 'Account created.');
      window.dispatchEvent(new Event('finsight:accounts:refresh'));
      await loadAccounts();
    } catch (e) { setError(getUserErrorMessage(e)); }
    finally { setSaving(false); }
  }
  function edit(account) {
    setEditingId(account.id);
    setForm({ name: account.name, type: account.type, currency: account.currency, openingBalance: String(account.openingBalance), active: account.active });
    setSuccess('');
  }
  async function remove(account) {
    if (!window.confirm(`Delete “${account.name}”? Accounts with transaction history cannot be deleted.`)) return;
    setError(''); setSuccess('');
    try { await apiRequest(`/accounts/${account.id}`, { method: 'DELETE' }); setSuccess('Account deleted.'); window.dispatchEvent(new Event('finsight:accounts:refresh')); await loadAccounts(); }
    catch (e) { setError(getUserErrorMessage(e)); }
  }

  return <div className="page-stack">
    <section className="panel-card">
      <div className="panel-header"><div><p className="eyebrow">ACCOUNT MANAGEMENT</p><h3>{editingId ? 'Edit account' : 'Add an account'}</h3></div></div>
      <form className="transaction-form" onSubmit={submit}>
        <div className="form-grid">
          <label><span>Name</span><input value={form.name} maxLength="80" required minLength="2" onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main savings" /></label>
          <label><span>Type</span><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="SAVINGS">Savings</option><option value="CURRENT">Current</option><option value="BANK">Bank</option><option value="CASH">Cash</option><option value="CREDIT_CARD">Credit card</option><option value="WALLET">Wallet</option><option value="INVESTMENT">Investment</option><option value="OTHER">Other</option></select></label>
          <label><span>Opening balance</span><input type="number" min="0" step="0.01" required value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} /></label>
          <label><span>Currency (profile-wide)</span><input value={form.currency} maxLength="3" minLength="3" pattern="[A-Za-z]{3}" required readOnly /><small>All accounts use your preferred currency.</small></label>
        </div>
        <label className="checkbox-label"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Available for transactions</label>
        <div className="inline-actions"><button className="primary-button" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create account'}</button>{editingId && <button type="button" className="secondary-button small" onClick={() => { setEditingId(null); setForm(blank()); }}>Cancel</button>}</div>
      </form>
      {success && <div className="success-panel" role="status">{success}</div>}{error && <div className="error-panel" role="alert">{error}</div>}
    </section>
    <section className="panel-card"><div className="panel-header"><div><p className="eyebrow">YOUR MONEY</p><h3>Accounts</h3></div></div>
      {loading ? <div className="loading-card">Loading accounts…</div> : accounts.length === 0 ? <div className="empty-card"><Wallet size={22}/><h4>No accounts yet</h4><p>Create an account to organize your transactions.</p></div> : <div className="budget-grid">{accounts.map(a => <article className="budget-card" key={a.id}><div className="budget-header"><div><span className="eyebrow"><Landmark size={14}/> {a.type.replace('_', ' ')}</span><h4>{a.name}</h4></div><span className={`pill ${a.active ? 'income' : ''}`}>{a.active ? 'Active' : 'Inactive'}</span></div><strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: a.currency }).format(Number(a.currentBalance ?? a.openingBalance ?? 0))}</strong><div className="inline-actions"><button className="secondary-button small" onClick={() => edit(a)}><Pencil size={15}/> Edit</button><button className="icon-button danger" onClick={() => remove(a)} aria-label={`Delete ${a.name}`}><Trash2 size={16}/></button></div></article>)}</div>}
    </section>
  </div>;
}

