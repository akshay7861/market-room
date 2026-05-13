/**
 * fredCacheService.ts
 *
 * Provides live FRED macroeconomic series data to agent prompt builders.
 * Replaces the static embedded-JSON approach that caused agents to cite stale
 * numbers (e.g., NFP 158K from March 2026 in every post through May 2026).
 *
 * Architecture:
 *   1. On each hourly cron tick, loadFredSeriesMap() is called once.
 *   2. For each of the 18 FRED series used by the agent services, it reads
 *      the cached row from D1.  If missing or older than STALE_THRESHOLD_MS,
 *      it fetches a fresh copy from the FRED API and writes it back to D1.
 *   3. Returns a Map<seriesId, HistoricalSeries> that callers inject into the
 *      service-level override via setFredSeriesMap().
 *   4. Fallback chain: D1 stale row → embedded static JSON (last resort).
 */

import type { D1Database } from "@cloudflare/workers-types";

// ── Types ──────────────────────────────────────────────────────────────────

export type FredObservation = { date: string; value: number | null };

export type FredHistoricalSeries = {
  id: string;
  source: "fred";
  label: string;
  frequency: string;
  units: string;
  coverageStart: string;
  coverageEnd: string;
  observations: FredObservation[];
  summary: {
    latestDate: string;
    latestValue: number;
    previousDate: string;
    previousValue: number;
    periodChangePct: number;
  };
};

/** Map returned by loadFredSeriesMap. Keys are internal series IDs. */
export type FredSeriesMap = Map<string, FredHistoricalSeries>;

// ── Constants ──────────────────────────────────────────────────────────────

/** Refresh any cached row older than 18 hours. */
const STALE_THRESHOLD_MS = 18 * 60 * 60 * 1000;

/** Earliest observation to request from FRED API. */
const FRED_START_DATE = "1990-01-01";

/**
 * Maps our internal series IDs → FRED API series codes.
 * All 20 series actively used by historicalDataContextService and
 * verifiedMarketMetricsService, including WTI monthly (replaces static EIA file)
 * and S&P 500 monthly (replaces static Alpha Vantage file).
 */
const FRED_SERIES_CATALOG: Record<string, { fredCode: string; label: string; frequency: string }> = {
  fred_nonfarm_payrolls:         { fredCode: "PAYEMS",       label: "Nonfarm payrolls",              frequency: "monthly"  },
  fred_unemployment:             { fredCode: "UNRATE",       label: "Unemployment rate",             frequency: "monthly"  },
  fred_pce_core:                 { fredCode: "PCEPILFE",     label: "Core PCE index",                frequency: "monthly"  },
  fred_pce_headline:             { fredCode: "PCEPI",        label: "Headline PCE index",            frequency: "monthly"  },
  fred_cpi_headline:             { fredCode: "CPIAUCSL",     label: "Headline CPI index",            frequency: "monthly"  },
  fred_fedfunds:                 { fredCode: "FEDFUNDS",     label: "Fed funds effective rate",      frequency: "monthly"  },
  fred_high_yield_spread:        { fredCode: "BAMLH0A0HYM2", label: "HY OAS",                       frequency: "daily"    },
  fred_us2y:                     { fredCode: "DGS2",         label: "US 2Y Treasury yield",          frequency: "daily"    },
  fred_us10y:                    { fredCode: "DGS10",        label: "US 10Y Treasury yield",         frequency: "daily"    },
  fred_curve_10y2y:              { fredCode: "T10Y2Y",       label: "10Y-2Y yield curve",            frequency: "daily"    },
  fred_breakeven_10y:            { fredCode: "T10YIE",       label: "10Y breakeven inflation",       frequency: "daily"    },
  fred_vix:                      { fredCode: "VIXCLS",       label: "VIX",                           frequency: "daily"    },
  fred_retail_sales:             { fredCode: "RSAFS",        label: "Retail and food services sales",frequency: "monthly"  },
  fred_industrial_production:    { fredCode: "INDPRO",       label: "Industrial production index",   frequency: "monthly"  },
  fred_manufacturing_employment: { fredCode: "MANEMP",       label: "Manufacturing employment",      frequency: "monthly"  },
  fred_broad_dollar:             { fredCode: "DTWEXBGS",     label: "Broad dollar index",            frequency: "daily"    },
  fred_m1_monthly:               { fredCode: "M1SL",         label: "M1 money supply",               frequency: "monthly"  },
  fred_m2_monthly:               { fredCode: "M2SL",         label: "M2 money supply",               frequency: "monthly"  },
  // Replaces static EIA WTI monthly file — same data, no separate API key needed.
  fred_wti_monthly:              { fredCode: "MCOILWTICO",   label: "WTI crude oil (monthly avg)",   frequency: "monthly"  },
  // Replaces static Alpha Vantage SPY file — FRED SP500 is free, no call limit.
  fred_sp500_monthly:            { fredCode: "SP500",        label: "S&P 500 index (monthly)",       frequency: "monthly"  },
};

