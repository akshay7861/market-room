import type { Agent, KnowledgeCategory } from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";

const embeddingModel = "@cf/baai/bge-base-en-v1.5" as const;
const vectorEnabledValue = "true";

export type KnowledgeVectorMatch = {
  id: string;
  score: number;
  rank: number;
};

type ApprovedKnowledgeVectorDocument = {
  id: string;
  title: string;
  summary: string;
  category: KnowledgeCategory;
  filename: string;
  content: string;
  reviewNotes: string | null;
};

type VectorBackfillAgentResult = {
  agentId: string;
  agentName: string;
  indexed: number;
  skipped: number;
};

export type VectorBackfillResult = {
  ok: boolean;
  enabled: boolean;
  model: string;
  index: string;
  agentResults: VectorBackfillAgentResult[];
  totalIndexed: number;
  totalSkipped: number;
};

export function isVectorKnowledgeConfigured(env: Env): boolean {
  return Boolean(
    env.KNOWLEDGE_VECTOR_RETRIEVAL === vectorEnabledValue &&
      env.AI &&
      env.KNOWLEDGE_VECTOR_INDEX
  );
}

export async function queryKnowledgeVectors(
  env: Env,
  agent: Agent,
  query: string,
  topK = 12
): Promise<KnowledgeVectorMatch[]> {
  if (!isVectorKnowledgeConfigured(env)) {
    return [];
  }

  try {
    const embedding = await embedText(env, query);
    const result = await env.KNOWLEDGE_VECTOR_INDEX!.query(embedding, {
      topK,
      namespace: agent.id,
      returnMetadata: "indexed"
    });

    const matches = result.matches
      .filter((match) => typeof match.id === "string" && typeof match.score === "number")
      .map((match, index) => ({
        id: match.id,
        score: match.score,
        rank: index + 1
      }));

    console.log(
      `[knowledge-vector:${agent.name}] query namespace=${agent.id} matches=${matches.length} top=${matches
        .slice(0, 5)
        .map((match) => `${match.id}:${match.score.toFixed(3)}`)
        .join(",") || "none"}`
    );
    return matches;
  } catch (error) {
    console.log(
      `[knowledge-vector:${agent.name}] query failed — falling back to lexical retrieval: ${error instanceof Error ? error.message : "unknown error"}`
    );
    return [];
  }
}

export async function backfillKnowledgeVectors(env: Env, agentId?: string | null): Promise<VectorBackfillResult> {
  if (!isVectorKnowledgeConfigured(env)) {
    return {
      ok: false,
      enabled: false,
      model: embeddingModel,
      index: "market-room-knowledge",
      agentResults: [],
      totalIndexed: 0,
      totalSkipped: 0
    };
  }

  const repositories = createRepositories(env);
  const requestedAgent = agentId ? await repositories.agents.getById(agentId) : null;
  const agents = agentId
    ? requestedAgent
      ? [requestedAgent]
      : []
    : await repositories.agents.list();
  const agentResults: VectorBackfillAgentResult[] = [];

  for (const agent of agents) {
    const rows = await repositories.knowledgeProcessingJobs.listApprovedKnowledgeByAgent(agent.id, 100);
    const documents: ApprovedKnowledgeVectorDocument[] = rows.map((row) => ({
      id: row.id,
      title: row.title || row.processedFilename || row.sourceFilename,
      summary: row.summary || "",
      category: row.category,
      filename: row.processedFilename || row.sourceFilename,
      content: row.distilledMarkdown,
      reviewNotes: row.reviewNotes
    }));

    let indexed = 0;
    let skipped = 0;
    for (const batch of chunkArray(documents, 16)) {
      const vectors = [];
      for (const document of batch) {
        const embeddingInput = buildEmbeddingText(document, agent);
        if (!embeddingInput.trim()) {
          skipped += 1;
          continue;
        }
        const values = await embedText(env, embeddingInput);
        const governanceTier = inferGovernanceTier(document);
        vectors.push({
          id: document.id,
          namespace: agent.id,
          values,
          metadata: {
            agentId: agent.id,
            sector: agent.sector,
            category: document.category,
            title: document.title.slice(0, 200),
            filename: document.filename.slice(0, 200),
            governanceTier
          }
        });
      }

      if (vectors.length > 0) {
        await env.KNOWLEDGE_VECTOR_INDEX!.upsert(vectors);
        indexed += vectors.length;
      }
    }

    await repositories.agents.updateVectorStoreId(agent.id, "market-room-knowledge", new Date().toISOString());
    agentResults.push({ agentId: agent.id, agentName: agent.name, indexed, skipped });
    console.log(`[knowledge-vector:${agent.name}] backfilled indexed=${indexed} skipped=${skipped}`);
  }

  const totalIndexed = agentResults.reduce((sum, result) => sum + result.indexed, 0);
  const totalSkipped = agentResults.reduce((sum, result) => sum + result.skipped, 0);
  return {
    ok: true,
    enabled: true,
    model: embeddingModel,
    index: "market-room-knowledge",
    agentResults,
    totalIndexed,
    totalSkipped
  };
}

function inferGovernanceTier(document: ApprovedKnowledgeVectorDocument): "active" | "fallback" | "legacy" {
  const manual = document.reviewNotes?.match(/governance:tier=(active|fallback|legacy)/);
  if (manual?.[1]) {
    return manual[1] as "active" | "fallback" | "legacy";
  }

  const lower = [document.title, document.filename, document.summary].join(" ").toLowerCase();
  if (
    lower.includes("starter pack") ||
    lower.includes("historical foundation") ||
    lower.includes("historical starter") ||
    lower.includes("public report") ||
    lower.includes("durable memory") ||
    lower.includes("long-term memory")
  ) {
    return "legacy";
  }
  if (
    lower.includes("census retail") ||
    lower.includes("retail spending") ||
    lower.includes("watchlist pack") ||
    lower.includes("historical regime anchors")
  ) {
    return "fallback";
  }
  return "active";
}

async function embedText(env: Env, text: string): Promise<number[]> {
  if (!env.AI) {
    throw new Error("Workers AI binding is not configured.");
  }

  const output = await env.AI.run(embeddingModel, {
    text: truncateForEmbedding(text)
  });
  const vector = "data" in output ? output.data?.[0] : undefined;

  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Workers AI returned no embedding vector.");
  }

  return vector;
}

function buildEmbeddingText(document: ApprovedKnowledgeVectorDocument, agent: Agent): string {
  return [
    `Agent: ${agent.name}`,
    `Sector: ${agent.sector}`,
    `Title: ${document.title}`,
    `Category: ${document.category}`,
    document.summary ? `Summary: ${document.summary}` : "",
    document.content
  ]
    .filter(Boolean)
    .join("\n\n");
}

function truncateForEmbedding(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 7000 ? normalized.slice(0, 7000) : normalized;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
