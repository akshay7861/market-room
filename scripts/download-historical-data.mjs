#!/usr/bin/env node

import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGENT_PACKS,
  ALPHA_VANTAGE_REQUEST_DELAY_MS,
  STARTER_DEFAULT_START_DATE,
  STARTER_SERIES_CATALOG
} from "./historical-data-catalog.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const knowledgeRoot = path.join(repoRoot, "knowledge");
const dataLakeRoot = path.join(knowledgeRoot, "data-lake");
const rawRoot = path.join(dataLakeRoot, "raw");
const normalizedRoot = path.join(dataLakeRoot, "normalized");
const envFilePath = path.join(repoRoot, "apps", "api", ".dev.vars");

const args = parseArgs(process.argv.slice(2));
const startDate = args.startDate || STARTER_DEFAULT_START_DATE;
const env = loadEnvFile(envFilePath);
const generatedAt = new Date().toISOString();
const providerStatus = [];
const successfulSeries = [];
const failedSeries = [];

await ensureDir(rawRoot);
await ensureDir(normalizedRoot);

console.log(`Downloading historical starter pack from ${startDate}...`);

for (const series of STARTER_SERIES_CATALOG) {
  const apiKey = getApiKeyForSeries(env, series.source);

  if (!apiKey) {
    providerStatus.push({
      source: series.source,
      status: "skipped",
      note: `Skipped ${series.label} because ${series.source.toUpperCase()} is not configured.`
    });
    failedSeries.push({
      id: series.id,
      label: series.label,
      source: series.source,
      error: `${series.source.toUpperCase()} API key missing`
    });
    continue;
  }

  try {
    const fetched = await fetchSeries(series, apiKey, startDate);
    const rawDir = path.join(rawRoot, series.source);
    await ensureDir(rawDir);

    const rawFile = path.join(rawDir, `${series.id}.json`);
    const normalizedFile = path.join(normalizedRoot, `${series.id}.json`);

    await writeJson(rawFile, fetched.rawPayload);
    await writeJson(normalizedFile, fetched.normalized);

    successfulSeries.push({
      ...series,
      rawFile,
      normalizedFile,
      normalized: fetched.normalized
    });

    providerStatus.push({
      source: series.source,
      status: "ok",
      note: `Downloaded ${series.label} with ${fetched.normalized.observations.length} observations.`
    });

    console.log(`  OK  ${series.label}`);

    if (series.source === "alpha_vantage") {
      await sleep(ALPHA_VANTAGE_REQUEST_DELAY_MS);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown download failure";
    failedSeries.push({
      id: series.id,
      label: series.label,
      source: series.source,
      error: message
    });
    providerStatus.push({
      source: series.source,
      status: "error",
      note: `Failed ${series.label}: ${message}`
    });
    console.log(`  ERR ${series.label}: ${message}`);

    if (series.source === "alpha_vantage") {
      await sleep(ALPHA_VANTAGE_REQUEST_DELAY_MS);
    }
  }
}

providerStatus.push(await validateBeaKey(env.BEA_API_KEY));
providerStatus.push({
  source: "census",
  status: env.CENSUS_API_KEY ? "configured" : "skipped",
  note: env.CENSUS_API_KEY
    ? "Census key is configured. The starter pack currently uses FRED retail history while detailed Census retail-industry range pulls are deferred to phase 2 because the EITS API needs month-by-month pagination."
    : "Census key is not configured."
});

const manifest = {
  generatedAt,
  startDate,
  seriesCount: successfulSeries.length,
  failedSeriesCount: failedSeries.length,
  providers: summarizeProviders(providerStatus),
  series: successfulSeries.map((series) => ({
    id: series.id,
    label: series.label,
    source: series.source,
    frequency: series.frequency,
    agents: series.agents,
    rawFile: toRepoRelative(series.rawFile),
    normalizedFile: toRepoRelative(series.normalizedFile),
    observationCount: series.normalized.observations.length,
    coverageStart: series.normalized.coverageStart,
    coverageEnd: series.normalized.coverageEnd
  })),
  failures: failedSeries
};

await writeJson(path.join(dataLakeRoot, "manifest.json"), manifest);
await writeJson(path.join(dataLakeRoot, "provider-status.json"), providerStatus);
await fs.writeFile(
  path.join(dataLakeRoot, "download-report.md"),
  buildDownloadReport({
    generatedAt,
    startDate,
    successfulSeries,
    failedSeries,
    providerStatus
  }),
  "utf8"
);

for (const [agentId, pack] of Object.entries(AGENT_PACKS)) {
  const agentSeries = successfulSeries.filter((series) => series.agents.includes(agentId));
  const packPath = path.join(knowledgeRoot, pack.slug, "historical-starter-pack.md");
  await fs.writeFile(
    packPath,
    buildAgentPackMarkdown({
      agentId,
      pack,
      series: agentSeries,
      generatedAt,
      startDate
    }),
    "utf8"
  );
}

console.log("");
console.log(`Starter pack complete. Downloaded ${successfulSeries.length} series; ${failedSeries.length} failed.`);
console.log(`Manifest: ${toRepoRelative(path.join(dataLakeRoot, "manifest.json"))}`);
console.log("Generated sector packs:");

for (const pack of Object.values(AGENT_PACKS)) {
  console.log(`  - ${toRepoRelative(path.join(knowledgeRoot, pack.slug, "historical-starter-pack.md"))}`);
}

function parseArgs(argv) {
  const parsed = {};

  for (const arg of argv) {
    if (arg.startsWith("--start=")) {
      parsed.startDate = arg.slice("--start=".length);
    }
  }

  return parsed;
}

function loadEnvFile(filePath) {
  try {
    const file = readFileSync(filePath, "utf8");
    const env = {};

    for (const rawLine of file.split(/\r?\n/u)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#")) {
        continue;
      }

      const separatorIndex = line.indexOf("=");

      if (separatorIndex < 0) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      env[key] = value;
    }

    return env;
  } catch {
    return {};
  }
}

