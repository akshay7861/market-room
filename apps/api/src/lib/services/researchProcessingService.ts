import type {
  Agent,
  CreateMarketCaseInput,
  KnowledgeCategory,
  KnowledgeProcessingArtifact,
  KnowledgeProcessingResult
} from "@market-room/shared";
import type { Env } from "../../index";
import { generateGeminiContent, getProcessingLlmModel, isLlmConfigured } from "../gemini";
import { parseStructuredResponseJson } from "../openAiResponses";
import { createRepositories } from "../repositories";
import {
  listAgentKnowledgeStore,
  uploadAgentKnowledgeFiles,
  validateKnowledgeFile
} from "./agentKnowledgeService";

const maxGeneratedCasesPerFile = 2;

export type DistilledResearchFile = {
  title: string;
  summary: string;
  processedFilename: string;
  distilledMarkdown: string;
  marketCases: CreateMarketCaseInput[];
};

export function getResearchProcessingModel(env: Env): string {
  return getProcessingLlmModel(env);
}

export async function processAgentResearchFiles(
  env: Env,
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<KnowledgeProcessingResult> {
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

  const processingModel = getResearchProcessingModel(env);
  const artifacts: KnowledgeProcessingArtifact[] = [];
  let createdMarketCaseCount = 0;

  for (const file of files) {
    validateKnowledgeFile(file);
    const processed = await distillResearchFile(env, processingModel, agent, category, file);
    const processedFile = new File([processed.distilledMarkdown], processed.processedFilename, {
      type: "text/markdown"
    });

    await uploadAgentKnowledgeFiles(env, agent.id, category, [processedFile]);

    for (const marketCase of processed.marketCases.slice(0, maxGeneratedCasesPerFile)) {
      await repositories.marketCases.create(agent.id, marketCase);
      createdMarketCaseCount += 1;
    }

    artifacts.push({
      sourceFilename: file.name,
      processedFilename: processed.processedFilename,
      title: processed.title,
      summary: processed.summary,
      marketCaseCount: processed.marketCases.length
    });
  }

  const refreshedAgent = await repositories.agents.getById(agent.id);

  if (!refreshedAgent) {
    throw new Error("Agent disappeared after processing.");
  }

  const knowledgeStore = await listAgentKnowledgeStore(env, refreshedAgent.id);

  if (!knowledgeStore) {
    throw new Error("Could not reload the processed knowledge store.");
  }

  return {
    agent: refreshedAgent,
    knowledgeStore,
    processingModel,
    processedFileCount: artifacts.length,
    createdMarketCaseCount,
    artifacts
  };
}

export async function distillResearchFile(
  env: Env,
  processingModel: string,
  agent: Agent,
  category: KnowledgeCategory,
  file: File
): Promise<DistilledResearchFile> {
  const parsed = await requestProcessedResearch(env, processingModel, agent, category, file);

  return {
    title: parsed.title,
    summary: parsed.summary,
    processedFilename: buildProcessedFilename(file.name),
    distilledMarkdown: buildProcessedMarkdown(agent, category, file.name, parsed),
    marketCases: parsed.marketCases
  };
}

async function requestProcessedResearch(
  env: Env,
  processingModel: string,
  agent: Agent,
  category: KnowledgeCategory,
  file: File
): Promise<{
  title: string;
  summary: string;
  keyTakeaways: string[];
  implications: string[];
  distilledNote: string;
  marketCases: CreateMarketCaseInput[];
}> {
  const inlineFile = await buildInlineFileInput(file);
  const payload = await generateGeminiContent(env, {
    model: processingModel,
    instructions: [
      "You are Research Processor, a preparation model for Market Room.",
      "Read the uploaded market report or historical note and convert it into compact, reusable memory for one specialist market agent.",
      "Do not write generic summaries. Distill reusable frameworks, regime lessons, what moved, why it mattered, what assets were affected, and what an analyst should watch next.",
      "Prefer concrete market language over broad business language.",
      "Generate up to two reusable market cases only when the source contains a real repeatable episode."
    ].join(" "),
    prompt: [
      `Agent: ${agent.name}`,
      `Sector: ${agent.sector}`,
      `Target category: ${formatCategory(category)}`,
      `Source file: ${file.name}`,
      "Turn this raw research into clean long-term memory that a market specialist can retrieve later."
    ].join("\n"),
    inlineFiles: [inlineFile],
    maxOutputTokens: 4800,
    temperature: 0.1,
    responseSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        keyTakeaways: {
          type: "array",
          items: { type: "string" }
        },
        implications: {
          type: "array",
          items: { type: "string" }
        },
        distilledNote: { type: "string" },
        marketCases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              dateLabel: { type: "string" },
              regimeTags: {
                type: "array",
                items: { type: "string" }
              },
              marketContext: { type: "string" },
              patternSummary: { type: "string" },
              implicationNote: { type: "string" },
              outcomeNote: { type: "string" },
              sourceLabel: { type: "string" },
              sourceUrl: { type: "string" }
            },
            required: [
              "title",
              "dateLabel",
              "regimeTags",
              "marketContext",
              "patternSummary",
              "implicationNote",
              "outcomeNote",
              "sourceLabel"
            ]
          }
        }
      },
      required: ["title", "summary", "keyTakeaways", "implications", "distilledNote", "marketCases"]
    }
  });

  const parsed = parseStructuredResponseJson<{
    title: string;
    summary: string;
    keyTakeaways: string[];
    implications: string[];
    distilledNote: string;
    marketCases: CreateMarketCaseInput[];
  }>(payload);

  if (!parsed) {
    throw new Error("Research processing returned no structured output.");
  }

  return {
    ...parsed,
    keyTakeaways: parsed.keyTakeaways.slice(0, 6),
    implications: parsed.implications.slice(0, 5),
    marketCases: parsed.marketCases.slice(0, maxGeneratedCasesPerFile)
  };
}

