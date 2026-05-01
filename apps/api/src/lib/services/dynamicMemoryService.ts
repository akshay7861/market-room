import type { Agent, DynamicMemoryContext, ForecastWithOutcome, Thesis, TrainingExample } from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";

const ACTIVE_THESIS_STATUSES = new Set(["open", "developing", "waiting_for_data", "reopened"]);

export type FrozenPeerThesisSnapshotRow = {
  agentId: string;
  agentName: string;
  status: string;
  confidence: number | null;
  updatedAt: string;
  claim: string;
  source: "thesis" | "memory_summary";
};

type ThesisUpdateRow = {
  thesisId: string;
  summary: string;
  createdAt: string;
};

export async function refreshDynamicHouseViews(
  env: Env,
  agents: Agent[],
  triggerEventId: string | null
): Promise<void> {
  for (const agent of agents) {
    await refreshDynamicHouseView(env, agent, triggerEventId);
  }
}

export async function refreshDynamicHouseView(
  env: Env,
  agent: Agent,
  triggerEventId: string | null
): Promise<string> {
  const repositories = createRepositories(env);
  const context = await buildDynamicMemoryContext(env, agent);
  const nextSummary = context.houseView;

  if (!hasMaterialMemoryChange(agent.memorySummary, nextSummary)) {
    console.log(
      `[memory-refresh:${agent.name}] skipped update, no material change`
    );
    return agent.memorySummary;
  }

  const updatedAt = new Date().toISOString();
  await repositories.memoryUpdates.create({
    id: crypto.randomUUID(),
    agentId: agent.id,
    oldSummary: agent.memorySummary,
    newSummary: nextSummary,
    triggerEventId,
    createdAt: updatedAt
  });
  await repositories.agents.updateMemorySummary(agent.id, nextSummary, updatedAt);

  console.log(
    `[memory-refresh:${agent.name}] updated summary because thesis state changed materially`
  );

  return nextSummary;
}

export async function buildDynamicMemoryContext(
  env: Env,
  agentOrId: Agent | string
): Promise<DynamicMemoryContext> {
  const repositories = createRepositories(env);
  const agent =
    typeof agentOrId === "string"
      ? await repositories.agents.getById(agentOrId)
      : agentOrId;

  if (!agent) {
    return {
      houseView: "No current house view is available yet.",
      openTheses: "No open theses right now.",
      strongTopics: "No clear strong topics yet.",
      weakTopics: "No clear weak topics yet.",
      calibration: "Not enough resolved forecasts yet to calibrate confidence."
    };
  }

  const [
    activeTheses,
    recentTheses,
    recentMessages,
    resolvedForecasts,
    goodExamples,
    badExamples,
    agentState,
    thesisUpdates
  ] = await Promise.all([
    repositories.theses.listActiveByOwner(agent.id),
    repositories.theses.listRecentByOwner(agent.id, 12),
    repositories.messages.listRecentByAgent(agent.id, 6),
    repositories.agentForecasts.listRecentResolvedWithOutcomes(agent.id, 20),
    repositories.trainingExamples.listRecentByLabel(agent.id, "good", 6),
    repositories.trainingExamples.listRecentByLabel(agent.id, "bad", 6),
    repositories.agentState.getByAgentId(agent.id),
    listRecentThesisUpdates(env, agent.id, 20)
  ]);

  const updateSummaryByThesisId = new Map<string, string>();
  for (const update of thesisUpdates) {
    if (!updateSummaryByThesisId.has(update.thesisId)) {
      updateSummaryByThesisId.set(update.thesisId, update.summary);
    }
  }

  // D1/D3: For FX/Macro/Rates — filter theses to sector-relevant topics and cap to 1.
  // These three agents recycle the same cross-sector thesis ("tightening regime") for weeks.
  // Narrowing scope forces each post to use a thesis that actually belongs to the agent's domain.
  const isTemplatedAgent = ["FX", "Macro", "Rates"].includes(agent.sector);
  const sectorThesisKeys: Record<string, string[]> = {
    FX: ["fx", "currency", "dollar", "dxy", "yen", "euro", "pound", "carry", "exchange rate", "usd"],
    Macro: ["macro", "inflation", "gdp", "employment", "fed", "fomc", "cpi", "pce", "fiscal", "labor", "monetary"],
    Rates: ["rates", "yield", "treasury", "curve", "duration", "auction", "term premium", "bond", "breakeven"],
  };
  let effectiveActiveTheses = activeTheses;
  let effectiveRecentTheses = recentTheses;
  if (isTemplatedAgent) {
    const keys = sectorThesisKeys[agent.sector] ?? [];
    effectiveActiveTheses = activeTheses
      .filter(t => {
        const topic = (t.topicPrimary || "").toLowerCase();
        if (!topic) return true; // keep neutral topics
        return keys.some(k => topic.includes(k));
      })
      .slice(0, 1); // D3: cap to 1 active thesis
    effectiveRecentTheses = recentTheses.slice(0, 1); // D3: cap recent also
  }

  // D2: Staleness decay — if the top active thesis content appears in 3+ of the last 6 messages,
  // prefix its summary with a STALE warning so the agent knows to refresh rather than repeat.
  if (isTemplatedAgent && effectiveActiveTheses.length > 0) {
    const topThesis = effectiveActiveTheses[0];
    const claim = updateSummaryByThesisId.get(topThesis.id) || topThesis.canonicalClaim || topThesis.title || "";
    const matchWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 5).slice(0, 3);
    if (matchWords.length > 0) {
      const appearCount = recentMessages.filter(m =>
        matchWords.some(w => (m.content || "").toLowerCase().includes(w))
      ).length;
      if (appearCount >= 3) {
        const existing = updateSummaryByThesisId.get(topThesis.id) || claim;
        updateSummaryByThesisId.set(topThesis.id, `[STALE — refresh with new data this post] ${existing}`);
      }
    }
  }

  return {
    houseView: buildHouseView(agent.memorySummary, effectiveActiveTheses, effectiveRecentTheses, recentMessages, updateSummaryByThesisId),
    openTheses: buildOpenThesesBlock(activeTheses),
    strongTopics: buildStrongTopicsBlock(resolvedForecasts, goodExamples, recentTheses),
    weakTopics: buildWeakTopicsBlock(resolvedForecasts, badExamples, agentState?.topicsToDeprioritize || []),
    calibration: buildCalibrationBlock(resolvedForecasts)
  };
}

