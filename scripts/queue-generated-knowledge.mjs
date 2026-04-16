#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const knowledgeRoot = path.join(repoRoot, "knowledge");

const args = parseArgs(process.argv.slice(2));
const apiBaseUrl = args.apiBaseUrl || "http://127.0.0.1:8787";

const ingestionPlan = [
  {
    agentId: "macro-agent",
    uploads: [
      { category: "foundations", files: ["macro/historical-starter-pack.md"] },
      { category: "frameworks", files: ["macro/census-retail-industry-pack.md"] },
      { category: "event_playbooks", files: ["macro/public-report-starter-pack.md"] }
    ]
  },
  {
    agentId: "equities-agent",
    uploads: [
      { category: "foundations", files: ["equities/historical-starter-pack.md"] },
      { category: "frameworks", files: ["equities/census-retail-industry-pack.md", "equities/twelvedata-equity-watchlist-pack.md"] },
      { category: "event_playbooks", files: ["equities/public-report-starter-pack.md"] }
    ]
  },
  {
    agentId: "commodities-agent",
    uploads: [
      { category: "foundations", files: ["commodities/historical-starter-pack.md"] },
      { category: "event_playbooks", files: ["commodities/public-report-starter-pack.md"] }
    ]
  },
  {
    agentId: "fx-agent",
    uploads: [
      { category: "foundations", files: ["fx/historical-starter-pack.md"] },
      { category: "event_playbooks", files: ["fx/public-report-starter-pack.md"] }
    ]
  },
  {
    agentId: "rates-agent",
    uploads: [
      { category: "foundations", files: ["rates/historical-starter-pack.md"] },
      { category: "event_playbooks", files: ["rates/public-report-starter-pack.md"] }
    ]
  },
  {
    agentId: "risk-sentiment-agent",
    uploads: [
      { category: "foundations", files: ["risk-sentiment/historical-starter-pack.md"] },
      { category: "frameworks", files: ["risk-sentiment/census-retail-industry-pack.md"] },
      { category: "event_playbooks", files: ["risk-sentiment/public-report-starter-pack.md"] }
    ]
  }
];

await assertApiAvailable(apiBaseUrl);

console.log(`Queueing generated knowledge packs via ${apiBaseUrl}...`);

for (const plan of ingestionPlan) {
  for (const upload of plan.uploads) {
    const fileEntries = [];

    for (const relativeFile of upload.files) {
      const absolutePath = path.join(knowledgeRoot, relativeFile);

      try {
        const fileBuffer = await fs.readFile(absolutePath);
        fileEntries.push({
          filename: path.basename(absolutePath),
          blob: new Blob([fileBuffer], { type: "text/markdown" })
        });
      } catch {
        continue;
      }
    }

    if (fileEntries.length === 0) {
      continue;
    }

    const formData = new FormData();
    formData.append("category", upload.category);

    for (const entry of fileEntries) {
      formData.append("files", entry.blob, entry.filename);
    }

    const response = await fetch(`${apiBaseUrl}/api/admin/agents/${plan.agentId}/knowledge-processing/jobs`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed queueing ${plan.agentId} ${upload.category}: ${response.status} ${text}`);
    }

    const payload = await response.json();
    console.log(`  queued ${plan.agentId} ${upload.category}: job ${payload.job.id}`);
  }
}

console.log("All available generated packs have been queued. Review them in /admin before approval.");

function parseArgs(argv) {
  const parsed = {};

  for (const arg of argv) {
    if (arg.startsWith("--api=")) {
      parsed.apiBaseUrl = arg.slice("--api=".length);
    }
  }

  return parsed;
}

async function assertApiAvailable(apiBaseUrlValue) {
  const response = await fetch(`${apiBaseUrlValue}/api/health`).catch(() => null);

  if (!response || !response.ok) {
    throw new Error(
      `Could not reach the local API at ${apiBaseUrlValue}. Start it with 'npm run dev:api' before queueing generated packs.`
    );
  }
}
