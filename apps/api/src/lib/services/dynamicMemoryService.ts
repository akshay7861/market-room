import type { Agent, DynamicMemoryContext, ForecastWithOutcome, Thesis, TrainingExample } from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";

const ACTIVE_THESIS_STATUSES = new Set(["open", "developing", "waiting_for_data", "reopened"]);

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

  return {
    houseView: buildHouseView(agent.memorySummary, activeTheses, recentTheses, recentMessages, updateSummaryByThesisId),
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

  return [
    "## Dynamic Memory",
    `- Current house view: ${context.houseView}`,
    `- Open theses: ${context.openTheses}`,
    `- Known strong topics: ${context.strongTopics}`,
    `- Known weak topics: ${context.weakTopics}`,
    `- Recent forecasting calibration: ${context.calibration}`
  ].join("\n");
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
