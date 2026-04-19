import type { Agent, SnapshotHeadline } from "@market-room/shared";
import type { Env } from "../../index";

const fedRssUrl = "https://www.federalreserve.gov/feeds/press_all.xml";
const treasuryPressUrl = "https://home.treasury.gov/news/press-releases";

export async function fetchOfficialCatalystLayer(
  env: Env,
  agents: Agent[]
): Promise<{
  generalHeadlines: SnapshotHeadline[];
  headlinesByAgentId: Map<string, SnapshotHeadline[]>;
}> {
  void env;
  const [fedHeadlines, treasuryHeadlines] = await Promise.all([
    fetchFedHeadlines(),
    fetchTreasuryHeadlines()
  ]);

  // FRED and EIA are data-lake/context sources, not autonomous posting triggers.
  // This service only returns actual official news/releases that can compete as catalysts.
  const generalHeadlines = dedupeHeadlines([
    ...fedHeadlines,
    ...treasuryHeadlines
  ]).slice(0, 10);
  console.log(
    `[official-news] catalysts=${generalHeadlines.length} fred=excluded_data_lake_only eia=excluded_data_lake_only`
  );

  const headlinesByAgentId = new Map<string, SnapshotHeadline[]>();

  for (const agent of agents) {
    const sectorHeadlines = generalHeadlines.filter((headline) =>
      officialHeadlineMatchesSector(headline, agent.sector)
    );
    headlinesByAgentId.set(agent.id, sectorHeadlines.slice(0, 5));
  }

  return {
    generalHeadlines,
    headlinesByAgentId
  };
}

async function fetchFedHeadlines(): Promise<SnapshotHeadline[]> {
  try {
    const response = await fetch(fedRssUrl);

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    return extractRssItems(xml).slice(0, 6).map((item) => ({
      title: item.title,
      source: "Federal Reserve",
      url: item.link,
      publishedAt: item.pubDate
    }));
  } catch {
    return [];
  }
}

async function fetchTreasuryHeadlines(): Promise<SnapshotHeadline[]> {
  try {
    const response = await fetch(treasuryPressUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]{20,220})<\/a>/gi)];
    const headlines = matches
      .map((match) => ({
        title: decodeHtmlEntities(match[2].trim()),
        url: match[1].startsWith("http") ? match[1] : `https://home.treasury.gov${match[1]}`
      }))
      .filter((item) => /(auction|treasury|debt|marketable|bond|security|financing|rates|yield)/i.test(item.title))
      .slice(0, 5)
      .map((item) => ({
        title: item.title,
        source: "U.S. Treasury",
        url: item.url
      }));

    return dedupeHeadlines(headlines);
  } catch {
    return [];
  }
}

function extractRssItems(xml: string): Array<{
  title: string;
  link?: string;
  pubDate?: string;
}> {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return itemMatches.map((match) => {
    const block = match[1];
    return {
      title: extractTag(block, "title") || "Untitled release",
      link: extractTag(block, "link"),
      pubDate: parsePubDate(extractTag(block, "pubDate"))
    };
  });
}

function extractTag(block: string, tagName: string): string | undefined {
  const match = block.match(new RegExp(`<${tagName}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tagName}>`, "i"));
  return match?.[1]?.trim();
}

function parsePubDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function officialHeadlineMatchesSector(headline: SnapshotHeadline, sector: string): boolean {
  const text = `${headline.title} ${headline.source}`.toLowerCase();

  switch (sector) {
    case "Macro":
      return /(inflation|cpi|jobs|unemployment|payroll|fed|economy|growth|treasury|yield)/i.test(text);
    case "Rates":
      return /(fed|treasury|yield|bond|curve|auction|debt|rates)/i.test(text);
    case "FX":
      return /(fed|yield|treasury|inflation|jobs|dollar)/i.test(text);
    case "Equities":
      return /(earnings|market|stock|economy|fed|yield)/i.test(text);
    case "Commodities":
      return /(inflation|oil|energy|supply|commodity|treasury)/i.test(text);
    case "Risk/Sentiment":
      return /(fed|yield|treasury|market|inflation|jobs|stress|risk)/i.test(text);
    default:
      return true;
  }
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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function isDataLakeOnlyHeadline(headline: SnapshotHeadline): boolean {
  const source = headline.source.toLowerCase();
  const title = headline.title.toLowerCase();

  return (
    source === "fred" ||
    source === "eia" ||
    source.includes("energy information administration") ||
    /\blatest official print\b/.test(title)
  );
}
