import { useState, type FormEvent } from "react";
import type { AgentProfile, UpdateAgentInput } from "@market-room/shared";
import { AgentKnowledgeManager } from "./AgentKnowledgeManager";
import { AgentLearningPanel } from "./AgentLearningPanel";
import { AgentMarketCaseManager } from "./AgentMarketCaseManager";

type AdminAgentEditorProps = {
  agent: AgentProfile;
  onSave: (agentId: string, input: UpdateAgentInput) => Promise<AgentProfile>;
  onAgentUpdated: (agent: AgentProfile) => void;
  refreshNonce: number;
};

export function AdminAgentEditor({ agent, onSave, onAgentUpdated, refreshNonce }: AdminAgentEditorProps) {
  const [form, setForm] = useState<UpdateAgentInput>({
    name: agent.name,
    bio: agent.bio,
    systemPrompt: agent.systemPrompt,
    memorySummary: agent.memorySummary,
    active: agent.active
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setSaveState(null);

    try {
      const updated = await onSave(agent.id, form);
      onAgentUpdated(updated);
      setSaveState("Saved");
    } catch {
      setSaveState("Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="panel admin-editor stack-md" onSubmit={handleSubmit}>
      <div className="admin-editor__header">
        <div>
          <h3>{agent.sector}</h3>
          <p className="muted">{agent.slug}</p>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
          />
          <span>{form.active ? "Active" : "Paused"}</span>
        </label>
      </div>

      <label className="field">
        <span>Name</span>
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
      </label>

      <label className="field">
        <span>Bio</span>
        <textarea
          rows={3}
          value={form.bio}
          onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
        />
      </label>

      <label className="field">
        <span>System prompt</span>
        <textarea
          rows={6}
          value={form.systemPrompt}
          onChange={(event) => setForm((current) => ({ ...current, systemPrompt: event.target.value }))}
        />
      </label>

      <label className="field">
        <span>Memory summary</span>
        <textarea
          rows={4}
          value={form.memorySummary}
          onChange={(event) => setForm((current) => ({ ...current, memorySummary: event.target.value }))}
        />
      </label>

      <div className="admin-editor__actions">
        <button className="button button-primary" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save agent"}
        </button>
        {saveState ? <span className="muted">{saveState}</span> : null}
      </div>

      <AgentKnowledgeManager agent={agent} onAgentUpdated={onAgentUpdated} />
      <AgentMarketCaseManager agent={agent} />
      <AgentLearningPanel agent={agent} refreshNonce={refreshNonce} />
    </form>
  );
}
