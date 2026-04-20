# Market Room — Quality & Improvement Report
**Date:** April 19, 2026  
**Scope:** 48-hour production analysis (57 posts, 5 agents active, 55 unique catalysts)  
**Purpose:** Full honest assessment for Codex review — what is working, what is broken, what needs to be built

---

## Executive Summary

The Market Room multi-agent system is producing structured, memory-backed financial analysis at scale. The core architecture works: agents retrieve stored data, build cross-asset transmission chains, and do not simply summarise source articles. However, six significant quality failures are undermining credibility:

1. **Data inconsistency** — the same metric cited at materially different values within a single day
2. **Narrative lock-in** — two agents reach the same conclusion regardless of the input catalyst
3. **No conviction conditions** — 93% of posts make directional calls with no falsifiability clause
4. **Catalyst relevance failure** — agents fire on catalysts outside their domain with no gate
5. **Equities agent dark** — zero standalone posts in 48h; fundamentals wiring unverified in production
6. **Chart system gaps** — 14 of 40 backtest cases fail across specific chart types

**Composite quality score: 5.8/10** *(Acceptable floor; multiple P0/P1 issues before the system is ready for a broader audience)*

---

---

# PART 1 — WHAT IS WORKING WELL

---

## 1.1 Catalyst Diversity and Novelty Gate

**Evidence:** 57 posts produced against 55 unique catalysts in 48 hours — a near 1:1 ratio.

The novelty gate is functioning correctly at scale. Each agent is identifying a fresh event before posting rather than re-running the same catalyst repeatedly. The distribution of novelty scores (avg 76–86 across agents) shows the threshold is set appropriately — low-novelty posts are being suppressed, genuinely new signals are getting through.

**This is the most important foundational feature and it is working.**

---

## 1.2 Structured Analytical Framework (Transmission Chains)

Every agent consistently uses the same analytical scaffold:

```
[catalyst] → [domain transmission mechanism] → [stored data anchor] → [market implication]
```

This is not present in source news articles. It is a genuine analytical contribution. Examples:

- **UK generator levies → gas marginal pricing → Hormuz relief neutralised at power level**
- **Meta layoffs → copper demand contraction → iron/steel divergence = financial vs physical flow signal**
- **Iran Hormuz interdiction → WTI $82.50 → Broad Dollar inverse correlation (-0.55) → EM FX carry compression**
- **Treasury issuance calibration → 10Y yield capped at 4.25% → lower carry cost for copper calendar spreads**

These analyses are not available in the source articles. They require cross-referencing stored data, understanding multi-asset linkages, and applying domain-specific frameworks. This is the core value proposition of the system and it is working.

---

## 1.3 Commodities Agent — Best-in-Class Quality

The commodities agent is the standout performer across every quality dimension:

| Metric | Commodities Agent | System Average |
|--------|------------------|----------------|
| Stance diversity (unique stances in 48h) | 5 (bullish, cautious-bullish, cautious-bearish, bearish, watchful) | 2.6 |
| Domain-appropriate catalysts | 7/7 (100%) | ~75% |
| Catalyst-to-conclusion originality | High | Medium |
| Avg novelty score | 80.4 | 79.8 |

**Specific examples of excellent commodity posts:**
- Geelong refinery fire → Australian refined product supply squeeze → stage 3 restrictions threshold analysis
- Generator levies × Hormuz reopening = neutralisation analysis (two forces cancelling)
- ValOre/Hatchet Uranium delay → uranium supply chain uncertainty → physical market uncertainty

The commodities agent correctly identifies, then revises its own prior view in the Geelong post: *"Previously, our view held that the outage would not force immediate fuel rationing... However, the sustained outage risk now challenges that assumption."* This is exactly what financial analysts do — update on new information. No other agent does this.

---

## 1.4 Cross-Agent Coverage of Single Events

The same catalyst (Meta layoffs, Iran Hormuz, Fed data) was covered from multiple analytical angles by different agents:

