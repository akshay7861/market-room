#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const envFilePath = path.join(repoRoot, "apps", "api", ".dev.vars");
const knowledgeRoot = path.join(repoRoot, "knowledge");
const dataLakeRoot = path.join(knowledgeRoot, "data-lake");
const rawRoot = path.join(dataLakeRoot, "raw", "census");
const normalizedRoot = path.join(dataLakeRoot, "normalized");
const execFileAsync = promisify(execFile);

const RETAIL_CATEGORIES = [
  {
    code: "441",
    label: "Motor vehicle and parts dealers",
    why: "Useful for auto demand, consumer financing sensitivity, and cyclical spending."
  },
  {
    code: "444",
    label: "Building material and garden equipment dealers",
    why: "Useful for housing-linked demand and home-improvement cycles."
  },
  {
    code: "445",
    label: "Food and beverage stores",
    why: "Useful for staple consumption trends and real-income squeeze context."
  },
  {
    code: "446",
    label: "Health and personal care stores",
    why: "Useful for defensive consumption mix and household resilience."
  },
  {
    code: "447",
    label: "Gasoline stations",
    why: "Useful for energy pass-through and nominal consumer spending distortions."
  },
  {
    code: "448",
    label: "Clothing and clothing accessories stores",
    why: "Useful for discretionary demand and seasonal weakness or strength."
  },
  {
    code: "452",
    label: "General merchandise stores",
    why: "Useful for mass-market retail demand and broad consumer-health checks."
  },
  {
    code: "453",
    label: "Miscellaneous store retailers",
    why: "Useful for small discretionary categories and retail breadth."
  },
  {
    code: "454",
    label: "Nonstore retailers",
    why: "Useful for ecommerce strength and distribution-channel shifts."
  },
  {
    code: "722",
    label: "Food services and drinking places",
    why: "Useful for services demand, labour intensity, and confidence in out-of-home spending."
  }
];

const args = parseArgs(process.argv.slice(2));
const startMonth = args.startMonth || "1992-01";
const endMonth = args.endMonth || currentMonth();
const concurrency = Number(args.concurrency || 8);
const env = loadEnvFile(envFilePath);

if (!env.CENSUS_API_KEY) {
  console.error("CENSUS_API_KEY is missing in apps/api/.dev.vars");
  process.exit(1);
}

await ensureDir(rawRoot);
await ensureDir(normalizedRoot);

const months = enumerateMonths(startMonth, endMonth);
const rawRows = [];
const observationsByCategory = new Map(RETAIL_CATEGORIES.map((category) => [category.code, []]));

console.log(`Downloading Census retail-industry history from ${startMonth} to ${endMonth}...`);

let processedMonths = 0;
const monthResults = await runWithConcurrency(months, concurrency, async (month) => {
  const rows = await fetchCensusMonth(month, env.CENSUS_API_KEY);
  processedMonths += 1;

  if (processedMonths % 24 === 0 || processedMonths === months.length) {
    console.log(`  processed ${processedMonths}/${months.length} months`);
  }

  return { month, rows };
});

for (const result of monthResults.sort((left, right) => left.month.localeCompare(right.month))) {
  rawRows.push(result);

  for (const row of result.rows) {
    if (!observationsByCategory.has(row.category_code)) {
      continue;
    }

    observationsByCategory.get(row.category_code).push({
      date: row.time,
      value: Number(row.cell_value)
    });
  }
}

const generatedAt = new Date().toISOString();
const normalizedSeries = [];

await writeJson(path.join(rawRoot, "census_retail_selected_categories.json"), {
  generatedAt,
  startMonth,
  endMonth,
  categories: RETAIL_CATEGORIES,
  months: rawRows
});

