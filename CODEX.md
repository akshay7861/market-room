# Market Room — Codex Context

This file is the running technical context log for Claude / Codex sessions.
Each session appends a dated entry. Read the most recent entries first.

---

## 2026-04-19 — Ask Market Chart Rendering + Stored Correlation Charts

### Root cause

Ask Market had a chart marker path (`%%CHART_DATA%%`) but the implementation was too narrow:

- backend chart generation only handled WTI-vs-CPI and M1-vs-CPI;
- the chart payload assumed a single percent axis;
- frontend rendering could not show dual-axis overlays or correlation heatmaps;
- lagged comparisons such as `WTI vs SPY lagged 3 months` were not supported.

### Fix

- Extended deterministic chart generation in `historicalDataContextService.ts`.
- Added Ask Market charts for:
  - WTI YoY% vs CPI YoY%;
  - WTI price vs CPI YoY% on dual axes when the user asks for overlay/price/level/two-axis;
  - WTI YoY% vs Broad Dollar YoY% (DXY proxy);
  - WTI YoY% vs SPY YoY%;
  - M1 YoY% vs CPI YoY%;
  - cross-asset correlation heatmap.
- Added lag parsing up to 12 months for user prompts like `WTI vs SPY lagged 3 months`.
- Extended frontend `ChartBlock` to render:
  - dual-axis line charts;
  - chart subtitles with computed correlation;
  - red/green correlation heatmaps.

### Guardrail

Charts are computed from stored data-lake series only. Agents can explain the chart, but they do not invent the chart values.

### Files changed

- `apps/api/src/lib/services/historicalDataContextService.ts`
- `apps/web/src/components/ChartBlock.tsx`
- `apps/web/src/styles/global.css`

### Validation

- `npm run typecheck --workspace @market-room/api` passed.
- `npm run typecheck --workspace @market-room/web` passed.
- `npm run build --workspace @market-room/api` passed (`wrangler deploy --dry-run`).
- `npm run build --workspace @market-room/web` passed.

---

## 2026-04-19 — Ask Market Thread-Aware Chart Follow-Ups

### Root cause

Ask Market could render an initial deterministic chart, but follow-up requests such as `make it two axis`, `use absolute values`, or `show it again` were treated as ordinary text. The chart builder only inspected the latest user message, so follow-ups without the original subject (`WTI`, `CPI`, `SPY`) did not generate a fresh chart payload. The agent then described a chart that did not exist or claimed the old chart had a different axis setup.

### Fix

- Added thread-aware chart intent extraction.
- Chart follow-ups now reuse the previous chart subject in the thread.
- Added explicit chart modes:
  - `yoy_same_axis`
  - `yoy_dual_axis`
  - `absolute_dual_axis`
  - `correlation_heatmap`
- Added CPI index-level support, so `WTI absolute values vs CPI absolute values in two axis` renders WTI `$ / bbl` against CPI index level.
- Added chart payload validation before appending `%%CHART_DATA%%`.
- Added chart prompt context so the agent knows exactly whether a chart will render and what axis setup it has.
- Added chart logs:
  - `[chart-intent] ...`
  - `[chart-render] generated ...`
  - `[chart-render] skipped ...`
- Added frontend axis badges so the rendered chart visibly says `Left: ...` and `Right: ...`.

### Expected behavior

- `Plot WTI vs inflation over the last 10 years` -> WTI YoY% vs CPI YoY%, single axis.
- `make it two axis` -> same WTI/CPI subject, WTI YoY% left axis and CPI YoY% right axis.
- `make the chart as WTI absolute values vs CPI absolute values in two axis` -> WTI `$ / bbl` left axis and CPI index right axis.
- `show it again` -> preserves the previous chart subject and mode.

### Follow-up hardening

- Added CPI month-over-month percent support (`CPI MoM%`) so requests such as `replace CPI index with CPI mom %` and `WTI absolute vs inflation MOM %` generate a real chart instead of prose only.
- Affirmative follow-ups such as `yes prepare` now inherit the previous chart modification request.
- The exact chart rendering context is now included in the user prompt body as well as model instructions.
- Added a sanitizer that removes unsupported chart claims such as `I also included EIA inventory / WTI curve overlays` unless those series are actually present in the chart payload.

