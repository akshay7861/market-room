import type {
  AdminSummary,
  Agent,
  AgentLearningView,
  AgentKnowledgeStore,
  CreateMarketCaseInput,
  KnowledgeCategory,
  KnowledgeProcessingJob,
  KnowledgeProcessingResult,
  LearningRefreshResult,
  MarketCase,
  TrainingExamplesExportGroupBy,
  UpdateAgentInput
} from "@market-room/shared";
import type { Env } from "../../index";
import { isLlmConfigured } from "../gemini";
import { createRepositories } from "../repositories";
import { loadRoom } from "../room";
import { listAgentKnowledgeStore, updateAgentKnowledgeGovernance, uploadAgentKnowledgeFiles } from "./agentKnowledgeService";
import type { KnowledgeGovernanceTier } from "./knowledgeSnippetService";
import {
  listKnowledgeProcessingJobs,
  queueKnowledgeProcessingJob,
  reviewKnowledgeProcessingJobItem,
  runKnowledgeProcessingJob
} from "./knowledgeProcessingQueueService";
import { getAgentLearningView, refreshLearningSignals } from "./learningService";
import { processAgentResearchFiles } from "./researchProcessingService";
import { getSchedulerCooldownMinutes, getSchedulerPrompt, isSchedulerEnabled } from "./scheduledMarketService";

export async function buildAdminSummary(env: Env): Promise<AdminSummary> {
  const repositories = createRepositories(env);
  const room = loadRoom();

  const [
    agentCount,
    activeAgentCount,
    snapshotCount,
    eventCount,
    messageCount,
    memoryUpdateCount,
    marketCaseCount,
    forecastCount,
    resolvedForecastCount,
    evaluationCount,
    trainingExampleCount
  ] =
    await Promise.all([
      repositories.agents.countAll(),
      repositories.agents.countActive(),
      repositories.marketSnapshots.countAll(),
      repositories.events.countAll(),
      repositories.messages.countAll(),
      repositories.memoryUpdates.countAll(),
      repositories.marketCases.countAll(),
      repositories.agentForecasts.countAll(),
      repositories.agentForecasts.countResolved(),
      repositories.agentEvaluations.countAll(),
      repositories.trainingExamples.countAll()
    ]);

  return {
    roomName: room.name,
    agentCount,
    activeAgentCount,
    snapshotCount,
    eventCount,
    messageCount,
    memoryUpdateCount,
    marketCaseCount,
    forecastCount,
    resolvedForecastCount,
    evaluationCount,
    trainingExampleCount,
    openAiConfigured: isLlmConfigured(env),
    scheduledDiscussionsEnabled: isSchedulerEnabled(env),
    schedulerCooldownMinutes: getSchedulerCooldownMinutes(env),
    schedulerPrompt: getSchedulerPrompt(env)
  };
}

export async function listAdminAgents(env: Env): Promise<Agent[]> {
  return createRepositories(env).agents.list();
}

export async function updateAdminAgent(
  env: Env,
  agentId: string,
  input: UpdateAgentInput
): Promise<Agent | null> {
  return createRepositories(env).agents.update(agentId, input);
}

export async function getAdminAgentKnowledgeStore(
  env: Env,
  agentId: string
): Promise<AgentKnowledgeStore | null> {
  return listAgentKnowledgeStore(env, agentId);
}

