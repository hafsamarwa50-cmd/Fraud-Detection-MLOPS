import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  CircleHelp,
  Clock3,
  Database,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "./Dashboard.css";

const API_URL = "http://127.0.0.1:8000";
const MAX_HISTORY = 20;

const initialForm = {
  step: 1,
  type: "TRANSFER",
  amount: 181,
  oldbalanceOrg: 181,
  newbalanceOrig: 0,
  oldbalanceDest: 0,
  newbalanceDest: 0,
};

const fields = [
  { name: "step", label: "Transaction step", min: 1 },
  { name: "amount", label: "Transaction amount", min: 0, step: "any" },
  { name: "oldbalanceOrg", label: "Sender balance before", min: 0, step: "any" },
  { name: "newbalanceOrig", label: "Sender balance after", min: 0, step: "any" },
  { name: "oldbalanceDest", label: "Recipient balance before", min: 0, step: "any" },
  { name: "newbalanceDest", label: "Recipient balance after", min: 0, step: "any" },
];

const modelMetrics = [
  { label: "Precision", value: 0.92 },
  { label: "Recall", value: 0.65 },
  { label: "F1-score", value: 0.76 },
  { label: "Average precision", value: 0.7913 },
  { label: "ROC-AUC", value: 0.9893 },
];

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function RiskTrendChart({ history }) {
  const chronological = [...history].reverse();
  const points = chronological.map((item, index) => {
    const x = chronological.length === 1 ? 170 : 30 + (index / (chronological.length - 1)) * 280;
    const y = 108 - item.fraud_probability * 88;
    return { x, y, item };
  });
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = points.length
    ? `M ${points[0].x} 108 L ${points.map(({ x, y }) => `${x} ${y}`).join(" L ")} L ${points.at(-1).x} 108 Z`
    : "";

  return (
    <section className="surface chart-panel" aria-labelledby="risk-chart-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SESSION SIGNAL</p>
          <h2 id="risk-chart-title">Fraud probability trend</h2>
        </div>
        <span className="scope-label"><Activity size={14} /> This session</span>
      </div>
      <div className="chart-wrap">
        <svg className="risk-chart" viewBox="0 0 340 132" role="img" aria-label="Fraud probability for predictions in this session">
          {[20, 64, 108].map((y) => (
            <line key={y} x1="30" x2="320" y1={y} y2={y} className="chart-gridline" />
          ))}
          <text x="0" y="24" className="chart-axis-label">100%</text>
          <text x="7" y="68" className="chart-axis-label">50%</text>
          <text x="17" y="112" className="chart-axis-label">0%</text>
          {points.length > 0 && <path d={area} className="chart-area" />}
          {points.length > 1 && <polyline points={line} className="chart-line" />}
          {points.map(({ x, y, item }) => (
            <circle key={item.id} cx={x} cy={y} r="4" className="chart-point">
              <title>{formatPercent(item.fraud_probability)} · {item.time}</title>
            </circle>
          ))}
        </svg>
        {history.length === 0 && (
          <div className="chart-empty">Run a prediction to see session risk scores.</div>
        )}
      </div>
      <div className="chart-footnote">
        <span>0%</span><span>Each point is a returned model probability</span><span>100%</span>
      </div>
    </section>
  );
}