### Files changed

- `apps/api/src/lib/services/historicalDataContextService.ts`
- `apps/api/src/lib/services/marketQuestionsService.ts`
- `apps/web/src/components/ChartBlock.tsx`
- `apps/web/src/styles/global.css`

---

## 2026-04-19 — Fed RSS Materiality + Anti-Repetition Gate

### Root cause

Fed RSS was still treated as a first-class autonomous catalyst source after FRED/EIA were removed from the trigger lane. That allowed low-materiality supervisory items to create Market Room posts and comments:

- `Federal Reserve Board issues enforcement action with Community Bankshares, Inc.`
- `former employee of United Bank`
- `Burke & Herbert application approval`
- `Morgan Stanley Section 23A exemption`
- `FedNow intermediaries proposal`

Remote D1 confirmed this was a real production failure, not just a UI artifact:

- `+178k NFP official print`: 136 messages
- `Morgan Stanley Section 23A`: 34 messages
- `former employee of United Bank`: 22 messages
- `Community Bankshares`: 16 messages
- `FedNow intermediaries`: 9 messages
- `Burke & Herbert approval`: 7 messages

### Fix

- Added Fed RSS materiality tiering in `officialCatalystService.ts`.
- Only `high` official headlines enter autonomous catalyst queues.
- `medium` items are context-only and not eligible for autonomous Market Room posts.
- `low` items are suppressed at source.
- Reordered catalyst priority to `Marketaux -> Yahoo -> high-tier official news`.
- Added normalized catalyst-family matching before headline analysis.
- Added final direct-post safety gate for repeated catalyst families.
- Added comment repetition gate so an agent cannot keep commenting on the same parent/catalyst family.
- Added catalyst-filter logs for skipped repeated catalysts, low-materiality official suppression, and alternate headline selection.

### Materiality behavior

- `Community Bankshares enforcement` -> `low`, suppressed.
- `former employee of United Bank` -> `low`, suppressed.
- `Burke & Herbert approval` -> `low`, suppressed.
- `Morgan Stanley Section 23A` -> `medium`, context-only.
- `FedNow intermediaries` -> `medium`, context-only.
- `discount-rate meeting minutes` -> `medium`, context-only.
- `FOMC statement`, `FOMC minutes`, `SEP/economic projections`, and broad capital-framework proposals -> `high`, eligible.

### Files changed

- `apps/api/src/lib/services/officialCatalystService.ts`
- `apps/api/src/lib/services/marketRoomService.ts`
- `packages/shared/src/index.ts`

### Validation

- `npm run typecheck --workspace @market-room/api` passed.
- `npm run build --workspace @market-room/api` passed (`wrangler deploy --dry-run`).
- Backtest table showed the known repeated Fed RSS items now suppress/context-only correctly while true FOMC/capital-framework items remain eligible.

---

## 2026-04-19 — Equities Market Room Subject Disambiguation Pass

### Root cause

The first subject-first Equities catalyst logic fixed the biggest theme-basket mistakes (`Equinor -> FSLR`, `Applied Optoelectronics -> NVDA`), but backtesting old Market Room triggers exposed a second class of false positives: broker/source names and ambiguous market words could still resolve as the company subject.

Examples:
- `TD Cowen downgrade of Microsoft` could resolve to `TD`.
- `BNP upgrade on Nvidia` could resolve to `BNP.PA`.
- `Dow Jones` could resolve to `DOW`.
- `NASDAQ:BSVN` could resolve to Nasdaq Inc rather than Bank7.
- `JD Vance` could resolve to `JD`.
- one-letter ticker `A` could be parsed from prose in a Vishay AGM headline.
- generic `TSX oilsands major` could infer a single oilsands company from a partial word match.

### Fix

