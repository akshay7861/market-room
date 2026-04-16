import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type {
  AgentKnowledgeStore,
  KnowledgeProcessingJob,
  AgentProfile,
  KnowledgeCategory,
  KnowledgeProcessingResult
} from "@market-room/shared";
import {
  fetchAgentKnowledgeProcessingJobs,
  fetchAgentKnowledgeStore,
  processAgentKnowledge,
  queueAgentKnowledgeProcessingJob,
  reviewAgentKnowledgeProcessingJobItem,
  updateAgentKnowledgeGovernance,
  uploadAgentKnowledge
} from "../lib/api";
import { FeedbackPanel } from "./FeedbackPanel";

type AgentKnowledgeManagerProps = {
  agent: AgentProfile;
  onAgentUpdated: (agent: AgentProfile) => void;
};

const categoryOptions: Array<{ value: KnowledgeCategory; label: string }> = [
  { value: "foundations", label: "Foundations" },
  { value: "frameworks", label: "Frameworks" },
  { value: "event_playbooks", label: "Event playbooks" },
  { value: "instrument_guides", label: "Instrument guides" },
  { value: "house_view_notes", label: "House-view notes" }
];

export function AgentKnowledgeManager({
  agent,
  onAgentUpdated
}: AgentKnowledgeManagerProps) {
  const config = knowledgeCopyForAgent(agent);
  const [knowledgeStore, setKnowledgeStore] = useState<AgentKnowledgeStore | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<KnowledgeCategory>("foundations");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState<KnowledgeProcessingJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isQueueingBatch, setIsQueueingBatch] = useState(false);
  const [reviewingItemId, setReviewingItemId] = useState<string | null>(null);
  const [updatingGovernanceId, setUpdatingGovernanceId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKnowledgeStore();
    loadJobs();
  }, [agent.id]);

  useEffect(() => {
    if (!jobs.some((job) => job.status === "queued" || job.status === "running")) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadJobs();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [jobs]);

  async function loadKnowledgeStore() {
    try {
      setIsLoading(true);
      setError(null);
      const nextStore = await fetchAgentKnowledgeStore(agent.id);
      setKnowledgeStore(nextStore);
    } catch {
      setError(`Could not load the ${agent.name} knowledge store.`);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadJobs() {
    try {
      setIsLoadingJobs(true);
      const nextJobs = await fetchAgentKnowledgeProcessingJobs(agent.id);
      setJobs(nextJobs);
    } catch {
      // Keep the panel resilient if polling fails temporarily.
    } finally {
      setIsLoadingJobs(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  }

  function handleProcessingFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setProcessingFiles(files);
  }

  function handleBatchFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setBatchFiles(files);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedFiles.length === 0) {
      setError("Choose one or more research files first.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setMessage(null);
      const result = await uploadAgentKnowledge(agent.id, category, selectedFiles);
      onAgentUpdated(result.agent);
      setKnowledgeStore(result.knowledgeStore);
      setSelectedFiles([]);
      setMessage("Knowledge files uploaded into the local Gemini memory store.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Knowledge upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleProcess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (processingFiles.length === 0) {
      setError("Choose one or more raw research files first.");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setMessage(null);
      const result = await processAgentKnowledge(agent.id, category, processingFiles);
      onAgentUpdated(result.agent);
      setKnowledgeStore(result.knowledgeStore);
      setProcessingFiles([]);
      await loadJobs();
      setMessage(buildProcessingMessage(result));
    } catch (processingError) {
      setError(processingError instanceof Error ? processingError.message : "Research processing failed.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleQueueBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (batchFiles.length === 0) {
      setError("Choose one or more raw research files to queue.");
      return;
    }

    try {
      setIsQueueingBatch(true);
      setError(null);
      setMessage(null);
      const job = await queueAgentKnowledgeProcessingJob(agent.id, category, batchFiles);
      setBatchFiles([]);
      await loadJobs();
      setMessage(`Queued batch job ${job.id.slice(0, 8)} for ${job.totalFiles} file(s). The panel will refresh as each file finishes.`);
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : "Could not queue the batch job.");
    } finally {
      setIsQueueingBatch(false);
    }
  }

  async function handleReview(jobId: string, itemId: string, decision: "approve" | "reject") {
    try {
      setReviewingItemId(itemId);
      setError(null);
      setMessage(null);
      const updatedJob = await reviewAgentKnowledgeProcessingJobItem(agent.id, jobId, itemId, decision);
      setJobs((current) => current.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
      await loadKnowledgeStore();
      setMessage(
        decision === "approve"
          ? "Approved the processed file and added it to the permanent memory base."
          : "Rejected the processed file. It stayed out of the permanent memory base."
      );
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Could not save the review decision.");
    } finally {
      setReviewingItemId(null);
    }
  }

  async function handleGovernanceChange(
    itemId: string,
    tier: "active" | "fallback" | "legacy",
    priority = 0
  ) {
    try {
      setUpdatingGovernanceId(itemId);
      setError(null);
      setMessage(null);
      const nextStore = await updateAgentKnowledgeGovernance(agent.id, itemId, { tier, priority });
      setKnowledgeStore(nextStore);
      setMessage(`Updated knowledge governance: ${tier}${priority ? ` (${priority > 0 ? "+" : ""}${priority})` : ""}.`);
    } catch (governanceError) {
      setError(governanceError instanceof Error ? governanceError.message : "Could not update knowledge governance.");
    } finally {
      setUpdatingGovernanceId(null);
    }
  }

  const governanceCounts = countGovernanceTiers(knowledgeStore?.files || []);

  return (
    <section className="knowledge-panel stack-md">
      <div className="knowledge-panel__header">
        <div>
          <p className="eyebrow">Long-term sector memory</p>
          <h3>{config.title}</h3>
        </div>
        <span className="badge badge--muted">
          {knowledgeStore?.files.length ? `${knowledgeStore.files.length} memory notes` : "No memory notes yet"}
        </span>
      </div>

      <p className="muted">
        {config.description}
      </p>

      <div className="stack-sm">
        <p className="muted">
          This store is retrieval memory, not model training. Use curated notes, reports, playbooks, and distilled historical lessons rather than dumping raw bulk market datasets.
        </p>
        <p className="muted">
          Good inputs for future autonomy: past writeups, regime notes, event post-mortems, policy frameworks, house views, and short structured summaries of external research.
        </p>
      </div>

      <div className="knowledge-file-list">
        {config.topics.map((topic) => (
          <div className="snapshot-metric-chip" key={topic}>
            {topic}
          </div>
        ))}
      </div>

      {knowledgeStore ? (
        <section className="panel stack-sm">
          <div>
            <p className="eyebrow">Retrieval governance</p>
            <h4>Active pool health</h4>
          </div>
          <p className="muted">
            These tiers control retrieval cleanliness without deleting docs. Active docs compete normally; fallback and legacy docs remain available but are demoted when sharper Wave docs match.
          </p>
          <div className="knowledge-file-list">
            <div className="snapshot-metric-chip">Active: {governanceCounts.active}</div>
            <div className="snapshot-metric-chip">Fallback: {governanceCounts.fallback}</div>
            <div className="snapshot-metric-chip">Legacy: {governanceCounts.legacy}</div>
          </div>
        </section>
      ) : null}

      <form className="stack-md" onSubmit={handleUpload}>
        <label className="field">
          <span>Knowledge category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as KnowledgeCategory)}>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Research files</span>
          <input
            type="file"
            accept=".md,.txt,.pdf,.docx"
            multiple
            onChange={handleFileChange}
          />
        </label>

        {selectedFiles.length > 0 ? (
          <div className="knowledge-file-list">
            {selectedFiles.map((file) => (
              <div className="snapshot-metric-chip" key={`${file.name}-${file.size}`}>
                {file.name}
              </div>
            ))}
          </div>
        ) : null}

        <div className="admin-editor__actions">
          <button className="button button-primary" disabled={isUploading} type="submit">
            {isUploading ? "Uploading..." : "Upload knowledge files"}
          </button>
          {message ? <span className="muted">{message}</span> : null}
        </div>
      </form>

      <form className="panel stack-md" onSubmit={handleProcess}>
        <div>
          <p className="eyebrow">Research processor</p>
          <h4>Process raw reports before feeding the agent</h4>
        </div>
        <p className="muted">
          Use a separate processing model to read bulky reports or historical writeups, distill them into cleaner sector notes, and optionally turn strong episodes into analog cases. This keeps the speaking agents focused on judgment instead of messy source digestion.
        </p>

        <label className="field">
          <span>Raw source files</span>
          <input
            type="file"
            accept=".md,.txt,.pdf,.docx"
            multiple
            onChange={handleProcessingFileChange}
          />
        </label>

        {processingFiles.length > 0 ? (
          <div className="knowledge-file-list">
            {processingFiles.map((file) => (
              <div className="snapshot-metric-chip" key={`${file.name}-${file.size}`}>
                {file.name}
              </div>
            ))}
          </div>
        ) : null}

        <div className="admin-editor__actions">
          <button className="button button-secondary" disabled={isProcessing} type="submit">
            {isProcessing ? "Processing..." : "Process and distill files"}
          </button>
        </div>
      </form>

      <form className="panel stack-md" onSubmit={handleQueueBatch}>
        <div>
          <p className="eyebrow">Batch queue</p>
          <h4>Queue many reports in the background</h4>
        </div>
        <p className="muted">
          Use this when you want to feed a large stack of raw reports at once. The Worker creates a background job, processes each file sequentially, and updates the job list below as it moves through the queue.
        </p>

        <label className="field">
          <span>Batch source files</span>
          <input
            type="file"
            accept=".md,.txt,.pdf,.docx"
            multiple
            onChange={handleBatchFileChange}
          />
        </label>

        {batchFiles.length > 0 ? (
          <div className="knowledge-file-list">
            {batchFiles.map((file) => (
              <div className="snapshot-metric-chip" key={`${file.name}-${file.size}`}>
                {file.name}
              </div>
            ))}
          </div>
        ) : null}

        <div className="admin-editor__actions">
          <button className="button button-secondary" disabled={isQueueingBatch} type="submit">
            {isQueueingBatch ? "Queueing..." : "Queue processing batch"}
          </button>
        </div>
      </form>

      <section className="panel stack-sm">
        <div>
          <p className="eyebrow">Batch jobs</p>
          <h4>Recent processing jobs</h4>
        </div>
        <p className="muted">
          Each job tracks how many files finished, how many failed, and the per-file output that was created for the agent.
        </p>
        {isLoadingJobs ? (
          <FeedbackPanel title="Loading batch jobs" description="Fetching recent background processing jobs." />
        ) : jobs.length > 0 ? (
          <div className="stack-sm">
            {jobs.map((job) => (
              <article className="knowledge-file stack-sm" key={job.id}>
                <div className="knowledge-file__header">
                  <strong>{job.id.slice(0, 8)} • {formatKnowledgeCategory(job.category)}</strong>
                  <span className={`badge ${job.status === "completed" ? "" : job.status === "failed" ? "badge--warning" : "badge--muted"}`}>
                    {job.status}
                  </span>
                </div>
                <p className="muted">
                  {job.processingModel} • {job.completedFiles}/{job.totalFiles} completed • {job.failedFiles} failed
                  {job.completedAt ? ` • finished ${new Date(job.completedAt).toLocaleString()}` : ""}
                </p>
                {job.lastError ? <p className="error-banner">{job.lastError}</p> : null}
                <div className="stack-sm">
                  {job.items.map((item) => (
                    <article className="panel stack-sm" key={item.id}>
                      <p className="muted">
                        {item.sourceFilename} • {item.status}
                        {item.processedFilename ? ` • ${item.processedFilename}` : ""}
                        {item.marketCaseCount > 0 ? ` • ${item.marketCaseCount} case(s)` : ""}
                      </p>
                      {item.summary ? <p className="muted">{item.summary}</p> : null}
                      {item.distilledMarkdown ? (
                        <details>
                          <summary>Preview distilled note</summary>
                          <pre className="muted">{item.distilledMarkdown}</pre>
                        </details>
                      ) : null}
                      {item.marketCases.length > 0 ? (
                        <details>
                          <summary>Preview generated cases</summary>
                          <div className="stack-sm">
                            {item.marketCases.map((marketCase, index) => (
                              <p className="muted" key={`${item.id}-${index}`}>
                                <strong>{marketCase.title}</strong> • {marketCase.dateLabel} • {marketCase.regimeTags.join(", ")}
                              </p>
                            ))}
                          </div>
                        </details>
                      ) : null}
                      {item.errorMessage ? <p className="error-banner">{item.errorMessage}</p> : null}
                      {item.status === "completed" && item.reviewStatus === "pending" ? (
                        <div className="admin-editor__actions">
                          <button
                            className="button button-primary"
                            disabled={reviewingItemId === item.id}
                            onClick={() => handleReview(job.id, item.id, "approve")}
                            type="button"
                          >
                            {reviewingItemId === item.id ? "Saving..." : "Approve"}
                          </button>
                          <button
                            className="button button-secondary"
                            disabled={reviewingItemId === item.id}
                            onClick={() => handleReview(job.id, item.id, "reject")}
                            type="button"
                          >
                            Reject
                          </button>
                        </div>
                      ) : item.reviewStatus ? (
                        <p className="muted">
                          Review: {item.reviewStatus}
                          {item.reviewedAt ? ` • ${new Date(item.reviewedAt).toLocaleString()}` : ""}
                          {item.persistedAt ? ` • persisted ${new Date(item.persistedAt).toLocaleString()}` : ""}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <FeedbackPanel
            title="No batch jobs yet"
            description="Queue a batch when you want the Worker to process many raw reports in the background."
          />
        )}
      </section>

      {error ? <FeedbackPanel title="Knowledge upload error" description={error} tone="error" /> : null}

      {isLoading ? (
        <FeedbackPanel
          title="Loading knowledge files"
          description="Fetching the current approved knowledge memory and indexed file list."
        />
      ) : knowledgeStore && knowledgeStore.files.length > 0 ? (
        <div className="knowledge-store-files stack-sm">
          {knowledgeStore.files.map((file) => (
            <article className="knowledge-file" key={file.id}>
              <div className="knowledge-file__header">
                <div>
                  <strong>{file.title || file.filename}</strong>
                  {file.title ? <p className="muted">{file.filename}</p> : null}
                </div>
                <div className="admin-editor__actions">
                  <span className={`badge ${governanceBadgeClass(file.governanceTier)}`}>
                    {file.governanceTier || "active"}
                  </span>
                  <span className={`badge ${file.status === "completed" ? "" : "badge--warning"}`}>
                    {file.status}
                  </span>
                </div>
              </div>
              <p className="muted">
                {formatKnowledgeCategory(file.category)}
                {file.createdAt ? ` • ${new Date(file.createdAt).toLocaleString()}` : ""}
                {typeof file.usageBytes === "number" ? ` • ${formatBytes(file.usageBytes)}` : ""}
                {file.governanceSource ? ` • ${file.governanceSource} governance` : ""}
                {typeof file.governancePriority === "number" && file.governancePriority !== 0
                  ? ` • priority ${file.governancePriority > 0 ? "+" : ""}${file.governancePriority}`
                  : ""}
              </p>
              {file.summary ? <p className="muted">{file.summary}</p> : null}
              {file.governanceReason ? <p className="muted">Governance: {file.governanceReason}</p> : null}
              <div className="admin-editor__actions">
                <button
                  className="button button-secondary"
                  disabled={updatingGovernanceId === file.id || file.governanceTier === "active"}
                  onClick={() => handleGovernanceChange(file.id, "active", 0)}
                  type="button"
                >
                  Mark active
                </button>
                <button
                  className="button button-secondary"
                  disabled={updatingGovernanceId === file.id || file.governanceTier === "fallback"}
                  onClick={() => handleGovernanceChange(file.id, "fallback", -5)}
                  type="button"
                >
                  Demote fallback
                </button>
                <button
                  className="button button-secondary"
                  disabled={updatingGovernanceId === file.id || file.governanceTier === "legacy"}
                  onClick={() => handleGovernanceChange(file.id, "legacy", -15)}
                  type="button"
                >
                  Mark legacy
                </button>
              </div>
              {file.lastError ? <p className="error-banner">{file.lastError}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <FeedbackPanel
          title="No sector research uploaded yet"
          description={`Start ${agent.name} with short curated notes, frameworks, event playbooks, and house views. Avoid giant raw datasets or scraped dumps.`}
        />
      )}
    </section>
  );
}

function countGovernanceTiers(files: AgentKnowledgeStore["files"]): Record<"active" | "fallback" | "legacy", number> {
  return files.reduce(
    (counts, file) => {
      const tier = file.governanceTier || "active";
      counts[tier] += 1;
      return counts;
    },
    { active: 0, fallback: 0, legacy: 0 }
  );
}

function governanceBadgeClass(tier?: string): string {
  if (tier === "legacy") {
    return "badge--warning";
  }
  if (tier === "fallback") {
    return "badge--muted";
  }
  return "";
}

function buildProcessingMessage(result: KnowledgeProcessingResult): string {
  return `Processed ${result.processedFileCount} file(s) with ${result.processingModel}, uploaded ${result.processedFileCount} distilled note(s), and created ${result.createdMarketCaseCount} market case(s).`;
}

function knowledgeCopyForAgent(agent: AgentProfile): {
  title: string;
  description: string;
  topics: string[];
} {
  switch (agent.sector) {
    case "Macro":
      return {
        title: "Macro knowledge base",
        description:
          "Upload curated macro research for inflation, growth, policy, liquidity, and cross-asset regimes. Keep this separate from live snapshots and the rolling working memory summary.",
        topics: ["Inflation regimes", "Fed frameworks", "Liquidity", "Growth scares", "Cross-asset playbooks"]
      };
    case "Equities":
      return {
        title: "Equities knowledge base",
        description:
          "Upload curated equities research for earnings cycles, sector rotation, market breadth, leadership, and valuation pressure. This is long-term sector context, not a live tape feed.",
        topics: ["Earnings frameworks", "Sector rotation", "Breadth", "Leadership shifts", "Valuation pressure"]
      };
    case "Commodities":
      return {
        title: "Commodities knowledge base",
        description:
          "Upload curated commodities research for oil, gas, metals, gold, inventories, supply shocks, and house views. These files stay separate from live snapshots and the rolling memory summary.",
        topics: ["Oil", "Natural gas", "Copper", "Gold", "Broad metals"]
      };
    case "FX":
      return {
        title: "FX knowledge base",
        description:
          "Upload curated FX research for dollar cycles, major currency crosses, policy divergence, carry, reserve flows, and cross-border transmission into risk assets.",
        topics: ["Dollar regimes", "Carry", "Policy divergence", "FX transmission", "Major crosses"]
      };
    case "Rates":
      return {
        title: "Rates knowledge base",
        description:
          "Upload curated rates research for Treasury moves, curve behavior, duration shocks, term premium, inflation expectations, and policy repricing.",
        topics: ["Curve frameworks", "Duration", "Fed repricing", "Term premium", "Yield shocks"]
      };
    case "Risk/Sentiment":
      return {
        title: "Risk/Sentiment knowledge base",
        description:
          "Upload curated positioning and sentiment research for crowding, vol regimes, breadth stress, risk-on versus risk-off behavior, and market psychology.",
        topics: ["Positioning", "Crowding", "Vol regimes", "Risk-on/off", "Sentiment playbooks"]
      };
    default:
      return {
        title: `${agent.name} knowledge base`,
        description:
          "Upload curated long-term sector research that the agent can retrieve during future discussions.",
        topics: ["Foundations", "Frameworks", "Playbooks", "House views"]
      };
  }
}

function formatKnowledgeCategory(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
