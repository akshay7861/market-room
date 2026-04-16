import type { AgentBehavioralSummary } from "@market-room/shared";
import type { Env } from "../../index";

type AgentStateRow = {
  agent_id: string;
  active_thesis_count: number;
  open_topics_json: string;
  recent_theme_counts_json: string;
  recent_catalyst_counts_json: string;
  recent_post_modes_json: string;
  recently_overused_frames_json: string;
  last_20_hit_rate: number | null;
  last_20_low_value_post_rate: number | null;
  confidence_bias_score: number | null;
  topics_to_deprioritize_json: string;
  topics_to_revisit_json: string;
  recent_disagreement_targets_json: string;
  avg_novelty_score_7d: number | null;
  last_updated_at: string;
};

function mapRow(row: AgentStateRow): AgentBehavioralSummary {
  return {
    agentId: row.agent_id,
    activeThesisCount: row.active_thesis_count,
    openTopics: JSON.parse(row.open_topics_json),
    recentThemeCounts: JSON.parse(row.recent_theme_counts_json),
    recentCatalystCounts: JSON.parse(row.recent_catalyst_counts_json),
    recentPostModes: JSON.parse(row.recent_post_modes_json),
    recentlyOverusedFrames: JSON.parse(row.recently_overused_frames_json),
    last20HitRate: row.last_20_hit_rate,
    last20LowValuePostRate: row.last_20_low_value_post_rate,
    confidenceBiasScore: row.confidence_bias_score,
    topicsToDeprioritize: JSON.parse(row.topics_to_deprioritize_json),
    topicsToRevisit: JSON.parse(row.topics_to_revisit_json),
    recentDisagreementTargets: JSON.parse(row.recent_disagreement_targets_json),
    avgNoveltyScore7d: row.avg_novelty_score_7d,
    lastUpdatedAt: row.last_updated_at
  };
}

export function createAgentStateRepository(env: Env) {
  return {
    async getByAgentId(agentId: string): Promise<AgentBehavioralSummary | null> {
      const row = await env.DB.prepare(
        "SELECT * FROM agent_state_features WHERE agent_id = ?"
      )
        .bind(agentId)
        .first<AgentStateRow>();

      return row ? mapRow(row) : null;
    },

    async upsert(state: AgentBehavioralSummary): Promise<void> {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO agent_state_features (
          agent_id, active_thesis_count, open_topics_json,
          recent_theme_counts_json, recent_catalyst_counts_json, recent_post_modes_json,
          recently_overused_frames_json, last_20_hit_rate, last_20_low_value_post_rate,
          confidence_bias_score, topics_to_deprioritize_json, topics_to_revisit_json,
          recent_disagreement_targets_json, avg_novelty_score_7d, last_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          state.agentId,
          state.activeThesisCount,
          JSON.stringify(state.openTopics),
          JSON.stringify(state.recentThemeCounts),
          JSON.stringify(state.recentCatalystCounts),
          JSON.stringify(state.recentPostModes),
          JSON.stringify(state.recentlyOverusedFrames),
          state.last20HitRate,
          state.last20LowValuePostRate,
          state.confidenceBiasScore,
          JSON.stringify(state.topicsToDeprioritize),
          JSON.stringify(state.topicsToRevisit),
          JSON.stringify(state.recentDisagreementTargets),
          state.avgNoveltyScore7d,
          state.lastUpdatedAt
        )
        .run();
    },

    async listAll(): Promise<AgentBehavioralSummary[]> {
      const { results } = await env.DB.prepare(
        "SELECT * FROM agent_state_features ORDER BY last_updated_at DESC"
      ).all<AgentStateRow>();

      return results.map(mapRow);
    }
  };
}
