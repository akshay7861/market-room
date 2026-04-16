import type { Agent, KnowledgeCategory, KnowledgeProcessingJob, KnowledgeProcessingJobItem } from "@market-room/shared";
import type { Env } from "../../index";
import { isLlmConfigured } from "../gemini";
import { createRepositories } from "../repositories";
import { validateKnowledgeFile } from "./agentKnowledgeService";
import {
  distillResearchFile,
  getResearchProcessingModel,
  type DistilledResearchFile
} from "./researchProcessingService";

export async function queueKnowledgeProcessingJob(
  env: Env,
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<KnowledgeProcessingJob> {
  if (!isLlmConfigured(env)) {
    throw new Error("Gemini is not configured for research processing.");
  }

  if (files.length === 0) {
    throw new Error("Choose one or more raw research files first.");
  }

  const repositories = createRepositories(env);
  const agent = await repositories.agents.getById(agentId);

  if (!agent) {
    throw new Error("Agent not found.");
  }

  for (const file of files) {
    validateKnowledgeFile(file);
  }

  const createdAt = new Date().toISOString();
  const jobId = crypto.randomUUID();
  const items = files.map((file) => ({
    id: crypto.randomUUID(),
    sourceFilename: file.name,
    createdAt
  }));

  await repositories.knowledgeProcessingJobs.createJob({
    id: jobId,
    agentId,
    category,
    processingModel: getResearchProcessingModel(env),
    totalFiles: files.length,
    createdAt,
    items
  });

  const job = await repositories.knowledgeProcessingJobs.getJob(jobId);

  if (!job) {
    throw new Error("Could not load the queued processing job.");
  }

  return job;
}

export async function runKnowledgeProcessingJob(
  env: Env,
  jobId: string,
  files: File[]
): Promise<KnowledgeProcessingJob | null> {
  const repositories = createRepositories(env);
  const job = await repositories.knowledgeProcessingJobs.getJob(jobId);

  if (!job) {
    return null;
  }

  const agent = await repositories.agents.getById(job.agentId);

  if (!agent) {
    await repositories.knowledgeProcessingJobs.markJobFailed(jobId, "Agent not found.", new Date().toISOString());
    return repositories.knowledgeProcessingJobs.getJob(jobId);
  }

  const fileMap = new Map(files.map((file) => [file.name, file]));
  const startedAt = new Date().toISOString();
  await repositories.knowledgeProcessingJobs.markJobRunning(jobId, startedAt);

  try {
    for (const item of job.items) {
      const sourceFile = fileMap.get(item.sourceFilename);

      if (!sourceFile) {
        await repositories.knowledgeProcessingJobs.markItemFailed(
          jobId,
          item.id,
          "Uploaded file data was unavailable when the batch runner started.",
          new Date().toISOString()
        );
        continue;
      }

      await repositories.knowledgeProcessingJobs.markItemRunning(jobId, item.id, new Date().toISOString());

      try {
        const distilled = await distillResearchFile(
          env,
          job.processingModel,
          agent,
          job.category,
          sourceFile
        );

        await repositories.knowledgeProcessingJobs.markItemCompleted(jobId, item.id, {
          processedFilename: distilled.processedFilename,
          title: distilled.title,
          summary: distilled.summary,
          marketCaseCount: distilled.marketCases.length,
          distilledMarkdown: distilled.distilledMarkdown,
          marketCasesJson: JSON.stringify(distilled.marketCases),
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        await repositories.knowledgeProcessingJobs.markItemFailed(
          jobId,
          item.id,
          error instanceof Error ? error.message : "Research processing failed.",
          new Date().toISOString()
        );
      }
    }

    const latestJob = await repositories.knowledgeProcessingJobs.getJob(jobId);

    if (!latestJob) {
      return null;
    }

    if (latestJob.completedFiles > 0 || latestJob.failedFiles === 0) {
      await repositories.knowledgeProcessingJobs.markJobCompleted(jobId, new Date().toISOString());
    } else {
      await repositories.knowledgeProcessingJobs.markJobFailed(
        jobId,
        latestJob.lastError || "Every file in the batch failed to process.",
        new Date().toISOString()
      );
    }

    return repositories.knowledgeProcessingJobs.getJob(jobId);
  } catch (error) {
    await repositories.knowledgeProcessingJobs.markJobFailed(
      jobId,
      error instanceof Error ? error.message : "Knowledge processing job failed.",
      new Date().toISOString()
    );

    return repositories.knowledgeProcessingJobs.getJob(jobId);
  }
}

export async function listKnowledgeProcessingJobs(
  env: Env,
  agentId: string
): Promise<KnowledgeProcessingJob[] | null> {
  const repositories = createRepositories(env);
  const agent = await repositories.agents.getById(agentId);

  if (!agent) {
    return null;
  }

  return repositories.knowledgeProcessingJobs.listByAgent(agentId);
}

async function persistDistilledResearch(
  env: Env,
  agent: Agent,
  distilled: DistilledResearchFile
): Promise<void> {
  const repositories = createRepositories(env);

  for (const marketCase of distilled.marketCases) {
    await repositories.marketCases.create(agent.id, marketCase);
  }
}

export async function reviewKnowledgeProcessingJobItem(
  env: Env,
  agentId: string,
  jobId: string,
  itemId: string,
  decision: "approve" | "reject"
): Promise<KnowledgeProcessingJob | null> {
  const repositories = createRepositories(env);
  const [job, agent, item] = await Promise.all([
    repositories.knowledgeProcessingJobs.getJob(jobId),
    repositories.agents.getById(agentId),
    repositories.knowledgeProcessingJobs.getItem(jobId, itemId)
  ]);

  if (!job || !agent || !item || job.agentId !== agentId) {
    return null;
  }

  if (item.status !== "completed") {
    throw new Error("Only completed processed files can be reviewed.");
  }

  if (item.reviewStatus === "approved" || item.reviewStatus === "rejected") {
    return job;
  }

  const reviewedAt = new Date().toISOString();

  if (decision === "reject") {
    await repositories.knowledgeProcessingJobs.markItemReviewed(jobId, itemId, {
      reviewStatus: "rejected",
      reviewNotes: "Rejected from the admin review panel.",
      reviewedAt
    });

    return repositories.knowledgeProcessingJobs.getJob(jobId);
  }

  const distilled = distilledFromJobItem(item);
  await persistDistilledResearch(env, agent, distilled);
  await repositories.knowledgeProcessingJobs.markItemReviewed(jobId, itemId, {
    reviewStatus: "approved",
    reviewNotes: "Approved from the admin review panel.",
    reviewedAt,
    persistedAt: reviewedAt
  });

  return repositories.knowledgeProcessingJobs.getJob(jobId);
}

function distilledFromJobItem(item: KnowledgeProcessingJobItem): DistilledResearchFile {
  if (!item.processedFilename || !item.title || !item.summary || !item.distilledMarkdown) {
    throw new Error("Processed review item is missing staged output.");
  }

  return {
    title: item.title,
    summary: item.summary,
    processedFilename: item.processedFilename,
    distilledMarkdown: item.distilledMarkdown,
    marketCases: item.marketCases
  };
}
