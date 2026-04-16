import type { AgentBehavioralSummary, ForecastWithOutcome } from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";

const OVERUSE_THRESHOLD = 4;
const STALE_DAYS = 7;

export async function refreshAgentBehavioralSummary(
  env: Env,
  agentId: string,
  roomId: string
): Promise<void> {
  const repositories = createRepositories(env);

  const [
    activeTheses,
    recentTheses,
    recentForecasts,
    recentGoodExamples,
    recentBadExamples,
    recentMessages,
    noveltyAvg
  ] = await Promise.all([
    repositories.theses.listActiveByOwner(agentId),
    repositories.theses.listRecentByOwner(agentId, 30),
    repositories.agentForecasts.listRecentResolvedWithOutcomes(agentId, 20),
    repositories.trainingExamples.listRecentByLabel(agentId, "good", 20),
    repositories.trainingExamples.listRecentByLabel(agentId, "bad", 20),
    fetchRecentAgentMessages(env, agentId, roomId, 20),
    fetchAvgNoveltyScore7d(env, agentId)
  ]);

  const openTopics = [...new Set(activeTheses.map((t) => t.topicPrimary))];

  const recentThemeCounts: Record<string, number> = {};
  for (const t of recentTheses) {
    recentThemeCounts[t.topicPrimary] = (recentThemeCounts[t.topicPrimary] || 0) + 1;
  }

  const recentlyOverusedFrames = Object.entries(recentThemeCounts)
    .filter(([, count]) => count >= OVERUSE_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);

  const recentCatalystCounts: Record<string, number> = {};
  for (const m of recentMessages) {
    if (m.catalyst) {
      recentCatalystCounts[m.catalyst] = (recentCatalystCounts[m.catalyst] || 0) + 1;
    }
  }

  const recentPostModes: Record<string, number> = {};
  for (const m of recentMessages) {
    const mode = m.thesisUpdateType || (m.thesisId ? "thesis_reference" : "standalone");
    recentPostModes[mode] = (recentPostModes[mode] || 0) + 1;
  }

  const { hitRate, confidenceBias } = computeForecastMetrics(recentForecasts);

  const totalExamples = recentGoodExamples.length + recentBadExamples.length;
  const lowValuePostRate = totalExamples > 0 ? recentBadExamples.length / totalExamples : null;

  const topicsToDeprioritize = recentlyOverusedFrames.filter((theme) => {
    const instrumentForecasts = recentForecasts.filter(
      (f) => f.targetInstrumentKey.toLowerCase().includes(theme.toLowerCase().replace(/ /g, "_"))
    );
    if (instrumentForecasts.length < 2) return true;
    const correct = instrumentForecasts.filter((f) => f.outcomeLabel === "correct").length;
    return correct / instrumentForecasts.length < 0.5;
  });

  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const topicsToRevisit = activeTheses
    .filter((t) =>
      t.status === "waiting_for_data" ||
      (["open", "developing"].includes(t.status) && t.lastUpdatedAt < staleCutoff)
    )
    .map((t) => t.topicPrimary);

  const disagreementTargets = await fetchDisagreementTargets(env, agentId, roomId, 20);

  const state: AgentBehavioralSummary = {
    agentId,
    activeThesisCount: activeTheses.length,
    openTopics,
    recentThemeCounts,
    recentCatalystCounts,
    recentPostModes,
    recentlyOverusedFrames,
    last20HitRate: hitRate,
    last20LowValuePostRate: lowValuePostRate,
    confidenceBiasScore: confidenceBias,
    topicsToDeprioritize,
    topicsToRevisit: [...new Set(topicsToRevisit)],
    recentDisagreementTargets: disagreementTargets,
    avgNoveltyScore7d: noveltyAvg,
    lastUpdatedAt: now.toISOString()
  };

  await repositories.agentState.upsert(state);
}