function getApiKeyForSeries(envVars, source) {
  switch (source) {
    case "fred":
      return envVars.FRED_API_KEY;
    case "eia":
      return envVars.EIA_API_KEY;
    case "alpha_vantage":
      return envVars.ALPHA_VANTAGE_API_KEY;
    default:
      return undefined;
  }
}

async function fetchSeries(series, apiKey, startDateValue) {
  switch (series.source) {
    case "fred":
      return fetchFredSeries(series, apiKey, startDateValue);
    case "eia":
      return fetchEiaSeries(series, apiKey, startDateValue);
    case "alpha_vantage":
      return fetchAlphaVantageSeries(series, apiKey);
    default:
      throw new Error(`Unsupported source: ${series.source}`);
  }
}

async function fetchFredSeries(series, apiKey, startDateValue) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", series.sourceSeriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", startDateValue);

  const payload = await fetchJson(url);

  if (!Array.isArray(payload.observations)) {
    throw new Error("FRED returned no observations array.");
  }

  const observations = payload.observations
    .filter((row) => row?.value && row.value !== ".")
    .map((row) => ({
      date: row.date,
      value: Number(row.value)
    }))
    .filter((row) => Number.isFinite(row.value));

  if (observations.length === 0) {
    throw new Error("FRED returned no usable observations.");
  }

  return {
    rawPayload: payload,
    normalized: buildNormalizedSeries(series, observations, payload.units || null)
  };
}