function buildProcessedMarkdown(
  agent: Agent,
  category: KnowledgeCategory,
  sourceFilename: string,
  processed: {
    title: string;
    summary: string;
    keyTakeaways: string[];
    implications: string[];
    distilledNote: string;
  }
): string {
  return [
    `# ${processed.title}`,
    "",
    `- Agent: ${agent.name}`,
    `- Sector: ${agent.sector}`,
    `- Category: ${formatCategory(category)}`,
    `- Source file: ${sourceFilename}`,
    `- Processed at: ${new Date().toISOString()}`,
    "",
    "## Why This Matters",
    processed.summary,
    "",
    "## Key Takeaways",
    ...processed.keyTakeaways.map((item) => `- ${item}`),
    "",
    "## Market Implications",
    ...processed.implications.map((item) => `- ${item}`),
    "",
    "## Distilled Analyst Note",
    processed.distilledNote.trim()
  ].join("\n");
}

function buildProcessedFilename(sourceFilename: string): string {
  const normalized = sourceFilename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const stem = normalized.replace(/^-+|-+$/g, "") || "processed-research";
  return `${stem}.processed.md`;
}

function formatCategory(category: KnowledgeCategory): string {
  return category.replace(/_/g, " ");
}

async function buildInlineFileInput(file: File): Promise<{ mimeType: string; data: string }> {
  const mimeType = supportedGeminiMimeType(file);

  return {
    mimeType,
    data: arrayBufferToBase64(await file.arrayBuffer())
  };
}

function supportedGeminiMimeType(file: File): string {
  const normalizedName = file.name.toLowerCase();

  if (normalizedName.endsWith(".md")) {
    return "text/plain";
  }

  if (normalizedName.endsWith(".txt")) {
    return "text/plain";
  }

  if (normalizedName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (normalizedName.endsWith(".docx")) {
    throw new Error("DOCX research processing is not wired for Gemini yet. Convert the file to PDF, Markdown, or plain text first.");
  }

  return file.type || "text/plain";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}
