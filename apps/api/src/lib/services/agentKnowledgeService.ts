import type {
  Agent,
  AgentKnowledgeFile,
  AgentKnowledgeStore,
  KnowledgeCategory
} from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";
import { getKnowledgeGovernanceProfile, type KnowledgeGovernanceTier } from "./knowledgeSnippetService";

const maxKnowledgeFileBytes = 10 * 1024 * 1024;
const supportedKnowledgeExtensions = [".md", ".txt", ".pdf", ".docx"];
const directUploadExtensions = [".md", ".txt"];

// ---------------------------------------------------------------------------
// Frontmatter parsing
// Reads the YAML fields used in Wave 1 knowledge docs so the content stored
// in the DB is clean and the metadata is surfaced for retrieval scoring.
// ---------------------------------------------------------------------------

type FrontmatterData = {
  topics: string[];
  trigger_patterns: string[];
  use_when: string[];
  instruments: string[];
  market_regimes: string[];
};

const emptyFrontmatter = (): FrontmatterData => ({
  topics: [],
  trigger_patterns: [],
  use_when: [],
  instruments: [],
  market_regimes: []
});

function parseFrontmatter(content: string): { data: FrontmatterData; body: string } {
  if (!content.startsWith("---")) {
    return { data: emptyFrontmatter(), body: content };
  }

  const closingIndex = content.indexOf("\n---", 3);
  if (closingIndex === -1) {
    return { data: emptyFrontmatter(), body: content };
  }

  const yamlText = content.slice(3, closingIndex).trim();
  const body = content.slice(closingIndex + 4).trim();

  const listFields = new Set<keyof FrontmatterData>([
    "topics",
    "trigger_patterns",
    "use_when",
    "instruments",
    "market_regimes"
  ]);

  const data = emptyFrontmatter();
  let currentField: keyof FrontmatterData | null = null;

  for (const line of yamlText.split("\n")) {
    const keyMatch = line.match(/^([a-z_]+):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1] as keyof FrontmatterData;
      currentField = listFields.has(key) ? key : null;
      continue;
    }

    if (currentField) {
      const listMatch = line.match(/^\s+-\s+(.+)$/);
      if (listMatch) {
        const item = listMatch[1]?.trim();
        if (item) {
          data[currentField].push(item);
        }
      }
    }
  }

  return { data, body };
}

