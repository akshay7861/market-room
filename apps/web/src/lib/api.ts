import type {
  AdminSummary,
  AgentLearningView,
  AgentKnowledgeStore,
  AgentProfile,
  CreateMarketCaseInput,
  DiscussionRun,
  KnowledgeCategory,
  KnowledgeProcessingJob,
  KnowledgeProcessingResult,
  LearningRefreshResult,
  LiveMarketView,
  MarketCase,
  MarketQuestionThreadView,
  MarketQuestionsView,
  MarketRoomView,
  TrainingExamplesExportGroupBy,
  UpdateAgentInput
} from "@market-room/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8787";
const ADMIN_TOKEN_STORAGE_KEY = "market-room-admin-token";

export function getAdminToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
}

export function setAdminToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token.trim());
  }
}

export function clearAdminToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
}

function getClientId(): string {
  if (typeof window === "undefined") {
    return "server-client";
  }

  const existing = window.localStorage.getItem("market-room-client-id");

  if (existing) {
    return existing;
  }

  const next = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `client-${Date.now()}`;
  window.localStorage.setItem("market-room-client-id", next);
  return next;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("X-Client-Id", getClientId());
  const adminToken = getAdminToken();
  if (adminToken) {
    headers.set("X-Admin-Token", adminToken);
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchAgents(): Promise<AgentProfile[]> {
  // The frontend only knows about the API base URL, which keeps deployment simple.
  const payload = await fetchJson<{ agents: AgentProfile[] }>("/api/agents");
  return payload.agents;
}

export async function fetchMarketRoom(options: { threadLimit?: number; threadOffset?: number } = {}): Promise<MarketRoomView> {
  const params = new URLSearchParams();

  if (options.threadLimit) {
    params.set("threadLimit", String(options.threadLimit));
  }

  if (options.threadOffset) {
    params.set("threadOffset", String(options.threadOffset));
  }

  const query = params.toString();
  return fetchJson<MarketRoomView>(`/api/market-room${query ? `?${query}` : ""}`);
}

export async function fetchLiveMarket(): Promise<LiveMarketView> {
  return fetchJson<LiveMarketView>("/api/live-market");
}

export async function fetchMarketQuestions(): Promise<MarketQuestionsView> {
  return fetchJson<MarketQuestionsView>("/api/market-questions");
}

export async function fetchMarketQuestionThread(threadId: string): Promise<MarketQuestionThreadView> {
  return fetchJson<MarketQuestionThreadView>(`/api/market-questions/${threadId}`);
}

export async function createMarketQuestion(question: string): Promise<MarketQuestionThreadView> {
  return fetchJson<MarketQuestionThreadView>("/api/market-questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question })
  });
}

export async function replyToMarketQuestion(
  threadId: string,
  question: string
): Promise<MarketQuestionThreadView> {
  return fetchJson<MarketQuestionThreadView>(`/api/market-questions/${threadId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ question })
  });
}

export async function fetchAdminSummary(): Promise<AdminSummary> {
  return fetchJson<AdminSummary>("/api/admin/summary");
}

export async function fetchAdminAgents(): Promise<AgentProfile[]> {
  const payload = await fetchJson<{ agents: AgentProfile[] }>("/api/admin/agents");
  return payload.agents;
}

export async function runDiscussion(prompt?: string): Promise<DiscussionRun> {
  return fetchJson<DiscussionRun>("/api/discussions/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  });
}

export async function updateAdminAgent(agentId: string, input: UpdateAgentInput): Promise<AgentProfile> {
  const payload = await fetchJson<{ agent: AgentProfile }>(`/api/admin/agents/${agentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return payload.agent;
}

export async function fetchAgentKnowledgeStore(agentId: string): Promise<AgentKnowledgeStore> {
  const payload = await fetchJson<{ knowledgeStore: AgentKnowledgeStore }>(
    `/api/admin/agents/${agentId}/knowledge-store`
  );

  return payload.knowledgeStore;
}

export async function updateAgentKnowledgeGovernance(
  agentId: string,
  itemId: string,
  input: { tier: "active" | "fallback" | "legacy"; priority?: number }
): Promise<AgentKnowledgeStore> {
  const payload = await fetchJson<{ knowledgeStore: AgentKnowledgeStore }>(
    `/api/admin/agents/${agentId}/knowledge-store/${itemId}/governance`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    }
  );

  return payload.knowledgeStore;
}

export async function uploadAgentKnowledge(
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<{ agent: AgentProfile; knowledgeStore: AgentKnowledgeStore }> {
  const formData = new FormData();
  formData.append("category", category);

  for (const file of files) {
    formData.append("files", file, file.name);
  }

  return fetchJson<{ agent: AgentProfile; knowledgeStore: AgentKnowledgeStore }>(
    `/api/admin/agents/${agentId}/knowledge-store`,
    {
      method: "POST",
      body: formData
    }
  );
}

export async function processAgentKnowledge(
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<KnowledgeProcessingResult> {
  const formData = new FormData();
  formData.append("category", category);

  for (const file of files) {
    formData.append("files", file, file.name);
  }

  return fetchJson<KnowledgeProcessingResult>(`/api/admin/agents/${agentId}/knowledge-processing`, {
    method: "POST",
    body: formData
  });
}

export async function queueAgentKnowledgeProcessingJob(
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<KnowledgeProcessingJob> {
  const formData = new FormData();
  formData.append("category", category);

  for (const file of files) {
    formData.append("files", file, file.name);
  }

  const payload = await fetchJson<{ job: KnowledgeProcessingJob }>(
    `/api/admin/agents/${agentId}/knowledge-processing/jobs`,
    {
      method: "POST",
      body: formData
    }
  );

  return payload.job;
}

export async function fetchAgentKnowledgeProcessingJobs(agentId: string): Promise<KnowledgeProcessingJob[]> {
  const payload = await fetchJson<{ jobs: KnowledgeProcessingJob[] }>(
    `/api/admin/agents/${agentId}/knowledge-processing/jobs`
  );

  return payload.jobs;
}

export async function reviewAgentKnowledgeProcessingJobItem(
  agentId: string,
  jobId: string,
  itemId: string,
  decision: "approve" | "reject"
): Promise<KnowledgeProcessingJob> {
  const payload = await fetchJson<{ job: KnowledgeProcessingJob }>(
    `/api/admin/agents/${agentId}/knowledge-processing/jobs/${jobId}/items/${itemId}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ decision })
    }
  );

  return payload.job;
}

export async function fetchAgentMarketCases(agentId: string): Promise<MarketCase[]> {
  const payload = await fetchJson<{ marketCases: MarketCase[] }>(`/api/admin/agents/${agentId}/market-cases`);
  return payload.marketCases;
}

export async function createAgentMarketCase(
  agentId: string,
  input: CreateMarketCaseInput
): Promise<MarketCase> {
  const payload = await fetchJson<{ marketCase: MarketCase }>(`/api/admin/agents/${agentId}/market-cases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return payload.marketCase;
}

export async function fetchAgentLearning(agentId: string): Promise<AgentLearningView> {
  const payload = await fetchJson<{ learning: AgentLearningView }>(`/api/admin/agents/${agentId}/learning`);
  return payload.learning;
}

export async function refreshLearningSignals(): Promise<LearningRefreshResult> {
  return fetchJson<LearningRefreshResult>("/api/admin/learning/refresh", {
    method: "POST"
  });
}

export async function downloadTrainingExamplesExport(
  groupBy: TrainingExamplesExportGroupBy
): Promise<{ blob: Blob; filename: string }> {
  const headers = new Headers({
    "X-Client-Id": getClientId()
  });
  const adminToken = getAdminToken();
  if (adminToken) {
    headers.set("X-Admin-Token", adminToken);
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/learning/export?groupBy=${groupBy}`, {
    headers
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);

  return {
    blob,
    filename: filenameMatch?.[1] || `training-examples-${groupBy}.jsonl`
  };
}

export async function reactToMessage(
  messageId: string,
  reaction: "like" | "dislike" | null
): Promise<{ message: import("@market-room/shared").AgentMessage }> {
  return fetchJson<{ message: import("@market-room/shared").AgentMessage }>(`/api/messages/${messageId}/reaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ reaction })
  });
}
