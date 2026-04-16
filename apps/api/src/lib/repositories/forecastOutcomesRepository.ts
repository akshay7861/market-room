import type { ForecastOutcome } from "@market-room/shared";
import type { Env } from "../../index";

export function createForecastOutcomesRepository(env: Env) {
  return {
    async create(outcome: ForecastOutcome): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO forecast_outcomes
          (id, forecast_id, evaluation_snapshot_id, actual_direction, actual_move, score, label, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          outcome.id,
          outcome.forecastId,
          outcome.evaluationSnapshotId,
          outcome.actualDirection,
          outcome.actualMove,
          outcome.score,
          outcome.label,
          outcome.notes,
          outcome.createdAt
        )
        .run();
    },

    async listByAgent(agentId: string, limit = 20): Promise<ForecastOutcome[]> {
      const result = await env.DB.prepare(
        `SELECT
          forecast_outcomes.id,
          forecast_outcomes.forecast_id AS forecastId,
          forecast_outcomes.evaluation_snapshot_id AS evaluationSnapshotId,
          forecast_outcomes.actual_direction AS actualDirection,
          forecast_outcomes.actual_move AS actualMove,
          forecast_outcomes.score,
          forecast_outcomes.label,
          forecast_outcomes.notes,
          forecast_outcomes.created_at AS createdAt
        FROM forecast_outcomes
        INNER JOIN agent_forecasts ON agent_forecasts.id = forecast_outcomes.forecast_id
        WHERE agent_forecasts.agent_id = ?
        ORDER BY forecast_outcomes.created_at DESC
        LIMIT ?`
      )
        .bind(agentId, limit)
        .all<ForecastOutcome>();

      return result.results;
    },

    async getByForecastId(forecastId: string): Promise<ForecastOutcome | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          forecast_id AS forecastId,
          evaluation_snapshot_id AS evaluationSnapshotId,
          actual_direction AS actualDirection,
          actual_move AS actualMove,
          score,
          label,
          notes,
          created_at AS createdAt
        FROM forecast_outcomes
        WHERE forecast_id = ?
        LIMIT 1`
      )
        .bind(forecastId)
        .first<ForecastOutcome>();

      return row ?? null;
    },

    async updateClassification(outcomeId: string, label: ForecastOutcome["label"], notes: string): Promise<void> {
      await env.DB.prepare(
        `UPDATE forecast_outcomes
         SET label = ?, notes = ?
         WHERE id = ?`
      )
        .bind(label, notes, outcomeId)
        .run();
    }
  };
}
