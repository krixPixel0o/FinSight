import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { apiRequest, formatCurrency, getUserErrorMessage } from '../services/api';

export default function InsightsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [anomalyReport, setAnomalyReport] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [recommendationError, setRecommendationError] = useState('');
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantConsent, setAssistantConsent] = useState(false);
  const [assistantReply, setAssistantReply] = useState(null);
  const [assistantError, setAssistantError] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [scenario, setScenario] = useState(null);
  const [scenarioError, setScenarioError] = useState('');
  const [scenarioForm, setScenarioForm] = useState({ type: 'REDUCE_CATEGORY_EXPENSE', category: '', percentage: '20', monthlyAmount: '', horizonMonths: '12' });
  const [scenarioSaving, setScenarioSaving] = useState(false);
  const [scoreError, setScoreError] = useState('');
  const [anomalyError, setAnomalyError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadInsights() {
      try {
        setLoading(true);
        const [dashboardResult, scoreResult, anomalyResult, forecastResult, recommendationsResult] = await Promise.allSettled([
          apiRequest('/dashboard/overview'),
          apiRequest('/intelligence/health-score'),
          apiRequest('/intelligence/anomalies'),
          apiRequest('/intelligence/forecast?months=6'),
          apiRequest('/intelligence/recommendations')
        ]);
        if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
        else throw dashboardResult.reason;
        if (scoreResult.status === 'fulfilled') {
          setHealthScore(scoreResult.value);
          setScoreError('');
        } else {
          setScoreError(getUserErrorMessage(scoreResult.reason));
        }
        if (anomalyResult.status === 'fulfilled') {
          setAnomalyReport(anomalyResult.value);
          setAnomalyError('');
        } else {
          setAnomalyError(getUserErrorMessage(anomalyResult.reason));
        }
        if (forecastResult.status === 'fulfilled') {
          setForecast(forecastResult.value);
          setForecastError('');
        } else {
          setForecastError(getUserErrorMessage(forecastResult.reason));
        }
        if (recommendationsResult.status === 'fulfilled') {
          setRecommendations(recommendationsResult.value);
          setRecommendationError('');
        } else {
          setRecommendationError(getUserErrorMessage(recommendationsResult.reason));
        }
        setError('');
      } catch (loadError) {
        setError(getUserErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, []);

  async function runScenario(event) {
    event.preventDefault();
    setScenarioSaving(true);
    setScenarioError('');
    const payload = {
      type: scenarioForm.type,
      horizonMonths: Number(scenarioForm.horizonMonths)
    };
    if (scenarioForm.type === 'REDUCE_CATEGORY_EXPENSE') {
      payload.category = scenarioForm.category;
      payload.percentage = Number(scenarioForm.percentage);
    } else if (scenarioForm.type === 'REDUCE_INCOME') {
      payload.percentage = Number(scenarioForm.percentage);
    } else {
      payload.monthlyAmount = Number(scenarioForm.monthlyAmount);
    }
    try {
      setScenario(await apiRequest('/intelligence/scenario', { method: 'POST', body: JSON.stringify(payload) }));
    } catch (requestError) {
      setScenarioError(getUserErrorMessage(requestError));
    } finally {
      setScenarioSaving(false);
    }
  }

  async function askAssistant(event) {
    event.preventDefault();
    if (!assistantQuestion.trim()) return;
    setAssistantLoading(true);
    setAssistantError('');
    try {
      const result = await apiRequest('/intelligence/assistant', {
        method: 'POST', body: JSON.stringify({ message: assistantQuestion.trim() })
      });
      setAssistantReply(result);
      setAssistantQuestion('');
      setAssistantConsent(false);
    } catch (requestError) {
      setAssistantError(getUserErrorMessage(requestError));
    } finally {
      setAssistantLoading(false);
    }
  }

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
                <strong>{formatCurrency(dashboard.currentBalance, dashboard.currency)}</strong>
              </div>
              <div>
                <small>Monthly spend</small>
                <strong>{formatCurrency(dashboard.monthlyExpenses, dashboard.currency)}</strong>
              </div>
              <div>
                <small>This month’s savings rate</small>
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

      <section className="panel-card health-score-card" aria-labelledby="recommendations-title">
        <div className="panel-header"><div><p className="eyebrow">EVIDENCE-BASED SUGGESTIONS</p><h3 id="recommendations-title">Recommendations</h3></div></div>
        {recommendationError ? <div className="error-panel">{recommendationError}</div> : !recommendations ? (
          <div className="loading-card">Reviewing recent activity…</div>
        ) : recommendations.recommendations?.length ? (
          <div className="anomaly-list">{recommendations.recommendations.map((item, index) => <article className="anomaly-item" key={`${item.type}-${index}`}>
            <div className="anomaly-item-heading"><strong>{item.title}</strong><span className="pill">{item.priority}</span></div>
            <p>{item.explanation}</p><small>{item.evidence}</small><p><strong>Consider:</strong> {item.suggestedAction}</p>
          </article>)}</div>
        ) : <div className="empty-card"><h4>No specific suggestions yet</h4><p>There are no matching signals in the analyzed records from {recommendations.periodStart} through {recommendations.periodEnd}.</p></div>}
        <small className="health-score-period">Suggestions are rule-based observations of recorded activity, not financial or investment advice.</small>
      </section>

      <section className="panel-card health-score-card" aria-labelledby="assistant-title">
        <div className="panel-header"><div><p className="eyebrow">PRIVATE, GROUNDED FINANCIAL Q&A</p><h3 id="assistant-title">Ask FinSight</h3></div></div>
        <p className="health-score-note">When enabled, your question and aggregate, read-only financial insights are sent to Google Gemini to prepare an answer. Google API data controls and retention apply. Do not include account credentials or other sensitive details. The backend does not save assistant conversations.</p>
        <form className="scenario-form" onSubmit={askAssistant}>
          <label><span>Your question</span><textarea required maxLength="2000" value={assistantQuestion} onChange={event => setAssistantQuestion(event.target.value)} placeholder="What changed in my recent spending?" rows="3" /></label>
          <label className="assistant-consent"><input type="checkbox" checked={assistantConsent} onChange={event => setAssistantConsent(event.target.checked)} /><span>I agree to send this question and my aggregate financial insights to Google Gemini if the assistant is enabled.</span></label>
          <button className="primary-button" type="submit" disabled={assistantLoading || !assistantQuestion.trim() || !assistantConsent}>{assistantLoading ? 'Preparing answer…' : 'Ask'}</button>
        </form>
        {assistantError && <div className="error-panel">{assistantError}</div>}
        {assistantReply && <article className="anomaly-item"><div className="anomaly-item-heading"><strong>{assistantReply.status === 'READY' ? 'FinSight assistant' : 'Assistant status'}</strong><span className="pill">{assistantReply.status}</span></div><p>{assistantReply.answer}</p></article>}
      </section>

      <section className="panel-card health-score-card" aria-labelledby="health-score-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">SIX COMPLETED MONTHS</p>
            <h3 id="health-score-title">Financial health score</h3>
          </div>
          {healthScore?.score != null && (
            <div className="health-score-total" aria-label={`Score ${healthScore.score} out of 100`}>
              <strong>{healthScore.score}</strong><span>/100</span>
              <small>{healthScore.rating?.replaceAll('_', ' ')}</small>
            </div>
          )}
        </div>
        {scoreError ? <div className="error-panel">{scoreError}</div> : !healthScore ? (
          <div className="loading-card">Calculating score…</div>
        ) : (
          <>
            {healthScore.status === 'INSUFFICIENT_DATA' && (
              <p className="health-score-note">Not enough transaction history for a reliable total score. Add activity across more months; current factor estimates are shown below.</p>
            )}
            {healthScore.status === 'PARTIAL' && (
              <p className="health-score-note">Partial score. Some financial dimensions are not modeled yet and are excluded from the total.</p>
            )}
            <div className="health-score-components">
              {Object.entries(healthScore.components || {}).map(([key, component]) => (
                <div className="health-score-component" key={key}>
                  <div className="health-score-component-heading">
                    <strong>{key.replaceAll(/([A-Z])/g, ' $1').replace(/^./, value => value.toUpperCase())}</strong>
                    <span>{component.score}/100 · weight {component.weight}%</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${component.score}%` }} /></div>
                  <p>{component.explanation}</p>
                  <small>{component.evidence}</small>
                </div>
              ))}
            </div>
            {!!healthScore.unavailableDimensions?.length && (
              <div className="health-score-note">
                <strong>Not included:</strong> {healthScore.unavailableDimensions.map(item => item.split(':')[0].replaceAll(/([A-Z])/g, ' $1').trim()).join(', ')}.
              </div>
            )}
            <small className="health-score-period">Based on {healthScore.periodStart} through {healthScore.periodEnd}; {healthScore.transactionsAnalyzed} income and expense entries analyzed.</small>
          </>
        )}
      </section>

      <section className="panel-card health-score-card" aria-labelledby="anomaly-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">CATEGORY HISTORY CHECK</p>
            <h3 id="anomaly-title">Unusual expenses</h3>
          </div>
          {anomalyReport && <span className="pill">{anomalyReport.anomalies?.length || 0} flagged</span>}
        </div>
        {anomalyError ? <div className="error-panel">{anomalyError}</div> : !anomalyReport ? (
          <div className="loading-card">Reviewing recent expenses…</div>
        ) : anomalyReport.status === 'INSUFFICIENT_HISTORY' ? (
          <div className="empty-card"><h4>Not enough history yet</h4><p>FinSight needs at least {anomalyReport.minimumBaselineTransactions} older expenses in a category before it can compare new charges.</p></div>
        ) : anomalyReport.anomalies?.length ? (
          <div className="anomaly-list">
            {anomalyReport.anomalies.map(item => (
              <article className="anomaly-item" key={item.transactionId}>
                <div className="anomaly-item-heading">
                  <div><strong>{item.description}</strong><small>{item.category} · {item.date}</small></div>
                  <strong>{formatCurrency(item.amount, item.currency)}</strong>
                </div>
                <p>{item.explanation}</p>
                <small>Category baseline: {formatCurrency(item.baselineAverage, item.currency)} average across {item.baselineTransactions} older expenses · signal strength {item.signalStrength}/100</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-card"><h4>{anomalyReport.historyLimited ? 'No signals detected in scanned records' : 'No unusual expenses detected'}</h4><p>Compared recent expenses with the same category’s prior 180-day baseline. This is a statistical signal, not a fraud determination.</p></div>
        )}
        {anomalyReport?.historyLimited && <p className="health-score-note">Recent history was capped for analysis; some older records may not have been included.</p>}
      </section>

      <section className="panel-card health-score-card" aria-labelledby="forecast-title">
        <div className="panel-header"><div><p className="eyebrow">HISTORICAL AVERAGES</p><h3 id="forecast-title">Cash-flow forecast</h3></div></div>
        {forecastError ? <div className="error-panel">{forecastError}</div> : !forecast ? (
          <div className="loading-card">Preparing forecast…</div>
        ) : (
          <>
            <p className="health-score-note">{forecast.method.replaceAll('_', ' ')} · {forecast.confidence} confidence · based on {forecast.monthsOfHistory} active months.</p>
            <div className="smart-summary">
              <div><small>Average monthly income</small><strong>{forecast.monthlyAverageIncome == null ? 'Insufficient data' : formatCurrency(forecast.monthlyAverageIncome, forecast.currency)}</strong></div>
              <div><small>Average monthly expenses</small><strong>{forecast.monthlyAverageExpenses == null ? 'Insufficient data' : formatCurrency(forecast.monthlyAverageExpenses, forecast.currency)}</strong></div>
              <div><small>Current combined balance</small><strong>{formatCurrency(forecast.currentBalance, forecast.currency)}</strong></div>
            </div>
            {forecast.projections?.length > 0 && <div className="forecast-projections">
              {forecast.projections.map(item => <div className="forecast-projection" key={item.month}>
                <strong>{item.month}</strong><span>Surplus {formatCurrency(item.projectedSurplus, forecast.currency)}</span><span>Estimated balance {formatCurrency(item.projectedEndingBalance, forecast.currency)}</span>
              </div>)}
            </div>}
            {forecast.budgetRunways?.length > 0 && <div className="anomaly-list"><strong>Active budget runway estimates</strong>{forecast.budgetRunways.map(item => <div className="forecast-projection" key={item.budgetId}>
              <strong>{item.category}</strong><span>Remaining {formatCurrency(item.remaining, forecast.currency)}</span><span>{item.estimatedMonthsToLimit == null ? item.status.replaceAll('_', ' ') : `At recent pace: ${item.estimatedMonthsToLimit} months to limit`}</span>
            </div>)}</div>}
            {forecast.goalProjections?.length > 0 && <div className="anomaly-list"><strong>Goal contribution estimates</strong>{forecast.goalProjections.map(item => <div className="forecast-projection" key={item.goalId}>
              <strong>{item.name}</strong><span>{item.estimatedCompletionMonth ? `Estimate ${item.estimatedCompletionMonth}` : item.status.replaceAll('_', ' ')}</span><span>{item.remainingAmount == null ? 'Currency mismatch' : `Remaining ${formatCurrency(item.remainingAmount, forecast.currency)} · planned ${formatCurrency(item.plannedMonthlyContribution, forecast.currency)}/month`}</span>
            </div>)}</div>}
            <ul className="forecast-assumptions">{[...(forecast.assumptions || []), ...(forecast.unavailableProjections || [])].map((item, index) => <li key={index}>{item}</li>)}</ul>
          </>
        )}
      </section>

      <section className="panel-card health-score-card" aria-labelledby="scenario-title">
        <div className="panel-header"><div><p className="eyebrow">DETERMINISTIC WHAT-IF</p><h3 id="scenario-title">Scenario analysis</h3></div></div>
        <form className="scenario-form" onSubmit={runScenario}>
          <label><span>Scenario</span><select value={scenarioForm.type} onChange={event => setScenarioForm({ ...scenarioForm, type: event.target.value })}>
            <option value="REDUCE_CATEGORY_EXPENSE">Reduce a category expense</option>
            <option value="REDUCE_INCOME">Reduce monthly income</option>
            <option value="ADD_MONTHLY_OUTFLOW">Add a monthly outflow</option>
          </select></label>
          {scenarioForm.type === 'REDUCE_CATEGORY_EXPENSE' && <label><span>Expense category</span><input required maxLength="80" value={scenarioForm.category} onChange={event => setScenarioForm({ ...scenarioForm, category: event.target.value })} placeholder="e.g. Food" /></label>}
          {scenarioForm.type === 'ADD_MONTHLY_OUTFLOW' ? <label><span>Additional monthly outflow</span><input required type="number" min="0.01" step="0.01" value={scenarioForm.monthlyAmount} onChange={event => setScenarioForm({ ...scenarioForm, monthlyAmount: event.target.value })} /></label> : <label><span>{scenarioForm.type === 'REDUCE_INCOME' ? 'Income decrease (%)' : 'Expense reduction (%)'}</span><input required type="number" min="0" max="100" step="0.1" value={scenarioForm.percentage} onChange={event => setScenarioForm({ ...scenarioForm, percentage: event.target.value })} /></label>}
          <label><span>Projection months</span><input required type="number" min="1" max="24" value={scenarioForm.horizonMonths} onChange={event => setScenarioForm({ ...scenarioForm, horizonMonths: event.target.value })} /></label>
          <button className="primary-button" type="submit" disabled={scenarioSaving}>{scenarioSaving ? 'Calculating…' : 'Calculate scenario'}</button>
        </form>
        {scenarioError && <div className="error-panel">{scenarioError}</div>}
        {scenario && (scenario.status === 'INSUFFICIENT_DATA' ? <p className="health-score-note">Not enough historical activity to calculate this scenario reliably.</p> : <div className="scenario-result">
          <div><small>Current monthly surplus</small><strong>{formatCurrency(scenario.baselineMonthlySurplus, scenario.currency)}</strong></div>
          <div><small>Scenario monthly surplus</small><strong>{formatCurrency(scenario.scenarioMonthlySurplus, scenario.currency)}</strong></div>
          <div><small>Projected cumulative change · {scenario.horizonMonths} months</small><strong>{formatCurrency(scenario.projectedCumulativeChange, scenario.currency)}</strong></div>
          {scenario.assumptions.map(item => <small key={item}>{item}</small>)}
        </div>)}
      </section>
    </div>
  );
}
