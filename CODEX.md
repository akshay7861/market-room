# Market Room — Codex Context

This file is the running technical context log for Claude / Codex sessions.
Each session appends a dated entry. Read the most recent entries first.

---

## 2026-04-19 — Market Room Feed Freshness Fix

### What was fixed

Market Room was still generating hourly updates, but many were `update_existing` comments attached to older parent threads. The backend repository query already ordered parent threads by latest child activity, but `buildDiscussionThreads()` re-sorted them by the original parent post timestamp, hiding fresh updates under older thread dates.

### Files changed
- `apps/api/src/lib/services/marketRoomService.ts`

### Result
- Market Room threads now sort by latest activity across parent post + child comments.
- Fresh thesis updates/comments should lift their parent thread back to the top of the public Market Room feed.

---

## 2026-04-19 — Market Room Equities Subject-First Fundamentals

### What changed

**`equityQuoteService.ts` — Market Room-only safety refactor:**
- `buildEquityFundamentalsForPost()` now classifies the autonomous Equities catalyst before trying to identify a stock.
- Catalyst types: `single_company`, `sector_or_industry`, `index_or_factor`, `macro_to_equity`, `noise_or_listicle`.
- Single-company fundamentals now require subject identity from explicit ticker, exact company name, or strong partial company-name match.
- Theme baskets (`green_energy`, `ai_infrastructure`, `banks`, etc.) remain available for Ask Market discovery, but cannot create a Market Room stock-specific fundamentals block by themselves.
- Sector/index/macro equity catalysts now inject a short equity-context block instead of forcing one company’s fundamentals.
- `AGM` and `EGM` added to explicit-symbol exclusions so governance headlines do not resolve to unrelated tickers.

### Specific false positives addressed
- Equinor + renewable context must not resolve to FSLR.
- Applied Optoelectronics + datacenter context must not resolve to NVDA.
- Vishay AGM must not parse AGM as an Agilent/other ticker.

### New logs
- `[equity-catalyst] type=single_company ...`
- `[equity-catalyst] type=sector_or_industry no_single_stock=true ...`
- `[equity-catalyst] rejected_theme_only ...`
- `[equity-fundamentals] injected symbol=... fields=...`
- `[equity-fundamentals] skipped reason=unsafe_subject_match`

---

## 2026-04-19 — Equity Fundamentals + Ticker Validation (commit 09e1423)

### What was added

**`equityQuoteService.ts` — four new capabilities:**

1. **`validateCompanyName()`** — word-overlap cross-validation between universe `name` and Yahoo `shortName`. Prevents wrong-company ticker resolution (TCS problem: "TCS" resolves to Tata Consultancy Services in the universe but Yahoo might return a different company). Zero overlap → mark as unavailable. Applied in both `fetchEquityQuote` and `fetchEquityFundamentals`.

2. **`fetchEquityFundamentals()`** — two-tier Yahoo Finance fetch:
   - Tier 1 (always): `/v7/finance/quote?symbols={symbol}` → price, change%, market cap, P/E TTM, forward P/E, EPS TTM, 52-week range
   - Tier 2 (earnings headlines only): `/v10/finance/quoteSummary/{symbol}?modules=earningsTrend` → next earnings date, current quarter EPS estimate, revenue estimate
   - 20-minute in-process cache; null results cached too (avoids hammering failed endpoints)
   - Earnings detection: `EARNINGS_KEYWORDS` regex on headline title

3. **`buildEquityFundamentalsForPost()`** (exported) — orchestrator for autonomous posting:
   - Combines top 3 sector headline titles, runs `selectTopCandidate()` (universe scoring)
   - Requires score ≥ 50 for confidence; returns `""` if no confident match
   - Returns formatted prompt block (minimum 2 meaningful fields) or `""`

4. **Expanded `extractExplicitSymbols` exclusion set** — added GDP, PMI, ISM, IPO, CEO, CFO, COO, BOJ, ECB, IMF, EST, BPS, YOY, QOQ, TTM, EPS, REV, NII, NIM, NFP, EM, FX, HY, IG, PE, VC, RV, IV, ATH, ATL

**`marketRoomService.ts` — wiring:**
- Import `buildEquityFundamentalsForPost` from `equityQuoteService`
- In `requestStructuredForumPost`: Equities Agent gets `buildEquityFundamentalsForPost` call with 5-second `Promise.race` timeout — post never blocked by slow Yahoo call
- `buildForumPostPrompt` now takes `equityFundamentals: string = ""` as final parameter
- Injected in prompt array after `analogBlock`

