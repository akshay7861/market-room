#!/usr/bin/env node

import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const knowledgeRoot = path.join(repoRoot, "knowledge");
const dataLakeRoot = path.join(knowledgeRoot, "data-lake");
const rawRoot = path.join(dataLakeRoot, "raw", "twelve_data");
const normalizedRoot = path.join(dataLakeRoot, "normalized");
const envFilePath = path.join(repoRoot, "apps", "api", ".dev.vars");

const START_DATE = "1990-01-01";
const REQUESTS_PER_MINUTE = 8;
const MINUTE_MS = 60_000;

const EQUITY_WATCHLIST = [
  {
    symbol: "SPY",
    label: "S&P 500 proxy",
    role: "Large-cap benchmark and headline index anchor.",
    themes: ["broad market", "index leadership", "beta"]
  },
  {
    symbol: "QQQ",
    label: "Nasdaq 100 proxy",
    role: "Growth and long-duration leadership anchor.",
    themes: ["growth", "AI concentration", "duration"]
  },
  {
    symbol: "IWM",
    label: "Russell 2000 proxy",
    role: "Small-cap participation and domestic breadth proxy.",
    themes: ["breadth", "small caps", "cyclicals"]
  },
  {
    symbol: "RSP",
    label: "Equal-weight S&P 500",
    role: "Breadth check versus cap-weighted index strength.",
    themes: ["breadth", "equal-weight", "participation"]
  },
  {
    symbol: "XLK",
    label: "Technology sector ETF",
    role: "Growth and software/mega-cap tech leadership proxy.",
    themes: ["technology", "leadership", "multiple sensitivity"]
  },
  {
    symbol: "SMH",
    label: "Semiconductor ETF",
    role: "AI and cyclical hardware leadership proxy.",
    themes: ["AI", "semiconductors", "capex cycle"]
  },
  {
    symbol: "XLF",
    label: "Financials sector ETF",
    role: "Bank and financial-conditions transmission proxy.",
    themes: ["banks", "credit", "rates transmission"]
  },
  {
    symbol: "KRE",
    label: "Regional banks ETF",
    role: "Smaller-bank stress and domestic credit pulse proxy.",
    themes: ["regional banks", "credit stress", "domestic lending"]
  },
  {
    symbol: "XLY",
    label: "Consumer discretionary ETF",
    role: "Consumer demand and cyclical spending proxy.",
    themes: ["consumer", "discretionary", "growth confidence"]
  },
  {
    symbol: "XLP",
    label: "Consumer staples ETF",
    role: "Defensive consumer rotation and inflation pass-through proxy.",
    themes: ["defensives", "staples", "rotation"]
  },
  {
    symbol: "XLI",
    label: "Industrials sector ETF",
    role: "Cyclical manufacturing and capital-goods participation proxy.",
    themes: ["industrials", "manufacturing", "capex"]
  },
  {
    symbol: "XLB",
    label: "Materials sector ETF",
    role: "Commodity-linked equity sensitivity proxy.",
    themes: ["materials", "commodity linkage", "cyclicals"]
  },
  {
    symbol: "XLV",
    label: "Healthcare sector ETF",
    role: "Defensive quality and lower-beta rotation proxy.",
    themes: ["healthcare", "defensive quality", "rotation"]
  },
  {
    symbol: "XLU",
    label: "Utilities sector ETF",
    role: "Bond-sensitive defensive equity proxy.",
    themes: ["utilities", "rates sensitivity", "defensives"]
  },
  {
    symbol: "XLE",
    label: "Energy sector ETF",
    role: "Commodity-led equity transmission proxy.",
    themes: ["energy", "oil beta", "inflation linkage"]
  },
  {
    symbol: "XLC",
    label: "Communication services ETF",
    role: "Internet platform and media leadership proxy.",
    themes: ["platforms", "communication services", "growth leadership"]
  },
  {
    symbol: "NVDA",
    label: "NVIDIA",
    role: "Single-name AI leadership marker.",
    themes: ["AI", "single-name leadership", "crowding"]
  },
  {
    symbol: "MSFT",
    label: "Microsoft",
    role: "Mega-cap quality growth marker.",
    themes: ["mega-cap tech", "quality growth", "AI monetization"]
  },
  {
    symbol: "AAPL",
    label: "Apple",
    role: "Mega-cap consumer-tech and index concentration marker.",
    themes: ["consumer tech", "index concentration", "hardware demand"]
  },
  {
    symbol: "JPM",
    label: "JPMorgan",
    role: "Large-bank leadership and credit-confidence marker.",
    themes: ["banks", "credit confidence", "financial leadership"]
  }
];