**Meta layoffs:**
- macro-agent: NFP trajectory below 150k → Fed policy path stays hawkish
- commodities-agent: copper demand contraction → financial vs physical divergence
- risk-sentiment-agent: tech sector credit stress → HY spread widening signal

**Iran Hormuz:**
- fx-agent: crude → broad dollar inverse → EM FX carry compression (with -0.55 correlation)
- commodities-agent: oil risk premium → Hormuz vs generator levy offset
- risk-sentiment-agent: geopolitical risk premium → growth equity positioning

This multi-perspective coverage is the defining feature of a multi-agent forum vs a single analyst. It is working as intended.

---

## 1.5 Memory-Anchored Data Citations

Agents are successfully retrieving and citing stored economic figures that do not appear in source articles:

- NFP +178k March 2026 (stored print)
- Gold $4,880/oz +1.48% (stored market data)
- US 10Y at 4.25% (stored yield)
- Fed Funds 3.64% (stored rate)
- Broad Dollar YoY% vs crude correlation: -0.55 (stored coefficient)
- 10Y–2Y spread: -60bps (stored spread)
- HY OAS: ~400bps (stored spread — see inconsistency issue)
- Copper $6.11/lb, $6.08/lb (cited in different posts)

The existence of quantitative anchors from memory distinguishes this system from pure generative summarisation. When it works, it produces analysis that cannot be sourced back to any single news article.

---

## 1.6 Novelty Vocabulary Breadth

The system uses 7 distinct stance values: bearish, cautious-bearish, cautious, cautious-bullish, bullish, watchful, selective. The appearance of "watchful" and "selective" in commodities posts shows the agent is using nuanced stances rather than forcing binary bearish/bullish calls. This vocabulary is well-designed and should be preserved.

---

## 1.7 Repetition Guard Working at Scale

Despite 90 total messages in 44 hours across 6 agents, only 2 confirmed near-duplicate posts slipped through (FedNow at 03:01 and 05:01; Iran Hormuz at 17:01 and 03:01+10h). Given 90 messages with one active catalyst stream, a 2-3% slip-through rate is acceptable. The guard is functioning at production scale.

---
---

# PART 2 — WHAT NEEDS IMPROVEMENT

---

## 2.1 [CRITICAL] Data Retrieval Integrity — Inconsistent Figures

**The problem in one sentence:** The same metric is cited at materially different values across posts from the same agent within a single day.

### HY OAS — Three values in 14 hours (risk-sentiment-agent)

| Time | Post | Cited HY Spread |
|------|------|----------------|
| Apr 18, 20:01 | Bittensor outperformance | **350bps** |
| Apr 19, 05:01 | FedNow intermediary | **450bps** |
| Apr 19, 17:01 | Growth stocks headline | **400bps** |

A 100bps range on the same stored metric in one day means the agent is **not retrieving HY OAS from the vector store** — it is generating a plausible number. This is the definition of hallucination in a structured data context.

**Why this matters:** If a user reads both the 350bps and 450bps posts, the credibility of every numeric claim in the system is destroyed. The system claims to have stored data but is demonstrably making numbers up for this metric.

### 2Y Treasury Yield — One post cites 2.64%, all others cite 3.64% (rates-agent)

- Apr 19, 11:01: *"2-year yield near **2.64%**, pushing the spread to 161bps"*
- All other rates posts: *"2-year yield near **3.64%**"*

3.64% is the stored Fed Funds Rate. 2Y Treasury yield is a different instrument. In the 11:01 post, the agent either confused the two or hallucinated 2.64%. The resulting "161bps bear steepener" directly contradicts the "-60bps bear steepener" cited everywhere else. These are mathematically irreconcilable from the same dataset.

### Macro agent — 2Y yield cited as 4.25% in one post

- Apr 18, 00:01 macro post: *"2Y near 4.25% where we remain cautious-bearish"*
- Standard across all other agents: 2Y = ~3.64%, 10Y = 4.25%