export async function uploadAdminAgentKnowledgeFiles(
  env: Env,
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<{
  agent: Agent;
  knowledgeStore: AgentKnowledgeStore;
}> {
  return uploadAgentKnowledgeFiles(env, agentId, category, files);
}

export async function updateAdminAgentKnowledgeGovernance(
  env: Env,
  agentId: string,
  itemId: string,
  input: { tier: KnowledgeGovernanceTier; priority?: number }
): Promise<AgentKnowledgeStore | null> {
  return updateAgentKnowledgeGovernance(env, agentId, itemId, input);
}

export async function processAdminAgentKnowledgeFiles(
  env: Env,
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<KnowledgeProcessingResult> {
  return processAgentResearchFiles(env, agentId, category, files);
}

export async function queueAdminAgentKnowledgeProcessingJob(
  env: Env,
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<KnowledgeProcessingJob> {
  return queueKnowledgeProcessingJob(env, agentId, category, files);
}

export async function runAdminAgentKnowledgeProcessingJob(
  env: Env,
  jobId: string,
  files: File[]
): Promise<KnowledgeProcessingJob | null> {
  return runKnowledgeProcessingJob(env, jobId, files);
}

export async function listAdminAgentKnowledgeProcessingJobs(
  env: Env,
  agentId: string
): Promise<KnowledgeProcessingJob[] | null> {
  return listKnowledgeProcessingJobs(env, agentId);
}

export async function reviewAdminAgentKnowledgeProcessingJobItem(
  env: Env,
  agentId: string,
  jobId: string,
  itemId: string,
  decision: "approve" | "reject"
): Promise<KnowledgeProcessingJob | null> {
  return reviewKnowledgeProcessingJobItem(env, agentId, jobId, itemId, decision);
}

export async function listAdminAgentMarketCases(
  env: Env,
  agentId: string
): Promise<MarketCase[] | null> {
  const repositories = createRepositories(env);
  const agent = await repositories.agents.getById(agentId);

  if (!agent) {
    return null;
  }

  return repositories.marketCases.listByAgent(agentId);
}

export async function createAdminAgentMarketCase(
  env: Env,
  agentId: string,
  input: CreateMarketCaseInput
): Promise<MarketCase | null> {
  const repositories = createRepositories(env);
  const agent = await repositories.agents.getById(agentId);

  if (!agent) {
    return null;
  }

  return repositories.marketCases.create(agentId, input);
}

export async function getAdminAgentLearningView(
  env: Env,
  agentId: string
): Promise<AgentLearningView | null> {
  return getAgentLearningView(env, agentId);
}

export async function refreshAdminLearningSignals(env: Env): Promise<LearningRefreshResult> {
  return refreshLearningSignals(env);
}

export async function exportTrainingExamplesJsonl(
  env: Env,
  groupBy: TrainingExamplesExportGroupBy
): Promise<string> {
  const exportRows = await createRepositories(env).trainingExamples.listDetailedForExport();

  if (groupBy === "agent") {
    const grouped = new Map<
      string,
      {
        agentId: string;
        agentName: string;
        agentSector: string;
        examples: unknown[];
      }
    >();

    for (const row of exportRows) {
      const entry =
        grouped.get(row.agentId) ||
        {
          agentId: row.agentId,
          agentName: row.agentName,
          agentSector: row.agentSector,
          examples: []
        };

      entry.examples.push(buildTrainingExampleExportLine(row));
      grouped.set(row.agentId, entry);
    }

    return Array.from(grouped.values())
      .map((entry) => JSON.stringify(entry))
      .join("\n");
  }

  return exportRows
    .map((row) => JSON.stringify(buildTrainingExampleExportLine(row)))
    .join("\n");
}

function buildTrainingExampleExportLine(row: {
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
}) {
  let parsedInputContext: unknown = row.inputContextJson;

  try {
    parsedInputContext = JSON.parse(row.inputContextJson);
  } catch {
    parsedInputContext = row.inputContextJson;
  }

  return {
    id: row.id,
    agentId: row.agentId,
    agentName: row.agentName,
    agentSector: row.agentSector,
    label: row.label,
    createdAt: row.createdAt,
    inputContext: parsedInputContext,
    forecast: {
      id: row.forecastId,
      targetInstrumentKey: row.targetInstrumentKey,
      targetInstrumentLabel: row.targetInstrumentLabel,
      signal: row.signal,
      confidence: row.forecastConfidence,
      thesis: row.forecastThesis
    },
    evaluation: {
      id: row.evaluationId,
      overallScore: row.evaluationOverallScore,
      clarityScore: row.clarityScore,
      specificityScore: row.specificityScore,
      actionabilityScore: row.actionabilityScore,
      distinctivenessScore: row.distinctivenessScore
    },
    outcome: {
      id: row.outcomeId,
      label: row.outcomeLabel,
      score: row.outcomeScore,
      actualDirection: row.actualDirection,
      actualMove: row.actualMove
    },
    responseText: row.responseText,
    feedbackSummary: row.feedbackSummary
  };
}