export function buildDynamicMemoryPromptBlock(agent: Agent, context: DynamicMemoryContext): string {
  console.log(
    `[memory-inject:${agent.name}] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration`
  );

  // Build calibration enforcement: make it a mandatory rule, not just a metric
  const calibrationBlock = buildCalibrationEnforcementBlock(context.calibration);

  return [
    "## Dynamic Memory",
    `- Current house view: ${context.houseView}`,
    `- Open theses: ${context.openTheses}`,
    `- Known strong topics: ${context.strongTopics}`,
    `- Known weak topics: ${context.weakTopics}`,
    calibrationBlock
  ].join("\n");
}

function buildCalibrationEnforcementBlock(calibration: string): string {
  if (calibration.includes("Not enough")) {
    return `- Forecast calibration: ${calibration} — default to qualified language ("likely", "suggests") until track record is established.`;
  }

  // Parse accuracy from the calibration string (format: "Accuracy NN% on last N resolved calls")
  const accuracyMatch = calibration.match(/Accuracy\s+(\d+)%/);
  const biasMatch = calibration.match(/Bias\s+([+-]?\d+\.\d+)/);
  const accuracy = accuracyMatch ? parseInt(accuracyMatch[1], 10) : null;
  const bias = biasMatch ? parseFloat(biasMatch[1]) : null;

  const lines: string[] = [`- CALIBRATION ENFORCEMENT — ${calibration}`];

  if (accuracy !== null && accuracy < 55) {
    lines.push(
      "  Your recent accuracy is below 55%. RULE: qualify every directional call with the specific condition that would prove it wrong. Do not use words like 'clearly', 'certainly', or 'obviously'. Prefer 'the data suggests' or 'the risk is skewed toward'."
    );
  } else if (accuracy !== null && accuracy < 65) {
    lines.push(
      "  Your recent accuracy is moderate. RULE: name one concrete invalidation condition for your directional call. Do not project high conviction without cross-asset confirmation."
    );
  } else if (accuracy !== null) {
    lines.push(
      "  Your recent accuracy is solid. Maintain discipline: still name the specific level or data point that would change your view."
    );
  }

  if (bias !== null && bias > 0.1) {
    lines.push(
      `  Overconfidence bias detected (+${bias.toFixed(2)}). RULE: reduce expressed certainty by one level — 'expect' becomes 'lean toward', 'will' becomes 'likely'. Demand stronger confirmation before committing to high conviction.`
    );
  } else if (bias !== null && bias < -0.1) {
    lines.push(
      `  Underconfidence bias detected (${bias.toFixed(2)}). When evidence aligns across multiple signals, trust your conviction and state it clearly.`
    );
  }

  return lines.join("\n");
}