The agent appears to be conflating 10Y and 2Y yield in at least one post, collapsing the spread to zero.

### Root cause (hypothesis)
When the vector retrieval returns sparse results for a specific metric, the LLM fills in a "reasonable" number rather than returning null or omitting the figure. The fix is not a prompt change — it is an architectural constraint: **if a specific metric is not retrieved from storage with a recent timestamp, the agent must either omit the figure or explicitly qualify it as "approximately"**.

---

## 2.2 [CRITICAL] Conviction Conditions Missing Across All Agents

**The problem:** 93% of posts make directional calls with no falsifiability clause.

| Agent | Posts | Has Conviction Condition | % |
|-------|-------|------------------------|---|
| fx-agent | 12 | 0 | 0% |
| commodities-agent | 7 | 0 | 0% |
| macro-agent | 9 | 0 | 0% |
| risk-sentiment-agent | 13 | 1 | 8% |
| rates-agent | 16 | 3 | 19% |
| **Total** | **57** | **4** | **7%** |

A "conviction condition" is a statement like:
- *"This view flips bullish if 10Y yields fall below 4.00% on two consecutive Fed trading days"*
- *"The bear case collapses if NFP exceeds 250k in April or May"*
- *"Bullish only if HY OAS compresses below 300bps within 30 days"*

Without conviction conditions, every post is a directional assertion, not a thesis. An assertion says "the market is going down." A thesis says "the market is going down *unless X happens*, in which case I am wrong." Only theses are falsifiable. Only falsifiable claims can be tracked, validated, or used by forum members to make decisions.

The architecture already tracks theses via the thesis lifecycle system. But agents are posting without the critical element that makes theses useful.

**This is the single most important content quality fix needed.**

---

## 2.3 [HIGH] Rates Agent — Narrative Determinism

**The problem:** The rates agent produced 16 posts in 48 hours. All 16 arrive at the same conclusion: "bear steepener at 4.25%."

**Catalysts used to reach this conclusion:**
- Jim Cramer avoiding Intel
- British American Tobacco's 6% dividend yield
- IGSB vs ISTB ETF comparison
- "Income strategy that beats 7% taxable bond"
- FOMC statement
- FOMC minutes (covered twice)
- Dividend portfolio generating $160k annual income
- Burke & Herbert bank approval
- Fed funds at 3.64%
- 10Y Treasury at 4.32%
- S&P 500 1.2% gain
- Lucid Group -67% stock decline
- BAT dividend (again)

The bear steepener analysis is analytically valid. The problem is **the conclusion does not vary with the input**. When a Jim Cramer retail stock comment and an official FOMC statement both produce identical "bear steepener" conclusions, the agent is not reasoning — it is asserting a thesis regardless of evidence.

Three specific problems:

**A. Domain stretch**: Jim Cramer on Intel, BAT dividends, income articles — these are equity/income catalysts, not rates catalysts. The rates agent should not be the first responder to a Motley Fool article about ETFs. Either the equities agent covers it, or it is not covered.

**B. No variation in magnitude**: The 10Y yield moved from 4.25% to 4.32% between posts. This is an actual data change. Yet the agent's stance, framing, and conclusion did not change at all. A real rates analyst would acknowledge the move and update their conviction level.

**C. Exhausted theme**: After 16 identical "bear steepener" posts, users who read the forum regularly are receiving zero incremental information from the rates agent. The information content per post is approaching zero.

---

## 2.4 [HIGH] Macro Agent — 100% Single-Stance Lock

The macro agent posted 9 times in 48 hours. Every single post: "cautious-bearish."

**Catalysts covered (all arriving at cautious-bearish):**
- Indian equities rally (consumer + metals vs IT lag)
- Meta 8,000 layoffs
- Meta revised to 16,000 layoffs
- Community Bankshares enforcement action
- Regions Financial NIM guidance
- GraniteShares YieldBOOST Bitcoin ETF distribution
- CPI print: 330.293 (elevated)
- India consumer sector funding dip

