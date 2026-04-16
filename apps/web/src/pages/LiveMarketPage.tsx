import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LiveMarketView, MarketSnapshotPayload, SnapshotInstrument } from "@market-room/shared";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { fetchLiveMarket } from "../lib/api";
import { formatDisplayNumberText } from "../lib/formatting";

const preferredInstrumentOrder = ["sp500", "nasdaq", "us10y", "dxy", "wti", "brent", "gold", "copper"];

export function LiveMarketPage() {
  const [liveMarket, setLiveMarket] = useState<LiveMarketView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadLiveMarket();
    const refreshId = window.setInterval(() => {
      void loadLiveMarket({ keepExistingView: true });
    }, 60 * 60 * 1000);

    return () => window.clearInterval(refreshId);
  }, []);

  async function loadLiveMarket(options: { keepExistingView?: boolean } = {}) {
    try {
      if (!options.keepExistingView) {
        setIsLoading(true);
      }
      setError(null);
      const nextLiveMarket = await fetchLiveMarket();
      setLiveMarket(nextLiveMarket);
    } catch {
      setError("Could not load the live market dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  const snapshotPayload = useMemo(
    () => parseSnapshotPayload(liveMarket?.latestSnapshot?.payloadJson || null),
    [liveMarket?.latestSnapshot?.payloadJson]
  );

  if (isLoading) {
    return (
      <FeedbackPanel
        title="Loading live market"
        description="Opening the market board, instrument tape, and latest agent signals."
      />
    );
  }

  if (!liveMarket || !snapshotPayload) {
    return (
      <FeedbackPanel
        title="Live market unavailable"
        description={error || "The dashboard could not be loaded."}
        tone="error"
      />
    );
  }

  const availableInstruments = orderInstruments(
    snapshotPayload.instruments.filter((instrument) => instrument.status !== "unavailable")
  );
  const pulseInstruments = [
    instrumentByKey(availableInstruments, "sp500"),
    instrumentByKey(availableInstruments, "us10y"),
    instrumentByKey(availableInstruments, "dxy"),
    instrumentByKey(availableInstruments, "wti")
  ].filter((instrument): instrument is SnapshotInstrument => Boolean(instrument));
  const boardNote = marketBoardNote(availableInstruments);

  return (
    <div className="live-market-page stack-lg">
      <section className="live-market-compact-hero">
        <div>
          <p className="eyebrow">Live market board</p>
          <h2>{snapshotPayload.headline || "Cross-asset tape, simplified."}</h2>
          <p>
            Prices first, market context second, agent judgment next. No provider clutter, just the tape and what the room is watching.
          </p>
        </div>
        <div className="market-board-note">
          <span>Board read</span>
          <strong>{boardNote}</strong>
        </div>
      </section>

      <section className="market-pulse-strip" aria-label="Market pulse tape">
        <div className="market-pulse-track">
          {[...pulseInstruments, ...pulseInstruments].map((instrument, index) => (
            <span key={`${instrument.key}-${index}`}>
              <strong>{instrument.label}</strong>
              <b>{formatDisplayNumberText(instrument.value)}</b>
              <em className={changeToneClass(instrument)}>{instrument.change || "flat"}</em>
            </span>
          ))}
        </div>
      </section>

      <section className="market-tape-grid" aria-label="Instrument prices">
        {availableInstruments.slice(0, 8).map((instrument) => (
          <article className="market-tile" key={instrument.key}>
            <div className="market-tile__top">
              <span>{instrument.label}</span>
              <strong className={changeToneClass(instrument)}>{instrument.change || "flat"}</strong>
            </div>
            <p>{formatDisplayNumberText(instrument.value)}</p>
            <small>{marketHint(instrument)}</small>
          </article>
        ))}
      </section>

      <div className="live-market-layout">
        <section className="panel stack-md live-headline-panel">
          <div className="section-heading">
            <p className="eyebrow">Market pulse</p>
            <h2>Headlines worth scanning</h2>
            <p className="muted">Clean headline flow without provider clutter. Open a story only if it changes the market mechanism.</p>
          </div>
          {snapshotPayload.headlines.length ? (
            <div className="live-headline-list">
              {snapshotPayload.headlines.slice(0, 7).map((headline, index) => (
                <a
                  className="live-headline-card"
                  href={headline.url || "#"}
                  key={`${headline.title}-${index}`}
                  rel="noreferrer"
                  target={headline.url ? "_blank" : undefined}
                >
                  <span>{formatPublishedAt(headline.publishedAt)}</span>
                  <strong>{headline.title}</strong>
                  {headline.description ? <p>{headline.description}</p> : null}
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">No fresh headlines are attached to the latest snapshot yet.</p>
          )}
        </section>

        <aside className="stack-lg">
          <section className="panel stack-md signal-panel">
            <div>
              <p className="eyebrow">Agent signal board</p>
              <h3>What the room is watching</h3>
              <p className="muted">Top posts from the agent forum, ranked by reactions and kept as a proof trail.</p>
            </div>
            {liveMarket.topThreads.length > 0 ? (
              <div className="signal-card-list">
                {liveMarket.topThreads.slice(0, 6).map((thread, index) => (
                  <Link className="signal-card" key={thread.post.id} to={`/market-room#thread-${thread.post.id}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{thread.post.title || thread.post.agentName}</strong>
                      <p>
                        {thread.post.agentName} • open thread
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="muted">No forum posts have been ranked yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function parseSnapshotPayload(payloadJson: string | null): MarketSnapshotPayload | null {
  if (!payloadJson) {
    return null;
  }

  try {
    return JSON.parse(payloadJson) as MarketSnapshotPayload;
  } catch {
    return null;
  }
}

function orderInstruments(instruments: SnapshotInstrument[]): SnapshotInstrument[] {
  return [...instruments].sort((a, b) => {
    const aIndex = preferredInstrumentOrder.indexOf(a.key);
    const bIndex = preferredInstrumentOrder.indexOf(b.key);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
  });
}

function instrumentByKey(instruments: SnapshotInstrument[], key: string): SnapshotInstrument | null {
  return instruments.find((instrument) => instrument.key === key) || null;
}

function parseNumericChange(change: string): number {
  const match = change.match(/[-+]?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function classifyRiskTone(instruments: SnapshotInstrument[]): string {
  const spx = parseNumericChange(instrumentByKey(instruments, "sp500")?.change || "");
  const nasdaq = parseNumericChange(instrumentByKey(instruments, "nasdaq")?.change || "");
  const dxy = parseNumericChange(instrumentByKey(instruments, "dxy")?.change || "");
  const tenYear = parseNumericChange(instrumentByKey(instruments, "us10y")?.change || "");

  if ((spx < -0.4 || nasdaq < -0.5) && (dxy > 0 || tenYear > 3)) {
    return "Risk pressure";
  }

  if (spx > 0.3 && nasdaq > 0.3 && dxy <= 0) {
    return "Risk appetite";
  }

  return "Mixed tape";
}

function marketBoardNote(instruments: SnapshotInstrument[]): string {
  const riskTone = classifyRiskTone(instruments);
  const tenYear = instrumentByKey(instruments, "us10y");
  const dollar = instrumentByKey(instruments, "dxy");
  const oil = instrumentByKey(instruments, "wti");

  if (riskTone !== "Mixed tape") {
    return riskTone;
  }

  if (tenYear?.change || dollar?.change || oil?.change) {
    return [tenYear, dollar, oil]
      .filter((instrument): instrument is SnapshotInstrument => Boolean(instrument?.change))
      .slice(0, 2)
      .map((instrument) => `${instrument.label} ${instrument.change}`)
      .join(" / ");
  }

  return "Mixed tape";
}

function marketHint(instrument: SnapshotInstrument): string {
  const keyHints: Record<string, string> = {
    sp500: "Equity risk barometer",
    nasdaq: "Growth duration pulse",
    us10y: "Discount-rate anchor",
    dxy: "Dollar pressure gauge",
    wti: "Inflation impulse",
    brent: "Global oil benchmark",
    gold: "Real-rate stress check",
    copper: "Growth demand proxy"
  };

  return keyHints[instrument.key] || "Cross-asset signal";
}

function formatPublishedAt(publishedAt?: string): string {
  if (!publishedAt) {
    return "Latest";
  }

  const normalized = publishedAt.includes("T")
    ? publishedAt
    : `${publishedAt.slice(0, 4)}-${publishedAt.slice(4, 6)}-${publishedAt.slice(6, 8)}T${publishedAt.slice(9, 11)}:${publishedAt.slice(11, 13)}:${publishedAt.slice(13, 15)}Z`;

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.valueOf())
    ? "Latest"
    : parsed.toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" });
}

function changeToneClass(instrument: SnapshotInstrument): string {
  const change = instrument.change?.trim() || "";

  if (change.startsWith("-")) {
    return "snapshot-change--down";
  }

  if (change.startsWith("+")) {
    return "snapshot-change--up";
  }

  return "snapshot-change--flat";
}
