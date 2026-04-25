/**
 * Equity Fundamentals Backtest — corrected
 *
 * Uses the exact scoring logic from equityQuoteService.ts:
 * - extractExplicitSymbols: /\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g
 * - detectTheme: themeKeywordMap regexes
 * - preferredThemeSymbols: only when theme detected
 * - score += 90 - preferredIndex (not 90 - idx*8)
 * - score threshold: 50
 *
 * Price data from v8/chart (works without auth).
 * v7/quote (P/E, EPS, market cap) is auth-gated locally; skipped here —
 * we note which companies ARE identified correctly, and whether the
 * historical post cited any of the price/valuation data it could have.
 *
 * Usage: node backtest-equity-fundamentals.mjs
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UNIVERSE = JSON.parse(
  readFileSync(join(__dirname, "apps/api/src/lib/equities/equityUniverse.json"), "utf-8")
);

// ─── Curated entries (mirrors equityQuoteService) ─────────────────────────────
const CURATED = [
  { symbol: "TAN",   bbg: "TAN US",   ric: "TAN",   name: "Invesco Solar ETF",           region: "US" },
  { symbol: "ICLN",  bbg: "ICLN US",  ric: "ICLN",  name: "iShares Global Clean Energy ETF", region: "US" },
  { symbol: "QCLN",  bbg: "QCLN US",  ric: "QCLN",  name: "First Trust Nasdaq Clean Edge Green Energy ETF", region: "US" },
  { symbol: "XLE",   bbg: "XLE US",   ric: "XLE",   name: "Energy Select Sector SPDR Fund", region: "US" },
  { symbol: "XOP",   bbg: "XOP US",   ric: "XOP",   name: "SPDR S&P Oil & Gas Exploration & Production ETF", region: "US" },
  { symbol: "OIH",   bbg: "OIH US",   ric: "OIH",   name: "VanEck Oil Services ETF",     region: "US" },
  { symbol: "SHEL",  bbg: "SHEL US",  ric: "SHEL",  name: "Shell PLC ADR",               region: "US" },
  { symbol: "TTE",   bbg: "TTE US",   ric: "TTE",   name: "TotalEnergies SE ADR",        region: "US" },
];

const ALL_ENTRIES = dedupeBySymbol([...CURATED, ...UNIVERSE]);

// ─── Theme maps (exact copy from equityQuoteService) ──────────────────────────
const preferredThemeSymbols = {
  green_energy:      ["FSLR","ENPH","SEDG","RUN","NEE","BEP","ETN","PWR","ALB","SQM","TAN","ICLN","QCLN"],
  energy_equities:   ["XOM","CVX","SHEL","TTE","COP","EOG","DVN","FANG","SLB","HAL","BKR","ENB","KMI","WMB","ET","XLE","XOP","OIH"],
  ai_infrastructure: ["NVDA","AMD","AVGO","MRVL","ASML","TSM","AMAT","LRCX","VRT","ETN","PWR","MSFT","AMZN","GOOGL"],
  banks:             ["JPM","BAC","WFC","C","GS","MS","USB","PNC","RY","TD","HSBA.L","BARC.L"],
  semiconductors:    ["NVDA","AMD","AVGO","MRVL","ASML","TSM","AMAT","LRCX","MU","TXN","QCOM","INTC"],
};

const themeKeywordMap = {
  green_energy:      /\b(green|clean energy|renewable|solar|wind|battery|lithium|ev|electrification|grid)\b/i,
  energy_equities:   /\b(oil stocks?|energy stocks?|higher oil|wti|brent|opec|upstream|midstream|oilfield|e&p)\b/i,
  ai_infrastructure: /\b(ai|semiconductor|chips?|data center|datacenter|cloud|compute|gpu|accelerator)\b/i,
  banks:             /\b(banks?|financials?|lenders?|net interest income|nii|deposit|credit card|brokerage)\b/i,
  semiconductors:    /\b(semiconductor|chips?|foundry|memory|equipment|wafer|gpu|asic)\b/i,
};

const EXCLUDED = new Set([
  "WHAT","WHICH","WHY","HOW","THE","AND","FOR","NOT","BUT","ARE",
  "ETF","ETFS","WTI","DXY","CPI","PCE","FED","US","UK","AI",
  "GDP","PMI","ISM","IPO","CEO","CFO","COO","BOJ","ECB","IMF",
  "EST","BPS","YOY","QOQ","TTM","EPS","REV","NII","NIM","NFP",
  "EM","FX","HY","IG","PE","VC","RV","IV","ATH","ATL",
]);

// ─── Scoring (exact mirror of equityQuoteService.ts selectTopCandidate) ───────

function detectTheme(text) {
  for (const [theme, pattern] of Object.entries(themeKeywordMap)) {
    if (pattern.test(text)) return theme;
  }
  return null;
}

function extractExplicitSymbols(text) {
  const matches = text.match(/\b[A-Z]{1,5}(?:\.[A-Z]{1,3})?\b/g) || [];
  return new Set(matches.filter((m) => !EXCLUDED.has(m)).map((m) => m.toUpperCase()));
}

function tokenize(text) {
  return text.split(/[^a-z0-9]+/g).map((t) => t.trim()).filter((t) => t.length >= 3);
}

function selectTopCandidate(text) {
  const lower = text.toLowerCase();
  const explicitSymbols = extractExplicitSymbols(text);
  const theme = detectTheme(text);
  const preferredSymbols = theme ? (preferredThemeSymbols[theme] || []) : [];
  const queryTokens = tokenize(lower);

  let best = null;

  for (const entry of ALL_ENTRIES) {
    const entryText = `${entry.symbol} ${entry.bbg} ${entry.ric} ${entry.name} ${entry.region}`.toLowerCase();
    let score = 0;

    if (explicitSymbols.has(entry.symbol.toUpperCase())) score += 120;
    if (explicitSymbols.has((entry.bbg.split(" ")[0] || "").toUpperCase())) score += 90;

    const preferredIndex = preferredSymbols.indexOf(entry.symbol);
    if (preferredIndex >= 0) score += 90 - preferredIndex;

    for (const token of queryTokens) {
      if (entryText.includes(token)) score += token.length >= 5 ? 4 : 2;
    }

    // Theme-specific name boosts
    if (theme === "green_energy" && /solar|renewable|energy|lithium|battery|electric|power|grid|wind/i.test(entry.name)) score += 16;
    if (theme === "energy_equities" && /oil|gas|energy|pipeline|resources|petroleum|midstream|drilling/i.test(entry.name)) score += 16;
    if (theme === "ai_infrastructure" && /semiconductor|technology|micro|nvidia|advanced micro|broadcom|cloud|electric|power/i.test(entry.name)) score += 16;

    if (score > (best?.score ?? 0)) best = { entry, score };
  }

  if (!best || best.score < 50) return null;
  return best;
}

// ─── Yahoo Finance v8/chart (works without auth) ─────────────────────────────

function validateCompanyName(universeName, yahooShortName) {
  if (!yahooShortName) return true;
  const normalize = (s) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  const uTokens = new Set(normalize(universeName));
  const yTokens = normalize(yahooShortName);
  return yTokens.some((t) => uTokens.has(t));
}

async function fetchChart(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(7000)
    });
    if (!r.ok) return null;
    const d = await r.json();
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return meta;
  } catch { return null; }
}

// ─── Historical posts ─────────────────────────────────────────────────────────

const POSTS = [
  { date: "2026-04-16", title: "Energy Surge Amplifies Inflation Regime Concerns Ahead of Netflix Earnings", catalyst: "Wall Street's mixed open driven by energy sector strength amid rising US 10Y yields and looming Netflix earnings", preview: "The sharp energy sector rally this morning, led by WTI breaching $90, has reignited inflation regime fears, putting renewed pressure on growth multiples sensitive to discount rates. The US 10Y yield climbing to 4.29% (+21bps) directly challenges valuation in long-duration sectors." },
  { date: "2026-04-16", title: "Australia's Steady 4.3% Unemployment Anchors Expectations for Global Rate Trajectory", catalyst: "Unemployment rate remained at 4.3pc in March", preview: "Australia's unemployment holding steady at 4.3% in March signals a resilient labor market that removes immediate pressure for aggressive monetary easing." },
  { date: "2026-04-16", title: "Equinor Downgrade Highlights Execution and Earnings Quality Risks Despite Renewable Wins", catalyst: "Equinor's rating downgrade driven by anticipated earnings disappointment amid stretched valuation despite recent U.S. wind contract wins", preview: "Equinor's downgrade centers on a disconnect between operational headlines and underlying earnings quality. While the recent surge on U.S. offshore wind awards signals strategic progress in renewables, the near-term earnings outlook is weaker than previously modeled." },
  { date: "2026-04-15", title: "Freehold Royalties' Dividend Declaration Reinforces Defensive Yield Appeal Amid Sector Rotation", catalyst: "Freehold Royalties declared a $0.09/share dividend payable May 15, 2026, signaling stable cash flow in a defensive royalties business.", preview: "Freehold Royalties' recent dividend declaration stands out against the current market backdrop where cyclicals are gaining momentum but face earnings revision risk." },
  { date: "2026-04-14", title: "Battalion Oil Selloff Driven by Iran Deal Hopes and Elevated Short Interest", catalyst: "BATL shares drop 8% amid JD Vance's diplomatic deal hint with Iran and rising short interest to 47%.", preview: "Battalion Oil's sharp 8% decline today reflects a sudden compression in geopolitical risk premium tied to crude. JD Vance's public suggestion of a 'good deal' with Iran signals easing Middle East tensions, undermining the supply risk premium embedded in oil-related equities like BATL. The dynamic matters because short interest at 47% amplifies any price swing." },
  { date: "2026-04-14", title: "Par Pacific's Q1 2026 Earnings Date Set: Fresh Focus on Refining Margins and Consumer Fuel Demand", catalyst: "Par Pacific Announces First Quarter 2026 Earnings Release and Conference Call Schedule", preview: "Par Pacific's announcement of its Q1 2026 earnings release on May 5, followed by a call on May 6, sets a clear near-term event for consumer-sensitive energy equities." },
  { date: "2026-04-11", title: "TSX Oilsands Major Set to Surge on Strait of Hormuz Tensions Amid Elevated Real Yields", catalyst: "This TSX oilsands major could jump as much as 20% on the Iran war and Strait of Hormuz crisis, analyst says", preview: "Heightened geopolitical risk around the Strait of Hormuz has sharply increased the risk premium on physical oil supply, directly benefiting Canadian oilsands producers." },
  { date: "2026-04-10", title: "Applied Optoelectronics' $1B Revenue Target Tightens Focus on Order Momentum Amid Sector Rotation", catalyst: "Applied Optoelectronics sets a $1 billion revenue target for 2026, doubling from 2024 levels, driven by datacenter and CATV demand.", preview: "Applied Optoelectronics' guidance to double revenues to $1 billion by 2026 crystallizes the underlying earnings momentum in a niche yet volatile segment of optical networking." },
  { date: "2026-04-10", title: "Amazon's Outperformance Highlights Narrow Leadership and Underlying Sector Divergence in Dow", catalyst: "Amazon Surges as Dow Jones Navigates Sector Divergence", preview: "Amazon's surge today amid a flat Dow signals a continuation of uneven sector leadership within the index." },
  { date: "2026-04-08", title: "Citi's Bullish Call on TSM Reflects AI Chip Demand Upside, Tightening Semiconductor Margins", catalyst: "Citi reaffirms Buy on Taiwan Semiconductor (TSM) and raises its price target, citing growing AI-driven chip demand.", preview: "Citi's reaffirmation and price target lift on TSM signals a meaningful shift in semiconductor earnings quality expectations. The core mechanism is the ramp in AI chip demand, which should translate into sustained revenue growth and better pricing power." },
  { date: "2026-04-08", title: "ClearBridge's WMB Addition Signals Rotation Into Quality Midstream Amid Earnings Visibility", catalyst: "ClearBridge Dividend Strategy Added The Williams Companies (WMB) on Strong Balance Sheet and Growth Outlook", preview: "ClearBridge's decision to add Williams Companies (WMB) to their Dividend Strategy portfolio marks a subtle but important shift in dividend-focused equity positioning." },
  { date: "2026-04-08", title: "Energy Transfer Discount Tightening Reflects Earnings Quality and Credit Stability Shift", catalyst: "Energy Transfer's discount to Enterprise Products is no longer justified, driven by superior growth and more attractive valuation despite higher leverage.", preview: "Energy Transfer's narrowing valuation gap versus Enterprise Products signals a fundamental rotation within midstream energy." },
  { date: "2026-04-08", title: "Vishay's 2026 AGM: A Quiet Signal for Defensive Tech Stability Amid Broader Cyclical Flux", catalyst: "Vishay Intertechnology announced the date for its 2026 Annual Meeting of Stockholders, scheduled for May 18, 2026.", preview: "Vishay's AGM announcement may seem routine, but given the current environment of sector rotation and defensive versus cyclical tug-of-war, it offers a subtle focal point on semiconductor supply chain stability." },
  { date: "2026-04-08", title: "Delta's Growth Pullback and Refinery Profit Signal Margin Squeeze in Airlines", catalyst: "Delta CEO announces a meaningful cut to growth plans alongside a $300 million earnings boost expected from its refinery business.", preview: "Delta's decision to scale back capacity growth amid rising fuel costs marks a critical inflection point for airline earnings quality. The $300 million refinery profit boost partially offsets the cost impact but does not offset capacity risk." },
  { date: "2026-04-08", title: "Morgan Stanley's Section 23A Exemption Clears Final Regulatory Hurdle, Shifting Bank Segment Breadth", catalyst: "Federal Reserve Board's joint findings enable OCC approval of Morgan Stanley Bank's Section 23A exemption request", preview: "The Federal Reserve's formal announcement that it has completed the joint findings required for the OCC to approve Morgan Stanley Bank's Section 23A exemption marks a pivotal change in intra-group transaction constraints." },
  { date: "2026-04-08", title: "Applied Industrial Growth Disappoints, Reinforcing Defensive Bias in Industrials", catalyst: "Applied Industrial's latest update signals muted growth and limited margin expansion, undermining cyclical appeal.", preview: "Applied Industrial's steady but uninspiring growth trajectory at current valuations shifts the needle on industrial sector rotation." },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dedupeBySymbol(entries) {
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    const k = e.symbol.toUpperCase();
    if (!seen.has(k)) { seen.add(k); out.push(e); }
  }
  return out;
}

function fmtChange(meta) {
  const pct = meta.regularMarketChangePercent
    ?? (meta.chartPreviousClose && meta.regularMarketPrice && meta.chartPreviousClose !== 0
      ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
      : null);
  if (pct == null || !isFinite(pct)) return "flat/unknown";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log("═".repeat(80));
  console.log("  EQUITY FUNDAMENTALS BACKTEST — 16 Historical Equities Agent Posts");
  console.log("  Scoring: exact mirror of equityQuoteService.ts  |  Prices: v8/chart");
  console.log("  Note: P/E / EPS / market cap require v7/quote (auth-gated locally)");
  console.log("═".repeat(80));
  console.log();

  let identified = 0, mismatch = 0, noMatch = 0, priceFail = 0;
  const summary = [];

  for (const post of POSTS) {
    const combined = `${post.title} ${post.catalyst}`;
    const candidate = selectTopCandidate(combined);
    const theme = detectTheme(combined);
    const exSymbols = [...extractExplicitSymbols(combined)].filter((s) => s.length > 1).join(",");
    const EARNINGS_RE = /\b(earnings|eps|revenue|beat|miss|guidance|quarter|q[1-4]|results|profit|loss|outlook|forecast)\b/i;
    const isEarnings = EARNINGS_RE.test(combined);

    console.log(`┌${"─".repeat(78)}`);
    console.log(`│ ${post.date}  ${post.title.slice(0, 68)}`);
    console.log(`│ Theme detected: ${theme ?? "none"}  |  Explicit symbols found: ${exSymbols || "none"}${isEarnings ? "  |  EARNINGS headline" : ""}`);

    if (!candidate) {
      noMatch++;
      console.log(`│`);
      console.log(`│ ⬜ NOT IDENTIFIED  (score < 50 for all universe entries)`);
      console.log(`│ Reason: no explicit ticker in text, no theme keyword match, OR name tokens too generic`);
      const shouldHave = inferExpectedCompany(post);
      if (shouldHave) console.log(`│ Expected: agent wrote about ${shouldHave} — but no symbol/name pattern matched`);
      summary.push({ date: post.date, company: shouldHave ?? "?", result: "no_match", symbol: null });
      console.log(`└${"─".repeat(78)}`);
      console.log();
      continue;
    }

    const { entry, score } = candidate;
    const expectedSymbol = inferExpectedSymbol(post);

    console.log(`│`);
    console.log(`│ 🔍 IDENTIFIED: ${entry.name} (${entry.symbol})  score=${score}`);

    const isCorrect = expectedSymbol && (
      entry.symbol.toUpperCase() === expectedSymbol.toUpperCase() ||
      entry.symbol.toUpperCase().startsWith(expectedSymbol.toUpperCase())
    );

    if (expectedSymbol && !isCorrect) {
      console.log(`│ ⚠️  WRONG COMPANY — agent wrote about ${expectedSymbol}, got ${entry.symbol} instead`);
    } else if (isCorrect) {
      console.log(`│ ✅ CORRECT MATCH`);
    }

    // Fetch price from v8/chart
    const meta = await fetchChart(entry.symbol);
    if (!meta) {
      priceFail++;
      console.log(`│ ℹ️  v8/chart returned nothing for ${entry.symbol} (delisted / restricted)`);
      summary.push({ date: post.date, company: entry.name, result: isCorrect ? "identified_no_price" : "wrong_company", symbol: entry.symbol });
    } else {
      const nameOk = validateCompanyName(entry.name, meta.shortName);
      if (!nameOk) {
        mismatch++;
        console.log(`│ ❌ NAME MISMATCH — universe: "${entry.name}" | Yahoo: "${meta.shortName}"`);
        console.log(`│    validateCompanyName() blocks this — no fundamentals injected`);
        summary.push({ date: post.date, company: entry.name, result: "name_mismatch", symbol: entry.symbol });
        console.log(`└${"─".repeat(78)}`);
        console.log();
        continue;
      }

      identified++;
      const price = `$${meta.regularMarketPrice.toFixed(2)}`;
      const change = fmtChange(meta);
      const hi52 = meta.fiftyTwoWeekHigh?.toFixed(2);
      const lo52 = meta.fiftyTwoWeekLow?.toFixed(2);
      const range52 = hi52 && lo52 ? `$${lo52}–$${hi52}` : null;
      const yName = meta.shortName || meta.longName || entry.name;

      console.log(`│`);
      console.log(`│ 📊 DATA AVAILABLE FROM v8/chart (would inject):`);
      console.log(`│   Company Fundamentals — ${entry.symbol} (${yName})`);
      console.log(`│   Live: ${price} (${change} today)${range52 ? " | 52-week: " + range52 : ""}`);
      console.log(`│   P/E, EPS, Market Cap: requires v7/quote (auth-gated — see production note)`);

      // Check what the agent actually cited
      const citedPrice = /\$\d+(\.\d+)?|\d+\.\d+%|\d+\s*bps/.test(post.preview);
      const citedPE = /p\/e|pe\s+ratio|multiple|valuation/i.test(post.preview);

      console.log(`│`);
      console.log(`│ 📝 AGENT POST (no fundamentals at the time):`);
      const lines = post.preview.match(/.{1,95}/g) || [post.preview];
      for (const l of lines.slice(0, 3)) console.log(`│   ${l}`);
      console.log(`│`);
      console.log(`│ 🔎 GAP ANALYSIS:`);
      if (citedPrice) {
        console.log(`│   ✓ Agent cited at least one price/figure`);
      } else {
        console.log(`│   ✗ Agent cited NO specific price/move figure — fundamentals would have added: ${price} (${change})`);
      }
      if (!citedPE) {
        console.log(`│   ✗ Agent did not cite valuation (P/E) — P/E not available yet; v7/quote needed`);
      }

      summary.push({ date: post.date, company: entry.name, result: isCorrect ? "correct" : (expectedSymbol ? "wrong" : "unverified"), symbol: entry.symbol, price, change, range52 });
    }

    console.log(`└${"─".repeat(78)}`);
    console.log();
    await new Promise((r) => setTimeout(r, 350));
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("═".repeat(80));
  console.log("  RESULTS SUMMARY");
  console.log("═".repeat(80));
  console.log(`  Total posts analysed        : ${POSTS.length}`);
  console.log(`  Company correctly identified: ${summary.filter((s) => s.result === "correct").length}`);
  console.log(`  Wrong company returned      : ${summary.filter((s) => s.result === "wrong").length}`);
  console.log(`  Name mismatch (blocked)     : ${mismatch}`);
  console.log(`  No match (score < 50)       : ${summary.filter((s) => s.result === "no_match").length}`);
  console.log(`  Identified / price available: ${summary.filter((s) => s.result === "correct" || s.result === "unverified").length}`);
  console.log();
  console.log("  IDENTIFICATION BREAKDOWN:");
  for (const s of summary) {
    const icon = s.result === "correct" ? "✅" : s.result === "wrong" ? "❌" : s.result === "name_mismatch" ? "🔒" : s.result === "no_match" ? "⬜" : "🔍";
    const info = s.price ? `→ ${s.symbol} ${s.price} (${s.change})` : s.symbol ? `→ ${s.symbol}` : "";
    console.log(`  ${icon} ${s.date} ${(s.company || "?").slice(0, 38).padEnd(38)} ${info}`);
  }
  console.log();
  console.log("  PRODUCTION NOTE:");
  console.log("  v8/chart (price, change%, 52-week range, name) — works from Workers ✓");
  console.log("  v7/quote (P/E, EPS, market cap) — auth-gated. Needs production test.");
  console.log("  If v7/quote fails in Workers: fundamentals block suppressed (≥2 meaningful");
  console.log("  fields required) → post goes out clean. No data → no injection, no crash.");
  console.log("═".repeat(80));
}

function inferExpectedCompany(post) {
  const t = `${post.title} ${post.catalyst}`;
  const map = [
    [/equinor/i, "Equinor (EQNR)"],
    [/freehold royalt/i, "Freehold Royalties (FRU)"],
    [/par pacific/i, "Par Pacific (PARR)"],
    [/applied optoelectronics/i, "Applied Optoelectronics (AAOI)"],
    [/amazon/i, "Amazon (AMZN)"],
    [/vishay/i, "Vishay Intertechnology (VSH)"],
    [/delta/i, "Delta Air Lines (DAL)"],
    [/applied industrial/i, "Applied Industrial Technologies (AIT)"],
    [/oilsands|oil sands/i, "Canadian Oilsands (unnamed)"],
  ];
  for (const [re, name] of map) if (re.test(t)) return name;
  return null;
}

function inferExpectedSymbol(post) {
  const t = `${post.title} ${post.catalyst}`;
  const map = [
    [/\bBATL\b/, "BATL"],
    [/\bTSM\b|taiwan semiconductor/i, "TSM"],
    [/\bWMB\b|williams companies/i, "WMB"],
    [/morgan stanley/i, "MS"],
    [/energy transfer/i, "ET"],
  ];
  for (const [re, sym] of map) if (re.test(t)) return sym;
  return null;
}

run().catch(console.error);