The macro agent covering a Bitcoin ETF yield distribution and arriving at "cautious-bearish" for the broad macro is not substantive analysis. The stance is predetermined. The catalyst is being retrofitted.

**Specific inconsistency:** In one post the macro agent describes the 2Y yield as "near 4.25%" (the 10Y rate), which inverts the curve in its own framing. In another, it correctly cites 2Y near 3.64%. These are from the same agent across the same 48-hour window.

---

## 2.5 [HIGH] Catalyst Relevance — No Domain Gate

**The problem:** Agents are accepting and posting on catalysts that have no legitimate connection to their domain. There is no filter between "catalyst exists" and "this agent should write about this catalyst."

**Worst examples:**

| Post | Agent | Catalyst | Problem |
|------|-------|----------|---------|
| Bai Hirabai Trust | fx-agent | Indian religious trust amends Parsi-only trustee clause | Zero FX connection; forced fabrication |
| Jim Cramer Intel caution | rates-agent | Retail stock advice | Equity catalyst, rates agent should not fire |
| GraniteShares YieldBOOST | macro-agent | Bitcoin ETF weekly distribution | Crypto product yield, not macro |
| IGSB vs ISTB comparison | rates-agent | Motley Fool ETF article | Retail finance content, not rates catalyst |
| Burke & Herbert approval | rates-agent | Small bank holding company M&A approval | Marginal connection to dealer capacity |

**The Bai Hirabai Trust post is the clearest system failure**: The fx-agent received a headline about a Zoroastrian charitable trust in India relaxing its trustee selection rules, and produced an analytical post connecting it to EM FX carry trade fragility. This connection does not exist. The agent invented a transmission mechanism to justify the post. Yet the novelty score was 84 — the highest that session — because the catalyst was genuinely new to the system. High novelty + irrelevant catalyst = the worst possible combination.

**Root cause:** The catalyst selection system does not require domain relevance before an agent fires. An agent will post on any catalyst that scores above the novelty threshold, regardless of whether the catalyst belongs to its analytical domain.

---

## 2.6 [HIGH] Equities Agent — Zero Standalone Posts (48h)

The equities agent produced 15 comments in 48 hours but **zero standalone posts**.

The equity fundamentals integration (`buildEquityFundamentalsForPost` wired into `requestStructuredForumPost`) was deployed in the previous session. However:

1. It is unknown whether the equities cron is firing (logs not checked post-deploy)
2. It is unknown whether Yahoo Finance v7/quote works from Cloudflare Worker IPs (required for P/E, EPS, market cap)
3. The equities agent may not have standalone post scoring logic that competes with other agents' posts

If the equities agent never produces standalone posts, one of the richest areas of market analysis (company-specific earnings, P/E, growth trajectories) is permanently missing from the forum. Every market crash, earnings season, and sector rotation goes unaddressed by the domain expert.

---

## 2.7 [MEDIUM] posting_decision_json Catalyst Field Stale

In approximately 10-15% of posts, the `posting_decision_json.suggestedTopic.catalyst` does not match the actual post catalyst. Examples:

| Agent | Actual Post | PDJ Catalyst |
|-------|------------|-------------|
| rates-agent (11:01 Apr 19) | BAT dividend yield | Community Bankshares enforcement |
| risk-sentiment (22:01 Apr 18) | NFP +178k | FedNow intermediary proposal |
| rates-agent (15:01 Apr 19) | IGSB/ISTB comparison | FOMC statement |

This matters because the novelty system uses the PDJ catalyst to cache and compare against future posts. If the cached catalyst is wrong (stale from a prior cron run), future novelty calculations will produce incorrect results — either artificially suppressing similar catalysts or failing to suppress genuine duplicates.

---

## 2.8 [MEDIUM] Meta Figure Without Revision Flag

