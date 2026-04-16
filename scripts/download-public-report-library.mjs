#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const knowledgeRoot = path.join(repoRoot, "knowledge");
const reportRoot = path.join(knowledgeRoot, "report-library");
const rawRoot = path.join(reportRoot, "raw");

const FED_PAGES = [
  {
    id: "fomc_historical",
    url: "https://www.federalreserve.gov/monetarypolicy/fomc_historical.htm",
    filename: "fomc-historical-index.md",
    label: "FOMC historical materials index"
  },
  {
    id: "fomc_strategy_history",
    url: "https://www.federalreserve.gov/monetarypolicy/historical-statements-on-longer-run-goals-and-monetary-policy-strategy.htm",
    filename: "fomc-strategy-history.md",
    label: "FOMC strategy statement history"
  },
  {
    id: "fomc_calendars",
    url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
    filename: "fomc-calendars.md",
    label: "FOMC calendars and statements page"
  }
];

const BLS_SOURCES = [
  {
    id: "bls_cpi_archive",
    url: "https://www.bls.gov/bls/news-release/cpi.htm",
    filename: "cpi-archive-status.md",
    label: "BLS CPI archive"
  },
  {
    id: "bls_employment_archive",
    url: "https://www.bls.gov/bls/news-release/empsit.htm",
    filename: "employment-situation-archive-status.md",
    label: "BLS Employment Situation archive"
  }
];

const EIA_STEO_URL = "https://www.eia.gov/outlooks/steo/";
const EIA_STEO_LIMIT = 12;

await ensureDir(rawRoot);
await ensureDir(path.join(rawRoot, "federal-reserve"));
await ensureDir(path.join(rawRoot, "eia"));
await ensureDir(path.join(rawRoot, "bls"));

const generatedAt = new Date().toISOString();
const manifestEntries = [];
const providerStatus = [];

console.log("Downloading public report library...");

for (const page of FED_PAGES) {
  const html = await fetchText(page.url);
  const markdown = buildSourceMarkdown(page.label, page.url, htmlToMarkdownish(html));
  const filePath = path.join(rawRoot, "federal-reserve", page.filename);
  await fs.writeFile(filePath, markdown, "utf8");
  manifestEntries.push({
    source: "federal-reserve",
    label: page.label,
    url: page.url,
    file: toRepoRelative(filePath)
  });
  providerStatus.push({
    source: "federal-reserve",
    status: "ok",
    note: `Downloaded ${page.label}.`
  });
  console.log(`  OK  ${page.label}`);
}

const eiaLandingHtml = await fetchText(EIA_STEO_URL);
const eiaLandingFile = path.join(rawRoot, "eia", "steo-index.md");
await fs.writeFile(
  eiaLandingFile,
  buildSourceMarkdown("EIA Short-Term Energy Outlook index", EIA_STEO_URL, htmlToMarkdownish(eiaLandingHtml)),
  "utf8"
);
manifestEntries.push({
  source: "eia",
  label: "EIA Short-Term Energy Outlook index",
  url: EIA_STEO_URL,
  file: toRepoRelative(eiaLandingFile)
});
providerStatus.push({
  source: "eia",
  status: "ok",
  note: "Downloaded the EIA STEO index page."
});
console.log("  OK  EIA STEO index");

const steoPdfLinks = Array.from(
  new Set(
    [...eiaLandingHtml.matchAll(/outlooks\/steo\/archives\/[A-Za-z0-9_-]+\.pdf/gu)].map((match) => `https://www.eia.gov/${match[0]}`)
  )
).slice(0, EIA_STEO_LIMIT);

for (const pdfUrl of steoPdfLinks) {
  const filename = path.basename(new URL(pdfUrl).pathname);
  const buffer = await fetchBuffer(pdfUrl);
  const filePath = path.join(rawRoot, "eia", filename);
  await fs.writeFile(filePath, buffer);
  manifestEntries.push({
    source: "eia",
    label: `EIA STEO archive ${filename.replace(".pdf", "")}`,
    url: pdfUrl,
    file: toRepoRelative(filePath)
  });
  console.log(`  OK  ${filename}`);
}

providerStatus.push({
  source: "eia",
  status: "ok",
  note: `Downloaded ${steoPdfLinks.length} STEO archive PDFs.`
});

