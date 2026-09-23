import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { apiRequest, formatCurrency, getUserErrorMessage } from '../services/api';

export default function InsightsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadInsights() {
      try {
        setLoading(true);
        const result = await apiRequest('/dashboard/overview');
        setDashboard(result);
        setError('');
      } catch (loadError) {
        setError(getUserErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, []);

  return (
    <div className="page-stack">
      {error && <div className="error-panel">{error}</div>}

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <p className="eyebrow">FINANCIAL INTELLIGENCE</p>
            <h3>Actionable insights</h3>
          </div>
        </div>

        {loading ? (
          <div className="loading-card">Generating insights…</div>
        ) : !dashboard || !dashboard.insights?.length ? (
          <div className="empty-card">
            <Lightbulb size={22} />
            <h4>No insights yet</h4>
            <p>Add a few transactions to unlock personalized intelligence.</p>
          </div>
        ) : (
          <div className="insights-panel">
            <div className="smart-summary">
              <div>
                <small>Current balance</small>
                <strong>{formatCurrency(dashboard.currentBalance)}</strong>
              </div>
              <div>
                <small>Monthly spend</small>
                <strong>{formatCurrency(dashboard.monthlyExpenses)}</strong>
              </div>
              <div>
                <small>Savings rate</small>
                <strong>{dashboard.savingsRate?.toFixed?.(1) || '0.0'}%</strong>
              </div>
            </div>

            <div className="insights-list">
              {dashboard.insights.map((insight, index) => (
                <div key={index} className="insight-item">
                  <span>{index + 1}</span>
                  <p>{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