export async function buildFrozenPeerThesisSnapshot(
  env: Env,
  agents: Agent[]
): Promise<FrozenPeerThesisSnapshotRow[]> {
  const repositories = createRepositories(env);
  const snapshots = await Promise.all(
    agents.map(async (peerAgent): Promise<FrozenPeerThesisSnapshotRow> => {
      const peerTheses = await repositories.theses.listActiveByOwner(peerAgent.id);
      const topThesis = peerTheses[0];
      if (topThesis) {
        return {
          agentId: peerAgent.id,
          agentName: peerAgent.name,
          status: topThesis.status || "open",
          confidence: topThesis.confidenceCurrent ?? null,
          updatedAt: topThesis.lastUpdatedAt || topThesis.createdAt || new Date().toISOString(),
          claim: topThesis.canonicalClaim || topThesis.title,
          source: "thesis"
        };
      }

      return {
        agentId: peerAgent.id,
        agentName: peerAgent.name,
        status: "memory_summary",
        confidence: null,
        updatedAt: peerAgent.updatedAt,
        claim: peerAgent.memorySummary || "No current peer thesis available.",
        source: "memory_summary"
      };
    })
  );

  return snapshots;
}

export function buildPeerAgentThesesView(
  agent: Agent,
  peerSnapshot: FrozenPeerThesisSnapshotRow[],
  nowIso: string
): string {
  const peerRows = peerSnapshot.filter((row) => row.agentId !== agent.id);
  if (peerRows.length === 0) {
    return "";
  }

  const lines = peerRows.map((row) => {
    const confidence = row.confidence != null ? `${Math.round(row.confidence * 100)}%` : "n/a";
    return `  • [${row.agentId}, ${row.status}, ${confidence}, ${freshnessLabel(row.updatedAt, nowIso)}] ${row.claim}`;
  });

  return [
    "PEER DESK VIEWS (current top peer theses for this run):",
    ...lines,
    "Use a directly relevant peer thesis where it matters: agree and add sector evidence, disagree and state the counter-mechanism, or extend the chain forward. Never silently diverge from a directly relevant peer thesis."
  ].join("\n");
}

function freshnessLabel(updatedAt: string, nowIso: string): string {
  const updatedMillis = Date.parse(updatedAt);
  const nowMillis = Date.parse(nowIso);
  if (!Number.isFinite(updatedMillis) || !Number.isFinite(nowMillis)) {
    return "updated recently";
  }
  const hours = Math.max(0, Math.round((nowMillis - updatedMillis) / (1000 * 60 * 60)));
  if (hours < 1) {
    return "updated <1h ago";
  }
  return `updated ${hours}h ago`;
}

async function listRecentThesisUpdates(
  env: Env,
  agentId: string,
  limit: number
): Promise<ThesisUpdateRow[]> {
  const result = await env.DB.prepare(
    `SELECT
      thesis_id AS thesisId,
      summary,
      created_at AS createdAt
     FROM thesis_updates
     WHERE agent_id = ?
       AND summary IS NOT NULL
       AND TRIM(summary) != ''
     ORDER BY created_at DESC
     LIMIT ?`
  )
    .bind(agentId, limit)
    .all<ThesisUpdateRow>();

  return result.results;
}

function buildHouseView(
  existingSummary: string,
  activeTheses: Thesis[],
  recentTheses: Thesis[],
  recentMessages: Array<{ title: string | null; catalyst: string | null; content: string }>,
  updateSummaryByThesisId: Map<string, string>
): string {
  if (activeTheses.length > 0) {
    const fragments = activeTheses
      .slice(0, 2)
      .map((thesis) => {
        const topic = humanize(thesis.topicPrimary || "general");
        const confidence = thesis.confidenceCurrent != null ? ` ${Math.round(thesis.confidenceCurrent * 100)}%` : "";
        const source = updateSummaryByThesisId.get(thesis.id) || thesis.canonicalClaim || thesis.title;
        return `${topic} ${thesis.status}${confidence}: ${trimToWordLimit(cleanClause(source), 10)}`;
      });

    return trimToWordLimit(fragments.join(" | "), 45);
  }

  if (recentTheses.length > 0) {
    const fragments = recentTheses
      .slice(0, 2)
      .map((thesis) => `${humanize(thesis.topicPrimary || "general")} ${thesis.status}: ${trimToWordLimit(cleanClause(thesis.title), 6)}`);
    return trimToWordLimit(`Recent focus: ${fragments.join(" | ")}`, 45);
  }

  if (recentMessages.length > 0) {
    const message = recentMessages[0];
    const focus = message.title || message.catalyst || cleanClause(message.content);
    return trimToWordLimit(`Recent focus: ${focus}`, 45);
  }

  return trimToWordLimit(existingSummary || "No current house view is available yet.", 45);
}

function buildOpenThesesBlock(activeTheses: Thesis[]): string {
  if (activeTheses.length === 0) {
    return "No open theses right now.";
  }

  return activeTheses
    .slice(0, 3)
    .map((thesis) => {
      const confidence = thesis.confidenceCurrent != null ? `${Math.round(thesis.confidenceCurrent * 100)}%` : "n/a";
      return `"${thesis.title}" [${thesis.status}, ${confidence}]`;
    })
    .join("; ");
}