for (const category of RETAIL_CATEGORIES) {
  const observations = (observationsByCategory.get(category.code) || [])
    .filter((entry) => Number.isFinite(entry.value))
    .sort((left, right) => left.date.localeCompare(right.date));

  const normalized = {
    id: `census_retail_${category.code}`,
    source: "census",
    label: category.label,
    description: `US Census MRTS monthly retail sales for ${category.label}.`,
    usageNote: category.why,
    frequency: "monthly",
    units: "million_usd",
    categoryCode: category.code,
    observationCount: observations.length,
    coverageStart: observations[0]?.date || null,
    coverageEnd: observations[observations.length - 1]?.date || null,
    summary: buildSummary(observations),
    observations
  };

  const normalizedPath = path.join(normalizedRoot, `${normalized.id}.json`);
  await writeJson(normalizedPath, normalized);
  normalizedSeries.push({
    ...normalized,
    normalizedPath
  });
}

await fs.writeFile(
  path.join(dataLakeRoot, "census-retail-download-report.md"),
  buildDownloadReport({
    generatedAt,
    startMonth,
    endMonth,
    normalizedSeries
  }),
  "utf8"
);

for (const target of [
  { slug: "macro", title: "Macro Census retail-industry pack", agent: "Macro Agent" },
  { slug: "equities", title: "Equities Census retail-industry pack", agent: "Equities Agent" },
  { slug: "risk-sentiment", title: "Risk / Sentiment Census retail-industry pack", agent: "Risk/Sentiment Agent" }
]) {
  await fs.writeFile(
    path.join(knowledgeRoot, target.slug, "census-retail-industry-pack.md"),
    buildSectorPackMarkdown({
      generatedAt,
      startMonth,
      endMonth,
      title: target.title,
      agent: target.agent,
      series: normalizedSeries,
      slug: target.slug
    }),
    "utf8"
  );
}

console.log("Census retail-industry history complete.");
console.log(`Report: ${toRepoRelative(path.join(dataLakeRoot, "census-retail-download-report.md"))}`);

function parseArgs(argv) {
  const parsed = {};

  for (const arg of argv) {
    if (arg.startsWith("--start=")) {
      parsed.startMonth = arg.slice("--start=".length);
    }

    if (arg.startsWith("--end=")) {
      parsed.endMonth = arg.slice("--end=".length);
    }

    if (arg.startsWith("--concurrency=")) {
      parsed.concurrency = arg.slice("--concurrency=".length);
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

      env[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim();
    }

    return env;
  } catch {
    return {};
  }
}

async function fetchCensusMonth(month, apiKey) {
  const args = [
    "-sG",
    "https://api.census.gov/data/timeseries/eits/mrts",
    "--data-urlencode",
    "get=cell_value,category_code",
    "--data-urlencode",
    "data_type_code=SM",
    "--data-urlencode",
    "seasonally_adj=yes",
    "--data-urlencode",
    "time_slot_id=0",
    "--data-urlencode",
    `time=${month}`,
    "--data-urlencode",
    `key=${apiKey}`
  ];

  const { stdout } = await execFileAsync("curl", args, {
    cwd: repoRoot,
    maxBuffer: 10 * 1024 * 1024
  });

  if (!stdout.trim()) {
    return [];
  }

  const payload = JSON.parse(stdout);

  if (!Array.isArray(payload) || payload.length < 2) {
    return [];
  }

  const [header, ...rows] = payload;

  return rows
    .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]])))
    .filter((row) => RETAIL_CATEGORIES.some((category) => category.code === row.category_code));
}

async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