for (const source of BLS_SOURCES) {
  try {
    const response = await fetch(source.url, {
      headers: {
        Accept: "text/html"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const markdown = buildSourceMarkdown(source.label, source.url, htmlToMarkdownish(html));
    const filePath = path.join(rawRoot, "bls", source.filename);
    await fs.writeFile(filePath, markdown, "utf8");
    manifestEntries.push({
      source: "bls",
      label: source.label,
      url: source.url,
      file: toRepoRelative(filePath)
    });
    providerStatus.push({
      source: "bls",
      status: "ok",
      note: `Downloaded ${source.label}.`
    });
    console.log(`  OK  ${source.label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const filePath = path.join(rawRoot, "bls", source.filename);
    await fs.writeFile(
      filePath,
      [
        `# ${source.label}`,
        "",
        `Official URL: ${source.url}`,
        "",
        `The download attempt from this environment failed with: ${message}`,
        "",
        "This is still useful operationally because it records the exact official source that should be retried later from a browser-friendly environment."
      ].join("\n"),
      "utf8"
    );
    manifestEntries.push({
      source: "bls",
      label: source.label,
      url: source.url,
      file: toRepoRelative(filePath)
    });
    providerStatus.push({
      source: "bls",
      status: "error",
      note: `Could not fetch ${source.label}: ${message}`
    });
    console.log(`  ERR ${source.label}: ${message}`);
  }
}

await writeJson(path.join(reportRoot, "manifest.json"), {
  generatedAt,
  fileCount: manifestEntries.length,
  entries: manifestEntries,
  providers: providerStatus
});

await fs.writeFile(
  path.join(reportRoot, "download-report.md"),
  buildReportLibrarySummary({
    generatedAt,
    manifestEntries,
    providerStatus
  }),
  "utf8"
);

for (const pack of buildSectorReportPacks(manifestEntries)) {
  const packPath = path.join(knowledgeRoot, pack.slug, "public-report-starter-pack.md");
  await fs.writeFile(packPath, pack.content, "utf8");
}

console.log("Public report library complete.");
console.log(`Manifest: ${toRepoRelative(path.join(reportRoot, "manifest.json"))}`);

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function buildSourceMarkdown(title, url, body) {
  return [`# ${title}`, "", `Source URL: ${url}`, "", body].join("\n");
}

function htmlToMarkdownish(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/giu, " ")
    .replace(/<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|tr)>/giu, "\n")
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&quot;/gu, "\"")
    .replace(/&#39;/gu, "'")
    .replace(/\n{3,}/gu, "\n\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();
}

function buildReportLibrarySummary({ generatedAt, manifestEntries, providerStatus }) {
  const lines = [
    "# Public report library download report",
    "",
    `Generated: ${generatedAt}`,
    `Downloaded files: ${manifestEntries.length}`,
    "",
    "## Provider status",
    ""
  ];

  for (const status of providerStatus) {
    lines.push(`- ${status.source}: ${status.status} — ${status.note}`);
  }

  lines.push("");
  lines.push("## Key outputs");
  lines.push("");

  for (const entry of manifestEntries.slice(0, 20)) {
    lines.push(`- ${entry.label}: ${entry.file}`);
  }

  return lines.join("\n");
}

function buildSectorReportPacks(entries) {
  const grouped = {
    "macro": entries.filter((entry) => ["federal-reserve", "eia", "bls"].includes(entry.source)),
    "rates": entries.filter((entry) => ["federal-reserve", "bls"].includes(entry.source)),
    "fx": entries.filter((entry) => ["federal-reserve", "bls"].includes(entry.source)),
    "commodities": entries.filter((entry) => entry.source === "eia"),
    "equities": entries.filter((entry) => ["federal-reserve", "bls"].includes(entry.source)),
    "risk-sentiment": entries.filter((entry) => ["federal-reserve", "bls", "eia"].includes(entry.source))
  };

  return Object.entries(grouped).map(([slug, files]) => ({
    slug,
    content: [
      `# ${titleForSlug(slug)} public report starter pack`,
      "",
      "_Auto-generated from official public report sources._",
      "",
      "## Why this exists",
      "",
      descriptionForSlug(slug),
      "",
      "## Files included",
      "",
      ...files.map((entry) => `- ${entry.label}: ${entry.file}`),
      "",
      "## How to use it",
      "",
      "- Upload this pack into the processor queue so the model can turn the raw report set into cleaner reusable memory.",
      "- Pair it with the historical starter packs so reports and time series reinforce each other.",
      "- Approve only the distilled outputs that read cleanly and actually add insight."
    ].join("\n")
  }));
}

function titleForSlug(slug) {
  switch (slug) {
    case "macro":
      return "Macro";
    case "rates":
      return "Rates";
    case "fx":
      return "FX";
    case "commodities":
      return "Commodities";
    case "equities":
      return "Equities";
    case "risk-sentiment":
      return "Risk / Sentiment";
    default:
      return slug;
  }
}

function descriptionForSlug(slug) {
  switch (slug) {
    case "macro":
      return "This pack gives the Macro agent official policy, labour, inflation, and energy report anchors for regime comparison.";
    case "rates":
      return "This pack gives the Rates agent policy and labour/inflation report context for front-end and duration repricing analysis.";
    case "fx":
      return "This pack gives the FX agent policy and macro release context for dollar and rate-differential narratives.";
    case "commodities":
      return "This pack gives the Commodities agent official energy outlook materials that complement price and inventory history.";
    case "equities":
      return "This pack gives the Equities agent policy and macro release context that can reshape multiples, leadership, and sector rotation.";
    case "risk-sentiment":
      return "This pack gives the Risk / Sentiment agent official cross-asset catalyst material for stress, liquidity, and risk appetite changes.";
    default:
      return "This pack groups public reports for the relevant agent.";
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function ensureDir(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath);
}