async function fetchEiaSeries(series, apiKey, startDateValue) {
  const url = new URL(`https://api.eia.gov${series.path}`);

  for (const [key, value] of Object.entries(series.params || {})) {
    url.searchParams.append(key, value);
  }

  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("start", formatEiaStart(series.frequency, startDateValue));

  const payload = await fetchJson(url);
  const rows = payload?.response?.data;

  if (!Array.isArray(rows)) {
    throw new Error(payload?.error || "EIA returned no data array.");
  }

  const observations = rows
    .map((row) => ({
      date: row.period,
      value: Number(row.value)
    }))
    .filter((row) => Number.isFinite(row.value))
    .sort((left, right) => left.date.localeCompare(right.date));

  if (observations.length === 0) {
    throw new Error("EIA returned no usable observations.");
  }

  const units = rows.find((row) => typeof row.units === "string")?.units || null;

  return {
    rawPayload: payload,
    normalized: buildNormalizedSeries(series, observations, units)
  };
}

async function fetchAlphaVantageSeries(series, apiKey) {
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", series.functionName);
  url.searchParams.set("symbol", series.symbol);
  url.searchParams.set("apikey", apiKey);

  if (series.market) {
    url.searchParams.set("market", series.market);
  }

  if (series.functionName === "TIME_SERIES_MONTHLY_ADJUSTED") {
    url.searchParams.set("outputsize", "full");
  }

  const payload = await fetchJson(url);

  if (payload.Note || payload.Information?.includes("premium") || payload.Information?.includes("free API requests")) {
    throw new Error(payload.Note || payload.Information);
  }

  const seriesKey =
    payload["Monthly Adjusted Time Series"] || payload["Time Series (Digital Currency Monthly)"];

  if (!seriesKey || typeof seriesKey !== "object") {
    throw new Error("Alpha Vantage returned no supported time series payload.");
  }

  const observations = Object.entries(seriesKey)
    .map(([date, point]) => ({
      date,
      value: pickAlphaVantageValue(point)
    }))
    .filter((row) => Number.isFinite(row.value))
    .sort((left, right) => left.date.localeCompare(right.date));

  if (observations.length === 0) {
    throw new Error("Alpha Vantage returned no usable observations.");
  }

  return {
    rawPayload: payload,
    normalized: buildNormalizedSeries(series, observations, null)
  };
}

