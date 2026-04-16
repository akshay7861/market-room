import type { AgentForecast, ForecastWithOutcome } from "@market-room/shared";
import type { Env } from "../../index";

export function createAgentForecastsRepository(env: Env) {
  return {
    async create(forecast: AgentForecast): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO agent_forecasts
          (id, agent_id, event_id, message_id, snapshot_id, target_instrument_key, target_instrument_label, horizon, signal, confidence, thesis, status, created_at, resolved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          forecast.id,
          forecast.agentId,
          forecast.eventId,
          forecast.messageId,
          forecast.snapshotId,
          forecast.targetInstrumentKey,
          forecast.targetInstrumentLabel,
          forecast.horizon,
          forecast.signal,
          forecast.confidence,
          forecast.thesis,
          forecast.status,
          forecast.createdAt,
          forecast.resolvedAt
        )
        .run();
    },

    async listByAgent(agentId: string, limit = 20): Promise<AgentForecast[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          event_id AS eventId,
          message_id AS messageId,
          snapshot_id AS snapshotId,
          target_instrument_key AS targetInstrumentKey,
          target_instrument_label AS targetInstrumentLabel,
          horizon,
          signal,
          confidence,
          thesis,
          status,
          created_at AS createdAt,
          resolved_at AS resolvedAt
        FROM agent_forecasts
        WHERE agent_id = ?
        ORDER BY created_at DESC
        LIMIT ?`
      )
        .bind(agentId, limit)
        .all<AgentForecast>();

      return result.results;
    },

    async listPending(limit = 50): Promise<AgentForecast[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          event_id AS eventId,
          message_id AS messageId,
          snapshot_id AS snapshotId,
          target_instrument_key AS targetInstrumentKey,
          target_instrument_label AS targetInstrumentLabel,
          horizon,
          signal,
          confidence,
          thesis,
          status,
          created_at AS createdAt,
          resolved_at AS resolvedAt
        FROM agent_forecasts
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT ?`
      )
        .bind(limit)
        .all<AgentForecast>();

      return result.results;
    },

    async listResolvedWithoutExample(limit = 100): Promise<AgentForecast[]> {
      const result = await env.DB.prepare(
        `SELECT
          agent_forecasts.id,
          agent_forecasts.agent_id AS agentId,
          agent_forecasts.event_id AS eventId,
          agent_forecasts.message_id AS messageId,
          agent_forecasts.snapshot_id AS snapshotId,
          agent_forecasts.target_instrument_key AS targetInstrumentKey,
          agent_forecasts.target_instrument_label AS targetInstrumentLabel,
          agent_forecasts.horizon,
          agent_forecasts.signal,
          agent_forecasts.confidence,
          agent_forecasts.thesis,
          agent_forecasts.status,
          agent_forecasts.created_at AS createdAt,
          agent_forecasts.resolved_at AS resolvedAt
        FROM agent_forecasts
        LEFT JOIN training_examples ON training_examples.forecast_id = agent_forecasts.id
        WHERE agent_forecasts.status = 'resolved'
          AND training_examples.id IS NULL
        ORDER BY agent_forecasts.resolved_at DESC, agent_forecasts.created_at DESC
        LIMIT ?`
      )
        .bind(limit)
        .all<AgentForecast>();

      return result.results;
    },

    async listResolved(limit = 100): Promise<AgentForecast[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          event_id AS eventId,
          message_id AS messageId,
          snapshot_id AS snapshotId,
          target_instrument_key AS targetInstrumentKey,
          target_instrument_label AS targetInstrumentLabel,
          horizon,
          signal,
          confidence,
          thesis,
          status,
          created_at AS createdAt,
          resolved_at AS resolvedAt
        FROM agent_forecasts
        WHERE status = 'resolved'
        ORDER BY resolved_at DESC, created_at DESC
        LIMIT ?`
      )
        .bind(limit)
        .all<AgentForecast>();

      return result.results;
    },

    async markResolved(forecastId: string, resolvedAt: string): Promise<void> {
      await env.DB.prepare(
        `UPDATE agent_forecasts
         SET status = 'resolved', resolved_at = ?
         WHERE id = ?`
      )
        .bind(resolvedAt, forecastId)
        .run();
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM agent_forecasts").first<{ total: number }>();
      return row?.total ?? 0;
    },

    async countResolved(): Promise<number> {
      const row = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM agent_forecasts WHERE status = 'resolved'"
      ).first<{ total: number }>();

      return row?.total ?? 0;
    },

    async listRecentResolvedWithOutcomes(agentId: string, limit = 10): Promise<ForecastWithOutcome[]> {
      const result = await env.DB.prepare(
        `SELECT
          af.id AS forecastId,
          af.agent_id AS agentId,
          af.target_instrument_key AS targetInstrumentKey,
          af.target_instrument_label AS targetInstrumentLabel,
          af.signal,
          af.confidence,
          af.thesis,
          af.created_at AS createdAt,
          af.resolved_at AS resolvedAt,
          fo.label AS outcomeLabel,
          fo.score AS outcomeScore,
          fo.actual_direction AS actualDirection,
          fo.actual_move AS actualMove,
          ae.overall_score AS evalOverallScore
        FROM agent_forecasts af
        LEFT JOIN forecast_outcomes fo ON fo.forecast_id = af.id
        LEFT JOIN agent_evaluations ae ON ae.message_id = af.message_id
        WHERE af.agent_id = ?
          AND af.status = 'resolved'
        ORDER BY af.resolved_at DESC
        LIMIT ?`
      )
        .bind(agentId, limit)
        .all<ForecastWithOutcome>();

      return result.results;
    }
  };
}
