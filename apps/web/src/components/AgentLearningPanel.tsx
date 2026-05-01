import { useEffect, useState } from "react";
import type { AgentLearningView, AgentProfile } from "@market-room/shared";
import { fetchAgentLearning } from "../lib/api";
import { FeedbackPanel } from "./FeedbackPanel";

export function AgentLearningPanel({
  agent,
  refreshNonce
}: {
  agent: AgentProfile;
  refreshNonce: number;
}) {
  const [learning, setLearning] = useState<AgentLearningView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLearning();
  }, [agent.id, refreshNonce]);

  async function loadLearning() {
    try {
      setIsLoading(true);
      setError(null);
      const nextLearning = await fetchAgentLearning(agent.id);
      setLearning(nextLearning);
    } catch {
      setError(`Could not load learning data for ${agent.name}.`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="knowledge-panel stack-md">
      <div className="knowledge-panel__header">
        <div>
          <p className="eyebrow">Training pipeline</p>
          <h3>{agent.sector} learning loop</h3>
        </div>
        <span className="badge badge--muted">
          {learning ? `${learning.trainingExamples.length} recent examples` : "Loading"}
        </span>
      </div>

      <p className="muted">
        This panel shows the four steps of the learning loop: forecasts, outcomes, eval scores, and the good/bad examples that are worth keeping for future tuning. Use the admin refresh button after a new snapshot if you want to resolve pending forecasts without waiting for another discussion.
      </p>

      {error ? <FeedbackPanel title="Learning data error" description={error} tone="error" /> : null}

      {isLoading ? (
        <FeedbackPanel title="Loading learning signals" description="Fetching forecasts, outcomes, evals, and examples." />
      ) : learning ? (
        <div className="stack-md">
          <article className="panel stack-sm">
            <h4>Recent forecasts</h4>
            {learning.forecasts.length > 0 ? (
              learning.forecasts.slice(0, 3).map((forecast) => (
                <p className="muted" key={forecast.id}>
                  {forecast.targetInstrumentLabel} • {forecast.signal} • {Math.round(forecast.confidence * 100)}% • {forecast.status}
                </p>
              ))
            ) : (
              <p className="muted">No forecasts saved yet. Run a new discussion to create them automatically.</p>
            )}
          </article>

          <article className="panel stack-sm">
            <h4>Recent outcomes</h4>
            {learning.outcomes.length > 0 ? (
              learning.outcomes.slice(0, 3).map((outcome) => (
                <p className="muted" key={outcome.id}>
                  {outcome.label} • {outcome.actualMove} • score {outcome.score.toFixed(2)}
                </p>
              ))
            ) : (
              <p className="muted">No outcomes yet. The next saved snapshot resolves earlier pending forecasts.</p>
            )}
          </article>

          <article className="panel stack-sm">
            <h4>Recent eval scores</h4>
            {learning.evaluations.length > 0 ? (
              learning.evaluations.slice(0, 3).map((evaluation) => (
                <p className="muted" key={evaluation.id}>
                  overall {(evaluation.overallScore * 10).toFixed(1)} / 10 • strengths: {evaluation.strengths}
                </p>
              ))
            ) : (
              <p className="muted">No evals yet. Each new discussion message is scored automatically.</p>
            )}
          </article>

          <article className="panel stack-sm">
            <h4>Training examples</h4>
            {learning.trainingExamples.length > 0 ? (
              learning.trainingExamples.slice(0, 3).map((example) => (
                <p className="muted" key={example.id}>
                  {example.label.toUpperCase()} • {example.feedbackSummary}
                </p>
              ))
            ) : (
              <p className="muted">
                No good/bad examples yet. They appear once a forecast resolves and the combined quality plus outcome signal is strong enough to keep for future tuning.
              </p>
            )}
          </article>
        </div>
      ) : null}
    </section>
  );
}