export function buildStatePromptBlock(state: AgentBehavioralSummary): string {
  const lines: string[] = ["## Your Behavioral State"];

  lines.push(`- Active theses: ${state.activeThesisCount}${state.openTopics.length > 0 ? ` (topics: ${state.openTopics.slice(0, 5).map(humanize).join(", ")})` : ""}`);

  if (state.last20HitRate != null) {
    lines.push(`- Recent accuracy: ${(state.last20HitRate * 100).toFixed(0)}% (last 20 scored calls)`);
  }

  if (state.confidenceBiasScore != null) {
    const bias = state.confidenceBiasScore;
    if (Math.abs(bias) > 0.05) {
      const direction = bias > 0 ? "overconfident" : "underconfident";
      lines.push(`- Confidence calibration: ${bias > 0 ? "+" : ""}${bias.toFixed(2)} ${direction} — ${bias > 0 ? "moderate your high-conviction calls" : "trust your analysis more"}`);
    } else {
      lines.push("- Confidence calibration: well-calibrated");
    }
  }

  if (state.recentlyOverusedFrames.length > 0) {
    const frameParts = state.recentlyOverusedFrames.slice(0, 3).map((f) => {
      const count = state.recentThemeCounts[f] || 0;
      return `"${humanize(f)}" (${count}x)`;
    });
    lines.push(`- Overused frames: ${frameParts.join(", ")} — find fresh angles`);
  }

  if (state.topicsToRevisit.length > 0) {
    lines.push(`- Topics to revisit: ${state.topicsToRevisit.slice(0, 3).map(humanize).join(", ")} — stale or awaiting data`);
  }

  if (state.topicsToDeprioritize.length > 0) {
    lines.push(`- Topics to deprioritize: ${state.topicsToDeprioritize.slice(0, 3).map(humanize).join(", ")} — overexposed or low hit rate`);
  }

  if (state.recentDisagreementTargets.length > 0) {
    lines.push(`- Frequent disagreements with: ${state.recentDisagreementTargets.slice(0, 3).join(", ")} — ensure genuine analytical basis`);
  }

  if (state.avgNoveltyScore7d != null) {
    const novelty = state.avgNoveltyScore7d;
    if (novelty < 0.5) {
      lines.push(`- Novelty score (7d avg): ${novelty.toFixed(2)} — push for more original analysis`);
    } else if (novelty >= 0.7) {
      lines.push(`- Novelty score (7d avg): ${novelty.toFixed(2)} — good originality, maintain it`);
    }
  }

  if (state.last20LowValuePostRate != null && state.last20LowValuePostRate > 0.3) {
    lines.push(`- Low-value post rate: ${(state.last20LowValuePostRate * 100).toFixed(0)}% — prioritize quality over frequency`);
  }

  return lines.join("\n");
}

function computeForecastMetrics(forecasts: ForecastWithOutcome[]): {
  hitRate: number | null;
  confidenceBias: number | null;
} {
  const scored = forecasts.filter((f) => f.outcomeLabel);
  if (scored.length === 0) return { hitRate: null, confidenceBias: null };

  const correct = scored.filter((f) => f.outcomeLabel === "correct").length;
  const hitRate = correct / scored.length;

  const avgConfidence = scored.reduce((sum, f) => sum + f.confidence, 0) / scored.length;
  const confidenceBias = avgConfidence - hitRate;

  return { hitRate, confidenceBias };
}

type RecentMessage = {
  catalyst: string | null;
  thesisId: string | null;
  thesisUpdateType: string | null;
};

async function fetchRecentAgentMessages(
  env: Env,
  agentId: string,
  roomId: string,
  limit: number
): Promise<RecentMessage[]> {
  const result = await env.DB.prepare(
    `SELECT
      m.catalyst,
      m.thesis_id AS thesisId,
      tu.update_type AS thesisUpdateType
    FROM messages m
    LEFT JOIN thesis_updates tu ON tu.id = m.thesis_update_id
    WHERE m.agent_id = ? AND m.room_id = ? AND m.message_type = 'post'
    ORDER BY m.created_at DESC
    LIMIT ?`
  )
    .bind(agentId, roomId, limit)
    .all<RecentMessage>();

  return result.results;
}

async function fetchAvgNoveltyScore7d(env: Env, agentId: string): Promise<number | null> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const row = await env.DB.prepare(
    `SELECT AVG(distinctiveness_score) AS avg_novelty
     FROM agent_evaluations
     WHERE agent_id = ? AND created_at >= ?`
  )
    .bind(agentId, cutoff)
    .first<{ avg_novelty: number | null }>();

  return row?.avg_novelty ?? null;
}

async function fetchDisagreementTargets(
  env: Env,
  agentId: string,
  roomId: string,
  limit: number
): Promise<string[]> {
  const result = await env.DB.prepare(
    `SELECT a.name AS targetName, COUNT(*) AS cnt
     FROM messages comment
     INNER JOIN messages parent ON parent.id = comment.parent_message_id
     INNER JOIN agents a ON a.id = parent.agent_id
     WHERE comment.agent_id = ?
       AND comment.room_id = ?
       AND comment.message_type = 'comment'
       AND parent.agent_id != comment.agent_id
       AND (
         (comment.stance = 'bearish' AND parent.stance = 'bullish')
         OR (comment.stance = 'bullish' AND parent.stance = 'bearish')
       )
     GROUP BY parent.agent_id
     HAVING cnt >= 2
     ORDER BY cnt DESC
     LIMIT ?`
  )
    .bind(agentId, roomId, limit)
    .all<{ targetName: string; cnt: number }>();

  return result.results.map((r) => r.targetName);
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