function enumerateMonths(start, end) {
  const months = [];
  let cursor = new Date(`${start}-01T00:00:00Z`);
  const endDate = new Date(`${end}-01T00:00:00Z`);

  while (cursor <= endDate) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function buildSummary(observations) {
  const latest = observations[observations.length - 1];
  const previous = observations[observations.length - 2];
  const annual = observations[observations.length - 13];

  return {
    latestDate: latest?.date || null,
    latestValue: latest?.value ?? null,
    previousDate: previous?.date || null,
    previousValue: previous?.value ?? null,
    periodChangePct: pctChange(previous?.value, latest?.value),
    annualChangePct: pctChange(annual?.value, latest?.value)
  };
}

function pctChange(fromValue, toValue) {
  if (!Number.isFinite(fromValue) || !Number.isFinite(toValue) || fromValue === 0) {
    return null;
  }

  return ((toValue - fromValue) / Math.abs(fromValue)) * 100;
}

function buildDownloadReport({ generatedAt, startMonth, endMonth, normalizedSeries }) {
  const lines = [
    "# Census retail-industry download report",
    "",
    `Generated: ${generatedAt}`,
    `Coverage: ${startMonth} to ${endMonth}`,
    "",
    "## Included categories",
    ""
  ];

  for (const series of normalizedSeries) {
    lines.push(
      `- ${series.label}: ${series.observationCount} observations from ${series.coverageStart} to ${series.coverageEnd}`
    );
  }

  lines.push("");
  lines.push("## Sector packs");
  lines.push("");
  lines.push("- knowledge/macro/census-retail-industry-pack.md");
  lines.push("- knowledge/equities/census-retail-industry-pack.md");
  lines.push("- knowledge/risk-sentiment/census-retail-industry-pack.md");

  return lines.join("\n");
}

function buildSectorPackMarkdown({ generatedAt, startMonth, endMonth, title, agent, series, slug }) {
  const lines = [
    `# ${title}`,
    "",
    "_Auto-generated from the US Census MRTS API._",
    "",
    `Generated: ${generatedAt}`,
    `Coverage: ${startMonth} to ${endMonth}`,
    "",
    "## Why this exists",
    "",
    `${agent} can use this pack to compare current consumer spending leadership with prior discretionary, staple, housing, and services demand regimes.`,
    "",
    "## How to use it",
    "",
    "- Upload this file into the relevant agent memory or queue it through the processor for review.",
    "- Pair it with earnings notes, CPI/job releases, and sector post-mortems.",
    "- Use it to frame whether demand is broadening, narrowing, or skewing toward defensive categories.",
    "",
    "## Series included",
    ""
  ];

  for (const entry of series) {
    lines.push(`### ${entry.label}`);
    lines.push(`- Coverage: ${entry.coverageStart} to ${entry.coverageEnd} (${entry.observationCount} observations)`);
    lines.push(`- Latest: ${formatNumber(entry.summary.latestValue)} million USD on ${entry.summary.latestDate}`);
    lines.push(`- Month-over-month change: ${formatPct(entry.summary.periodChangePct)}`);
    lines.push(`- Year-over-year change: ${formatPct(entry.summary.annualChangePct)}`);
    lines.push(`- Why it matters: ${entry.usageNote}`);
    lines.push(`- Local normalized data file: ${toRepoRelative(entry.normalizedPath)}`);
    lines.push("");
  }

  lines.push("## Agent framing prompts");
  lines.push("");

  for (const prompt of promptsForSlug(slug)) {
    lines.push(`- ${prompt}`);
  }

  return lines.join("\n");
}

function promptsForSlug(slug) {
  switch (slug) {
    case "macro":
      return [
        "Check whether consumer demand is concentrated in staples or broadening into cyclicals.",
        "Compare current retail mix with prior growth scares, inflation squeezes, and post-shock recoveries.",
        "Explain which category shift matters most for the macro view."
      ];
    case "equities":
      return [
        "Check whether consumer-facing sectors line up with the retail-spending mix.",
        "Compare current category leadership with prior retail rotation and margin-pressure regimes.",
        "Explain which industry group should benefit or suffer if the current spending mix persists."
      ];
    case "risk-sentiment":
      return [
        "Check whether spending breadth supports risk-taking or hints at defensive behaviour.",
        "Compare the current consumer mix with prior de-risking and re-risking episodes.",
        "Explain whether spending concentration confirms or challenges the current sentiment signal."
      ];
    default:
      return [
        "Compare the current retail spending mix with prior demand regimes."
      ];
  }
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

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2
  });
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath);
}
