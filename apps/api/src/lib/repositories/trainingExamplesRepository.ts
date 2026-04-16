import type { TrainingExample } from "@market-room/shared";
import type { Env } from "../../index";

type TrainingExampleExportRow = {
  id: string;
  agentId: string;
  agentName: string;
  agentSector: string;
  forecastId: string;
  evaluationId: string;
  outcomeId: string;
  label: "good" | "bad";
  inputContextJson: string;
  responseText: string;
  feedbackSummary: string;
  createdAt: string;
  targetInstrumentKey: string;
  targetInstrumentLabel: string;
  signal: string;
  forecastConfidence: number;
  forecastThesis: string;
  outcomeLabel: string;
  outcomeScore: number;
  actualDirection: string;
  actualMove: string;
  evaluationOverallScore: number;
  clarityScore: number;
  specificityScore: number;
  actionabilityScore: number;
  distinctivenessScore: number;
};

export function createTrainingExamplesRepository(env: Env) {
  return {
    async create(example: TrainingExample): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO training_examples
          (id, agent_id, forecast_id, evaluation_id, outcome_id, label, input_context_json, response_text, feedback_summary, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(forecast_id) DO UPDATE SET
           agent_id = excluded.agent_id,
           evaluation_id = excluded.evaluation_id,
           outcome_id = excluded.outcome_id,
           label = excluded.label,
           input_context_json = excluded.input_context_json,
           response_text = excluded.response_text,
           feedback_summary = excluded.feedback_summary,
           created_at = excluded.created_at`
      )
        .bind(
          example.id,
          example.agentId,
          example.forecastId,
          example.evaluationId,
          example.outcomeId,
          example.label,
          example.inputContextJson,
          example.responseText,
          example.feedbackSummary,
          example.createdAt
        )
        .run();
    },

    async listByAgent(agentId: string, limit = 20): Promise<TrainingExample[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          forecast_id AS forecastId,
          evaluation_id AS evaluationId,
          outcome_id AS outcomeId,
          label,
          input_context_json AS inputContextJson,
          response_text AS responseText,
          feedback_summary AS feedbackSummary,
          created_at AS createdAt
        FROM training_examples
        WHERE agent_id = ?
        ORDER BY created_at DESC
        LIMIT ?`
      )
        .bind(agentId, limit)
        .all<TrainingExample>();

      return result.results;
    },

    async getByForecastId(forecastId: string): Promise<TrainingExample | null> {
      const row = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          forecast_id AS forecastId,
          evaluation_id AS evaluationId,
          outcome_id AS outcomeId,
          label,
          input_context_json AS inputContextJson,
          response_text AS responseText,
          feedback_summary AS feedbackSummary,
          created_at AS createdAt
        FROM training_examples
        WHERE forecast_id = ?
        LIMIT 1`
      )
        .bind(forecastId)
        .first<TrainingExample>();

      return row ?? null;
    },

    async listRecentByLabel(agentId: string, label: "good" | "bad", limit = 3): Promise<TrainingExample[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          forecast_id AS forecastId,
          evaluation_id AS evaluationId,
          outcome_id AS outcomeId,
          label,
          input_context_json AS inputContextJson,
          response_text AS responseText,
          feedback_summary AS feedbackSummary,
          created_at AS createdAt
        FROM training_examples
        WHERE agent_id = ? AND label = ?
        ORDER BY created_at DESC
        LIMIT ?`
      )
        .bind(agentId, label, limit)
        .all<TrainingExample>();

      return result.results;
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM training_examples").first<{ total: number }>();
      return row?.total ?? 0;
    },

    async listDetailedForExport(): Promise<TrainingExampleExportRow[]> {
      const result = await env.DB.prepare(
        `SELECT
          training_examples.id,
          training_examples.agent_id AS agentId,
          agents.name AS agentName,
          agents.sector AS agentSector,
          training_examples.forecast_id AS forecastId,
          training_examples.evaluation_id AS evaluationId,
          training_examples.outcome_id AS outcomeId,
          training_examples.label,
          training_examples.input_context_json AS inputContextJson,
          training_examples.response_text AS responseText,
          training_examples.feedback_summary AS feedbackSummary,
          training_examples.created_at AS createdAt,
          agent_forecasts.target_instrument_key AS targetInstrumentKey,
          agent_forecasts.target_instrument_label AS targetInstrumentLabel,
          agent_forecasts.signal,
          agent_forecasts.confidence AS forecastConfidence,
          agent_forecasts.thesis AS forecastThesis,
          forecast_outcomes.label AS outcomeLabel,
          forecast_outcomes.score AS outcomeScore,
          forecast_outcomes.actual_direction AS actualDirection,
          forecast_outcomes.actual_move AS actualMove,
          agent_evaluations.overall_score AS evaluationOverallScore,
          agent_evaluations.clarity_score AS clarityScore,
          agent_evaluations.specificity_score AS specificityScore,
          agent_evaluations.actionability_score AS actionabilityScore,
          agent_evaluations.distinctiveness_score AS distinctivenessScore
        FROM training_examples
        INNER JOIN agents ON agents.id = training_examples.agent_id
        INNER JOIN agent_forecasts ON agent_forecasts.id = training_examples.forecast_id
        INNER JOIN forecast_outcomes ON forecast_outcomes.id = training_examples.outcome_id
        INNER JOIN agent_evaluations ON agent_evaluations.id = training_examples.evaluation_id
        ORDER BY training_examples.created_at DESC, agents.name ASC`
      ).all<TrainingExampleExportRow>();

      return result.results;
    }
  };
}
