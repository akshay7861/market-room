import type { Agent, SnapshotHeadline } from "@market-room/shared";

const yahooSearchBaseUrl = "https://query1.finance.yahoo.com/v1/finance/search";
const browserLikeUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

const sectorQueries: Record<string, string[]> = {
  Macro: ["federal reserve inflation jobs economy", "cpi payrolls yields dollar"],
  Equities: ["stock market earnings sectors breadth", "sp500 nasdaq rotation valuations"],
  Commodities: ["oil brent wti natural gas copper gold", "energy inventories opec crude supply"],
  FX: ["dollar forex currency market fed divergence", "dxy yen euro carry emerging markets"],
  Rates: ["treasury yields fed rates curve bond market", "2 year 10 year breakevens duration"],
  "Risk/Sentiment": ["risk appetite volatility credit spreads positioning", "vix spreads de risk sentiment"]
};

const generalQueries = [
  "federal reserve inflation oil yields dollar stocks",
  "treasury dollar crude equities market risk"
];

const relevanceKeywords = [
  "fed",
  "federal",
  "inflation",
  "cpi",
  "payroll",
  "jobs",
  "yield",
  "treasury",
  "bond",
  "dollar",
  "dxy",
  "oil",
  "wti",
  "brent",
  "gas",
  "gold",
  "copper",
  "stock",
  "s&p",
  "nasdaq",
  "market",
  "volatility",
  "risk"
];

export async function fetchYahooFinanceNews(
  query: string,
  newsCount = 6
): Promise<SnapshotHeadline[]> {
  try {
    const url = new URL(yahooSearchBaseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("newsCount", String(newsCount));
    url.searchParams.set("quotesCount", "0");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": browserLikeUserAgent
      }
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      news?: Array<{
        title?: string;
        publisher?: string;
        link?: string;
        providerPublishTime?: number;
        relatedTickers?: string[];
      }>;
    };

    return (payload.news || [])
      .slice(0, newsCount)
      .map((item) => ({
        title: item.title || "Untitled headline",
        source: item.publisher || "Yahoo Finance",
        url: item.link,
        publishedAt:
          typeof item.providerPublishTime === "number"
            ? new Date(item.providerPublishTime * 1000).toISOString()
            : undefined
      }))
      .filter((headline) => headline.title);
  } catch {
    return [];
  }
}

export async function fetchYahooFinanceBriefing(activeAgents: Agent[]): Promise<{
  generalHeadlines: SnapshotHeadline[];
  headlinesByAgentId: Map<string, SnapshotHeadline[]>;
}> {
  const generalHeadlines = await fetchCuratedYahooHeadlines(generalQueries, 8);
  const headlinesByAgentId = new Map<string, SnapshotHeadline[]>();

  await Promise.all(
    activeAgents.map(async (agent) => {
      const queries = sectorQueries[agent.sector] || [`${agent.sector} market news`];
      const headlines = await fetchCuratedYahooHeadlines(queries, 5);
      headlinesByAgentId.set(agent.id, headlines);
    })
  );

  return {
    generalHeadlines,
    headlinesByAgentId
  };
}

async function fetchCuratedYahooHeadlines(
  queries: string[],
  maxItems: number
): Promise<SnapshotHeadline[]> {
  const results = await Promise.all(queries.map((query) => fetchYahooFinanceNews(query, maxItems)));
  const deduped = dedupeHeadlines(results.flat());
  return deduped
    .filter((headline) => headlineRelevanceScore(headline) > 0)
    .sort((left, right) => {
      const timeDelta =
        (right.publishedAt ? Date.parse(right.publishedAt) : 0) -
        (left.publishedAt ? Date.parse(left.publishedAt) : 0);

      if (timeDelta !== 0) {
        return timeDelta;
      }

      return headlineRelevanceScore(right) - headlineRelevanceScore(left);
    })
    .slice(0, maxItems);
}

function dedupeHeadlines(headlines: SnapshotHeadline[]): SnapshotHeadline[] {
  const seen = new Set<string>();

  return headlines.filter((headline) => {
    const key = `${headline.title}|${headline.source}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function headlineRelevanceScore(headline: SnapshotHeadline): number {
  const text = `${headline.title} ${headline.source}`.toLowerCase();
  return relevanceKeywords.reduce(
    (score, keyword) => score + (text.includes(keyword) ? 1 : 0),
    0
  );
}
