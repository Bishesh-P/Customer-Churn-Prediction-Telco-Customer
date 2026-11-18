import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const ADDONS = ['OnlineSecurity', 'OnlineBackup', 'DeviceProtection', 'TechSupport', 'StreamingTV', 'StreamingMovies'];

function Dropdown({ value, options, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="dd" ref={ref}>
      <button type="button" className="dd-btn" disabled={disabled} onClick={() => setOpen(!open)}>
        {value}<span>▾</span>
      </button>
      {open && (
        <ul className="dd-list">
          {options.map((o) => (
            <li key={o} className={o === value ? 'sel' : ''}
                onClick={() => { onChange(o); setOpen(false); }}>{o}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const FIELDS = {
  SeniorCitizen: { label: 'Senior citizen', options: ['No', 'Yes'] },
  Partner: { label: 'Has a partner', options: ['No', 'Yes'] },
  Dependents: { label: 'Has dependents', options: ['No', 'Yes'] },
  tenure: { label: 'Months with the company', type: 'number' },
  InternetService: { label: 'Internet service', options: ['DSL', 'Fiber optic', 'No'] },
  OnlineSecurity: { label: 'Online security', addon: true },
  OnlineBackup: { label: 'Online backup', addon: true },
  DeviceProtection: { label: 'Device protection', addon: true },
  TechSupport: { label: 'Tech support', addon: true },
  StreamingTV: { label: 'Streaming TV', addon: true },
  StreamingMovies: { label: 'Streaming movies', addon: true },
  Contract: { label: 'Contract', options: ['Month-to-month', 'One year', 'Two year'] },
  PaperlessBilling: { label: 'Paperless billing', options: ['Yes', 'No'] },
  PaymentMethod: {
    label: 'Payment method',
    options: ['Electronic check', 'Mailed check', 'Bank transfer (automatic)', 'Credit card (automatic)'],
  },
  MonthlyCharges: { label: 'Monthly bill ($)', type: 'number' },
  TotalCharges: { label: 'Total paid so far ($)', type: 'number' },
};

const GROUPS = [
  { title: 'About the customer', fields: ['SeniorCitizen', 'Partner', 'Dependents', 'tenure'] },
  { title: 'Services', fields: ['InternetService', ...ADDONS] },
  { title: 'Contract & billing', fields: ['Contract', 'PaperlessBilling', 'PaymentMethod', 'MonthlyCharges', 'TotalCharges'] },
];

const INITIAL = {
  SeniorCitizen: 'No', Partner: 'No', Dependents: 'No', tenure: '3',
  InternetService: 'Fiber optic',
  OnlineSecurity: 'No', OnlineBackup: 'No', DeviceProtection: 'No',
  TechSupport: 'No', StreamingTV: 'No', StreamingMovies: 'No',
  Contract: 'Month-to-month', PaperlessBilling: 'Yes', PaymentMethod: 'Electronic check',
  MonthlyCharges: '85', TotalCharges: '255',
};

const MESSAGES = {
  High: 'This customer looks a lot like people who left in the past. A personal offer could be worth it.',
  Medium: 'Some warning signs. A light nudge, like a helpful email, may be enough.',
  Low: 'This customer looks settled and is unlikely to leave soon.',
};

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Field({ name, form, onChange }) {
  const spec = FIELDS[name];
  const noNet = spec.addon && form.InternetService === 'No';
  const options = spec.addon ? (noNet ? ['No internet service'] : ['Yes', 'No']) : spec.options;
    return (
    <div className="field">
      <span>{spec.label}</span>
      {options ? (
        <Dropdown value={form[name]} options={options} disabled={noNet}
                  onChange={(v) => onChange(name, v)} />
      ) : (
        <input
          type="number" min="0" step={name === 'tenure' ? 1 : 0.01}
          value={form[name]} onChange={(e) => onChange(name, e.target.value)} required
        />
      )}
    </div>
  );
}

function Predictor() {
  const [form, setForm] = useState(INITIAL);
  const [totalEdited, setTotalEdited] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (name, value) => {
    if (name === 'TotalCharges') setTotalEdited(true);
    setForm((f) => {
      const next = { ...f, [name]: value };
      if (name === 'InternetService') {
        ADDONS.forEach((a) => {
          next[a] = value === 'No' ? 'No internet service' : f[a] === 'No internet service' ? 'No' : f[a];
        });
      }
      if (!totalEdited && (name === 'tenure' || name === 'MonthlyCharges')) {
        next.TotalCharges = (Number(next.tenure || 0) * Number(next.MonthlyCharges || 0)).toFixed(2);
      }
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    const payload = {
      ...form,
      SeniorCitizen: form.SeniorCitizen === 'Yes' ? 1 : 0,
      tenure: Number(form.tenure),
      MonthlyCharges: Number(form.MonthlyCharges),
      TotalCharges: Number(form.TotalCharges),
    };
    try {
      const res = await fetch(`${API}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('The API rejected the input. Please check every field.');
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof TypeError ? 'Cannot reach the API. Is uvicorn running on port 8000?' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const pct = result ? Math.round(result.churn_probability * 100) : 0;

  return (
    <div className="predictor">
      <form onSubmit={submit} className="card">
        {GROUPS.map((g) => (
          <fieldset key={g.title}>
            <legend>{g.title}</legend>
            <div className="form-grid">
              {g.fields.map((n) => <Field key={n} name={n} form={form} onChange={update} />)}
            </div>
          </fieldset>
        ))}
        <button className="btn" disabled={loading}>{loading ? 'Thinking…' : 'Predict churn risk'}</button>
        {error && <p className="error">{error}</p>}
      </form>

      {result && (
        <div className={`card result ${result.risk_segment.toLowerCase()}`}>
          <p className="eyebrow">Estimated chance of leaving</p>
          <div className="big">{pct}%</div>
          <div className="meter"><i style={{ width: `${pct}%` }} /></div>
          <span className="badge">{result.risk_segment} risk</span>
          <p className="muted">{MESSAGES[result.risk_segment]}</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  useReveal();
  return (
    <>
      <div className="orb o1" /><div className="orb o2" />

      <nav>
        <a href="#top" className="brand">Churn<span className="grad">Sight</span></a>
        <div className="links">
          <a href="#problem">The problem</a>
          <a href="#how">How it works</a>
          <a href="#findings">Findings</a>
          <a href="#try" className="pill">Try it</a>
        </div>
      </nav>

      <header id="top" className="hero">
        <p className="eyebrow">A customer-retention project</p>
        <h1>Which customers are <span className="grad">about to leave?</span><br />We can see it coming.</h1>
        <p className="lead">
          This project teaches a computer to spot the early warning signs that a customer might
          cancel, so a company can reach out before it is too late.
        </p>
        <a href="#try" className="btn">Try the predictor</a>
        <div className="stats">
          <div><b>7,043</b><span>customers studied</span></div>
          <div><b>1 in 4</b><span>of them left</span></div>
          <div><b>~84/100</b><span>times the model ranks a leaver as riskier than a stayer</span></div>
        </div>
      </header>

      <section id="problem" className="reveal">
        <h2>Why does this matter?</h2>
        <p className="lead">
          Winning a new customer usually costs far more than keeping an existing one. Yet most
          companies only learn a customer is unhappy after they have gone. In this data, about a
          quarter of customers cancelled, and nobody knew in advance who it would be.
        </p>
      </section>

      <section id="how" className="reveal">
        <h2>How it works</h2>
        <div className="grid">
          {[
            ['1', 'Learn from the past', 'We gave the computer the records of thousands of past customers, including who stayed and who left.'],
            ['2', 'Find the warning signs', 'It looked for patterns: type of contract, how long they have been a customer, how they pay, which services they use.'],
            ['3', 'Score every customer', 'For any customer, it now gives a risk score from 0% to 100%, like a weather forecast for cancellations.'],
            ['4', 'Take action', 'The riskiest customers can get a personal offer or a helpful call, while safe ones are left alone.'],
          ].map(([n, t, d]) => (
            <div className="card step" key={n}><div className="num">{n}</div><h3>{t}</h3><p className="muted">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="findings" className="reveal">
        <h2>What we found</h2>
        <p className="lead">We sorted customers into three groups. The riskiest group is only 28% of customers, but it contains roughly 64% of the people who actually left.</p>
        <div className="card bars">
          {[['Low risk', 6.6, 'var(--low)'], ['Medium risk', 28.6, 'var(--mid)'], ['High risk', 60.6, 'var(--high)']].map(([l, v, c]) => (
            <div className="bar-row" key={l}>
              <span>{l}</span>
              <div className="bar"><i style={{ width: `${v}%`, background: c }} /></div>
              <b>{v}% left</b>
            </div>
          ))}
        </div>

        <div className="two">
          <div className="card">
            <h3>🚩 The typical at-risk customer</h3>
            <div className="chips">
              {['New (first year)', 'Month-to-month contract', 'Fiber internet', 'Pays by electronic check', 'No online security', 'No tech support'].map((c) => <span key={c}>{c}</span>)}
            </div>
          </div>
          <div className="card">
            <h3>💚 The typical loyal customer</h3>
            <div className="chips good">
              {['Long-time customer', 'One or two-year contract', 'Automatic payments', 'Uses security & support add-ons'].map((c) => <span key={c}>{c}</span>)}
            </div>
          </div>
        </div>

        <h3 className="sub">What a company could do about it</h3>
        <div className="grid">
          {[
            ['📝', 'Offer longer contracts', 'A small discount for moving off month-to-month.'],
            ['🛡️', 'Bundle protection', 'Free trial of security and tech support for fiber customers.'],
            ['💳', 'Switch payment method', 'A bill credit for moving to automatic payments.'],
            ['👋', 'Welcome new customers', 'Check-ins during the first year, when risk is highest.'],
          ].map(([i, t, d]) => (
            <div className="card step" key={t}><div className="icon">{i}</div><h3>{t}</h3><p className="muted">{d}</p></div>
          ))}
        </div>
        <p className="note">These are ideas based on patterns in the data. They would need to be tested before anyone relies on them.</p>
      </section>

      <section id="try" className="reveal">
        <h2>Try it yourself</h2>
        <p className="lead">Describe a customer below and the model will estimate how likely they are to leave.</p>
        <Predictor />
      </section>

      <footer>
        Portfolio project. Built on the public IBM Telco sample dataset. Predictions are estimates, not certainties.
      </footer>
    </>
  );
}