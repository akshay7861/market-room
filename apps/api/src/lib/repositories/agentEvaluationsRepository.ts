import type { AgentEvaluation } from "@market-room/shared";
import type { Env } from "../../index";

export function createAgentEvaluationsRepository(env: Env) {
  return {
    async create(evaluation: AgentEvaluation): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO agent_evaluations
          (id, agent_id, event_id, message_id, clarity_score, specificity_score, actionability_score, distinctiveness_score, overall_score, strengths, weaknesses, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          evaluation.id,
          evaluation.agentId,
          evaluation.eventId,
          evaluation.messageId,
          evaluation.clarityScore,
          evaluation.specificityScore,
          evaluation.actionabilityScore,
          evaluation.distinctivenessScore,
          evaluation.overallScore,
          evaluation.strengths,
          evaluation.weaknesses,
          evaluation.createdAt
        )
        .run();
    },

    async listByAgent(agentId: string, limit = 20): Promise<AgentEvaluation[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          event_id AS eventId,
          message_id AS messageId,
          clarity_score AS clarityScore,
          specificity_score AS specificityScore,
          actionability_score AS actionabilityScore,
          distinctiveness_score AS distinctivenessScore,
          overall_score AS overallScore,
          strengths,
          weaknesses,
          created_at AS createdAt
        FROM agent_evaluations
        WHERE agent_id = ?
        ORDER BY created_at DESC
        LIMIT ?`
      )
        .bind(agentId, limit)
        .all<AgentEvaluation>();

      return result.results;
    },

    async getByMessageId(messageId: string): Promise<AgentEvaluation | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          event_id AS eventId,
          message_id AS messageId,
          clarity_score AS clarityScore,
          specificity_score AS specificityScore,
          actionability_score AS actionabilityScore,
          distinctiveness_score AS distinctivenessScore,
          overall_score AS overallScore,
          strengths,
          weaknesses,
          created_at AS createdAt
        FROM agent_evaluations
        WHERE message_id = ?
        LIMIT 1`
      )
        .bind(messageId)
        .first<AgentEvaluation>();

      return row ?? null;
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM agent_evaluations").first<{ total: number }>();
      return row?.total ?? 0;
    }
  };
}
