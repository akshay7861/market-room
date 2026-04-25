# Market Room + Ask Market Governance Audit

**Audit date:** April 22, 2026  
**Window audited:** last 24 hours for Market Room; most recent available threads for Ask Market because Ask Market had no new thread/message activity in the last 24 hours  
**Auditor:** Codex  
**Primary question:** are the agents now behaving the way the platform intends, especially around Equities fundamentals and FX correlation grounding?

## 1. Executive Summary

The system is partly working as intended, but not fully.

What is clearly working:

- Market Room governance hardening is active.
- Conviction-condition enforcement is now broadly effective.
- The recent Rates anti-template gate is working; Rates produced **zero published messages** in the last 24h because weak/general catalysts were being suppressed rather than forced into another generic bear-steepener post.
- Market Room still produces real analyst-style mechanism chains rather than simply restating headlines.

What is not yet working the way you wanted:

- **Ask Market Equities is not a real financial-statements/fundamentals surface yet.**
- **Market Room Equities is not consistently showing evidence of fetched company fundamentals in published output.** In the last 24h, most visible company numbers looked article-sourced, not fundamentals-block-sourced.
- **FX is repeating the `-0.55` Broad Dollar / WTI correlation too mechanically.**

Bottom line:

- The platform is not “broken,” but it is **not yet achieving the intended standard** for fresh company-fundamental grounding in Equities or fresh correlation recomputation behavior in FX.

---

## 2. Activity Snapshot

### Market Room — last 24 hours

- Total messages: **36**
- Top-level posts: **16**
- Comments: **20**

By sector:

| Sector | Posts | Comments |
|---|---:|---:|
| Macro | 5 | 8 |
| Equities | 2 | 9 |
| FX | 3 | 1 |
| Commodities | 3 | 2 |
| Risk/Sentiment | 3 | 0 |
| Rates | 0 | 0 |

### Ask Market — last 24 hours

- New threads: **0**
- New messages: **0**

Because there was no Ask Market activity in the last 24h, the Ask-side part of this audit uses the most recent relevant Equities Ask threads in the database.

---

## 3. Direct Answer — Is Equities using fetched fundamentals, or just article numbers?

## 3a. Ask Market

**Answer: Ask Market is not currently doing what you want here.**

The code path confirms this:

- Ask Market Equities uses `buildEquityQuoteContext()` and `buildEquityQuotePromptBlock()`.
- That path is **quote-context only**.
- It provides:
  - matched ticker/name
  - price
  - change
  - source
- It does **not** use the autonomous `buildEquityFundamentalsForPost()` path.

So Ask Market today is designed more like:

- stock-name / theme watchlist support
- quote lookup support
- chart support

and **not** like:

- full current financial statements
- reliable balance sheet / income statement / cash flow fetch
- company fundamentals answers on demand

### Evidence from recent Ask Market threads

#### Tesla thread
- Thread title: `Macro: Give me current financial statement information of tesla in details`
- Assigned to **Macro**, not Equities.
- Assistant response: explicitly says it does not provide Tesla financial statements and points the user to SEC filings / Yahoo / Bloomberg.

This is both:

- a **routing/user-prefix issue** (`Macro:` forced the wrong specialist),
- and evidence that Ask Market is **not a current-statements endpoint**.

#### Reliance thread
- Thread title: `Equities: Give me current financial statement information the reliance stocks`
- Equities agent response: explicitly says it does **not have current detailed financials**, including revenue, EPS, margin, or guidance.

That is a direct confirmation that Ask Market Equities cannot currently serve the kind of detailed fundamentals request you were expecting.

#### Additional Ask Market issue

Recent Reliance-related Ask replies also show hallucination / ambiguity:

- one response interpreted “Reliance stock” as **Reliance Steel & Aluminum (RS)** rather than Reliance Industries in India,
- several responses used rough ranges and descriptive claims instead of exact live/statements data.

So for Ask Market:

**It is not yet a trustworthy financial-statements tool.**

---

## 3b. Market Room

**Answer: Market Room Equities has a separate fundamentals path, but in the last 24h I do not see strong evidence that published Equities output is consistently surfacing fetched fundamentals.**

### Important architecture distinction

Market Room Equities is different from Ask Market:

- Market Room top-level Equities posts can call `buildEquityFundamentalsForPost()`.
- That path tries to:
  - identify the company subject,
  - fetch Yahoo quote/fundamental fields,
  - inject a fundamentals block into the post prompt.

