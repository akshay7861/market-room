import type { MarketSnapshotPayload, SnapshotInstrument } from "@market-room/shared";
import fredFedFunds from "../../../../../knowledge/data-lake/normalized/fred_fedfunds.json";
import fredHighYieldSpread from "../../../../../knowledge/data-lake/normalized/fred_high_yield_spread.json";
import fredUnemployment from "../../../../../knowledge/data-lake/normalized/fred_unemployment.json";
import fredUs2y from "../../../../../knowledge/data-lake/normalized/fred_us2y.json";
import fredVix from "../../../../../knowledge/data-lake/normalized/fred_vix.json";
import type { FredSeriesMap } from "./fredCacheService";

// ── Live FRED data override ────────────────────────────────────────────────
// Set once per cron tick from marketRoomService after loading fresh D1/API data.
let _activeFredMap: FredSeriesMap | null = null;

/** Called by marketRoomService at the start of each agent run to inject live FRED data. */
export function setFredSeriesMap(map: FredSeriesMap | null): void {
  _activeFredMap = map;
}

/** Returns the live series if available, otherwise the embedded static JSON fallback. */
function liveMetricSeries(id: string, fallback: object): HistoricalSeries {
  return (_activeFredMap?.get(id) ?? fallback) as HistoricalSeries;
}

type HistoricalObservation = {
  date: string;
  value: number | null;
};

type HistoricalSeries = {
  id: string;
  label: string;
  units: string;
  observations: HistoricalObservation[];
};

export type VerifiedMetric = {
  key: string;
  label: string;
  valueText: string;
  numericValue: number;
  dateLabel: string;
  source: string;
  citationValues: string[];
};

export type VerifiedMarketMetricsContext = {
  block: string;
  metrics: VerifiedMetric[];
  missingKeys: string[];
};

const LIVE_SNAPSHOT_KEYS = new Set(["sp500", "nasdaq", "dxy", "us10y", "wti", "brent", "gold", "copper"]);

export function buildVerifiedMarketMetricsContext(snapshot: MarketSnapshotPayload): VerifiedMarketMetricsContext {
  const metrics: VerifiedMetric[] = [];
  const missingKeys: string[] = [];

  for (const key of LIVE_SNAPSHOT_KEYS) {
    const metric = metricFromSnapshot(snapshot, key);
    if (metric) metrics.push(metric);
    else missingKeys.push(key);
  }

  addStoredMetric(metrics, missingKeys, "us2y", "US 2Y yield", liveMetricSeries("fred_us2y", fredUs2y), "%", "FRED US2Y");
  addStoredMetric(metrics, missingKeys, "fedfunds", "Fed Funds", liveMetricSeries("fred_fedfunds", fredFedFunds), "%", "FRED Fed Funds");
  addStoredMetric(metrics, missingKeys, "hy_oas", "HY OAS", liveMetricSeries("fred_high_yield_spread", fredHighYieldSpread), "bps", "FRED HY OAS", (value) => value * 100);
  addStoredMetric(metrics, missingKeys, "vix", "VIX", liveMetricSeries("fred_vix", fredVix), "", "FRED VIX");
  addStoredMetric(metrics, missingKeys, "unemployment", "Unemployment rate", liveMetricSeries("fred_unemployment", fredUnemployment), "%", "FRED unemployment");

  const blockLines = [
    "VERIFIED MARKET METRICS:",
    "Use this as the only source for live/current market numbers. You may also cite numbers from article text, historical-data blocks, analog blocks, chart data, or explicitly labelled stored correlations.",
    "Do NOT invent or approximate HY OAS, 2Y, 10Y, Fed Funds, WTI, DXY, SPY/S&P, VIX, gold, or unemployment if the value is unavailable below.",
    ...metrics.map((metric) => `- ${metric.label}: ${metric.valueText} [${metric.source}, ${metric.dateLabel}]`),
    missingKeys.length > 0 ? `Unavailable verified metrics: ${missingKeys.join(", ")}.` : "Unavailable verified metrics: none.",
    "Citation rule: if a metric is listed as unavailable, discuss the mechanism qualitatively and do not attach a precise number."
  ];

  // Append HY OAS context: 90-day mean (local/recent baseline) + full-series percentile
  // (required for "historically elevated" or "stress territory" language).
  const hyOasCtx = computeHyOasContext(liveMetricSeries("fred_high_yield_spread", fredHighYieldSpread));
  if (hyOasCtx) {
    blockLines.push(
      `HY OAS context: current ${Math.round(hyOasCtx.current)}bps | 90d mean ${hyOasCtx.recent90dMean}bps | full-series percentile ${hyOasCtx.historicalPercentile}th (n=${hyOasCtx.observationCount} monthly obs). Use 90d mean when claiming "above recent average"; cite percentile when claiming "historically elevated" or "stress territory".`
    );
  }

  const block = blockLines.join("\n");

  console.log(
    `[verified-metrics] built keys=${metrics.map((metric) => metric.key).join(",") || "none"} missing=${missingKeys.join(",") || "none"} stale=none hy_oas_percentile=${hyOasCtx ? `${hyOasCtx.historicalPercentile}th` : "unavailable"}`
  );

  return { block, metrics, missingKeys };
}

