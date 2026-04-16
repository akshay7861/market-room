import type { DecisionLogEntry } from "@market-room/shared";
import type { Env } from "../../index";

type DecisionLogRow = {
  id: string;
  agent_id: string;
  room_id: string;
  action_type: string;
  reason_codes_json: string;
  novelty_score: number | null;
  candidate_theme_key: string | null;
  target_thesis_id: string | null;
  message_id: string | null;
  decided_at: string;
  headline_analysis_json: string | null;
};

function mapRow(row: DecisionLogRow): DecisionLogEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    roomId: row.room_id,
    actionType: row.action_type as DecisionLogEntry["actionType"],
    reasonCodes: JSON.parse(row.reason_codes_json),
    noveltyScore: row.novelty_score,
    candidateThemeKey: row.candidate_theme_key,
    targetThesisId: row.target_thesis_id,
    messageId: row.message_id,
    decidedAt: row.decided_at,
    headlineAnalysisJson: row.headline_analysis_json
  };
}

export function createDecisionLogRepository(env: Env) {
  return {
    async log(entry: DecisionLogEntry): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO decision_event_log
          (id, agent_id, room_id, action_type, reason_codes_json, novelty_score,
           candidate_theme_key, target_thesis_id, message_id, decided_at, headline_analysis_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          entry.id,
          entry.agentId,
          entry.roomId,
          entry.actionType,
          JSON.stringify(entry.reasonCodes),
          entry.noveltyScore,
          entry.candidateThemeKey,
          entry.targetThesisId,
          entry.messageId,
          entry.decidedAt,
          entry.headlineAnalysisJson ?? null
        )
        .run();
    },

    async listByRoom(roomId: string, limit = 50): Promise<DecisionLogEntry[]> {
      const result = await env.DB.prepare(
        `SELECT * FROM decision_event_log
         WHERE room_id = ?
         ORDER BY decided_at DESC
         LIMIT ?`
      )
        .bind(roomId, limit)
        .all<DecisionLogRow>();

      return result.results.map(mapRow);
    },

    async listByAgent(agentId: string, limit = 20): Promise<DecisionLogEntry[]> {
      const result = await env.DB.prepare(
        `SELECT * FROM decision_event_log
         WHERE agent_id = ?
         ORDER BY decided_at DESC
         LIMIT ?`
      )
        .bind(agentId, limit)
        .all<DecisionLogRow>();

      return result.results.map(mapRow);
    }
  };
}