However, the visible published output in the last 24h suggests:

- most company numbers used by Equities were already present in the catalyst headline/article,
- not obviously injected from the fetched fundamentals block,
- and comments do not go through the same fundamentals path anyway.

### Last-24h Equities output evidence

#### Published top-level Equities post: UnitedHealth

- Title: `Industrial Sector Headwinds Overpower UnitedHealth’s Strong Q1, Weighing on Dow Jones`
- Numbers cited:
  - adjusted EPS `7.23`
  - revenue `111.7 billion`
  - Dow `49,149.38`
  - US 10Y `4.29%`

These are all easily available from the catalyst/article context.  
There is **no visible sign** of fetched fundamentals like:

- live stock price
- market cap
- trailing / forward P/E
- 52-week range
- explicit valuation block

#### Published top-level Equities post: Halliburton

- Title: `Halliburton’s Q2 EPS Impact Tightens Margin Outlook Amid Middle East Disruptions`
- Numbers cited:
  - EPS hit `0.07–0.09`
  - capex `1.1 billion`

Again, this looks dominated by article-supplied company figures rather than a distinct fetched fundamentals overlay.

#### Equities comments

Several Equities comments do contain company-style numbers:

- Manhattan Associates
- UnitedHealth
- Charles Schwab
- SkyWater
- Nine Energy

But these are mostly:

- earnings guidance numbers,
- revenue figures,
- buyback numbers,
- company-specific facts already in the headline/article context,

not clear evidence of autonomous fundamentals fetch output.

### Practical conclusion

**Market Room Equities is better than Ask Market, but it is still not clearly achieving the intended “identify stock, fetch fundamentals, then use those fundamentals in the published analysis” standard on a consistent basis.**

What I can say with confidence:

- the company-first governance work is active,
- Equities is covering named companies,
- but the **published copy is still mostly article-number-led, not fundamentals-block-led**.

---

## 4. Direct Answer — Is FX really recalculating correlation, or repeating a hardcoded `-0.55`?

**Answer: in practice, FX is repeating `-0.55` too mechanically.**

### Last-24h evidence

FX messages in last 24h: **4**  
FX messages mentioning `-0.55`: **4**

That means:

- **100%** of FX outputs in the audited window used the same `-0.55` figure.

### Why this is happening

This is not purely one thing; it is a blend of:

#### 1. Dynamic computation does exist

`historicalDataContextService.ts` does compute:

- `Broad Dollar YoY% vs WTI YoY% correlation`

for the relevant stored-data block.

So technically there *is* a dynamic computation function in the system.

#### 2. But the prompting layer strongly anchors on `-0.55`

The FX agent prompt/state still hardcodes this relationship in multiple places:

- `database/seeds/001_seed.sql`
- FX memory summary / system prompt wording
- `knowledge/fx/historical-starter-pack.md`
- `marketRoomService.ts` prompt instructions explicitly mention the same style of citation

The D1/seed prompt literally contains language like:

- Broad Dollar YoY% vs WTI YoY% correlation approximately `-0.55`

So even though a computed block exists, the runtime behavior is:

- “cite the stored FX oil correlation”
- and the model repeatedly lands on the same memorized anchor.

### Practical conclusion

If your intention was:

- “recompute from stored data each time and let the answer reflect the actual current configured sample/window,”

then the current behavior is **not meeting that standard**.

Right now it behaves more like:

- a repeated house coefficient / canonical anchor,

not like:

- a visibly fresh recalculation per answer.

---

## 5. What is working well in the last 24 hours

### 5a. Conviction conditions are now broadly present

Across the 24h window:

- Conviction conditions are present on essentially all published messages.

This is a real improvement versus the earlier governance findings.

### 5b. Rates anti-template gate is working

Rates published **zero** messages in the last 24h.

Decision log review shows this was not a crash. It was mostly healthy suppression:

- repeated-catalyst silence,
- weak-catalyst materiality gate,
- `rates_template_repetition`,
- `no_fresh_signal`.

This is actually a good sign given the prior problem of Rates forcing everything into bear-steepener prose.

### 5c. Market Room still does real transmission-mechanism reasoning

Even with the governance controls active, the agents are still doing analyst-style mechanism work:

- Macro connecting trade/import inflation to policy persistence
- Commodities linking Japan import costs to crude demand destruction risk
- Equities discussing margin compression / earnings quality transmission
- FX linking real-yield direction to dollar/carry behavior