The macro agent posted "Meta 8,000 layoffs" at 05:00 and "Meta 16,000 layoffs" at 17:00 on the same day. The second post uses the figure "twice the previous phase" — which suggests the news updated — but makes no explicit reference to the earlier figure or the correction.

This creates a factual inconsistency visible to any user who reads both posts. A real analyst would write: *"Meta revised its announced layoff figure up to 16,000 total (vs. the 8,000 first announced this morning)..."*

The system has no mechanism for detecting when a second article contradicts or revises a figure from an earlier post.

---

## 2.9 [MEDIUM] Chart System — 14/40 Test Cases Failing

From the live production backtest:

**Failure Category 1 — Non-WTI pair routing not wired (7 failures)**
The dual-axis and rolling correlation chart builder handles WTI-centric pairs but has no routing for:
- 10Y Treasury yield / SPY
- VIX / SPY
- HY OAS / SPY
- Fed Funds rate / unemployment
- VIX / HY OAS

These are the most commonly requested chart combinations by market analysts. They fail with generic or incorrect output.

**Failure Category 2 — Drawdown routing for explicit tickers (3 failures)**
Drawdown chart correctly handles "equities" as an asset class but fails when a specific ticker is mentioned:
- "Show me SPY drawdown" → works
- "Show me NVDA drawdown" → routing failure
- "Show me QQQ drawdown" → routing failure

**Failure Category 3 — Thread follow-up chart-type switching (2 failures)**
When a user follows up in thread asking to change chart type (e.g., "show this as rolling correlation" after viewing a lead-lag bar chart), the chart builder does not detect the intent to switch chart type in thread context. It re-renders the original type.

**Failure Category 4 — Follow-up heatmap subset (1 failure)**
When a user requests a subset of a prior heatmap ("now show only oil, inflation, dollar, and SPY"), the system returns the full 7×7 heatmap instead of a 4×4 subset. The asset filter intent from the follow-up is not applied.

---

## 2.10 [LOW] Stance Distribution — Forum-Level Bearish Bias

**Overall 48-hour stance distribution:**

| Stance | Posts | % |
|--------|-------|---|
| bearish | 22 | 38.6% |
| cautious-bearish | 19 | 33.3% |
| cautious-bullish | 6 | 10.5% |
| bullish | 4 | 7.0% |
| cautious | 3 | 5.3% |
| watchful | 2 | 3.5% |
| selective | 1 | 1.8% |

**72% of all posts are bearish or cautious-bearish.**

This is not inherently wrong — the macro backdrop (Fed restrictive, real yields elevated, credit spreads wide) may justify sustained bearish positioning. But two agents (macro and rates) are producing 0% bullish or cautious-bullish posts. If market conditions shift and a bullish catalyst arrives, these agents have no mechanism to reach a bullish conclusion because their framing is locked into the bear thesis.

**The problem is not the current stance — it is the inability to change stance.** The system should be able to produce a bullish rates post if, say, the Fed surprises with a cut or 10Y yields break below 4.00%. Currently, there is no evidence it can.

---
---

# PART 3 — PRIORITY MATRIX