export function hasVerifiedMetricCitation(content: string, context: VerifiedMarketMetricsContext): boolean {
  const normalized = normalize(content);
  return context.metrics.some((metric) =>
    metric.citationValues.some((value) => value && normalized.includes(normalize(value)))
  );
}

export function hasMissingMetricClaim(content: string, context: VerifiedMarketMetricsContext): boolean {
  const lower = content.toLowerCase();
  return context.missingKeys.some((key) => metricMentionPattern(key).test(lower) && metricValueNearMention(lower, metricMentionPattern(key)));
}

type WatchedPattern = {
  /** Matches the VerifiedMetric.key for the instrument this watches */
  key: string;
  /** Regex that matches a mention of this metric followed by a number in the post content */
  pattern: RegExp;
  /** Returns true if the extracted numeric value is plausible for this instrument.
   *  Implausible numbers (e.g. a year "2024" found near "DXY") are ignored to avoid
   *  false positives. Ranges are conservative to avoid both over- and under-detection. */
  plausible: (value: number) => boolean;
};

const WATCHED_PATTERNS: WatchedPattern[] = [
  {
    key: "hy_oas",
    // HY OAS is expressed in bps (e.g. 450bps) — realistic range 100–2500
    pattern: /\b(?:hy oas|high[-\s]?yield(?:\s+oas|\s+spread)?|credit spread)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\s?(?:bps|bp|%)\b/gi,
    plausible: (v) => v >= 100 && v <= 2500
  },
  {
    key: "us2y",
    // 2Y Treasury yield in % — realistic range 0–10
    pattern: /\b(?:2y|2-year|2 year|two-year treasury|us 2y)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\s?%\b/gi,
    plausible: (v) => v >= 0 && v <= 10
  },
  {
    key: "us10y",
    // 10Y Treasury yield in % — realistic range 0–10
    pattern: /\b(?:10y|10-year|10 year|us 10y|treasury yield)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\s?%\b/gi,
    plausible: (v) => v >= 0 && v <= 10
  },
  {
    key: "fedfunds",
    // Fed Funds rate in % — realistic range 0–25
    pattern: /\b(?:fed funds|federal funds|policy rate)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\s?%\b/gi,
    plausible: (v) => v >= 0 && v <= 25
  },
  {
    key: "wti",
    // WTI crude in $/bbl — realistic range >0 to 250
    pattern: /\b(?:wti|crude)\b[^.\n]{0,60}?\$?\d+(?:\.\d+)?\b/gi,
    plausible: (v) => v > 0 && v <= 250
  },
  {
    key: "dxy",
    // DXY dollar index level — realistic range 50–150
    pattern: /\b(?:dxy|dollar index)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\b/gi,
    plausible: (v) => v >= 50 && v <= 150
  },
  {
    key: "vix",
    // VIX volatility index — realistic range 5–90
    pattern: /\b(?:vix)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\b/gi,
    plausible: (v) => v >= 5 && v <= 90
  }
];

export function hasUnverifiedMetricClaim(content: string, context: VerifiedMarketMetricsContext): boolean {
  const lower = content.toLowerCase();
  const allowed = new Set(context.metrics.flatMap((metric) => metric.citationValues.map(normalizeNumberText)));

  for (const wp of WATCHED_PATTERNS) {
    // Re-create regex each iteration so lastIndex is reset (the pattern source flags are "gi")
    const regex = new RegExp(wp.pattern.source, "gi");
    for (const match of lower.matchAll(regex)) {
      const numbers = match[0].match(/\d+(?:\.\d+)?/g) || [];
      for (const num of numbers) {
        const n = parseFloat(num);
        // Flag if: (a) this number is not in the allowed citation set AND
        //          (b) it is numerically plausible for this instrument
        // (implausible numbers are likely incidental — e.g. "since 2024" near "DXY")
        if (!allowed.has(normalizeNumberText(num)) && wp.plausible(n)) {
          return true;
        }
      }
    }
  }

  return false;
}

function metricFromSnapshot(snapshot: MarketSnapshotPayload, key: string): VerifiedMetric | null {
  const instrument = snapshot.instruments.find((item) => item.key === key && item.status !== "unavailable");
  if (!instrument) return null;
  const value = parseDisplayNumber(instrument.value);
  if (value === null || !isPlausibleSnapshotMetric(instrument, value)) return null;

  return {
    key,
    label: key === "sp500" ? "SPY/S&P 500" : instrument.label,
    valueText: instrument.value,
    numericValue: value,
    dateLabel: snapshot.asOf || "snapshot",
    source: `${instrument.status} snapshot: ${instrument.source}`,
    citationValues: citationValuesFor(instrument.value, value, unitForInstrument(instrument))
  };
}

function addStoredMetric(
  metrics: VerifiedMetric[],
  missingKeys: string[],
  key: string,
  label: string,
  series: HistoricalSeries,
  unit: string,
  source: string,
  transform: (value: number) => number = (value) => value
): void {
  const latest = latestObservation(series);
  if (!latest) {
    missingKeys.push(key);
    return;
  }
  const value = transform(latest.value);
  const valueText = formatMetricValue(value, unit);
  metrics.push({
    key,
    label,
    valueText,
    numericValue: value,
    dateLabel: latest.date,
    source,
    citationValues: citationValuesFor(valueText, value, unit)
  });
}

