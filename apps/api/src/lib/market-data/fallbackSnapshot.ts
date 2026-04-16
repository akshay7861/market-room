import type { MarketSnapshotPayload } from "@market-room/shared";

// Fallback values are calibrated to approximate real market levels as of early 2026.
// These only activate when live data is unavailable — agents should treat them as
// "reasonable context" not precise current quotes.
export function buildFallbackSnapshot(prompt: string, now: string, reason?: string): MarketSnapshotPayload {
  return {
    provider: reason ? `fallback:${reason}` : "fallback",
    usedFallback: true,
    asOf: now,
    headline: "Live market data is unavailable, so Market Room is using a resilient fallback snapshot.",
    summary:
      "The app could not fetch live market data right now. Agents can still discuss a conservative fallback snapshot so the room stays usable.",
    prompt,
    instruments: [
      // Equities — SPY×10 ≈ S&P 500; QQQ is Nasdaq 100 ETF price
      { key: "sp500",      label: "S&P 500",       value: "5,200",     change: "+0.4%",   source: "fallback", status: "fallback" },
      { key: "nasdaq",     label: "Nasdaq 100",     value: "$450.00",   change: "+0.1%",   source: "fallback", status: "fallback" },
      // Rates — actual yield in %, not TNX index value
      { key: "us10y",      label: "US 10Y yield",   value: "4.30%",     change: "+3 bps",  source: "fallback", status: "fallback" },
      // FX — UUP×3.5 ≈ DXY; shown as index level
      { key: "dxy",        label: "DXY",            value: "103.0",     change: "+0.2%",   source: "fallback", status: "fallback" },
      // Commodities — actual prices in correct units
      { key: "wti",        label: "WTI crude",      value: "$68.50/bbl", change: "+0.8%",  source: "fallback", status: "fallback" },
      { key: "brent",      label: "Brent crude",    value: "$72.10/bbl", change: "+0.6%",  source: "fallback", status: "fallback" },
      { key: "natural_gas",label: "Natural gas",    value: "$2.40/MMBtu",change: "+3.1%",  source: "fallback", status: "fallback" },
      { key: "gold",       label: "Gold",           value: "$3,050/oz", change: "+0.6%",   source: "fallback", status: "fallback" },
      { key: "copper",     label: "Copper",         value: "$4.55/lb",  change: "-0.3%",   source: "fallback", status: "fallback" }
    ],
    headlines: [
      {
        title: "Fallback mode: live headlines unavailable",
        source: "Market Room"
      }
    ]
  };
}