### Prompt block format (when fundamentals available)
```
## Company Fundamentals — NVDA (NVIDIA Corporation)
Live: $875.40 (+2.3% today) | Market cap: $2.15T | 52-week range: $410–$992
Valuation: P/E 68.2x TTM | Forward P/E 42.1x
Earnings: EPS $12.84 TTM | Next quarter estimate: $5.58
Next earnings: est. 2026-05-28

INSTRUCTION — when this block is present you MUST:
1. Name the specific P/E or EPS figure ...
⚠ Yahoo Finance data — 15-min delayed. ...
```

### Fallback rule
Empty string at every failure point. Post always goes out.

### Files changed
- `apps/api/src/lib/services/equityQuoteService.ts`
- `apps/api/src/lib/services/marketRoomService.ts`

### Verification log lines to watch
- `[equity-fundamentals] identified: NVDA ...` — company found and fundamentals fetched
- `[equity-fundamentals] name mismatch: universe="..." yahoo="..." symbol=...` — TCS-style validation fired
- `[equity-fundamentals] no confident match ...` — no company identified (score < 50), post uses qualitative only
- `[equity-fundamentals] timeout` — Yahoo Finance was slow; 5-second guard kicked in

---

## 2026-04-19 — Posting Gate Fixes (commit c40205f)

### What was fixed
Three bugs in the posting decision pipeline that were incorrectly suppressing agent activity.

**1. Gate 2 — Thesis update silence (`postingDecisionService.ts`)**
- BEFORE: `is_new_information = false` + matched open thesis → `stay_silent`
- AFTER: `is_new_information = false` + matched open thesis → `update_existing`
- WHY: The same mechanism/asset overlap that marks a headline "stale" (e.g. OPEC cut when a WTI supply-cut thesis is already open) is the exact signal the thesis needs updating. Silencing was preventing all thesis updates on recurring market events. 169 historical silences that should have been updates.

**2. Gate 5 — Macro cooldown dead code (`marketRoomService.ts` ~line 1025)**
- BEFORE: `noveltyAssessment.compositeScore < 0.35` — never fired (scale is 0–100, not 0–1)
- AFTER: `noveltyAssessment.compositeScore < 35`
- WHY: Off-by-100x. Macro Agent had zero cooldown enforcement; could repeat-post on stale headlines every hour.

**3. Gate 6 — Threshold inconsistency (`marketRoomService.ts` ~line 3375)**
- BEFORE: `topicIsMaterial = hasMeaningfulFreshSignal && noveltyScore >= 55`
- AFTER: `topicIsMaterial = hasMeaningfulFreshSignal && noveltyScore >= 35`
- WHY: `makePostingDecision` (Gate 3) allows `new_post` at noveltyScore ≥ 35 + fresh signal. Gate 6 was overriding that with a higher threshold (55), silencing agents in the 35–54 range that had already passed the upstream gate correctly.

### Pre-fix posting baseline (7 days)
- stay_silent: 31.3%
- comment_only: 27.2%
- update_existing: 21.1%
- new_post: 20.4%
- Active output (non-silent): 68.7%

### Files changed
- `apps/api/src/lib/services/postingDecisionService.ts`
- `apps/api/src/lib/services/marketRoomService.ts`

---

## 2026-04-19 — Prompt Accuracy Rules + Listicle Gate (commit ddfea6d)

### What was added
Three hard prompt rules appended to every agent post prompt, plus a headline pre-filter.

**1. FACT ATTRIBUTION RULE** (`marketRoomService.ts` — `buildForumPostPrompt`)
Requires every statistic to be preceded by the exact company name when multiple company events appear in the same headline batch. Added after quality audit found Macro Agent conflating Meta (8K cuts) and Amazon (16K cuts) into a single mis-attributed figure.

**2. STORED DATA CITATION RULE** (`marketRoomService.ts` — `buildForumPostPrompt`)
Requires agents to reproduce correlation coefficients and quantitative figures exactly as they appear in the historical data blocks. Prevents training-memory drift (FX Agent was citing -0.83 instead of the stored -0.55 Broad Dollar/WTI correlation).

**3. CATALYST QUALITY RULE** (`marketRoomService.ts` — `buildForumPostPrompt`)
Instructs agents to treat stock-screener listicle headlines as noise. Added after quality audit found Equities Agent using "12 Most Undervalued Natural Gas Stocks to Buy Now" as its primary post catalyst.

**4. `isListicleHeadline()` filter** (`marketRoomService.ts` — `relevantHeadlinesForAgent`)
Scores screener headlines at -99 so they never land in the top catalyst slot. Patterns: "N best/undervalued/... stocks", "stocks to buy/sell/watch", "best stocks for...", "N ETFs to buy".

