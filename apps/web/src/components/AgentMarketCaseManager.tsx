import { useEffect, useState, type FormEvent } from "react";
import type { AgentProfile, CreateMarketCaseInput, MarketCase } from "@market-room/shared";
import { createAgentMarketCase, fetchAgentMarketCases } from "../lib/api";
import { FeedbackPanel } from "./FeedbackPanel";

type AgentMarketCaseManagerProps = {
  agent: AgentProfile;
};

const emptyForm = (): CreateMarketCaseInput => ({
  title: "",
  dateLabel: "",
  regimeTags: [],
  marketContext: "",
  patternSummary: "",
  implicationNote: "",
  outcomeNote: "",
  sourceLabel: "",
  sourceUrl: ""
});

export function AgentMarketCaseManager({ agent }: AgentMarketCaseManagerProps) {
  const [marketCases, setMarketCases] = useState<MarketCase[]>([]);
  const [form, setForm] = useState<CreateMarketCaseInput>(emptyForm);
  const [tagInput, setTagInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
  }, [agent.id]);

  async function loadCases() {
    try {
      setIsLoading(true);
      setError(null);
      const nextCases = await fetchAgentMarketCases(agent.id);
      setMarketCases(nextCases);
    } catch {
      setError(`Could not load analog market cases for ${agent.name}.`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSaving(true);
      setError(null);
      setMessage(null);
      const created = await createAgentMarketCase(agent.id, {
        ...form,
        regimeTags: parseTags(tagInput)
      });
      setMarketCases((current) => [created, ...current]);
      setForm(emptyForm());
      setTagInput("");
      setMessage("Analog case saved. Future replies can retrieve it when the setup looks similar.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this analog case.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="knowledge-panel stack-md">
      <div className="knowledge-panel__header">
        <div>
          <p className="eyebrow">Pattern memory</p>
          <h3>{agent.sector} analog cases</h3>
        </div>
        <span className="badge badge--muted">{marketCases.length} saved</span>
      </div>

      <p className="muted">
        Save past market episodes as structured cases so {agent.name} can compare today&apos;s setup with earlier regimes instead of only retrieving reports.
      </p>

      <form className="stack-md" onSubmit={handleSubmit}>
        <label className="field">
          <span>Case title</span>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="March 2023 banking stress"
          />
        </label>

        <label className="field">
          <span>Date or window</span>
          <input
            value={form.dateLabel}
            onChange={(event) => setForm((current) => ({ ...current, dateLabel: event.target.value }))}
            placeholder="March 2023"
          />
        </label>

        <label className="field">
          <span>Regime tags</span>
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="banking stress, rate shock, defensive rotation"
          />
        </label>

        <label className="field">
          <span>Market context</span>
          <textarea
            rows={3}
            value={form.marketContext}
            onChange={(event) => setForm((current) => ({ ...current, marketContext: event.target.value }))}
            placeholder="What was happening in markets before and during the episode?"
          />
        </label>

        <label className="field">
          <span>Pattern summary</span>
          <textarea
            rows={3}
            value={form.patternSummary}
            onChange={(event) => setForm((current) => ({ ...current, patternSummary: event.target.value }))}
            placeholder="What pattern or analog should the agent recognize later?"
          />
        </label>

        <label className="field">
          <span>Implication for this sector</span>
          <textarea
            rows={3}
            value={form.implicationNote}
            onChange={(event) => setForm((current) => ({ ...current, implicationNote: event.target.value }))}
            placeholder="What should the agent watch or infer when a similar setup appears again?"
          />
        </label>

        <label className="field">
          <span>What happened next</span>
          <textarea
            rows={3}
            value={form.outcomeNote}
            onChange={(event) => setForm((current) => ({ ...current, outcomeNote: event.target.value }))}
            placeholder="How did the market resolve, and what was learned?"
          />
        </label>

        <label className="field">
          <span>Source label</span>
          <input
            value={form.sourceLabel || ""}
            onChange={(event) => setForm((current) => ({ ...current, sourceLabel: event.target.value }))}
            placeholder="Internal note, Bloomberg writeup, CIO memo"
          />
        </label>

        <label className="field">
          <span>Source URL</span>
          <input
            value={form.sourceUrl || ""}
            onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
            placeholder="Optional link"
          />
        </label>

        <div className="admin-editor__actions">
          <button className="button button-primary" disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save analog case"}
          </button>
          {message ? <span className="muted">{message}</span> : null}
        </div>
      </form>

      {error ? <FeedbackPanel title="Analog case error" description={error} tone="error" /> : null}

      {isLoading ? (
        <FeedbackPanel
          title="Loading analog cases"
          description="Fetching structured past episodes for this agent."
        />
      ) : marketCases.length > 0 ? (
        <div className="knowledge-store-files stack-sm">
          {marketCases.map((marketCase) => (
            <article className="knowledge-file" key={marketCase.id}>
              <div className="knowledge-file__header">
                <strong>{marketCase.title}</strong>
                <span className="badge badge--muted">{marketCase.dateLabel}</span>
              </div>
              <p className="muted">{marketCase.regimeTags.join(" • ") || "No tags yet"}</p>
              <p className="muted">{marketCase.patternSummary}</p>
              <p className="muted">Signal: {marketCase.implicationNote}</p>
              <p className="muted">Outcome: {marketCase.outcomeNote}</p>
            </article>
          ))}
        </div>
      ) : (
        <FeedbackPanel
          title="No analog cases saved yet"
          description="Start by writing down 5 to 10 past episodes this agent should remember and compare against."
        />
      )}
    </section>
  );
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
