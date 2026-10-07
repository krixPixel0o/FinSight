import { useEffect, useState } from 'react';
import { apiRequest, formatCurrency, getUserErrorMessage } from '../services/api';

const emptyGoal = { name: '', targetAmount: '', currentAmount: '0', plannedMonthlyContribution: '0', targetDate: '', active: true };
const emptyLiability = { name: '', type: 'CREDIT_CARD', currentBalance: '', annualInterestRate: '0', monthlyPayment: '', asOfDate: new Date().toISOString().slice(0, 10), active: true };

export default function PlanningPage() {
  const [goals, setGoals] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [goalForm, setGoalForm] = useState(emptyGoal);
  const [liabilityForm, setLiabilityForm] = useState(emptyLiability);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingLiability, setEditingLiability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    const [goalRows, liabilityRows] = await Promise.all([apiRequest('/goals'), apiRequest('/liabilities')]);
    setGoals(goalRows);
    setLiabilities(liabilityRows);
  }
  useEffect(() => { load().catch(e => setError(getUserErrorMessage(e))).finally(() => setLoading(false)); }, []);

  async function submitGoal(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const body = { ...goalForm, name: goalForm.name.trim(), targetAmount: Number(goalForm.targetAmount), currentAmount: Number(goalForm.currentAmount), plannedMonthlyContribution: Number(goalForm.plannedMonthlyContribution), targetDate: goalForm.targetDate || null };
    try {
      await apiRequest(editingGoal ? `/goals/${editingGoal}` : '/goals', { method: editingGoal ? 'PUT' : 'POST', body: JSON.stringify(body) });
      setEditingGoal(null); setGoalForm(emptyGoal); await load(); setSuccess('Goal saved.');
    } catch (e) { setError(getUserErrorMessage(e)); } finally { setSaving(false); }
  }

  async function submitLiability(event) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    const body = { ...liabilityForm, name: liabilityForm.name.trim(), currentBalance: Number(liabilityForm.currentBalance), annualInterestRate: Number(liabilityForm.annualInterestRate), monthlyPayment: Number(liabilityForm.monthlyPayment) };
    try {
      await apiRequest(editingLiability ? `/liabilities/${editingLiability}` : '/liabilities', { method: editingLiability ? 'PUT' : 'POST', body: JSON.stringify(body) });
      setEditingLiability(null); setLiabilityForm({ ...emptyLiability, asOfDate: new Date().toISOString().slice(0, 10) }); await load(); setSuccess('Liability snapshot saved.');
    } catch (e) { setError(getUserErrorMessage(e)); } finally { setSaving(false); }
  }

  async function remove(path, label) {
    setError(''); setSuccess('');
    try { await apiRequest(path, { method: 'DELETE' }); await load(); setSuccess(`${label} removed.`); }
    catch (e) { setError(getUserErrorMessage(e)); }
  }

  function editGoal(item) {
    setEditingGoal(item.id);
    setGoalForm({ name: item.name, targetAmount: String(item.targetAmount), currentAmount: String(item.currentAmount), plannedMonthlyContribution: String(item.plannedMonthlyContribution), targetDate: item.targetDate || '', active: item.active });
  }
  function editLiability(item) {
    setEditingLiability(item.id);
    setLiabilityForm({ name: item.name, type: item.type, currentBalance: String(item.currentBalance), annualInterestRate: String(item.annualInterestRate), monthlyPayment: String(item.monthlyPayment), asOfDate: item.asOfDate, active: item.active });
  }

  return <div className="page-stack">
    {error && <div className="error-panel" role="alert">{error}</div>}{success && <div className="success-panel" role="status">{success}</div>}
    {loading ? <div className="loading-card">Loading goals and liabilities…</div> : <>
      <section className="panel-card health-score-card">
        <div className="panel-header"><div><p className="eyebrow">SAVING TARGETS</p><h3>Financial goals</h3></div></div>
        <p className="health-score-note">Enter the amount already saved and your target. These figures are self-reported and feed the explainable health score; FinSight does not verify that goal funds are held separately.</p>
        <div className="anomaly-list">{goals.length ? goals.map(item => <article className="anomaly-item" key={item.id}>
          <div className="anomaly-item-heading"><div><strong>{item.name}</strong><small>{item.scheduleStatus}{item.targetDate ? ` · target ${item.targetDate}` : ''}</small></div><strong>{formatCurrency(item.currentAmount, item.currency)} / {formatCurrency(item.targetAmount, item.currency)}</strong></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${item.progressPercent}%` }} /></div>
          <small>{item.progressPercent}% complete · {formatCurrency(item.remainingAmount, item.currency)} remaining</small>
          <div className="planning-actions"><button className="secondary-button" type="button" onClick={() => editGoal(item)}>Edit progress</button><button className="secondary-button" type="button" onClick={() => remove(`/goals/${item.id}`, 'Goal')}>Remove</button></div>
        </article>) : <div className="empty-card"><h4>No goals recorded</h4><p>Add a target to track its reported progress.</p></div>}</div>
        <form className="scenario-form" onSubmit={submitGoal}>
          <label><span>Goal name</span><input required maxLength="100" value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="Emergency fund" /></label>
          <label><span>Target amount</span><input required type="number" min="0.01" step="0.01" value={goalForm.targetAmount} onChange={e => setGoalForm({ ...goalForm, targetAmount: e.target.value })} /></label>
          <label><span>Amount currently saved</span><input required type="number" min="0" step="0.01" value={goalForm.currentAmount} onChange={e => setGoalForm({ ...goalForm, currentAmount: e.target.value })} /></label>
          <label><span>Planned monthly contribution</span><input required type="number" min="0" step="0.01" value={goalForm.plannedMonthlyContribution} onChange={e => setGoalForm({ ...goalForm, plannedMonthlyContribution: e.target.value })} /></label>
          <label><span>Target date (optional)</span><input type="date" value={goalForm.targetDate} onChange={e => setGoalForm({ ...goalForm, targetDate: e.target.value })} /></label>
          <label className="assistant-consent"><input type="checkbox" checked={goalForm.active} onChange={e => setGoalForm({ ...goalForm, active: e.target.checked })} /><span>Include this goal in active progress</span></label>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editingGoal ? 'Update goal' : 'Add goal'}</button>
          {editingGoal && <button className="secondary-button" type="button" onClick={() => { setEditingGoal(null); setGoalForm(emptyGoal); }}>Cancel edit</button>}
        </form>
      </section>

      <section className="panel-card health-score-card">
        <div className="panel-header"><div><p className="eyebrow">USER-REPORTED SNAPSHOTS</p><h3>Liabilities</h3></div></div>
        <p className="health-score-note">Balances, rates, and payments are manually entered. Payoff timing assumes a fixed rate and payment with no new charges, fees, or rate changes. Keep the as-of date current.</p>
        <div className="anomaly-list">{liabilities.length ? liabilities.map(item => <article className="anomaly-item" key={item.id}>
          <div className="anomaly-item-heading"><div><strong>{item.name}</strong><small>{item.type.replaceAll('_', ' ')} · {item.active ? 'ACTIVE' : 'INACTIVE'} · as of {item.asOfDate}</small></div><strong>{formatCurrency(item.currentBalance, item.currency)}</strong></div>
          <small>APR {item.annualInterestRate}% · monthly payment {formatCurrency(item.monthlyPayment, item.currency)} · {item.estimatedMonthsToPayoff == null ? item.payoffStatus.replaceAll('_', ' ') : `estimated payoff in ${item.estimatedMonthsToPayoff} months`}</small>
          <div className="planning-actions"><button className="secondary-button" type="button" onClick={() => editLiability(item)}>Update snapshot</button><button className="secondary-button" type="button" onClick={() => remove(`/liabilities/${item.id}`, 'Liability')}>Remove</button></div>
        </article>) : <div className="empty-card"><h4>No liabilities recorded</h4><p>Add a loan or credit balance to include payment burden in the health score.</p></div>}</div>
        <form className="scenario-form" onSubmit={submitLiability}>
          <label><span>Name</span><input required maxLength="100" value={liabilityForm.name} onChange={e => setLiabilityForm({ ...liabilityForm, name: e.target.value })} placeholder="Credit card" /></label>
          <label><span>Type</span><select value={liabilityForm.type} onChange={e => setLiabilityForm({ ...liabilityForm, type: e.target.value })}>{['CREDIT_CARD', 'PERSONAL_LOAN', 'HOME_LOAN', 'AUTO_LOAN', 'STUDENT_LOAN', 'OTHER'].map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
          <label><span>Current balance</span><input required type="number" min="0" step="0.01" value={liabilityForm.currentBalance} onChange={e => setLiabilityForm({ ...liabilityForm, currentBalance: e.target.value })} /></label>
          <label><span>Annual interest rate (%)</span><input required type="number" min="0" max="100" step="0.0001" value={liabilityForm.annualInterestRate} onChange={e => setLiabilityForm({ ...liabilityForm, annualInterestRate: e.target.value })} /></label>
          <label><span>Required monthly payment</span><input required type="number" min="0" step="0.01" value={liabilityForm.monthlyPayment} onChange={e => setLiabilityForm({ ...liabilityForm, monthlyPayment: e.target.value })} /></label>
          <label><span>Balance as of</span><input required type="date" max={new Date().toISOString().slice(0, 10)} value={liabilityForm.asOfDate} onChange={e => setLiabilityForm({ ...liabilityForm, asOfDate: e.target.value })} /></label>
          <label className="assistant-consent"><input type="checkbox" checked={liabilityForm.active} onChange={e => setLiabilityForm({ ...liabilityForm, active: e.target.checked })} /><span>Include this liability in active totals and score</span></label>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editingLiability ? 'Update liability' : 'Add liability'}</button>
          {editingLiability && <button className="secondary-button" type="button" onClick={() => { setEditingLiability(null); setLiabilityForm(emptyLiability); }}>Cancel edit</button>}
        </form>
      </section>
    </>}
  </div>;
}
