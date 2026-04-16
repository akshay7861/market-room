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
  const [fredHeadlines, fedHeadlines, treasuryHeadlines] = await Promise.all([
    fetchFredMacroReleaseHeadlines(env),
    fetchFedHeadlines(),
    fetchTreasuryHeadlines()
  ]);

  const generalHeadlines = dedupeHeadlines([
    ...fredHeadlines,
    ...fedHeadlines,
    ...treasuryHeadlines
  ]).slice(0, 10);

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

async function fetchFredMacroReleaseHeadlines(env: Env): Promise<SnapshotHeadline[]> {
  if (!env.FRED_API_KEY) {
    return [];
  }

  const configs = [
    {
      seriesId: "CPIAUCSL",
      label: "CPI",
      formatter: (latest: FredObservation, previous: FredObservation | null) =>
        `${latest.value}${previous ? ` vs ${previous.value} prior month` : ""}`
    },
    {
      seriesId: "PAYEMS",
      label: "Nonfarm payrolls",
      formatter: (latest: FredObservation, previous: FredObservation | null) =>
        `${formatFredDelta(latest, previous)} jobs change context`
    },
    {
      seriesId: "UNRATE",
      label: "Unemployment rate",
      formatter: (latest: FredObservation) => `${latest.value}%`
    },
    {
      seriesId: "FEDFUNDS",
      label: "Fed funds",
      formatter: (latest: FredObservation) => `${latest.value}%`
    },
    {
      seriesId: "DGS10",
      label: "US 10Y Treasury",
      formatter: (latest: FredObservation) => `${latest.value}%`
    }
  ];

  const maybeHeadlines = await Promise.all(
    configs.map(async (config) => {
      const observations = await fetchFredSeriesObservations(env.FRED_API_KEY!, config.seriesId, 2);

      if (observations.length === 0) {
        return undefined;
      }

      const [latest, previous] = observations;
      const headline: SnapshotHeadline = {
        title: `${config.label} latest official print: ${config.formatter(latest, previous || null)} (${latest.date})`,
        source: "FRED",
        url: `https://fred.stlouisfed.org/series/${config.seriesId}`,
        publishedAt: latest.realtimeStart ? `${latest.realtimeStart}T00:00:00.000Z` : undefined
      };

      return headline;
    })
  );

  return maybeHeadlines.filter((headline): headline is SnapshotHeadline => headline !== undefined);
}

async function fetchFredSeriesObservations(
  apiKey: string,
  seriesId: string,
  limit: number
): Promise<FredObservation[]> {
  try {
    const url = new URL("https://api.stlouisfed.org/fred/series/observations");
    url.searchParams.set("series_id", seriesId);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString());

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      observations?: Array<{
        realtime_start?: string;
        date?: string;
        value?: string;
      }>;
    };

    return (payload.observations || [])
      .filter((item) => item.date && item.value && item.value !== ".")
      .map((item) => ({
        realtimeStart: item.realtime_start || "",
        date: item.date || "",
        value: item.value || ""
      }));
  } catch {
    return [];
  }
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

function formatFredDelta(latest: FredObservation, previous: FredObservation | null): string {
  if (!previous) {
    return latest.value;
  }

  const latestNumber = Number(latest.value);
  const previousNumber = Number(previous.value);

  if (Number.isNaN(latestNumber) || Number.isNaN(previousNumber)) {
    return latest.value;
  }

  const delta = latestNumber - previousNumber;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}`;
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

type FredObservation = {
  realtimeStart: string;
  date: string;
  value: string;
};