function OutcomeChart({ history }) {
  const fraudCount = history.filter((item) => item.prediction === 1).length;
  const legitimateCount = history.length - fraudCount;
  const maxCount = Math.max(fraudCount, legitimateCount, 1);

  return (
    <section className="surface chart-panel outcome-panel" aria-labelledby="outcome-chart-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MODEL OUTPUTS</p>
          <h2 id="outcome-chart-title">Session classifications</h2>
        </div>
        <span className="scope-label"><Database size={14} /> {history.length} total</span>
      </div>
      <div className="outcome-chart">
        <div className="outcome-row">
          <div className="outcome-label"><span className="legend-dot fraud-dot" />Fraud</div>
          <div className="outcome-track"><span className="outcome-fill fraud-fill" style={{ width: `${(fraudCount / maxCount) * 100}%` }} /></div>
          <strong>{fraudCount}</strong>
        </div>
        <div className="outcome-row">
          <div className="outcome-label"><span className="legend-dot clear-dot" />Legitimate</div>
          <div className="outcome-track"><span className="outcome-fill clear-fill" style={{ width: `${(legitimateCount / maxCount) * 100}%` }} /></div>
          <strong>{legitimateCount}</strong>
        </div>
      </div>
      <p className="chart-caption">Counts include only predictions made in this browser session.</p>
    </section>
  );
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [latestTransaction, setLatestTransaction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");

  async function checkApi() {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setApiStatus(response.ok && data.status === "healthy" && data.model_loaded ? "online" : "offline");
    } catch {
      setApiStatus("offline");
    }
  }

  useEffect(() => {
    checkApi();
    const interval = window.setInterval(checkApi, 30000);
    return () => window.clearInterval(interval);
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const payload = {
      ...form,
      step: Number(form.step),
      amount: Number(form.amount),
      oldbalanceOrg: Number(form.oldbalanceOrg),
      newbalanceOrig: Number(form.newbalanceOrig),
      oldbalanceDest: Number(form.oldbalanceDest),
      newbalanceDest: Number(form.newbalanceDest),
    };

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Prediction request failed.");
      }

      const timestamp = new Date();
      const entry = {
        id: `${timestamp.getTime()}-${Math.random()}`,
        ...payload,
        ...data,
        time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setResult(data);
      setLatestTransaction(payload);
      setHistory((previous) => [entry, ...previous].slice(0, MAX_HISTORY));
      setApiStatus("online");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot connect to the API. Check that the backend is running and CORS is configured."
          : err.message
      );
      setApiStatus("offline");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setResult(null);
    setLatestTransaction(null);
    setError("");
  }

  const fraudCount = history.filter((item) => item.prediction === 1).length;
  const averageProbability = history.length
    ? history.reduce((total, item) => total + item.fraud_probability, 0) / history.length
    : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="FraudGuard overview">
          <span className="brand-mark"><ShieldCheck size={19} strokeWidth={2.2} /></span>
          <span>Fraud<span className="brand-light">Guard</span></span>
        </a>

        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Dashboard sections">
          <a className="nav-link active" href="#overview"><LayoutDashboard size={17} />Overview</a>
          <a className="nav-link" href="#analysis"><ShieldAlert size={17} />Analyze transaction</a>
          <a className="nav-link" href="#history"><Clock3 size={17} />Recent predictions</a>
          <a className="nav-link" href="#model"><ChartNoAxesCombined size={17} />Model performance</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="service-card">
            <span className={`service-indicator ${apiStatus}`} />
            <div><strong>Prediction API</strong><span>{apiStatus === "checking" ? "Checking connection" : apiStatus === "online" ? "Connected" : "Unavailable"}</span></div>
            <button className="icon-button service-refresh" type="button" onClick={checkApi} aria-label="Refresh API status" title="Refresh API status"><RefreshCw size={14} /></button>
          </div>
          <p className="sidebar-footnote">FastAPI · local inference</p>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div>
            <p className="breadcrumb">RISK OPERATIONS <span>/</span> OVERVIEW</p>
            <h1>Fraud detection</h1>
          </div>
          <div className="topbar-meta">
            <span className={`connection-pill ${apiStatus}`}><span className="service-indicator" />{apiStatus === "checking" ? "Connecting" : apiStatus === "online" ? "Model online" : "API unavailable"}</span>
            <span className="topbar-divider" />
            <span className="session-label">Live session</span>
          </div>
        </header>

        <section className="overview-intro">
          <div>
            <p className="eyebrow">OPERATIONS OVERVIEW</p>
            <h2>Monitor the signals that matter.</h2>
            <p>Run an inference, review its probability, and keep the decision grounded in the model response.</p>
          </div>
          <a className="text-link" href="#analysis">New analysis <ArrowRight size={15} /></a>
        </section>

        <section className="metric-grid" aria-label="Current session metrics">
          <article className="metric-card">
            <div className="metric-top"><span>Predictions run</span><span className="metric-icon green"><Activity size={17} /></span></div>
            <strong>{history.length}</strong>
            <span className="metric-note">In this browser session</span>
          </article>
          <article className="metric-card">
            <div className="metric-top"><span>Fraud classifications</span><span className="metric-icon coral"><ShieldAlert size={17} /></span></div>
            <strong>{fraudCount}</strong>
            <span className="metric-note">Returned by the model</span>
          </article>
          <article className="metric-card">
            <div className="metric-top"><span>Mean fraud probability</span><span className="metric-icon amber"><Gauge size={17} /></span></div>
            <strong>{averageProbability === null ? "--" : formatPercent(averageProbability)}</strong>
            <span className="metric-note">Across session predictions</span>
          </article>
          <article className="metric-card">
            <div className="metric-top"><span>Model service</span><span className="metric-icon green"><Database size={17} /></span></div>
            <strong className={`metric-status ${apiStatus}`}>{apiStatus === "checking" ? "Checking" : apiStatus === "online" ? "Online" : "Offline"}</strong>
            <span className="metric-note">FastAPI health response</span>
          </article>
        </section>

        <section className="charts-grid" aria-label="Fraud analytics">
          <RiskTrendChart history={history} />
          <OutcomeChart history={history} />
        </section>

        <section className="workbench" id="analysis">
          <form className="surface transaction-panel" onSubmit={handleSubmit}>
            <div className="section-heading form-heading">
              <div>
                <p className="eyebrow">LIVE INFERENCE</p>
                <h2>Analyze a transaction</h2>
              </div>
              <span className="form-step">API · /predict</span>
            </div>

            <label className="field transaction-type">
              <span>Transaction type</span>
              <select name="type" value={form.type} onChange={handleChange}>
                {["PAYMENT", "TRANSFER", "CASH_OUT", "DEBIT", "CASH_IN"].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <div className="fields-grid">
              {fields.map((field) => (
                <label className="field" key={field.name}>
                  <span>{field.label}</span>
                  <input
                    type="number"
                    name={field.name}
                    min={field.min}
                    step={field.step || 1}
                    value={form[field.name]}
                    onChange={handleChange}
                    required
                  />
                </label>
              ))}
            </div>

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? <><LoaderCircle className="spin" size={16} /> Analyzing</> : <>Run prediction <ArrowRight size={16} /></>}
              </button>
              <button className="secondary-button" type="button" onClick={resetForm}>Reset</button>
            </div>
            {error && <div className="error-box" role="alert"><ShieldAlert size={16} /><span>{error}</span></div>}
            <p className="form-note">Values are sent to the existing FastAPI model. Results are estimates, not proof of fraud.</p>
          </form>

          <div className="result-stack">
            <section className="surface result-panel" aria-labelledby="result-title">
              <div className="section-heading">
                <div><p className="eyebrow">LATEST RESPONSE</p><h2 id="result-title">Prediction result</h2></div>
                {result && <span className={`verdict-tag ${result.prediction === 1 ? "fraud" : "legitimate"}`}>{result.result}</span>}
              </div>
              {!result && !loading && !error && (
                <div className="result-empty"><span className="result-empty-icon"><CircleHelp size={20} /></span><p>No prediction yet</p><span>Submit transaction details to see the live model response.</span></div>
              )}
              {loading && <div className="result-empty"><LoaderCircle className="spin" size={21} /><p>Scoring transaction</p><span>Waiting for the FastAPI response.</span></div>}
              {error && !loading && <div className="result-error"><ShieldAlert size={18} /><div><strong>Prediction unavailable</strong><span>Check the API connection and try again.</span></div></div>}
              {result && latestTransaction && (
                <div className="result-details">
                  <div className="probability-summary">
                    <div><span>Fraud probability</span><strong>{formatPercent(result.fraud_probability)}</strong></div>
                    <span className={`probability-icon ${result.prediction === 1 ? "fraud" : "legitimate"}`}>{result.prediction === 1 ? <ShieldAlert size={19} /> : <ShieldCheck size={19} />}</span>
                  </div>
                  <div className="probability-track"><span className={result.prediction === 1 ? "fraud-fill" : "clear-fill"} style={{ width: `${Math.min(100, Math.max(0, result.fraud_probability * 100))}%` }} /></div>
                  <div className="result-meta"><span>{latestTransaction.type}</span><span>Amount {formatAmount(latestTransaction.amount)}</span></div>
                </div>
              )}
            </section>

            <section className="surface copilot-panel" aria-labelledby="copilot-title">
              <div className="copilot-heading">
                <span className="copilot-mark"><Sparkles size={16} /></span>
                <div><p className="eyebrow">AI COPILOT</p><h2 id="copilot-title">Decision support</h2></div>
                <span className="copilot-state"><Bot size={13} /> Model-linked</span>
              </div>
              {result && latestTransaction ? (
                <div className="copilot-response">
                  <p>The model classified this <strong>{latestTransaction.type}</strong> transaction as <strong>{result.result.toLowerCase()}</strong> and returned an estimated fraud probability of <strong>{formatPercent(result.fraud_probability)}</strong>.</p>
                  <span>Use this score alongside trusted account context before taking action.</span>
                </div>
              ) : (
                <div className="copilot-response muted-response">
                  <p>Run an analysis to receive a summary tied to the actual model response.</p>
                  <span>No prediction data is available yet.</span>
                </div>
              )}
              <div className="copilot-disclaimer">No generative AI endpoint is connected. This panel uses only the returned prediction.</div>
            </section>
          </div>
        </section>

        <section className="lower-grid">
          <section className="surface history-panel" id="history" aria-labelledby="history-title">
            <div className="section-heading">
              <div><p className="eyebrow">SESSION ACTIVITY</p><h2 id="history-title">Recent predictions</h2></div>
              <span className="scope-label">Latest {Math.min(history.length, MAX_HISTORY)}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Transaction</th><th>Amount</th><th>Classification</th><th>Probability</th><th>Time</th></tr></thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td className="table-empty" colSpan="5">No predictions recorded in this session.</td></tr>
                  ) : history.map((item) => (
                    <tr key={item.id}>
                      <td><span className="transaction-name"><span className={`table-icon ${item.prediction === 1 ? "fraud" : "legitimate"}`}>{item.prediction === 1 ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}</span>{item.type}</span></td>
                      <td>{formatAmount(item.amount)}</td>
                      <td><span className={`table-verdict ${item.prediction === 1 ? "fraud" : "legitimate"}`}>{item.result}</span></td>
                      <td>{formatPercent(item.fraud_probability)}</td>
                      <td className="table-time">{item.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="panel-footnote">In-memory browser session only; the backend does not expose a transaction history endpoint.</p>
          </section>

          <section className="surface model-panel" id="model" aria-labelledby="model-title">
            <div className="section-heading">
              <div><p className="eyebrow">OFFLINE EVALUATION</p><h2 id="model-title">Model performance</h2></div>
              <span className="model-badge">DOCUMENTED</span>
            </div>
            <div className="model-metrics">
              {modelMetrics.map((metric) => (
                <div className="model-metric" key={metric.label}>
                  <div><span>{metric.label}</span><strong>{formatPercent(metric.value)}</strong></div>
                  <div className="metric-track"><span style={{ width: `${metric.value * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <p className="panel-footnote">Repository evaluation figures from README.md; not live monitoring data. Training sample: 200,000 transactions.</p>
          </section>
        </section>

        <footer className="app-footer">
          <span>FraudGuard <span className="footer-separator">/</span> FastAPI inference</span>
          <span><ShieldCheck size={13} /> Model estimates require human review</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
