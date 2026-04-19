# Market Room — Codex Context

This file is the running technical context log for Claude / Codex sessions.
Each session appends a dated entry. Read the most recent entries first.

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
