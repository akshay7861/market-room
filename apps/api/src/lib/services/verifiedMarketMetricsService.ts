import type { MarketSnapshotPayload, SnapshotInstrument } from "@market-room/shared";
import fredFedFunds from "../../../../../knowledge/data-lake/normalized/fred_fedfunds.json";
import fredHighYieldSpread from "../../../../../knowledge/data-lake/normalized/fred_high_yield_spread.json";
import fredUnemployment from "../../../../../knowledge/data-lake/normalized/fred_unemployment.json";
import fredUs2y from "../../../../../knowledge/data-lake/normalized/fred_us2y.json";
import fredVix from "../../../../../knowledge/data-lake/normalized/fred_vix.json";

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

  addStoredMetric(metrics, missingKeys, "us2y", "US 2Y yield", fredUs2y as HistoricalSeries, "%", "data lake: FRED US2Y");
  addStoredMetric(metrics, missingKeys, "fedfunds", "Fed Funds", fredFedFunds as HistoricalSeries, "%", "data lake: FRED Fed Funds");
  addStoredMetric(metrics, missingKeys, "hy_oas", "HY OAS", fredHighYieldSpread as HistoricalSeries, "bps", "data lake: FRED HY OAS", (value) => value * 100);
  addStoredMetric(metrics, missingKeys, "vix", "VIX", fredVix as HistoricalSeries, "", "data lake: FRED VIX");
  addStoredMetric(metrics, missingKeys, "unemployment", "Unemployment rate", fredUnemployment as HistoricalSeries, "%", "data lake: FRED unemployment");

  const block = [
    "VERIFIED MARKET METRICS:",
    "Use this as the only source for live/current market numbers. You may also cite numbers from article text, historical-data blocks, analog blocks, chart data, or explicitly labelled stored correlations.",
    "Do NOT invent or approximate HY OAS, 2Y, 10Y, Fed Funds, WTI, DXY, SPY/S&P, VIX, gold, or unemployment if the value is unavailable below.",
    ...metrics.map((metric) => `- ${metric.label}: ${metric.valueText} [${metric.source}, ${metric.dateLabel}]`),
    missingKeys.length > 0 ? `Unavailable verified metrics: ${missingKeys.join(", ")}.` : "Unavailable verified metrics: none.",
    "Citation rule: if a metric is listed as unavailable, discuss the mechanism qualitatively and do not attach a precise number."
  ].join("\n");

  console.log(
    `[verified-metrics] built keys=${metrics.map((metric) => metric.key).join(",") || "none"} missing=${missingKeys.join(",") || "none"} stale=none`
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

export function hasUnverifiedMetricClaim(content: string, context: VerifiedMarketMetricsContext): boolean {
  const lower = content.toLowerCase();
  const allowed = new Set(context.metrics.flatMap((metric) => metric.citationValues.map(normalizeNumberText)));
  const watchedPatterns = [
    /\b(?:hy oas|high[-\s]?yield(?:\s+oas|\s+spread)?|credit spread)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\s?(?:bps|bp|%)\b/gi,
    /\b(?:2y|2-year|2 year|two-year treasury|us 2y)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\s?%\b/gi,
    /\b(?:10y|10-year|10 year|us 10y|treasury yield)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\s?%\b/gi,
    /\b(?:fed funds|federal funds|policy rate)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\s?%\b/gi,
    /\b(?:wti|crude)\b[^.\n]{0,60}?\$?\d+(?:\.\d+)?\b/gi,
    /\b(?:dxy|dollar index)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\b/gi,
    /\b(?:vix)\b[^.\n]{0,60}?\b\d+(?:\.\d+)?\b/gi
  ];

  for (const pattern of watchedPatterns) {
    for (const match of lower.matchAll(pattern)) {
      const numbers = match[0].match(/\d+(?:\.\d+)?/g) || [];
      const hasAllowedNumber = numbers.some((number) => allowed.has(normalizeNumberText(number)));
      if (!hasAllowedNumber) {
        return true;
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
  if (/\$/.test(instrument.value)) return "";
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