- Added Market Room-only strict subject-symbol extraction; Ask Market broad stock discovery remains unchanged.
- Excluded broker/source/person/venue symbols from autonomous subject ownership: `JD`, `TD`, `BNP`, `OCC`, `NYSE`, `NASDAQ`, `TSX`, `DOW`, `AGM`, `EGM`.
- One-letter tickers are accepted only with strong ticker context such as `(A)`, `$A`, or `NYSE:A`.
- Ambiguous aliases such as `dow`, `nasdaq`, `td`, `bnp`, and `jd` cannot become subject matches unless explicit company wording is present.
- Partial company-name matches are allowed only when the headline has single-company catalyst language; this blocks generic sector headlines like `TSX oilsands major` from forcing one stock.
- Added `META` aliases for Meta/Facebook and a curated `BSVN` entry for Bank7, which was absent from the imported universe.

### Backtest checkpoint

Focused checkpoint on prior failure classes:
- `BATL shares ... JD Vance` -> `BATL`
- `TSX oilsands major` -> sector-level, no single-stock fundamentals
- `Amazon ... Dow Jones` -> `AMZN`
- `Vishay AGM` -> `VSH`
- `TD Cowen downgrade of Microsoft` -> `MSFT`
- `Bank7 Q1 (NASDAQ:BSVN)` -> `BSVN`
- `Natural gas stocks to buy` -> `noise_or_listicle`, no fundamentals
- `Meta job cuts` -> `META`

### Files changed

- `apps/api/src/lib/services/equityQuoteService.ts`

---

## 2026-04-19 — FRED/EIA Removed From Catalyst Trigger Lane

### Root cause

The earlier repetition guard stopped unchanged official prints from updating theses, but the deeper architecture issue was still present: FRED data was being fetched by `officialCatalystService.ts`, converted into `SnapshotHeadline`s, and merged into the same Market Room catalyst queues as Marketaux news. That meant durable data-lake observations such as `Nonfarm payrolls latest official print: +178...`, `Fed funds latest official print...`, and `US 10Y Treasury latest official print...` could compete as autonomous post triggers.

This was feed-role confusion, not a memory-size or vector issue. FRED and EIA are data/context sources. Marketaux/news headlines are catalyst triggers.

### Fix

- Removed FRED headline generation from `fetchOfficialCatalystLayer()`.
- `fetchOfficialCatalystLayer()` now returns only real official news/release headlines from Federal Reserve RSS and Treasury press pages.
- Added `isDataLakeOnlyHeadline()` to defensively exclude direct FRED/EIA/latest-official-print headlines from Market Room and Ask Market headline queues if they appear from any future path.
- Added catalyst-source logs:
  - `[official-news] catalysts=... fred=excluded_data_lake_only eia=excluded_data_lake_only`
  - `[catalyst-source] market_room ... data_lake_sources=excluded`
  - `[catalyst-source] ask_market ... data_lake_sources=excluded`

### Files changed

- `apps/api/src/lib/services/officialCatalystService.ts`
- `apps/api/src/lib/services/marketRoomService.ts`
- `apps/api/src/lib/services/marketQuestionsService.ts`

### Result

FRED/EIA-style data prints can still support reasoning through the historical/data-lake context path, but they should no longer become the primary headline, posting catalyst, thesis-update reason, or autonomous Market Room trigger.

---

## 2026-04-19 — Stale Official Print Repetition Guard

### Root cause

The official FRED catalyst layer re-emits durable monthly/latest observations every scheduled run, e.g. `Nonfarm payrolls latest official print: +178 jobs change context (2026-03-01)`.

Headline analysis correctly marked repeated NFP prints as `is_new_information=false`, but `postingDecisionService.ts` had an exception: stale headline + matched thesis → `update_existing`. That was useful for evolving stories, but it let unchanged official prints repeatedly update old Risk/Sentiment/Macro theses.

This was not a vector, memory-size, or knowledge-base shortage problem. The memory/thesis layer was doing its job by matching existing theses; the posting gate was too permissive for unchanged official data prints.

### Fix
- Added `stale_official_print_no_update` posting reason.
- If a headline is not new and matches `latest official print` for durable data (`NFP/payrolls`, `Fed funds`, `CPI`, `PCE`, `unemployment rate`, `US 10Y Treasury`), it now stays silent before the matched-thesis update branch.
- Official prints can still be used as background context and can still post when the observation is genuinely new.

### Files changed
- `apps/api/src/lib/services/postingDecisionService.ts`
- `packages/shared/src/index.ts`

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

## 2026-04-20 — Ask Market Chart Coverage Fix After Live Audit

