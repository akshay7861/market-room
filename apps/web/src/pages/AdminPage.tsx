import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AdminSummary, AgentProfile, UpdateAgentInput } from "@market-room/shared";
import { AdminAgentEditor } from "../components/AdminAgentEditor";
import { FeedbackPanel } from "../components/FeedbackPanel";
import { StatCard } from "../components/StatCard";
import {
  clearAdminToken,
  downloadTrainingExamplesExport,
  fetchAdminAgents,
  fetchAdminSummary,
  getAdminToken,
  refreshLearningSignals,
  setAdminToken,
  updateAdminAgent
} from "../lib/api";

export function AdminPage() {
  const [adminTokenInput, setAdminTokenInput] = useState(() => getAdminToken());
  const [adminTokenReady, setAdminTokenReady] = useState(() => Boolean(getAdminToken()));
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(getAdminToken()));
  const [isRefreshingLearning, setIsRefreshingLearning] = useState(false);
  const [isExportingAllExamples, setIsExportingAllExamples] = useState(false);
  const [isExportingGroupedExamples, setIsExportingGroupedExamples] = useState(false);
  const [learningMessage, setLearningMessage] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminTokenReady) {
      return;
    }

    setIsLoading(true);
    setError(null);
    Promise.all([fetchAdminSummary(), fetchAdminAgents()])
      .then(([nextSummary, nextAgents]) => {
        setSummary(nextSummary);
        setAgents(nextAgents);
      })
      .catch(() => setError("Could not load admin data."))
      .finally(() => setIsLoading(false));
  }, [adminTokenReady]);

  function handleUnlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedToken = adminTokenInput.trim();
    if (!trimmedToken) {
      setError("Enter the admin token to unlock the hosted admin panel.");
      return;
    }

    setAdminToken(trimmedToken);
    setAdminTokenReady(true);
  }

  function handleLockAdmin() {
    clearAdminToken();
    setAdminTokenInput("");
    setAdminTokenReady(false);
    setSummary(null);
    setAgents([]);
  }

  function handleAgentUpdated(updated: AgentProfile) {
    setAgents((current) => current.map((agent) => (agent.id === updated.id ? updated : agent)));
  }

  async function handleSave(agentId: string, input: UpdateAgentInput): Promise<AgentProfile> {
    const updated = await updateAdminAgent(agentId, input);
    handleAgentUpdated(updated);
    const nextSummary = await fetchAdminSummary();
    setSummary(nextSummary);
    return updated;
  }

  async function handleRefreshLearning() {
    try {
      setIsRefreshingLearning(true);
      setLearningMessage(null);
      const result = await refreshLearningSignals();
      const nextSummary = await fetchAdminSummary();
      setSummary(nextSummary);
      setRefreshNonce((current) => current + 1);
      setLearningMessage(
        `Resolved ${result.resolvedForecastCount} forecast(s) and created ${result.createdTrainingExampleCount} training example(s).`
      );
    } catch {
      setLearningMessage("Could not refresh learning signals.");
    } finally {
      setIsRefreshingLearning(false);
    }
  }

  async function handleExportTrainingExamples(groupBy: "all" | "agent") {
    const setLoading = groupBy === "agent" ? setIsExportingGroupedExamples : setIsExportingAllExamples;

    try {
      setLoading(true);
      setLearningMessage(null);
      const { blob, filename } = await downloadTrainingExamplesExport(groupBy);
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
      setLearningMessage(
        groupBy === "agent"
          ? "Downloaded grouped JSONL export with one line per agent."
          : "Downloaded flat JSONL export with one line per training example."
      );
    } catch {
      setLearningMessage("Could not export training examples.");
    } finally {
      setLoading(false);
    }
  }

  if (!adminTokenReady) {
    return (
      <section className="panel stack-md">
        <div className="section-heading">
          <p className="eyebrow">Private admin</p>
          <h2>Unlock admin controls</h2>
          <p className="muted">
            Enter the admin token for this browser. This is a temporary hosted-admin guard until Cloudflare Access is enabled.
          </p>
        </div>
        <form className="stack-sm" onSubmit={handleUnlockAdmin}>
          <label className="field">
            <span>Admin token</span>
            <input
              type="password"
              value={adminTokenInput}
              onChange={(event) => setAdminTokenInput(event.target.value)}
              placeholder="Paste admin token"
              autoComplete="off"
            />
          </label>
          {error ? <p className="muted">{error}</p> : null}
          <button className="button button-primary" type="submit">
            Unlock admin
          </button>
        </form>
      </section>
    );
  }

  if (isLoading) {
    return <FeedbackPanel title="Loading admin page" description="Fetching editable agents and platform summary." />;
  }

  if (error) {
    return <FeedbackPanel title="Admin unavailable" description={error} tone="error" />;
  }

  return (
    <div className="stack-lg">
      <section className="room-heading">
        <div>
          <p className="eyebrow">Internal admin</p>
          <h2>Agent controls</h2>
          <p className="muted">Edit the live agent profiles stored in D1. Hosted admin is guarded by an admin token until Cloudflare Access is configured.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={handleLockAdmin}>
          Lock admin
        </button>
      </section>

      <div className="stats-grid">
        <StatCard label="Room" value={summary?.roomName || "Market Room"} />
        <StatCard label="Agents" value={String(summary?.agentCount || 0)} />
        <StatCard label="Events" value={String(summary?.eventCount || 0)} />
        <StatCard label="Analog cases" value={String(summary?.marketCaseCount || 0)} />
      </div>

      <section className="panel stack-sm">
        <h3>Gemini status</h3>
        <p className="muted">
          {summary?.openAiConfigured
            ? "Gemini is configured. Live generated replies, local knowledge retrieval, and research processing are available."
            : "Gemini key not set yet. The app will use safe fallback discussion text and knowledge uploads will stay disabled."}
        </p>
      </section>

      <section className="panel stack-sm">
        <h3>Database signals</h3>
        <p className="muted">
          Active agents: {summary?.activeAgentCount || 0} • Snapshots: {summary?.snapshotCount || 0} •
          Messages: {summary?.messageCount || 0} • Memory updates: {summary?.memoryUpdateCount || 0}
        </p>
        <p className="muted">
          Forecasts: {summary?.forecastCount || 0} • Resolved forecasts: {summary?.resolvedForecastCount || 0} •
          Evals: {summary?.evaluationCount || 0} • Training examples: {summary?.trainingExampleCount || 0}
        </p>
        <div className="admin-editor__actions">
          <button className="button button-primary" disabled={isRefreshingLearning} onClick={handleRefreshLearning} type="button">
            {isRefreshingLearning ? "Refreshing..." : "Refresh learning signals"}
          </button>
          <button
            className="button button-secondary"
            disabled={isExportingAllExamples}
            onClick={() => handleExportTrainingExamples("all")}
            type="button"
          >
            {isExportingAllExamples ? "Exporting all..." : "Export training examples"}
          </button>
          <button
            className="button button-secondary"
            disabled={isExportingGroupedExamples}
            onClick={() => handleExportTrainingExamples("agent")}
            type="button"
          >
            {isExportingGroupedExamples ? "Exporting grouped..." : "Export by agent"}
          </button>
          {learningMessage ? <span className="muted">{learningMessage}</span> : null}
        </div>
        <p className="muted">
          Use this after a new snapshot lands. It resolves older forecasts against the latest market state and backfills any good/bad examples that are now label-worthy.
        </p>
        <p className="muted">
          Export training examples when you want a reviewable JSONL dataset for scoring, cleanup, or later fine-tuning preparation.
        </p>
      </section>

      <section className="panel stack-sm">
        <h3>Scheduler status</h3>
        <p className="muted">
          {summary?.scheduledDiscussionsEnabled
            ? `Scheduled mode is enabled. Cooldown: ${summary.schedulerCooldownMinutes} minutes.`
            : "Scheduled mode is disabled. Manual runs from the Market Room button are still available."}
        </p>
        <p className="muted">Default scheduled brief: {summary?.schedulerPrompt || "Not set"}</p>
      </section>

      {agents.length === 0 ? (
        <FeedbackPanel
          title="No agents to edit"
          description="Seed the database first so the admin page has editable agent records."
        />
      ) : (
        <div className="stack-lg">
          {agents.map((agent) => (
            <AdminAgentEditor
              key={agent.id}
              agent={agent}
              onSave={handleSave}
              onAgentUpdated={handleAgentUpdated}
              refreshNonce={refreshNonce}
            />
          ))}
        </div>
      )}
    </div>
  );
}