function buildStrongTopicsBlock(
  forecasts: ForecastWithOutcome[],
  goodExamples: TrainingExample[],
  recentTheses: Thesis[]
): string {
  const ranked = rankForecastTopics(forecasts)
    .filter((entry) => entry.total >= 2 && entry.correctRatio >= 0.6)
    .slice(0, 3)
    .map((entry) => `${entry.label} (${entry.correct}/${entry.total} correct recent calls)`);

  if (ranked.length > 0) {
    return ranked.join("; ");
  }

  const thesisTopics = [...new Set(recentTheses.slice(0, 3).map((thesis) => humanize(thesis.topicPrimary || "")).filter(Boolean))];
  if (thesisTopics.length > 0 && goodExamples.length > 0) {
    return thesisTopics.map((topic) => `${topic} (supported by recent strong examples)`).join("; ");
  }

  return "No clear strong topics yet.";
}

function buildWeakTopicsBlock(
  forecasts: ForecastWithOutcome[],
  badExamples: TrainingExample[],
  deprioritizedTopics: string[]
): string {
  const weakForecasts = rankForecastTopics(forecasts)
    .filter((entry) => entry.total >= 2 && entry.correctRatio < 0.5)
    .slice(0, 2)
    .map((entry) => `${entry.label} (${entry.correct}/${entry.total} correct recent calls)`);

  const weakTopics = [...new Set([
    ...deprioritizedTopics.slice(0, 2).map(humanize),
    ...weakForecasts
  ])];

  if (weakTopics.length > 0) {
    return weakTopics.join("; ");
  }

  if (badExamples.length > 0) {
    return trimToWordLimit(cleanClause(badExamples[0].feedbackSummary), 18);
  }

  return "No clear weak topics yet.";
}

function buildCalibrationBlock(forecasts: ForecastWithOutcome[]): string {
  const scored = forecasts.filter((forecast) => Boolean(forecast.outcomeLabel));
  if (scored.length === 0) {
    return "Not enough resolved forecasts yet to calibrate confidence.";
  }

  const correct = scored.filter((forecast) => forecast.outcomeLabel === "correct").length;
  const hitRate = correct / scored.length;
  const averageConfidence = scored.reduce((sum, forecast) => sum + forecast.confidence, 0) / scored.length;
  const bias = averageConfidence - hitRate;

  const highConfidence = scored.filter((forecast) => forecast.confidence >= 0.7);
  const highConfidenceCorrect = highConfidence.filter((forecast) => forecast.outcomeLabel === "correct").length;
  const highConfidenceSummary =
    highConfidence.length >= 2
      ? ` High-conviction hit rate ${Math.round((highConfidenceCorrect / highConfidence.length) * 100)}%.`
      : "";

  const biasSummary =
    Math.abs(bias) < 0.05
      ? " Confidence is roughly calibrated."
      : bias > 0
        ? ` Bias +${bias.toFixed(2)}: trim conviction unless confirmation is strong.`
        : ` Bias ${bias.toFixed(2)}: trust conviction slightly more when evidence is aligned.`;

  return `Accuracy ${Math.round(hitRate * 100)}% on last ${scored.length} resolved calls.${highConfidenceSummary}${biasSummary}`;
}

function rankForecastTopics(forecasts: ForecastWithOutcome[]): Array<{
  label: string;
  total: number;
  correct: number;
  correctRatio: number;
}> {
  const byInstrument = new Map<string, { label: string; total: number; correct: number }>();

  for (const forecast of forecasts) {
    if (!forecast.outcomeLabel) continue;
    const key = forecast.targetInstrumentKey || forecast.targetInstrumentLabel;
    const entry = byInstrument.get(key) || {
      label: forecast.targetInstrumentLabel || humanize(forecast.targetInstrumentKey),
      total: 0,
      correct: 0
    };
    entry.total += 1;
    if (forecast.outcomeLabel === "correct") {
      entry.correct += 1;
    }
    byInstrument.set(key, entry);
  }

  return [...byInstrument.values()]
    .map((entry) => ({
      ...entry,
      correctRatio: entry.total > 0 ? entry.correct / entry.total : 0
    }))
    .sort((left, right) => right.correctRatio - left.correctRatio || right.total - left.total);
}

function hasMaterialMemoryChange(previous: string, next: string): boolean {
  return normalizeMemory(previous) !== normalizeMemory(next);
}

function normalizeMemory(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanClause(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").replace(/^[-:;,\s]+|[-:;,\s]+$/g, "").trim();
}

function trimToWordLimit(value: string, maxWords: number): string {
  const words = cleanClause(value).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ").trim()}...`;
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