function latestObservation(series: HistoricalSeries): { date: string; value: number } | null {
  for (let index = series.observations.length - 1; index >= 0; index -= 1) {
    const observation = series.observations[index];
    if (typeof observation.value === "number" && Number.isFinite(observation.value)) {
      return { date: observation.date, value: observation.value };
    }
  }
  return null;
}

/**
 * Computes HY OAS context values from the full FRED high-yield-spread series.
 * All returned values are in basis points (bps), consistent with the ×100 transform
 * already applied in addStoredMetric for hy_oas.
 *
 * Returns null if there are fewer than 4 valid observations (insufficient for 90d mean).
 */
function computeHyOasContext(series: HistoricalSeries): {
  current: number;
  recent90dMean: number;
  historicalPercentile: number;
  observationCount: number;
} | null {
  const latest = latestObservation(series);
  if (!latest) return null;
  // FRED stores HY OAS in percentage points; ×100 converts to bps
  const current = latest.value * 100;

  const validObs = series.observations
    .filter((o) => typeof o.value === "number" && Number.isFinite(o.value as number))
    .map((o) => (o.value as number) * 100);  // convert to bps
  if (validObs.length < 4) return null;

  // 90-day mean ≈ last 3 monthly observations (FRED series is monthly)
  const last3 = validObs.slice(-3);
  const recent90dMean = Math.round(last3.reduce((a, b) => a + b, 0) / last3.length);

  // Full-series percentile rank: what fraction of historical obs are below current level?
  const below = validObs.filter((v) => v < current).length;
  const historicalPercentile = Math.round((below / validObs.length) * 100);

  return { current, recent90dMean, historicalPercentile, observationCount: validObs.length };
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === "bps") return `${Math.round(value)}bps`;
  if (unit === "%") return `${value.toFixed(2).replace(/\.00$/, "")}%`;
  return value.toFixed(Math.abs(value) >= 100 ? 0 : 2).replace(/\.00$/, "");
}

function citationValuesFor(valueText: string, value: number, unit: string): string[] {
  const rounded0 = Math.round(value).toString();
  const rounded1 = value.toFixed(1).replace(/\.0$/, "");
  const rounded2 = value.toFixed(2).replace(/\.00$/, "");
  const values = new Set([valueText, rounded0, rounded1, rounded2]);
  if (unit) {
    values.add(`${rounded0}${unit}`);
    values.add(`${rounded1}${unit}`);
    values.add(`${rounded2}${unit}`);
    values.add(`${rounded0} ${unit}`);
    values.add(`${rounded1} ${unit}`);
    values.add(`${rounded2} ${unit}`);
  }
  return [...values];
}

function parseDisplayNumber(value: string): number | null {
  const match = value.replace(/,/g, "").match(/-?[\d.]+/);
  if (!match) return null;
  const parsed = parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function unitForInstrument(instrument: SnapshotInstrument): string {
  if (/%/.test(instrument.value)) return "%";
  if (/\$/.test(instrument.value)) return "$";
  return "";
}

function isPlausibleSnapshotMetric(instrument: SnapshotInstrument, value: number): boolean {
  if (instrument.key === "us10y") return value >= 0 && value <= 10;
  if (instrument.key === "dxy") return value >= 50 && value <= 150;
  if (["wti", "brent"].includes(instrument.key)) return value > 0 && value <= 250;
  if (instrument.key === "gold") return value > 0 && value <= 10000;
  if (instrument.key === "copper") return value > 0 && value <= 20;
  return Number.isFinite(value);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/,/g, "").replace(/\s+/g, " ").trim();
}

function normalizeNumberText(value: string): string {
  return value.toLowerCase().replace(/,/g, "").replace(/\s+/g, "").replace(/\.0+(?=\D|$)/g, "");
}

function metricMentionPattern(key: string): RegExp {
  switch (key) {
    case "us2y":
      return /\b(2y|2-year|2 year|two-year treasury|us 2y)\b/i;
    case "hy_oas":
      return /\b(hy oas|high[-\s]?yield|credit spread)\b/i;
    case "fedfunds":
      return /\b(fed funds|federal funds|policy rate)\b/i;
    case "vix":
      return /\bvix\b/i;
    case "us10y":
      return /\b(10y|10-year|10 year|us 10y|treasury yield)\b/i;
    case "wti":
      return /\b(wti|crude)\b/i;
    case "dxy":
      return /\b(dxy|dollar index)\b/i;
    default:
      return new RegExp(`\\b${key}\\b`, "i");
  }
}

function metricValueNearMention(content: string, mentionPattern: RegExp): boolean {
  const match = content.match(mentionPattern);
  if (match?.index === undefined) return false;
  const segment = content.slice(match.index, match.index + 80);
  return /\d+(?:\.\d+)?\s?(?:%|bps|bp|\$)?/i.test(segment);
}