### Problem
- Claude's live Ask Market chart backtest passed only 26/40 cases.
- Failures were concentrated in missing non-WTI pair routing, explicit drawdown wording, and thread follow-ups that described a chart without emitting `%%CHART_DATA%%`.
- Specific misses included 10Y/SPY, Fed Funds/unemployment, VIX/SPY, HY OAS/SPY, VIX/HY OAS, SPY/WTI/DXY drawdowns, lead-lag -> rolling follow-ups, and heatmap subset follow-ups.

### Fix
- `historicalDataContextService.ts` now supports these additional pair routes:
  - `us10y_spy`
  - `fedfunds_unemployment`
  - `vix_spy`
  - `hy_oas_spy`
  - `vix_hy_oas`
- Added level data support for Broad Dollar index, Fed Funds rate, and unemployment rate in chart series definitions.
- Drawdown requests now recognize explicit assets such as SPY, WTI, and DXY/dollar index.
- Latest user follow-up now overrides older chart context for chart mode, so "now show it as rolling correlation" is not overridden by a previous lead-lag request.
- Heatmap follow-up subsets now use the latest user message first, so "only oil inflation dollar and SPY" returns a 4x4 matrix instead of the previous full 7x7 matrix.
- Fixed Ask Market follow-up assembly so the latest user message is not passed twice into the prompt/chart context. The duplicate latest message caused subset follow-ups to lose the original heatmap request and degrade into a WTI/CPI line chart.
- `buildChartIntentFromThread` defensively dedupes adjacent identical user messages.

### Validation
- `npm run charts:backtest` now covers 22 deterministic chart cases and passes 22/22.
- `npm run typecheck --workspace @market-room/api` passes.
- `npm run build --workspace @market-room/api` Worker dry-run passes.

## 2026-04-20 — Market Room Governance Credibility Guards

### Problem
- Governance audit flagged credibility risks in autonomous Market Room posts: inconsistent live metric citations, weak/missing conviction conditions, irrelevant catalyst ownership, same-stance lock-in, Equities standalone silence, and stale `posting_decision_json` catalyst metadata.
- Numeric market truth should not come from vectors. Vectors remain unsuitable as source-of-truth for live HY OAS, 2Y, 10Y, Fed Funds, WTI, DXY, VIX, or SPY values.

### Fix
- Added deterministic verified metrics grounding for Market Room prompts:
  - live snapshot values where available: S&P/SPY, Nasdaq, DXY, US10Y, WTI, Brent, gold, copper.
  - normalized data-lake values for US2Y, Fed Funds, HY OAS, VIX, and unemployment.
  - prompt rule tells agents to cite only verified metrics, article text, historical-data blocks, analog/chart data, or stored correlations.
- Added quality flags for metric and falsifiability governance:
  - `verified_metric_cited`
  - `unverified_metric_claim`
  - `metric_missing`
  - `weak_conviction_condition`
  - `stance_lock_review_missing`
  - `resolved_catalyst_corrected`
- Strengthened View Protocol so top-level posts must include exactly one sentence beginning with `This view changes if...` and containing a metric/event, threshold, and timeframe.
- Added log-only domain relevance gate by default:
  - logs `[domain-gate] agent=... verdict=... score=... action=log_only`.
  - suppressive mode only activates when `MARKET_ROOM_DOMAIN_GATE_SUPPRESS=true` and the catalyst is clearly irrelevant/non-protected.
- Added stance-lock challenge prompt:
  - if the latest 5 posts are the same stance or 80% of latest 10 share one stance, injects `STANCE REVIEW REQUIRED`.
  - logs `[stance-lock] agent=... streak=... stance=... challenge=injected`.
- Added Equities standalone diagnostics around eligible headlines, posting decisions, and fundamentals injection.
- Corrected final persisted `posting_decision_json.suggestedTopic.catalyst` after the final message catalyst is resolved, with `[pdj-catalyst] corrected ...` logs.

### Validation
- `npm run typecheck --workspace @market-room/api` passes.
- `npm run typecheck --workspace @market-room/shared` passes.
- `npm run charts:backtest` passes 22/22 to confirm Ask Market chart work was not regressed.

