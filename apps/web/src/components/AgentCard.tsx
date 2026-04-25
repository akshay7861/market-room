import type { AgentProfile } from "@market-room/shared";

type AgentMeta = {
  tagline: string;
  plainEnglish: string;
  watches: string[];
  iconPath: string;
  accentHex: string;
};

const AGENT_META: Record<string, AgentMeta> = {
  "macro-agent": {
    tagline: "The economy's heartbeat monitor",
    plainEnglish:
      "Watches whether the economy is heating up or cooling down — tracks interest rates, inflation, and big global events that ripple across every market.",
    watches: ["Interest Rates", "Inflation (CPI)", "GDP", "Geopolitics", "Recession Risk"],
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    accentHex: "#1a6b4a",
  },
  "rates-agent": {
    tagline: "Government bond & interest rate specialist",
    plainEnglish:
      "Focuses on US Treasury bonds and where the Federal Reserve is taking interest rates. When rates rise, borrowing costs go up and bonds lose value.",
    watches: ["10Y Treasury Yield", "Fed Rate Path", "Yield Curve Shape", "Duration Risk", "Real Yields"],
    iconPath:
      "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
    accentHex: "#1a4a8a",
  },
  "equities-agent": {
    tagline: "Stock picker & earnings analyst",
    plainEnglish:
      "Looks at individual companies — their profits, growth, and whether their stock price is fair or overpriced. Spots which sectors are winning and which are losing.",
    watches: ["Earnings Reports", "P/E Ratios", "Sector Rotation", "Analyst Ratings", "Company News"],
    iconPath: "M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z",
    accentHex: "#6b3a1a",
  },
  "fx-agent": {
    tagline: "Currency & dollar dynamics",
    plainEnglish:
      "Tracks the US dollar against other currencies. A strong dollar makes US exports expensive and shrinks overseas earnings. Policy differences between central banks drive big currency moves.",
    watches: ["USD Index (DXY)", "EUR/USD", "USD/JPY", "Policy Divergence", "EM Currency Risk"],
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z",
    accentHex: "#4a1a6b",
  },
  "commodities-agent": {
    tagline: "Oil, gold & raw materials tracker",
    plainEnglish:
      "Monitors oil, gold, and raw materials. Rising oil drives up inflation everywhere. Gold rises when people are nervous. Supply disruptions anywhere can ripple through global prices.",
    watches: ["Oil (WTI/Brent)", "Gold", "Supply Disruptions", "China Demand", "Commodity Inflation"],
    iconPath:
      "M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z",
    accentHex: "#7a5400",
  },
  "risk-sentiment-agent": {
    tagline: "Market mood & stress detector",
    plainEnglish:
      "Reads whether investors are calm, nervous, or panicking. Watches the signals that show risk building in the system before most people notice — like an early-warning radar.",
    watches: ["VIX Volatility", "Credit Spreads", "Positioning", "Risk Appetite", "Fear Signals"],
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
    accentHex: "#8a1a1a",
  },
};

export function AgentCard({ agent }: { agent: AgentProfile }) {
  const meta = AGENT_META[agent.id];

  // Fallback: no meta found (future agents not yet in the map)
  if (!meta) {
    return (
      <article className="panel agent-card">
        <div className="agent-card__header">
          <img className="avatar-image" src={agent.avatarUrl} alt={`${agent.name} avatar`} />
          <div>
            <h3>{agent.name}</h3>
            <p className="muted">{agent.sector}</p>
          </div>
          <span className="agent-card__status">{agent.active ? "Active" : "Paused"}</span>
        </div>
        <p>{agent.bio}</p>
        <div className="agent-card__meta">
          <div>
            <span className="meta-label">Memory</span>
            <p className="muted">{agent.memorySummary}</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="panel agent-card agent-card--hoverable">
      {/* ── Card face (always visible) ── */}
      <div className="agent-card__face">
        <div className="agent-card__header">
          <div
            className="agent-card__icon"
            style={{ background: meta.accentHex + "18" }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={meta.iconPath} fill={meta.accentHex} />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3>{agent.name}</h3>
            <p className="muted" style={{ margin: 0 }}>{agent.sector}</p>
          </div>
          <span className="agent-card__status">
            {agent.active ? "Active" : "Paused"}
          </span>
        </div>

        <p className="agent-card__tagline">{meta.tagline}</p>
        <p style={{ margin: 0 }}>{agent.bio}</p>
      </div>

      {/* ── Hover overlay (slides up from bottom) ── */}
      <div className="agent-card__overlay" aria-hidden="true">
        <div>
          <p className="agent-card__overlay-label">What it does</p>
          <p className="agent-card__overlay-text">{meta.plainEnglish}</p>
        </div>
        <div className="agent-card__overlay-watches">
          <p className="agent-card__overlay-label">Tracks</p>
          <div className="agent-watch-tags">
            {meta.watches.map((w) => (
              <span key={w} className="agent-watch-tag">
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
