import type { Agent, MarketCase, MarketSnapshotPayload } from "@market-room/shared";
import type { Env } from "../../index";
import { createRepositories } from "../repositories";

export async function listRelevantMarketCasesForAgent(
  env: Env,
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  discussionProfile: string,
  maxResults = 5
): Promise<MarketCase[]> {
  const cases = await createRepositories(env).marketCases.listByAgent(agent.id, 20);
  const keywords = buildCaseKeywords(agent, marketSnapshot, discussionProfile);

  return cases
    .map((marketCase) => ({
      marketCase,
      score: scoreMarketCase(marketCase, keywords)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.marketCase.createdAt.localeCompare(left.marketCase.createdAt))
    .slice(0, maxResults)
    .map((entry) => entry.marketCase);
}

function buildCaseKeywords(
  agent: Agent,
  marketSnapshot: MarketSnapshotPayload,
  discussionProfile: string
): string[] {
  const headlineText = marketSnapshot.headlines
    .slice(0, 3)
    .map((headline) => headline.title.toLowerCase())
    .join(" ");
  const summaryText = `${marketSnapshot.headline} ${marketSnapshot.summary}`.toLowerCase();
  const baseKeywords = [discussionProfile, agent.sector.toLowerCase(), ...tokenize(headlineText), ...tokenize(summaryText)];

  switch (agent.sector) {
    case "Macro":
      return baseKeywords.concat(["inflation", "growth", "policy", "liquidity", "macro"]);
    case "Equities":
      return baseKeywords.concat(["equity", "earnings", "breadth", "leadership", "risk"]);
    case "Commodities":
      return baseKeywords.concat(["commodity", "oil", "gas", "gold", "copper", "supply"]);
    case "FX":
      return baseKeywords.concat(["fx", "dollar", "carry", "divergence", "currency"]);
    case "Rates":
      return baseKeywords.concat(["rates", "yield", "curve", "duration", "treasury"]);
    case "Risk/Sentiment":
      return baseKeywords.concat(["risk", "sentiment", "positioning", "crowding", "vol"]);
    default:
      return baseKeywords;
  }
}

function scoreMarketCase(marketCase: MarketCase, keywords: string[]): number {
  const haystack = [
    marketCase.title,
    marketCase.dateLabel,
    marketCase.marketContext,
    marketCase.patternSummary,
    marketCase.implicationNote,
    marketCase.outcomeNote,
    marketCase.regimeTags.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  const tags = new Set(marketCase.regimeTags.map((tag) => tag.toLowerCase()));
  let score = 0;

  for (const keyword of keywords) {
    if (!keyword || keyword.length < 3) {
      continue;
    }

    if (tags.has(keyword)) {
      score += 4;
      continue;
    }

    if (haystack.includes(keyword)) {
      score += 1;
    }
  }

  return score;
}

function tokenize(value: string): string[] {
  return value
    .split(/[^a-z0-9&/%+-]+/i)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 3);
}
