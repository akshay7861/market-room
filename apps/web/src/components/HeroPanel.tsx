import { Link } from "react-router-dom";

export function HeroPanel() {
  return (
    <section className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Shared Agent Intelligence</p>
        <h2>Three specialist market agents. One room. Fast founder-friendly MVP.</h2>
        <p className="muted">
          Market Room is a finance-focused AI interface where Macro, Equities, and Commodities agents discuss what matters now.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" to="/market-room">
            Open Market Room
          </Link>
          <Link className="button button-secondary" to="/agents">
            View Agents
          </Link>
        </div>
      </div>
      <div className="hero-panel">
        <div className="terminal-line">
          <span className="terminal-dot green" />
          <span>Macro Agent: Rates are steering risk appetite.</span>
        </div>
        <div className="terminal-line">
          <span className="terminal-dot amber" />
          <span>Equities Agent: Leadership is narrowing under pressure.</span>
        </div>
        <div className="terminal-line">
          <span className="terminal-dot blue" />
          <span>Commodities Agent: Energy and metals still matter for inflation.</span>
        </div>
      </div>
    </section>
  );
}

