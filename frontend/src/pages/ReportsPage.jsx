import { useEffect, useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import { apiRequest, buildUrl, downloadTransactionsCsv, formatCurrency, formatPercent, getUserErrorMessage, localDateInputValue } from '../services/api';

function firstDayOfPreviousElevenMonths() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 11);
  return localDateInputValue(date);
}

export default function ReportsPage() {
  const [range, setRange] = useState({ from: firstDayOfPreviousElevenMonths(), to: localDateInputValue() });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      if (range.from && range.to && range.from > range.to) {
        setError('Start date cannot be after end date.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await apiRequest(buildUrl('/reports/summary', range));
        if (!cancelled) {
          setReport(result);
          setError('');
        }
      } catch (loadError) {
        if (!cancelled) setError(getUserErrorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => { cancelled = true; };
  }, [range]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadTransactionsCsv(range);
      setError('');
    } catch (downloadError) {
      setError(getUserErrorMessage(downloadError));
    } finally {
      setDownloading(false);
    }
  }

  const categoryExpenses = Object.entries(report?.categoryExpenses || {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  const monthlyExpenses = Object.entries(report?.monthlyExpenses || {});

  return (
    <div className="page-stack">
      {error && <div className="error-panel" role="alert">{error}</div>}

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">FINANCIAL OVERVIEW</p>
            <h3>Reports</h3>
          </div>
          <button className="secondary-button" type="button" onClick={handleDownload} disabled={downloading}>
            <Download size={16} /> {downloading ? 'Preparing…' : 'Download CSV'}
          </button>
        </div>

        <div className="filter-grid">
          <label>
            <span>From</span>
            <input type="date" value={range.from} max={range.to || undefined} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={range.to} min={range.from || undefined} max={localDateInputValue()} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} />
          </label>
        </div>
      </section>

      {loading ? <div className="loading-card">Loading your report…</div> : report && (
        <>
          <section className="stats-grid">
            <article className="metric-card"><div className="metric-header"><span>Income</span></div><strong>{formatCurrency(report.income)}</strong></article>
            <article className="metric-card"><div className="metric-header"><span>Expenses</span></div><strong>{formatCurrency(report.expenses)}</strong></article>
            <article className="metric-card"><div className="metric-header"><span>Net cash flow</span></div><strong>{formatCurrency(report.netCashFlow)}</strong></article>
            <article className="metric-card"><div className="metric-header"><span>Savings rate</span></div><strong>{formatPercent(report.savingsRate)}</strong><small>{report.transactionCount} transactions</small></article>
          </section>

          <section className="content-grid two-column">
            <div className="panel-card">
              <div className="panel-header"><div><p className="eyebrow">MONTHLY TREND</p><h3>Expenses by month</h3></div></div>
              {monthlyExpenses.length ? <div className="category-list">
                {monthlyExpenses.map(([month, amount]) => <div className="category-stat" key={month}>
                  <div className="category-row-top"><span>{month}</span><strong>{formatCurrency(amount)}</strong></div>
                </div>)}
              </div> : <div className="empty-card small"><FileBarChart size={20} /><p>No expenses in this date range.</p></div>}
            </div>
            <div className="panel-card">
              <div className="panel-header"><div><p className="eyebrow">SPENDING BREAKDOWN</p><h3>Expenses by category</h3></div></div>
              {categoryExpenses.length ? <div className="category-list">
                {categoryExpenses.map(([category, amount]) => <div className="category-stat" key={category}>
                  <div className="category-row-top"><span>{category}</span><strong>{formatCurrency(amount)}</strong></div>
                </div>)}
              </div> : <div className="empty-card small"><p>No category spending in this date range.</p></div>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