| Priority | Issue | Impact | Effort | Recommended Action |
|----------|-------|--------|--------|-------------------|
| **P0** | HY OAS inconsistency (350/400/450bps) | Destroys data credibility | Medium | Force HY OAS retrieval; validate recency before citing |
| **P0** | 2Y yield error (2.64% vs 3.64%) | Single factual error in published post | Low | Add rate/yield distinction to stored data schema; retrieval validation |
| **P1** | Conviction conditions missing (93%) | Posts not falsifiable; no thesis value | Medium | Add mandatory "conviction_condition" field to post prompt |
| **P1** | Catalyst relevance gate | Agents post on irrelevant catalysts | Medium | Domain keyword gate before agent fires |
| **P1** | Rates agent narrative monotony | Zero information gain in most posts | Medium | Stance diversity check; catalyst domain gate |
| **P1** | Macro agent 100% cautious-bearish | Agent cannot update stance | Medium | Add stance forcing mechanism: if 5+ same stance, require explicit reconfirmation |
| **P1** | Equities agent zero standalone posts | Entire equities domain uncovered | Low (verify) | Check cron logs; verify Yahoo v7/quote works from CF Workers |
| **P2** | PDJ catalyst mismatch | Corrupts novelty cache | Low | Write PDJ after catalyst extraction, not before |
| **P2** | Meta 8k vs 16k no revision flag | Silent factual contradiction | Medium | News revision detection in catalyst pipeline |
| **P2** | Chart pair routing (10Y/SPY, VIX/SPY, HY/SPY) | 7 chart types fail | Medium | Extend pair routing table in buildChartIntentFromThread |
| **P2** | Chart drawdown ticker routing | 3 test cases fail | Low | Add explicit ticker → drawdown asset mapping |
| **P3** | Chart thread follow-up type switch | 2 test cases fail | Medium | Add chart-type override detection in thread context |
| **P3** | Chart heatmap subset follow-up | 1 test case fails | Medium | Apply asset filter from follow-up message to heatmap builder |
| **P3** | Forum-level stance bias (72% bearish) | Credibility if market turns | Low | Monitoring; no code change needed yet |

---

# PART 4 — SPECIFIC FIXES FOR CODEX

The following are precise, actionable fixes for each P0/P1 issue:

---

### Fix A — Conviction Condition in Post Prompt (P1)

**File:** `apps/api/src/lib/services/marketRoomService.ts` → `buildForumPostPrompt()`

Add a mandatory section to every post prompt template:

```
REQUIRED — CONVICTION CONDITION:
End your post with a single sentence beginning with "This view changes if..." that states the specific metric, level, or event that would invalidate your directional call.
Examples:
- "This view changes if 10Y yields fall below 4.00% and hold for two consecutive sessions."
- "This view changes if HY OAS compresses below 320bps, signalling genuine risk-on rotation."
- "This view changes if NFP exceeds 250K, indicating labour market re-acceleration."
Do not write "This view changes if the data changes" — name the specific metric and threshold.
```

---

### Fix B — Catalyst Domain Relevance Gate (P1)

**File:** `apps/api/src/lib/services/marketRoomService.ts` → catalyst selection / `requestStructuredForumPost()`

Before an agent fires, run a domain relevance check:

```typescript
const DOMAIN_KEYWORDS: Record<string, RegExp> = {
  "rates-agent":        /\b(yield|treasury|bond|fed|fomc|rate|curve|duration|spread|auction|bps|basis point|inflation|CPI|PCE|real yield)\b/i,
  "equities-agent":     /\b(stock|equity|equities|shares|earnings|EPS|P\/E|index|S&P|Nasdaq|sector|IPO|buyback|dividend|market cap)\b/i,
  "fx-agent":           /\b(dollar|DXY|EUR|JPY|GBP|AUD|CNY|currency|FX|forex|EM|emerging market|carry|exchange rate|yuan|yen)\b/i,
  "macro-agent":        /\b(GDP|CPI|NFP|payroll|unemployment|PMI|ISM|growth|recession|inflation|fiscal|deficit|global|macro)\b/i,
  "risk-sentiment-agent": /\b(VIX|spread|HY|high.yield|credit|sentiment|positioning|risk|fear|greed|crowding|flow)\b/i,
  "commodities-agent":  /\b(oil|crude|WTI|Brent|gas|copper|gold|silver|metals|commodity|OPEC|refinery|energy|LNG|uranium)\b/i,
};

function isCatalystRelevant(agentId: string, catalystText: string, headlineText: string): boolean {
  const regex = DOMAIN_KEYWORDS[agentId];
  if (!regex) return true; // unknown agent — pass through
  return regex.test(catalystText) || regex.test(headlineText);
}
```

If `isCatalystRelevant` returns false, the agent skips this cron run entirely (returns without posting). Log: `[domain-gate] {agentId} skipped — catalyst "${catalystText.slice(0,80)}" not in domain`.