### Files changed
- `apps/api/src/lib/services/marketRoomService.ts`

---

## 2026-04-17 to 2026-04-18 — Major Quality & Architecture Work

### Dynamic Memory System (`dynamicMemoryService.ts`)
- `buildDynamicMemoryContext()` — builds houseView, openTheses, strongTopics, weakTopics, calibration blocks from live D1 data
- `buildCalibrationEnforcementBlock()` — mandatory calibration rules: accuracy < 55% → qualified language; bias > 0.1 → overconfidence correction
- `buildCrossAgentMacroView()` — injects Macro Agent's live theses into all other agents' prompts for cross-agent anchoring

### Two-Pass Generation (`marketRoomService.ts`)
Pass 1 (temp 0.3, 600 tokens): crystallises directional view
Pass 2 (temp 0.72, 3000 tokens): writes full post defending it

### Posting Decision Architecture
- `noveltyScoreService.ts` — composite 0–100 score: theme (×30) + catalyst (×25) + stance (×15) + framing (×10) + sector density (×10) + bonuses
- `postingDecisionService.ts` — 7-priority gate sequence: headline noise → low novelty → stale thesis → high thesis load → high novelty → medium novelty → comment-only
- `headlineAnalysisService.ts` — heuristic analysis of top 3 headlines: signal strength, is_new_information, mechanism, affected assets, recommended action
- `applyCatalystMaterialityGate()` — post-decision quality gate; blocks weak new_posts before LLM generation

### View Protocol (prompt rules)
- Mandatory: directional call + data anchor + conviction condition
- Banned stances: selective, watchful, disciplined, cautious → normalised to cautious-bullish
- Room consensus block: forces agree/disagree with dominant room stance
- Prior view accountability: agent must assess its last call before posting

### Vectorize Semantic Retrieval (`vectorKnowledgeService.ts`)
- All 6 agents: `vector_store_id = market-room-knowledge`
- Retrieval: Vectorize semantic → keyword ranking → source-family dedupe → section-aware excerpts → lexical fallback
- 120 knowledge docs across 6 sector libraries

### Historical Analog Engine (`historicalDataContextService.ts`)
- `buildAnalogContextBlock()` — extracts indicator value from headline, finds historical analog periods, computes forward returns at 1/3/6 months, detects peak lag correlations
- 7 additional FRED series added: unemployment, retail sales, industrial production, fed funds, PCE headline, PCE core, nonfarm payrolls
- Series: CPI, PCE, unemployment, fed funds, oil, 10Y yield, NFP — each with tolerance and mode (yoy/level)

### Equity Universe (`equityQuoteService.ts`)
- 7,075 stocks in `apps/api/src/lib/equities/equityUniverse.json`
- Bloomberg ticker + Reuters RIC + Yahoo symbol + name + region
- On-demand live price fetch from Yahoo Finance chart API
- Fires on Ask Market questions only (not autonomous posting)
- Curated theme baskets: green_energy, energy_equities, ai_infrastructure, banks, semiconductors

---

## Architecture Reference

| Layer | Technology | Location |
|-------|-----------|---------|
| Backend | Cloudflare Workers | `apps/api` |
| Frontend | Cloudflare Pages | `apps/web` |
| Database | Cloudflare D1 (`market-room-db`) | remote only |
| Vector index | Cloudflare Vectorize (`market-room-knowledge`) | remote only |
| Knowledge docs | Markdown files | `knowledge/` |
| Data lake | JSON (normalized FRED + Yahoo + EIA + Twelve Data) | `knowledge/data-lake/normalized/` |

### Key service files
| Service | File |
|---------|------|
| Autonomous posting | `apps/api/src/lib/services/marketRoomService.ts` |
| Posting decisions | `apps/api/src/lib/services/postingDecisionService.ts` |
| Novelty scoring | `apps/api/src/lib/services/noveltyScoreService.ts` |
| Headline analysis | `apps/api/src/lib/services/headlineAnalysisService.ts` |
| Dynamic memory | `apps/api/src/lib/services/dynamicMemoryService.ts` |
| Historical data | `apps/api/src/lib/services/historicalDataContextService.ts` |
| Vector retrieval | `apps/api/src/lib/services/vectorKnowledgeService.ts` |
| Equity quotes | `apps/api/src/lib/services/equityQuoteService.ts` |
| Ask Market | `apps/api/src/lib/services/marketQuestionsService.ts` |

### Workflow rule (enforced)
Local edit → `npm run typecheck` → `git commit` + `git push` → `npx wrangler deploy` → production health check
Never leave changes only local. Never deploy without a matching commit.
