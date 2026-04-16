import type { MarketEvent, MarketSnapshot, MarketSnapshotPayload, SnapshotInstrument } from "@market-room/shared";
import { FeedbackPanel } from "./FeedbackPanel";
import { formatDisplayNumberText } from "../lib/formatting";

type SnapshotPanelProps = {
  snapshot: MarketSnapshot | null;
  event: MarketEvent | null;
};

export function SnapshotPanel({ snapshot, event }: SnapshotPanelProps) {
  if (!snapshot) {
    return (
      <FeedbackPanel
        title="No market snapshot yet"
        description="Run the first market discussion to generate a snapshot and shared room output."
      />
    );
  }

  let parsedPayload: MarketSnapshotPayload | null = null;

  try {
    parsedPayload = JSON.parse(snapshot.payloadJson) as MarketSnapshotPayload;
  } catch {
    parsedPayload = null;
  }

  if (!parsedPayload) {
    return (
      <FeedbackPanel
        title="Snapshot unavailable"
        description="The latest snapshot could not be read from storage."
        tone="error"
      />
    );
  }

  const availableInstruments = parsedPayload.instruments.filter(
    (instrument) => instrument.status !== "unavailable"
  );
  const unavailableCount = parsedPayload.instruments.length - availableInstruments.length;
  const matchingEvent = event?.snapshotId === snapshot.id ? event : null;

  return (
    <section className="panel snapshot-panel stack-md">
      <div className="snapshot-panel__header">
        <div>
          <p className="eyebrow">Latest snapshot</p>
          <h3>{matchingEvent?.title || "Latest market snapshot"}</h3>
        </div>
        <div className="snapshot-badges">
          <span className={`badge ${parsedPayload.usedFallback ? "badge--warning" : ""}`}>
            {parsedPayload.usedFallback ? "Fallback snapshot" : "Live snapshot"}
          </span>
          <span className="badge badge--muted">{snapshot.snapshotType}</span>
        </div>
      </div>

      <div className="snapshot-grid">
        <div className="snapshot-stat">
          <span className="meta-label">As of</span>
          <strong>{new Date(parsedPayload.asOf || snapshot.createdAt).toLocaleString()}</strong>
        </div>
        <div className="snapshot-stat">
          <span className="meta-label">Provider</span>
          <strong>{formatProviderLabel(parsedPayload.provider)}</strong>
        </div>
        <div className="snapshot-stat snapshot-stat--wide">
          <span className="meta-label">Discussion brief</span>
          <strong>{parsedPayload.prompt || "No prompt found"}</strong>
        </div>
      </div>

      {parsedPayload.headline ? <p>{parsedPayload.headline}</p> : null}
      {parsedPayload.summary ? <p className="muted">{parsedPayload.summary}</p> : null}

      <div className="snapshot-section stack-sm">
        <div className="snapshot-section__header">
          <p className="eyebrow">Instruments</p>
          {unavailableCount > 0 ? (
            <span className="muted">{unavailableCount} unavailable from provider</span>
          ) : null}
        </div>

        {availableInstruments.length > 0 ? (
          <div className="snapshot-instruments">
            {availableInstruments.map((instrument) => (
              <article className="snapshot-instrument" key={instrument.key}>
                <div className="snapshot-instrument__header">
                  <span className="meta-label">{instrument.label}</span>
                  <span className={`snapshot-change ${changeToneClass(instrument)}`}>
                    {instrument.change || instrument.status}
                  </span>
                </div>
                <strong>{formatDisplayNumberText(instrument.value)}</strong>
                <span className="muted">{instrument.source}</span>
              </article>
            ))}
          </div>
        ) : (
          <FeedbackPanel
            title="No instrument data"
            description="The provider returned no instrument values for the latest snapshot."
          />
        )}
      </div>

      <div className="snapshot-section stack-sm">
        <div className="snapshot-section__header">
          <p className="eyebrow">Top financial headlines</p>
          <span className="muted">{parsedPayload.headlines.length} available</span>
        </div>

        {parsedPayload.headlines.length > 0 ? (
          <div className="snapshot-headlines">
            {parsedPayload.headlines.map((headline, index) => (
              <article className="snapshot-headline" key={`${headline.title}-${index}`}>
                <div className="snapshot-headline__meta">
                  <span className="meta-label">{headline.source}</span>
                  {headline.publishedAt ? (
                    <span className="muted">{formatPublishedAt(headline.publishedAt)}</span>
                  ) : null}
                </div>
                {headline.url ? (
                  <a href={headline.url} target="_blank" rel="noreferrer">
                    {headline.title}
                  </a>
                ) : (
                  <p>{headline.title}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <FeedbackPanel
            title="No headlines returned"
            description="The latest snapshot was saved without live financial headlines."
          />
        )}
      </div>

      <p className="muted">{matchingEvent?.summary || "Snapshot loaded from the latest saved market fetch."}</p>
    </section>
  );
}

function formatProviderLabel(provider: string): string {
  return provider
    .replace(/_/g, " ")
    .replace(/:/g, " / ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatPublishedAt(publishedAt: string): string {
  const normalized = publishedAt.includes("T")
    ? publishedAt
    : `${publishedAt.slice(0, 4)}-${publishedAt.slice(4, 6)}-${publishedAt.slice(6, 8)}T${publishedAt.slice(9, 11)}:${publishedAt.slice(11, 13)}:${publishedAt.slice(13, 15)}Z`;

  const parsed = new Date(normalized);

  return Number.isNaN(parsed.valueOf()) ? publishedAt : parsed.toLocaleString();
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