const args = parseArgs(process.argv.slice(2));
const startDate = args.startDate || START_DATE;
const env = loadEnvFile(envFilePath);
const apiKey = env.TWELVE_DATA_API_KEY;
const generatedAt = new Date().toISOString();

if (!apiKey) {
  throw new Error(
    "TWELVE_DATA_API_KEY is missing. Add it to apps/api/.dev.vars, then run npm run data:download:twelvedata-equities."
  );
}

await ensureDir(rawRoot);
await ensureDir(normalizedRoot);

const successful = [];
const failures = [];

console.log(`Downloading Twelve Data equities watchlist from ${startDate}...`);

let windowStartedAt = Date.now();
let windowRequestCount = 0;

for (const [index, symbolConfig] of EQUITY_WATCHLIST.entries()) {
  try {
    ({ windowStartedAt, windowRequestCount } = await respectTwelveDataFreePacing({
      windowStartedAt,
      windowRequestCount
    }));
    const fetched = await fetchTimeSeries(symbolConfig, apiKey, startDate);
    windowRequestCount += 1;
    const rawFile = path.join(rawRoot, `td_${symbolConfig.symbol.toLowerCase()}_daily.json`);
    const normalizedFile = path.join(normalizedRoot, `td_${symbolConfig.symbol.toLowerCase()}_daily.json`);

    await writeJson(rawFile, fetched.rawPayload);
    await writeJson(normalizedFile, fetched.normalized);

    successful.push({
      ...symbolConfig,
      rawFile,
      normalizedFile,
      normalized: fetched.normalized
    });

    console.log(`  OK  ${symbolConfig.symbol} ${symbolConfig.label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Twelve Data failure";
    failures.push({
      symbol: symbolConfig.symbol,
      label: symbolConfig.label,
      error: message
    });
    console.log(`  ERR ${symbolConfig.symbol}: ${message}`);
  }
}

const manifest = {
  generatedAt,
  startDate,
  provider: "twelve_data",
  seriesCount: successful.length,
  failedSeriesCount: failures.length,
  series: successful.map((item) => ({
    symbol: item.symbol,
    label: item.label,
    role: item.role,
    themes: item.themes,
    rawFile: toRepoRelative(item.rawFile),
    normalizedFile: toRepoRelative(item.normalizedFile),
    observationCount: item.normalized.observations.length,
    coverageStart: item.normalized.coverageStart,
    coverageEnd: item.normalized.coverageEnd
  })),
  failures
};

await writeJson(path.join(dataLakeRoot, "twelvedata-equities-manifest.json"), manifest);
await fs.writeFile(
  path.join(knowledgeRoot, "equities", "twelvedata-equity-watchlist-pack.md"),
  buildEquitiesPackMarkdown({
    generatedAt,
    startDate,
    successful,
    failures
  }),
  "utf8"
);

console.log("");
console.log(`Twelve Data equities pull complete. Downloaded ${successful.length} series; ${failures.length} failed.`);
console.log(`Pack: ${toRepoRelative(path.join(knowledgeRoot, "equities", "twelvedata-equity-watchlist-pack.md"))}`);

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
    const envVars = {};

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
      envVars[key] = value;
    }

    return envVars;
  } catch {
    return {};
  }
}

async function fetchTimeSeries(symbolConfig, apiKeyValue, startDateValue) {
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbolConfig.symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("start_date", startDateValue);
  url.searchParams.set("end_date", new Date().toISOString().slice(0, 10));
  url.searchParams.set("outputsize", "5000");
  url.searchParams.set("order", "ASC");
  url.searchParams.set("format", "JSON");
  url.searchParams.set("apikey", apiKeyValue);

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok || payload.code || payload.status === "error") {
    throw new Error(payload.message || payload.code || `HTTP ${response.status}`);
  }

  if (!Array.isArray(payload.values) || payload.values.length === 0) {
    throw new Error("No daily values returned.");
  }

  const observations = payload.values
    .map((row) => ({
      date: row.datetime,
      close: Number(row.close),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      volume: Number(row.volume || 0)
    }))
    .filter((row) => Number.isFinite(row.close));

  if (observations.length === 0) {
    throw new Error("No usable daily observations returned.");
  }

  return {
    rawPayload: payload,
    normalized: {
      provider: "twelve_data",
      symbol: symbolConfig.symbol,
      label: symbolConfig.label,
      role: symbolConfig.role,
      themes: symbolConfig.themes,
      frequency: "daily",
      coverageStart: observations[0]?.date || null,
      coverageEnd: observations[observations.length - 1]?.date || null,
      observationCount: observations.length,
      observations
    }
  };
}

function buildEquitiesPackMarkdown({ generatedAt, startDate: rangeStart, successful, failures }) {
  const lines = [
    "# Equities Twelve Data watchlist pack",
    "",
    `Generated at: ${generatedAt}`,
    `Coverage start target: ${rangeStart}`,
    "",
    "This pack extends the equities agent with a curated live-equity watchlist built around breadth, sector rotation, and leadership markers.",
    "",
    "## Why this pack matters",
    "",
    "- It gives the equities agent more than just SPY and QQQ.",
    "- It adds breadth checks like RSP and IWM.",
    "- It adds sector rotation proxies like XLK, XLF, XLY, XLP, XLE, and XLV.",
    "- It adds a few single-name leadership markers like NVDA, MSFT, AAPL, and JPM.",
    "",
    "## Watchlist coverage"
  ];

  for (const item of successful) {
    lines.push("");
    lines.push(`### ${item.symbol} — ${item.label}`);
    lines.push(`- Role: ${item.role}`);
    lines.push(`- Themes: ${item.themes.join(", ")}`);
    lines.push(`- Coverage: ${item.normalized.coverageStart || "unknown"} to ${item.normalized.coverageEnd || "unknown"} (${item.normalized.observationCount} daily observations)`);
    lines.push(`- Local normalized data file: ${toRepoRelative(item.normalizedFile)}`);
  }

  if (failures.length > 0) {
    lines.push("");
    lines.push("## Failed pulls");
    lines.push("");
    for (const failure of failures) {
      lines.push(`- ${failure.symbol} — ${failure.label}: ${failure.error}`);
    }
  }

  lines.push("");
  lines.push("## How to use this pack");
  lines.push("");
  lines.push("- Queue this file into the equities agent knowledge pipeline from /admin or with the batch queue.");
  lines.push("- Treat it as a sector framework pack, not a replacement for live quote infrastructure.");
  lines.push("- Use it to improve how the equities agent thinks about breadth, sector rotation, and leadership concentration.");

  return `${lines.join("\n")}\n`;
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function respectTwelveDataFreePacing({ windowStartedAt, windowRequestCount }) {
  const now = Date.now();

  if (now - windowStartedAt >= MINUTE_MS) {
    return {
      windowStartedAt: now,
      windowRequestCount: 0
    };
  }

  if (windowRequestCount < REQUESTS_PER_MINUTE) {
    return {
      windowStartedAt,
      windowRequestCount
    };
  }

  const waitMs = MINUTE_MS - (now - windowStartedAt) + 250;
  console.log(`  pacing Twelve Data free plan: waiting ${Math.ceil(waitMs / 1000)}s for the next minute window...`);
  await sleep(waitMs);

  return {
    windowStartedAt: Date.now(),
    windowRequestCount: 0
  };
}
