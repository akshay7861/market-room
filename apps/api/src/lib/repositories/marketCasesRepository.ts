import type { CreateMarketCaseInput, MarketCase } from "@market-room/shared";
import type { Env } from "../../index";

type MarketCaseRow = {
  id: string;
  agentId: string;
  title: string;
  dateLabel: string;
  regimeTagsJson: string;
  marketContext: string;
  patternSummary: string;
  implicationNote: string;
  outcomeNote: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createMarketCasesRepository(env: Env) {
  return {
    async listByAgent(agentId: string, limit = 20): Promise<MarketCase[]> {
      const result = await env.DB.prepare(
        `SELECT
          id,
          agent_id AS agentId,
          title,
          date_label AS dateLabel,
          regime_tags_json AS regimeTagsJson,
          market_context AS marketContext,
          pattern_summary AS patternSummary,
          implication_note AS implicationNote,
          outcome_note AS outcomeNote,
          source_label AS sourceLabel,
          source_url AS sourceUrl,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM market_cases
        WHERE agent_id = ?
        ORDER BY created_at DESC
        LIMIT ?`
      )
        .bind(agentId, limit)
        .all<MarketCaseRow>();

      return result.results.map(mapMarketCaseRow);
    },

    async create(agentId: string, input: CreateMarketCaseInput): Promise<MarketCase> {
      validateMarketCaseInput(input);
      const now = new Date().toISOString();
      const marketCase: MarketCase = {
        id: crypto.randomUUID(),
        agentId,
        title: input.title.trim(),
        dateLabel: input.dateLabel.trim(),
        regimeTags: input.regimeTags.map((tag) => tag.trim()).filter(Boolean),
        marketContext: input.marketContext.trim(),
        patternSummary: input.patternSummary.trim(),
        implicationNote: input.implicationNote.trim(),
        outcomeNote: input.outcomeNote.trim(),
        sourceLabel: input.sourceLabel?.trim() || null,
        sourceUrl: input.sourceUrl?.trim() || null,
        createdAt: now,
        updatedAt: now
      };

      await env.DB.prepare(
        `INSERT INTO market_cases
          (id, agent_id, title, date_label, regime_tags_json, market_context, pattern_summary, implication_note, outcome_note, source_label, source_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          marketCase.id,
          marketCase.agentId,
          marketCase.title,
          marketCase.dateLabel,
          JSON.stringify(marketCase.regimeTags),
          marketCase.marketContext,
          marketCase.patternSummary,
          marketCase.implicationNote,
          marketCase.outcomeNote,
          marketCase.sourceLabel,
          marketCase.sourceUrl,
          marketCase.createdAt,
          marketCase.updatedAt
        )
        .run();

      return marketCase;
    },

    async countAll(): Promise<number> {
      const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM market_cases").first<{ total: number }>();
      return row?.total ?? 0;
    }
  };
}

function mapMarketCaseRow(row: MarketCaseRow): MarketCase {
  return {
    id: row.id,
    agentId: row.agentId,
    title: row.title,
    dateLabel: row.dateLabel,
    regimeTags: parseRegimeTags(row.regimeTagsJson),
    marketContext: row.marketContext,
    patternSummary: row.patternSummary,
    implicationNote: row.implicationNote,
    outcomeNote: row.outcomeNote,
    sourceLabel: row.sourceLabel,
    sourceUrl: row.sourceUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function parseRegimeTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function validateMarketCaseInput(input: CreateMarketCaseInput): void {
  const requiredFields: Array<[string, string]> = [
    ["title", input.title],
    ["dateLabel", input.dateLabel],
    ["marketContext", input.marketContext],
    ["patternSummary", input.patternSummary],
    ["implicationNote", input.implicationNote],
    ["outcomeNote", input.outcomeNote]
  ];

  for (const [label, value] of requiredFields) {
    if (!value.trim()) {
      throw new Error(`${label} is required.`);
    }
  }
}