function extractMarkdownTitle(body: string): string | null {
  const match = body.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function buildMetadataSection(data: FrontmatterData): string {
  const sections: string[] = [];

  if (data.topics.length > 0) {
    sections.push(`## Coverage\n${data.topics.join(", ")}`);
  }

  if (data.trigger_patterns.length > 0) {
    sections.push(`## Triggers\n${data.trigger_patterns.join("; ")}`);
  }

  if (data.use_when.length > 0) {
    sections.push(`## Use When\n${data.use_when.join("; ")}`);
  }

  if (data.instruments.length > 0) {
    sections.push(`## Instruments\n${data.instruments.join(", ")}`);
  }

  return sections.join("\n\n");
}

export const knowledgeCategories: KnowledgeCategory[] = [
  "foundations",
  "frameworks",
  "event_playbooks",
  "instrument_guides",
  "house_view_notes"
];

export function isKnowledgeCategory(value: string): value is KnowledgeCategory {
  return knowledgeCategories.includes(value as KnowledgeCategory);
}

export async function listAgentKnowledgeStore(
  env: Env,
  agentId: string
): Promise<AgentKnowledgeStore | null> {
  const repositories = createRepositories(env);
  const agent = await repositories.agents.getById(agentId);

  if (!agent) {
    return null;
  }

  const approvedDocuments = await repositories.knowledgeProcessingJobs.listApprovedKnowledgeByAgent(agent.id, 50);
  const files = approvedDocuments
    .map<AgentKnowledgeFile>((document) => {
      const filename = document.processedFilename || document.sourceFilename;
      const governance = getKnowledgeGovernanceProfile({
        title: document.title,
        filename,
        summary: document.summary,
        reviewNotes: document.reviewNotes
      });

      return {
        id: document.id,
        fileId: document.id,
        filename,
        category: document.category,
        status: "completed",
        governanceTier: governance.tier,
        governanceSource: governance.source,
        governanceReason: governance.reason,
        governancePriority: governance.priority,
        title: document.title,
        summary: document.summary,
        usageBytes: new TextEncoder().encode(document.distilledMarkdown).byteLength,
        createdAt: document.persistedAt || document.createdAt,
        lastError: null
      };
    })
    .sort((left, right) => (right.createdAt || "").localeCompare(left.createdAt || ""));

  return {
    agentId: agent.id,
    agentName: agent.name,
    sector: agent.sector,
    vectorStoreId: null,
    files
  };
}

export async function updateAgentKnowledgeGovernance(
  env: Env,
  agentId: string,
  itemId: string,
  input: { tier: KnowledgeGovernanceTier; priority?: number }
): Promise<AgentKnowledgeStore | null> {
  const repositories = createRepositories(env);
  const agent = await repositories.agents.getById(agentId);

  if (!agent) {
    return null;
  }

  const priority = Math.max(-25, Math.min(25, Math.trunc(input.priority || 0)));
  const notes = `governance:tier=${input.tier};priority=${priority}`;
  const updated = await repositories.knowledgeProcessingJobs.updateItemGovernance(
    agentId,
    itemId,
    notes,
    new Date().toISOString()
  );

  if (!updated) {
    return null;
  }

  console.log(`[knowledge-governance:${agent.name}] item=${itemId} tier=${input.tier} priority=${priority}`);
  return listAgentKnowledgeStore(env, agentId);
}

export async function uploadAgentKnowledgeFiles(
  env: Env,
  agentId: string,
  category: KnowledgeCategory,
  files: File[]
): Promise<{
  agent: Agent;
  knowledgeStore: AgentKnowledgeStore;
}> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Gemini is not configured for knowledge uploads.");
  }

  if (files.length === 0) {
    throw new Error("Choose at least one file to upload.");
  }

  const repositories = createRepositories(env);
  const agent = await repositories.agents.getById(agentId);

  if (!agent) {
    throw new Error("Agent not found.");
  }

  const unsupported = files.find((file) => !supportsDirectUpload(file.name));

  if (unsupported) {
    throw new Error("Direct Gemini knowledge uploads currently support .md and .txt only. Use the research processor for PDF or DOCX files.");
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
    processingModel: "manual_upload",
    totalFiles: files.length,
    createdAt,
    items
  });
  await repositories.knowledgeProcessingJobs.markJobRunning(jobId, createdAt);

  for (const [index, file] of files.entries()) {
    const itemId = items[index]?.id;

    if (!itemId) {
      continue;
    }

    const rawContent = await file.text();
    const { data, body } = parseFrontmatter(rawContent.trim());
    const title = extractMarkdownTitle(body) ?? directUploadTitle(file.name);
    const summary =
      data.topics.length > 0
        ? `${category.replace(/_/g, " ")} covering: ${data.topics.slice(0, 4).join(", ")}.`
        : `Direct ${category.replace(/_/g, " ")} upload for ${agent.name}.`;
    const markdown = buildDirectUploadMarkdown(agent, category, file.name, title, data, body);
    const updatedAt = new Date().toISOString();
    await repositories.knowledgeProcessingJobs.markItemCompleted(jobId, itemId, {
      processedFilename: buildProcessedFilename(file.name),
      title,
      summary,
      marketCaseCount: 0,
      distilledMarkdown: markdown,
      marketCasesJson: "[]",
      updatedAt
    });
    await repositories.knowledgeProcessingJobs.markItemReviewed(jobId, itemId, {
      reviewStatus: "approved",
      reviewNotes: "Direct text upload saved to local Gemini knowledge memory.",
      reviewedAt: updatedAt,
      persistedAt: updatedAt
    });
  }

  await repositories.knowledgeProcessingJobs.markJobCompleted(jobId, new Date().toISOString());

  const knowledgeStore = await listAgentKnowledgeStore(env, agent.id);

  if (!knowledgeStore) {
    throw new Error("Could not reload the agent knowledge store.");
  }

  return {
    agent,
    knowledgeStore
  };
}

export function validateKnowledgeFile(file: File): void {
  const normalizedName = file.name.toLowerCase();
  const hasSupportedExtension = supportedKnowledgeExtensions.some((extension) =>
    normalizedName.endsWith(extension)
  );

  if (!hasSupportedExtension) {
    throw new Error("Use .md, .txt, .pdf, or .docx files for sector knowledge.");
  }

  if (file.size > maxKnowledgeFileBytes) {
    throw new Error("Keep each knowledge file under 10 MB so the store stays curated and fast.");
  }
}

function supportsDirectUpload(filename: string): boolean {
  const normalized = filename.toLowerCase();
  return directUploadExtensions.some((extension) => normalized.endsWith(extension));
}

function buildDirectUploadMarkdown(
  agent: Agent,
  category: KnowledgeCategory,
  filename: string,
  title: string,
  frontmatterData: FrontmatterData,
  body: string
): string {
  const metadataSection = buildMetadataSection(frontmatterData);
  // Strip the leading # Title from the body — the header block above already owns the title
  const bodyWithoutTitle = body.replace(/^#\s+.+\n+/, "").trim();

  const parts: string[] = [
    `# ${title}`,
    "",
    `- Agent: ${agent.name}`,
    `- Sector: ${agent.sector}`,
    `- Category: ${category.replace(/_/g, " ")}`,
    `- Source file: ${filename}`,
    `- Uploaded at: ${new Date().toISOString()}`,
  ];

  if (metadataSection) {
    parts.push("", metadataSection);
  }

  parts.push("", bodyWithoutTitle);

  return parts.join("\n");
}

function buildProcessedFilename(filename: string): string {
  return filename.endsWith(".md") ? filename : `${filename.replace(/\.[^.]+$/, "")}.md`;
}

function directUploadTitle(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return stem ? stem.charAt(0).toUpperCase() + stem.slice(1) : "Knowledge upload";
}