const ALL_SERIES_IDS = Object.keys(FRED_SERIES_CATALOG);

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Loads all 18 FRED series into a map, refreshing any stale entries from the
 * FRED API and writing them back to D1.  Entries that cannot be refreshed
 * (API failure, missing key) are populated from the stale D1 row if one exists.
 * Returns an empty map entry for any series that has no D1 row and no API key.
 *
 * This function is called once per cron tick, before the agent loop starts.
 */
export async function loadFredSeriesMap(
  db: D1Database,
  fredApiKey: string,
  seriesIds: string[] = ALL_SERIES_IDS
): Promise<FredSeriesMap> {
  const map: FredSeriesMap = new Map();

  await Promise.all(
    seriesIds.map(async (id) => {
      const series = await getOrRefreshSeries(id, db, fredApiKey);
      if (series) map.set(id, series);
    })
  );

  const refreshed = seriesIds.filter((id) => map.has(id)).length;
  console.log(`[fredCache] loaded ${refreshed}/${seriesIds.length} series (stale threshold ${STALE_THRESHOLD_MS / 3600000}h)`);
  return map;
}

// ── Internal helpers ───────────────────────────────────────────────────────

type CacheRow = { payload_json: string; fetched_at: string };

async function getOrRefreshSeries(
  seriesId: string,
  db: D1Database,
  fredApiKey: string
): Promise<FredHistoricalSeries | null> {
  // 1. Read current D1 row.
  let row: CacheRow | null = null;
  try {
    row = await db
      .prepare("SELECT payload_json, fetched_at FROM fred_series_cache WHERE series_id = ?")
      .bind(seriesId)
      .first<CacheRow>();
  } catch (e) {
    console.warn(`[fredCache] D1 read failed for ${seriesId}:`, e);
  }

  const ageMs = row ? Date.now() - new Date(row.fetched_at).getTime() : Infinity;
  const isStale = ageMs > STALE_THRESHOLD_MS;

  if (!isStale && row) {
    // Fresh — use cached value without hitting FRED API.
    try {
      return JSON.parse(row.payload_json) as FredHistoricalSeries;
    } catch {
      // Corrupt row — fall through to re-fetch.
    }
  }

  // 2. Try FRED API if we have a key.
  if (fredApiKey) {
    try {
      const fresh = await fetchFromFred(seriesId, fredApiKey);
      if (fresh) {
        const now = new Date().toISOString();
        try {
          await db
            .prepare(
              "INSERT OR REPLACE INTO fred_series_cache (series_id, payload_json, fetched_at) VALUES (?, ?, ?)"
            )
            .bind(seriesId, JSON.stringify(fresh), now)
            .run();
        } catch (e) {
          console.warn(`[fredCache] D1 write failed for ${seriesId}:`, e);
        }
        return fresh;
      }
    } catch (e) {
      console.error(`[fredCache] FRED API fetch failed for ${seriesId}:`, e);
    }
  }

  // 3. Fallback: use stale D1 row (better than nothing).
  if (row) {
    console.warn(`[fredCache] using stale D1 row for ${seriesId} (age ${Math.round(ageMs / 3600000)}h)`);
    try {
      return JSON.parse(row.payload_json) as FredHistoricalSeries;
    } catch {/* ignore */}
  }

  // 4. No data at all — return null; caller will fall back to embedded static JSON.
  console.warn(`[fredCache] no data available for ${seriesId} — will use embedded static JSON`);
  return null;
}

async function fetchFromFred(seriesId: string, apiKey: string): Promise<FredHistoricalSeries | null> {
  const catalog = FRED_SERIES_CATALOG[seriesId];
  if (!catalog) return null;

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", catalog.fredCode);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", FRED_START_DATE);
  url.searchParams.set("sort_order", "asc");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "MarketRoom/1.0" },
    // Cloudflare Workers fetch timeout is 30s by default; FRED usually responds in <3s.
  });

  if (!res.ok) {
    throw new Error(`FRED API returned HTTP ${res.status} for ${catalog.fredCode}`);
  }

  const json = await res.json<{ observations?: Array<{ date: string; value: string }> }>();
  if (!Array.isArray(json.observations)) {
    throw new Error(`FRED API: no observations array for ${catalog.fredCode}`);
  }

  const observations: FredObservation[] = json.observations
    .map((o) => ({
      date: o.date,
      value: o.value === "." || o.value === "" ? null : parseFloat(o.value),
    }))
    .map((o) => ({
      date: o.date,
      value: typeof o.value === "number" && isFinite(o.value) ? o.value : null,
    }));

  const valid = observations.filter((o): o is { date: string; value: number } => typeof o.value === "number");
  if (valid.length === 0) {
    throw new Error(`FRED API: zero valid observations for ${catalog.fredCode}`);
  }

  const latest = valid[valid.length - 1];
  const prev = valid[valid.length - 2] ?? latest;
  const periodChangePct =
    prev.value !== 0
      ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100
      : 0;

  return {
    id: seriesId,
    source: "fred",
    label: catalog.label,
    frequency: catalog.frequency,
    units: "lin",
    coverageStart: observations[0]?.date ?? FRED_START_DATE,
    coverageEnd: latest.date,
    observations,
    summary: {
      latestDate: latest.date,
      latestValue: latest.value,
      previousDate: prev.date,
      previousValue: prev.value,
      periodChangePct,
    },
  };
}