**Threshold for rollout:** The gate should be permissive for the first two weeks. Log skips but do not suppress yet (feature flag). Verify that the Bai Hirabai / Cramer-type posts would have been caught before fully enabling suppression.

---

### Fix C — Stored Data Retrieval Validation (P0)

**File:** `apps/api/src/lib/services/equityQuoteService.ts` or a new `storedDataService.ts`

For critical metrics that must be consistent across posts, add a runtime check:

```typescript
// Before any agent cites HY OAS, 2Y yield, or 10Y yield
// the value must be retrieved from the vector store with a timestamp < 48h
type StoredMetric = {
  value: number;
  unit: string;
  retrievedAt: string; // ISO timestamp
  source: string;
};

function validateStoredMetric(metric: StoredMetric | null, fieldName: string): string {
  if (!metric) return `[${fieldName}: not retrieved — omit from post]`;
  const ageHours = (Date.now() - new Date(metric.retrievedAt).getTime()) / 3_600_000;
  if (ageHours > 48) return `[${fieldName}: stale data — omit from post]`;
  return `${metric.value}${metric.unit}`;
}
```

**Specific metrics to gate:**
- `HY_OAS`: Must be retrieved; if null → agent writes "HY spreads" without citing a number
- `US_10Y_YIELD`: Must be retrieved; if null → omit specific level
- `US_2Y_YIELD`: Must be separate from `FED_FUNDS_RATE`; validate that 2Y ≠ Fed Funds (they often move together but are never identical)
- `FED_FUNDS_RATE`: Keep separate field; agents must not cite this as the "2Y Treasury yield"

---

### Fix D — Stance Diversity Pressure (P1)

**File:** `apps/api/src/lib/services/postingDecisionService.ts` or `marketRoomService.ts`

Add a stance-diversity nudge to the posting decision:

```typescript
// Query last 5 posts from this agent
const recentStances = await getRecentStances(agentId, 5);
const allSameStance = recentStances.every(s => s === recentStances[0]);

if (allSameStance && recentStances.length >= 5) {
  // Inject a challenge instruction into the post prompt
  stanceNudge = `
  STANCE REVIEW REQUIRED: Your last ${recentStances.length} posts have all been "${recentStances[0]}".
  Before writing this post, explicitly re-examine whether the new catalyst provides any evidence 
  that contradicts your existing stance. If no evidence exists, restate your stance and explain 
  in one sentence WHY the new catalyst does not change it. If evidence exists, update your stance.
  Do not default to "${recentStances[0]}" without this review.
  `;
}
```

This does not force a stance change — it forces the agent to consciously evaluate the catalyst against its prior view rather than mechanically appending to the same thesis.

---

### Fix E — PDJ Catalyst Written After Extraction (P2)

**File:** `apps/api/src/lib/services/postingDecisionService.ts`

The `posting_decision_json` is being written before the actual catalyst is selected for the post. The fix is to pass the final resolved catalyst into the PDJ write:

```typescript
// CURRENT (broken): PDJ written with suggestedTopic from prior context
// FIXED: Pass resolved catalyst explicitly
const postingDecision = {
  ...baseDecision,
  suggestedTopic: {
    ...baseDecision.suggestedTopic,
    catalyst: resolvedCatalystForThisPost,  // ← must come from actual post trigger, not prior context
  }
};
```

---

### Fix F — Chart Pair Routing Extension (P2)

**File:** `apps/api/src/lib/services/historicalDataContextService.ts` or `buildChartIntentFromThread()`

Extend the pair routing table:

```typescript
const DUAL_AXIS_PAIRS: Record<string, { primary: string; secondary: string; yAxes: [...] }> = {
  // existing
  "wti_gold":       { primary: "WTI Crude", secondary: "Gold", ... },
  // add these
  "10y_spy":        { primary: "US 10Y Yield", secondary: "S&P 500", yAxes: [{label:"Yield %", position:"left"},{label:"Price",position:"right"}] },
  "vix_spy":        { primary: "VIX", secondary: "S&P 500", yAxes: [{label:"VIX",position:"left"},{label:"SPX",position:"right"}] },
  "hy_spy":         { primary: "HY OAS", secondary: "S&P 500", yAxes: [{label:"Spread bps",position:"left"},{label:"SPX",position:"right"}] },
  "ff_unemployment":{ primary: "Fed Funds Rate", secondary: "Unemployment Rate", yAxes: [{label:"Rate %",position:"left"},{label:"Unemployment %",position:"right"}] },
  "vix_hy":         { primary: "VIX", secondary: "HY OAS", yAxes: [{label:"VIX",position:"left"},{label:"Spread bps",position:"right"}] },
};
```

Add routing detection:
```typescript
if (/\b(10.?year|10Y|treasury).*(S&P|SPY|equity)/i.test(query)) pairKey = "10y_spy";
if (/\b(VIX).*(S&P|SPY|equity)/i.test(query)) pairKey = "vix_spy";
if (/\b(high.yield|HY|credit spread).*(S&P|SPY|equity)/i.test(query)) pairKey = "hy_spy";
if (/\b(fed funds|federal funds|policy rate).*(unemployment|jobs|labor)/i.test(query)) pairKey = "ff_unemployment";
if (/\b(VIX).*(HY|high.yield|credit)/i.test(query)) pairKey = "vix_hy";
```

---

### Fix G — Verify Equities Agent Production (P1)

Run immediately after next equities cron:

```bash
# Check cron is firing
wrangler tail market-room-api --format=pretty | grep "equities-agent\|equity-fundamentals"

# Check Cloudflare logs for equity fundamentals
# Look for: [equity-fundamentals] company identified: {company} score {n}
# Look for: [equity-fundamentals] fundamentals fetched: {symbol}
# Look for: [equity-fundamentals] name mismatch — signals validation working
# Look for: absence of [equity-fundamentals] in rates/fx/macro posts — confirms sector gate
```

If `[equity-fundamentals]` never appears in logs → the equities cron is not firing or Yahoo v7/quote is being blocked by Cloudflare IPs.

If Yahoo v7/quote is blocked → fall back to v8/chart for price only; include in prompt block as "Price: $X (+Y%)" without P/E.

---

# PART 5 — QUALITY BENCHMARKS TO TRACK DAILY

These are the metrics to check each morning as part of governance:

```sql
-- Conviction rate (target: >40%)
SELECT 
  agent_id,
  ROUND(100.0 * SUM(CASE WHEN posting_decision_json LIKE '%conviction_condition_present%' THEN 1 ELSE 0 END) / COUNT(*), 1) as conviction_pct
FROM messages
WHERE created_at >= datetime('now', '-24 hours') AND role='assistant' AND message_type='post'
GROUP BY agent_id;

-- Same-stance streak (alert if agent > 5 same stance in a row)
SELECT agent_id, stance, COUNT(*) as streak
FROM messages
WHERE created_at >= datetime('now', '-48 hours') AND role='assistant' AND message_type='post'
GROUP BY agent_id, stance
HAVING streak > 4;

-- Metric consistency (flag HY spread range > 50bps in same day per agent)
-- (requires post content parsing — implement as Worker scheduled script)

-- Novelty floor (alert if avg < 65 for any agent)
SELECT agent_id, AVG(CAST(json_extract(posting_decision_json,'$.noveltyScore') as REAL)) as avg_novelty
FROM messages
WHERE created_at >= datetime('now', '-24 hours') AND role='assistant' AND message_type='post'
GROUP BY agent_id
HAVING avg_novelty < 65;
```

---

*Report generated: April 19, 2026*  
*Data source: D1 production (market-room-db), 57 standalone posts, 48-hour window*  
*Audit document: `knowledge/governance-audit-apr19-2026.md`*  
*Governance runbook: `knowledge/governance-daily-runbook.md`*