## 2026-04-20 — Market Room Conviction Repair + Feed Ordering Fix

### Problem
- Production validation showed agents still wrote falsification-style language without the exact required `This view changes if...` sentence, so posts were flagged `conviction_condition_missing`.
- The Market Room feed could show an old thread above a newer post because thread ordering used latest comment activity rather than top-level post creation time.

### Fix
- Added deterministic backend repair after Market Room generation:
  - If generated content lacks `This view changes if`, append a sector-specific sentence with a metric/event, numeric threshold, and timeframe.
  - Logs `[conviction-repair] agent=... appended required condition`.
- Changed Market Room thread retrieval and display sorting to order by top-level post `created_at DESC`, not latest comment activity.

### Validation
- `npm run typecheck --workspace @market-room/api` passes.
- `npm run build --workspace @market-room/api` Worker dry-run passes.
- `npm run charts:backtest` remains 22/22.

## 2026-04-20 — Finnhub + Polygon/Massive Provider Validation

### Massive / Polygon note
- Polygon.io rebranded to Massive.com in 2025. This is a name/API continuity change, not an acquisition.
- The code keeps `polygonNewsService.ts`, `POLYGON_API_KEY`, provider id `polygon`, and the legacy `https://api.polygon.io` endpoint for compatibility.
- Live API validation showed the accepted query shape is `sort=published_utc&order=desc`, not `sort=published_utc.desc`.

### Source quality hardening
- Finnhub general feed includes non-market CNBC/general stories, so `finnhubNewsService.ts` now requires explicit market relevance before selecting general-category items.
- Polygon/Massive feed includes promotional stock-picking/listicle, securities-law deadline, and sponsorship PR noise, so `polygonNewsService.ts` rejects those before scoring.
- Both new source adapters now use word-boundary matching for very short routing keywords such as `em`, `fx`, `oil`, `fed`, `dxy`, `usd`, `eur`, and `jpy`, preventing accidental substring matches inside unrelated words.

### Smoke-test observations
- Finnhub key works; latest service-level test selected 9 market-relevant headlines from 154 raw articles and routed all 6 agents.
- Polygon/Massive key works; latest service-level test selected 6 cleaner company-event headlines from 50 raw articles and routed 4 agents.

## 2026-04-20 — Market Room Trigger Election Quality Gate

### Problem
- A production smoke run proved Finnhub and Polygon/Massive were active, but agents still wrote from weak Marketaux/general catalysts:
  - South India movie screen count decline -> Macro post.
  - DEKRA anniversary/growth PR -> Rates post.
  - Chihuahua fatal crash -> FX comment.
- Root cause: after cross-provider merge, Market Room mostly preserved provider order and analyzed only the top few sector headlines. Weak-but-novel items could therefore beat stronger financial catalysts.

### Fix
- `filterEligibleHeadlinesForAgent()` now applies a shared catalyst election quality score before repeat filtering and headline analysis.
- Obvious non-market catalysts are skipped with `[catalyst-quality] skipped weak ...` logs.
- Eligible headlines are ranked by quality score and sector fit before they enter `analyzeTopHeadlinesForAgent()`.
- The main Market Room keyword scorer now uses word-boundary matching for short tokens, preventing accidental matches such as `em` inside unrelated words.

### Expected effect
- Movie-screen-count, local crash, lifestyle, DEKRA anniversary, local insurance-platform, stock-picking/listicle, and similar weak articles should no longer become primary Market Room catalysts.
- Stronger market/company catalysts from Finnhub and Polygon/Massive should be allowed to beat weaker Marketaux items even though Marketaux still has first-pass source priority.

## 2026-04-19 — Ask Market Chart Transform Precedence Fix

### Problem
- Ask Market correctly rendered `WTI absolute vs inflation MoM%`, but `WTI absolute vs inflation YoY%` incorrectly rendered CPI index level.
- Root cause: chart intent parsing gave explicit `MoM` precedence, but did not give explicit `YoY` the same precedence. Generic words like `absolute` therefore forced inflation to `level`.