function pickAlphaVantageValue(point) {
  if (!point || typeof point !== "object") {
    return Number.NaN;
  }

  const prioritizedKeys = [
    "5. adjusted close",
    "4b. close (USD)",
    "4. close",
    "4a. close (USD)",
    "4a. close (USD)"
  ];

  for (const key of prioritizedKeys) {
    if (typeof point[key] === "string") {
      const numericValue = Number(point[key]);

      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }
  }

  for (const value of Object.values(point)) {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return Number.NaN;
}

function buildNormalizedSeries(series, observations, units) {
  const firstObservation = observations[0];
  const lastObservation = observations[observations.length - 1];

  return {
    id: series.id,
    source: series.source,
    label: series.label,
    description: series.description,
    usageNote: series.usageNote,
    frequency: series.frequency,
    units,
    agents: series.agents,
    observationCount: observations.length,
    coverageStart: firstObservation?.date || null,
    coverageEnd: lastObservation?.date || null,
    summary: buildSeriesSummary(series.frequency, observations),
    observations
  };
}

function buildSeriesSummary(frequency, observations) {
  const latest = observations[observations.length - 1];
  const previous = observations[observations.length - 2] || null;
  const annualLookback = annualLookbackByFrequency(frequency);
  const annualBaseline = observations.length > annualLookback ? observations[observations.length - 1 - annualLookback] : null;

  return {
    latestDate: latest?.date || null,
    latestValue: latest?.value ?? null,
    previousDate: previous?.date || null,
    previousValue: previous?.value ?? null,
    periodChangePct: calculatePctChange(previous?.value, latest?.value),
    annualChangePct: calculatePctChange(annualBaseline?.value, latest?.value)
  };
}

function annualLookbackByFrequency(frequency) {
  switch (frequency) {
    case "quarterly":
      return 4;
    case "weekly":
      return 52;
    case "daily":
      return 252;
    case "monthly":
    default:
      return 12;
  }
}

function calculatePctChange(fromValue, toValue) {
  if (!Number.isFinite(fromValue) || !Number.isFinite(toValue) || fromValue === 0) {
    return null;
  }

  return ((toValue - fromValue) / Math.abs(fromValue)) * 100;
}

async function validateBeaKey(apiKey) {
  if (!apiKey) {
    return {
      source: "bea",
      status: "skipped",
      note: "BEA key is not configured."
    };
  }

  try {
    const url = new URL("https://apps.bea.gov/api/data");
    url.searchParams.set("UserID", apiKey);
    url.searchParams.set("method", "GETDATA");
    url.searchParams.set("datasetname", "NIPA");
    url.searchParams.set("TableName", "T10105");
    url.searchParams.set("LineNumber", "1");
    url.searchParams.set("Frequency", "Q");
    url.searchParams.set("Year", "2024");
    url.searchParams.set("ResultFormat", "json");

    const payload = await fetchJson(url);
    const errorDescription = payload?.BEAAPI?.Results?.Error?.APIErrorDescription;

    if (errorDescription) {
      return {
        source: "bea",
        status: "error",
        note: `BEA key validation failed: ${errorDescription}`
      };
    }

    return {
      source: "bea",
      status: "configured",
      note: "BEA key validated successfully. The starter pack still leans on FRED GDP for now because it is simpler to normalize."
    };
  } catch (error) {
    return {
      source: "bea",
      status: "error",
      note: `BEA key validation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

function buildAgentPackMarkdown({ agentId, pack, series, generatedAt: generatedAtValue, startDate: startDateValue }) {
  const lines = [
    `# ${pack.title}`,
    "",
    "_Auto-generated historical context pack._",
    "",
    `Generated: ${generatedAtValue}`,
    `Historical floor: ${startDateValue}`,
    "",
    "## Why this exists",
    "",
    pack.focus,
    "",
    "Use this pack as durable sector memory. It is meant to help the agent compare current conditions with older cycles, squeezes, disinflations, inventory shocks, valuation resets, and recovery phases.",
    "",
    "## How to use it",
    "",
    "- Upload this markdown into the relevant agent memory after a quick human review.",
    "- Pair it with event playbooks, policy reports, and post-mortems rather than treating it as a standalone forecast engine.",
    "- Refresh it periodically so new regimes get added without losing the long historical anchors.",
    "",
    "## Series included",
    ""
  ];

  if (series.length === 0) {
    lines.push("No successful series were downloaded for this pack yet.");
    return lines.join("\n");
  }

  for (const entry of series) {
    const summary = entry.normalized.summary;

    lines.push(`### ${entry.label}`);
    lines.push(`- Source: ${formatSourceLabel(entry.source)}`);
    lines.push(`- Coverage: ${entry.normalized.coverageStart} to ${entry.normalized.coverageEnd} (${entry.normalized.observationCount} observations)`);
    lines.push(`- Latest: ${formatNumeric(summary.latestValue)}${entry.normalized.units ? ` ${entry.normalized.units}` : ""} on ${summary.latestDate}`);
    lines.push(
      `- Change versus previous observation: ${formatPct(summary.periodChangePct)}`
    );
    lines.push(`- Approximate one-year change: ${formatPct(summary.annualChangePct)}`);
    lines.push(`- Why it matters: ${entry.usageNote}`);
    lines.push(`- Local normalized data file: ${toRepoRelative(entry.normalizedFile)}`);
    lines.push("");
  }

  lines.push("## Agent framing prompts");
  lines.push("");

  for (const prompt of buildPromptBullets(agentId)) {
    lines.push(`- ${prompt}`);
  }

  return lines.join("\n");
}

function buildPromptBullets(agentId) {
  switch (agentId) {
    case "macro-agent":
      return [
        "Compare today’s inflation, labour, and policy mix with prior late-cycle and early-easing regimes.",
        "Check whether growth, inflation, and real-yield signals are aligned or conflicted.",
        "Flag what would invalidate the current macro regime analogy."
      ];
    case "equities-agent":
      return [
        "Compare index leadership with prior narrow-breadth, broadening, and derating regimes.",
        "Check whether rates and credit conditions support or fight the current equity trend.",
        "Separate tactical momentum from durable earnings or sector-rotation change."
      ];
    case "commodities-agent":
      return [
        "Compare today’s commodity tape with prior supply shocks, demand slumps, and inventory squeezes.",
        "Translate raw-material moves into inflation, margins, and policy risk.",
        "Call out whether inventory direction confirms or contradicts the price signal."
      ];
    case "fx-agent":
      return [
        "Compare current dollar behaviour with prior divergence, carry unwind, and dollar shortage episodes.",
        "Check whether rate differentials and risk sentiment are reinforcing each other.",
        "Explain which cross-asset signal most clearly supports or challenges the FX view."
      ];
    case "rates-agent":
      return [
        "Compare the current curve shape with prior hiking, pause, and easing transitions.",
        "Check whether inflation expectations and growth data justify the latest duration move.",
        "Explain where the front end and long end are sending different messages."
      ];
    case "risk-sentiment-agent":
      return [
        "Compare current volatility, spreads, and proxy asset performance with prior de-risking and re-risking episodes.",
        "Check whether stress is broadening beyond one asset class or staying contained.",
        "Explain which cross-asset divergence matters most for market positioning right now."
      ];
    default:
      return [
        "Compare today’s setup with prior market regimes and explain the strongest analog."
      ];
  }
}

function buildDownloadReport({ generatedAt: generatedAtValue, startDate: startDateValue, successfulSeries, failedSeries: failedSeriesValue, providerStatus: providerStatusValue }) {
  const lines = [
    "# Historical data download report",
    "",
    `Generated: ${generatedAtValue}`,
    `Historical floor: ${startDateValue}`,
    "",
    `Successful series: ${successfulSeries.length}`,
    `Failed series: ${failedSeriesValue.length}`,
    "",
    "## Provider status",
    ""
  ];

  for (const status of providerStatusValue) {
    lines.push(`- ${status.source}: ${status.status} — ${status.note}`);
  }

  lines.push("");
  lines.push("## Sector packs");
  lines.push("");

  for (const pack of Object.values(AGENT_PACKS)) {
    lines.push(`- ${toRepoRelative(path.join(knowledgeRoot, pack.slug, "historical-starter-pack.md"))}`);
  }

  if (failedSeriesValue.length > 0) {
    lines.push("");
    lines.push("## Failures");
    lines.push("");

    for (const failure of failedSeriesValue) {
      lines.push(`- ${failure.label} (${failure.source}): ${failure.error}`);
    }
  }

  lines.push("");
  lines.push("## Recommended next step");
  lines.push("");
  lines.push("1. Review the generated sector markdown packs.");
  lines.push("2. Upload the strongest packs and supporting reports through the Admin batch queue.");
  lines.push("3. Approve only the processed notes and market cases that read cleanly.");

  return lines.join("\n");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function formatEiaStart(frequency, startDateValue) {
  if (frequency === "monthly") {
    return startDateValue.slice(0, 7);
  }

  return startDateValue;
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function ensureDir(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

function formatPct(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatNumeric(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2
    });
  }

  return value.toFixed(2);
}

function formatSourceLabel(source) {
  switch (source) {
    case "fred":
      return "FRED";
    case "eia":
      return "EIA";
    case "alpha_vantage":
      return "Alpha Vantage";
    default:
      return source;
  }
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath);
}

function summarizeProviders(statuses) {
  const summary = {};

  for (const status of statuses) {
    summary[status.source] = summary[status.source] || { ok: 0, error: 0, skipped: 0, configured: 0 };
    const bucket = summary[status.source];

    if (status.status === "ok") {
      bucket.ok += 1;
    } else if (status.status === "error") {
      bucket.error += 1;
    } else if (status.status === "configured") {
      bucket.configured += 1;
    } else {
      bucket.skipped += 1;
    }
  }

  return summary;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
