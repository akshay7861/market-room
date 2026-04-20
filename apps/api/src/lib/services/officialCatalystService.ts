import type { Agent, SnapshotHeadline } from "@market-room/shared";
import type { Env } from "../../index";

const fedRssUrl = "https://www.federalreserve.gov/feeds/press_all.xml";
const treasuryPressUrl = "https://home.treasury.gov/news/press-releases";

export type OfficialNewsMaterialityTier = "high" | "medium" | "low";

export type OfficialNewsMateriality = {
  tier: OfficialNewsMaterialityTier;
  reason: string;
};

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
    const tierCounts: Record<OfficialNewsMaterialityTier, number> = {
      high: 0,
      medium: 0,
      low: 0
    };
    const classified = extractRssItems(xml).slice(0, 14).map((item) => {
      const headline: SnapshotHeadline = {
        title: item.title,
        source: "Federal Reserve",
        url: item.link,
        publishedAt: item.pubDate
      };
      const materiality = classifyOfficialNewsMateriality(headline);
      tierCounts[materiality.tier] += 1;
      if (materiality.tier !== "high") {
        const logPrefix = materiality.tier === "low"
          ? "[catalyst-filter] skipped low_materiality_official"
          : "[official-news] context_only";
        console.log(`${logPrefix} tier=${materiality.tier} reason=${materiality.reason} title="${truncateForLog(headline.title)}"`);
      }
      return { headline, materiality };
    });

    console.log(
      `[official-news] fed_materiality high=${tierCounts.high} medium_context=${tierCounts.medium} low_suppressed=${tierCounts.low}`
    );

    return classified
      .filter((item) => item.materiality.tier === "high")
      .map((item) => item.headline)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function classifyOfficialNewsMateriality(headline: SnapshotHeadline): OfficialNewsMateriality {
  const text = `${headline.title} ${headline.description || ""}`.toLowerCase();

  const isSystemicInstitution = /\b(goldman|morgan stanley|jpmorgan|jp morgan|citigroup|bank of america|wells fargo|deutsche bank|ubs|credit suisse|barclays|hsbc|bnpp|bnp paribas|soci[eé]t[eé] g[eé]n[eé]rale|standard chartered|industrial and commercial bank of china|icbc|gsib|g-sib)\b/i.test(text);

  if (/\b(fomc statement|federal open market committee statement|minutes of the federal open market committee|economic projections|summary of economic projections|sep\b|monetary policy report)\b/i.test(text)) {
    return { tier: "high", reason: "monetary_policy_core_release" };
  }

  if (/\b(stress tests?|ccar|capital framework|bank capital|liquidity rulemaking|liquidity rule|basel|emergency lending|liquidity facility|discount window policy|discount window program|standing repo facility|broad capital framework)\b/i.test(text)) {
    return { tier: "high", reason: "systemic_capital_or_liquidity_framework" };
  }

  if (/\b(discount rate meetings?|discount-rate meetings?|fednow|tokeni[sz]ed securities|section 23a|proposal|request for comment|proposed rule)\b/i.test(text)) {
    return { tier: "medium", reason: "official_context_no_immediate_market_trigger" };
  }

  if (/\b(termination|cease and desist|enforcement action|prohibition order|former employee|approval of application|applications? by|bank holding company|annual audited financial statements|financial statements)\b/i.test(text)) {
    return isSystemicInstitution
      ? { tier: "medium", reason: "systemic_institution_legal_or_plumbing_context" }
      : { tier: "low", reason: "single_institution_or_routine_supervisory_item" };
  }

  return { tier: "low", reason: "unclassified_fed_release_not_autonomous_catalyst" };
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
      .filter((item) => isAutonomousTreasuryCatalyst(item.title))
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

function isAutonomousTreasuryCatalyst(title: string): boolean {
  const text = title.toLowerCase();
  if (/\brole of the treasury\b|\babout treasury\b|\bsecretary\b|\bremarks by\b|\bstatement by\b|\btravel to\b|\bvisit to\b/i.test(text)) {
    console.log(`[catalyst-filter] skipped low_materiality_official tier=low reason=vague_treasury_page title="${truncateForLog(title)}"`);
    return false;
  }

  return /\b(?:quarterly refunding|auction|auction results?|marketable borrowing|debt limit|debt management|treasury securities|treasury bills?|treasury notes?|treasury bonds?|buyback|financing estimates?|sanctions?|ofac|financial stability|currency report)\b/i.test(text);
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

function truncateForLog(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
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