### Fix
- `historicalDataContextService.ts` now treats explicit transform words as stronger than generic chart-shape words:
  - `MoM`, `month-over-month`, `monthly %` -> CPI MoM%.
  - `YoY`, `Y/Y`, `year-over-year`, `year-on-year`, `annual %`, `12-month` -> CPI YoY%.
  - `CPI index`, `inflation index`, `index level` -> CPI index level.
- `YoY` terms now also count as chart modification language, so follow-ups like "make it YoY instead" keep the chart path active.
- Removed the later `absolute_dual_axis` override in CPI series selection, so an explicit `YoY` request is not silently downgraded back to CPI index.

### Expected behavior
- `WTI absolute vs inflation YoY%` -> WTI $/bbl on left axis, CPI YoY% on right axis.
- `WTI absolute vs inflation MoM%` -> WTI $/bbl on left axis, CPI MoM% on right axis.
- `WTI absolute vs inflation` with no explicit transform -> WTI $/bbl and CPI index level.

## 2026-04-19 — Ask Market Series-Level Chart Parser

### What changed
- Chart parsing now builds per-series intent internally: `asset + transform + axis + lagMonths`.
- The API still emits the same `ChartData` shape, so the frontend chart renderer remains compatible.
- Supported two-series families remain WTI/CPI, M1/CPI, WTI/Dollar, WTI/SPY, plus cross-asset heatmaps.
- Chart logs now include the chosen series intent, for example:
  `series="wti:level:left,cpi:yoy_pct:right"`.

### Why
- Prevents generic chart words like `absolute` from overriding explicit transform words like `YoY` or `MoM` on the wrong series.
- Makes follow-up edits safer: `make it MoM`, `make it two axes`, `lag SPY by 3 months`, `show the same chart again`.
- Keeps chart behavior deterministic and inspectable before adding more chart types.

## 2026-04-19 — Ask Market Chart Waves A/B/C

### Wave A
- Hardened the existing series-level parser and retained backward-compatible `ChartData` output.
- Heatmaps can now use requested subsets instead of always rendering the full default matrix.

### Wave B
- Added rolling correlation line charts.
- Added lead-lag correlation bar charts.
- Added drawdown-from-peak line charts for supported level series.
- Frontend `ChartBlock.tsx` now renders `chartType: "bar"` using Recharts `BarChart`.

### Wave C
- Added `npm run charts:backtest`.
- Backtest script: `scripts/backtest-ask-market-charts.mjs`.
- Current checkpoint: 9 chart prompts covering WTI/CPI transforms, rolling correlation, lead-lag bars, SPY drawdown, and heatmap subsets.

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

## 2026-04-20 — Market Room Multi-Source News Integration

### What changed
- Added Finnhub and Polygon.io (now trading as Massive — massive.com) as parallel Market Room catalyst sources.
- `finnhubNewsService.ts` fetches `general`, `forex`, and `merger` categories with `Promise.allSettled`, applies 24h freshness filtering, provider-specific cross-run dedupe, Jaccard near-duplicate cleanup, and routes up to 12 selected headlines.
- `polygonNewsService.ts` fetches `/v2/reference/news` once per run from the legacy `https://api.polygon.io` endpoint, maps `tickers[]` into headline entities, discards `insights` for now, applies 24h freshness filtering, provider-specific cross-run dedupe, Jaccard cleanup, and routes up to 12 selected headlines.
- `marketRoomService.ts` now fetches five source layers in the same discussion event: official, Yahoo, Marketaux, Finnhub, and Polygon/Massive.
- Merge priority is Marketaux -> Yahoo -> Finnhub -> Polygon/Massive -> Official.
- `[catalyst-source]` logs now include `finnhub=N polygon=N`.
- `fetched_news_items` logging now persists Finnhub and Polygon rows after `event.id` is known.

### Secrets
- `FINNHUB_API_KEY` and `POLYGON_API_KEY` are typed on `Env`.
- `POLYGON_API_KEY` accepts the key issued by Massive.com because Polygon.io's API and key model remain compatible.
- They must be set as Cloudflare secrets via Wrangler, not in `wrangler.jsonc`.

### Validation
- `npm run typecheck --workspace @market-room/api` passes.
- `npm run build --workspace @market-room/api` Worker dry-run passes.
- `npm run charts:backtest` remains 22/22.