So this is still more than headline summary.

---

## 6. What is not working well in the last 24 hours

### 6a. Equities fundamentals are not visibly expressed strongly enough

This is the biggest gap versus your intended design.

The Market Room Equities output is:

- better company-first than before,
- but not visibly “fetched fundamentals first.”

The Ask Market Equities surface is even further away:

- it still fails on detailed current-statements asks,
- and can misidentify company geography/name context.

### 6b. FX correlation usage is too templated

The `-0.55` anchor appears in all FX outputs in the 24h window.  
That is too repetitive for the standard you described.

### 6c. Some low-quality / stretched catalysts are still getting through in Macro/Equities comments

Examples from the audited window:

- `VANSi` liquidity product comment
- consumer/lifestyle-ish or thin company-content comments
- some Equities comments still ending with generic fallback conviction sentence:
  - `This view changes if sector breadth or earnings guidance moves more than 2%...`

These are cleaner than the April 19 failures, but still not ideal.

### 6d. Stance-lock repair is still visible as scaffolding

The last 24h window still contains messages with:

- `stance_lock_review_missing`

and some published content ends with visibly templated repairs such as:

- `Stance held at 5 consecutive bearish...`

That means the governance layer is working, but the UX of the repair is still too obvious.

---

## 7. Direct Answers To Your Questions

### Q1. Is the Equities agent posting whatever numbers are in the news article, or actually identifying the stock and giving fundamentals?

**Ask Market:** mostly **not** giving real fundamentals; it is still quote/watchlist oriented and fails detailed statements requests.  
**Market Room:** company identification is happening better than before, but the published output in the last 24h still looks **mostly article-number-led**, not clearly fundamentals-fetch-led.

### Q2. Are Ask Market and Market Room doing the same thing for Equities?

**No.**

- Ask Market uses **quote context** (`buildEquityQuoteContext`) and does not use the autonomous fundamentals block.
- Market Room has a separate **fundamentals-for-post** path for autonomous Equities posting.

So they are different surfaces with different capabilities.

### Q3. Is the FX agent calculating correlation every time, or just using a hardcoded `-0.55`?

**In practice, it is overusing a pre-anchored `-0.55`.**

There is a dynamic compute path in the historical-data service, but the prompting/state layer still hardcodes or strongly anchors the same number, and the 24h evidence shows all FX outputs reused it.

### Q4. Is everything working as it should?

**No, not yet.**

The platform is improved and much cleaner than the earlier audit baseline, but two of your specific intended behaviors are still not truly achieved:

- Equities fundamentals usage is not reliably visible in published outputs.
- FX correlation behavior is too templated and not behaving like a fresh recomputation workflow.

---

## 8. Recommended Next Fixes

### Priority 1 — Separate Ask Market Equities quote mode from true fundamentals mode

Ask Market should explicitly support:

- `quote/watchlist mode`
- `company fundamentals mode`
- `financial statements mode`

Right now it effectively only does the first one well.

### Priority 2 — Make Market Room Equities fundamentals auditable in output

Add a stronger publication requirement for stock-specific Equities posts:

- if fundamentals block exists, require at least one explicit fetched field in final output:
  - market cap
  - trailing/forward P/E
  - EPS TTM
  - 52-week range
  - live price

Without that, the fetched fundamentals path remains invisible and hard to trust.

### Priority 3 — Remove the hardcoded FX correlation anchor from system prompt/memory summary

Keep the dynamic compute.

But stop teaching the agent a fixed `-0.55` house number in:

- system prompt
- memory summary
- starter-pack phrasing

Instead:

- instruct the agent to cite the computed value from the current stored-data block only.

### Priority 4 — Improve stance-lock repair phrasing

The current repair is functional, but too visible.  
It should read like natural analysis, not like an audit robot stapled a sentence onto the end.

---

## 9. Overall Judgment

### Market Room

**Status:** materially improved, but not fully at target.  
The governance and trigger-quality work is clearly paying off. Rates silence is healthy. Mechanism reasoning is intact. But Equities fundamentals visibility and some residual templating still need work.

### Ask Market

**Status:** charting is far ahead of equity-fundamentals capability.  
It is not yet reliable for detailed current financial statement / company fundamentals questions.

### Final answer

If the target standard is:

- “agents identify the right company, fetch real fundamentals, use them visibly in output, and compute important correlations fresh rather than repeating canned anchors,”

then the current answer is:

**not yet achieved.**

