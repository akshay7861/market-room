# Post-Cleanup Retrieval Evaluation

**Date:** 2026-04-10  
**Scope:** Evaluate the cleaned non-vector retrieval stack after Routing Phase 1 and retrieval cleanup/ranking changes  
**Method:** live `POST /api/market-questions` runs against a temporary local API on `127.0.0.1:8794`, with direct inspection of:

- `[routing]` logs
- `[knowledge:*]` logs
- `[memory-inject:*]` logs
- returned agent assignment and response previews

## 1. Evaluation Set Used

The evaluation set intentionally mixed:

- prior fragile routing cases
- Wave 1 validation prompts
- Wave 2 validation prompts
- indirect-wording probes
- cross-asset prompts that previously risked contamination

### Prompt set

| ID | Prompt family | Expected agent | Intended doc |
|---|---|---:|---|
| 1 | Rates / bond-vigilante / term premium | Rates | `Term Premium and Breakeven Interpretation Guide` |
| 2 | Macro / sticky CPI / supercore | Macro | `Inflation Transmission Mechanisms` |
| 3 | Macro / JOLTS + quits + claims | Macro | `Labor Market Deterioration Playbook` |
| 4 | Commodities / EIA draw + Cushing | Commodities | `Oil Supply-Demand and Inventory Framework` |
| 5 | Commodities / Saudi cut + Libya | Commodities | `OPEC and Geopolitical Shock Playbook` |
| 6 | FX / ECB-Fed divergence | FX | `Central-Bank Divergence Playbook` |
| 7 | FX / basis widening + swap lines | FX | `Dollar Funding Stress and Intervention Playbook` |
| 8 | Risk/Sentiment / VIX regime + HY widening | Risk/Sentiment | `Volatility Regime and Fragility Playbook` |
| 9 | Risk/Sentiment / fractured cross-asset risk-off | Risk/Sentiment | `Risk-On / Risk-Off Transmission Guide` |
| 10 | Equities / real yields + equal-weight + HY | Equities | `Equity Regime Framework: Rates, Growth, Liquidity, Earnings` |
| 11 | Equities / low-quality beat + margin pressure | Equities | `Earnings Quality and Margin Pressure Interpretation Guide` |
| 12 | FX / prior fragile payroll-Fed-dollar query | FX | `Carry and Rate Differential Framework` or `Central-Bank Divergence Playbook` |

## 2. Summary Metrics

### Routing accuracy

- **12 / 12** prompts routed to the expected specialist agent
- Most important change versus the pre-cleanup / pre-routing state:
  - the previously fragile FX divergence-style prompt routed cleanly to `FX Agent`
  - the Equities regime prompt was not swallowed by Macro or Rates despite real-yield language
  - Risk/Sentiment prompts were no longer captured by broader market-language agents

### Intended-doc top-1 rate

- **10 / 12 strict pass** = `83%`

Strict misses:

1. **Equities regime prompt**
   - `Sector Rotation and Market Leadership Playbook` and `Equity Regime Framework` tied at `149.0`
   - the playbook appeared first in the log ordering
   - this is a ranking ambiguity between two good docs, not a catastrophic miss

2. **FX prior fragile payroll/Fed query**
   - `Dollar Funding Stress and Intervention Playbook` ranked first at `103.0`
   - `Central-Bank Divergence Playbook` ranked second at `98.0`
   - `Carry and Rate Differential Framework` ranked third at `78.0`
   - this is the clearest remaining within-agent ranking miss

### Intended-doc top-3 rate

- **12 / 12** = `100%`

Even the two strict top-1 misses still had the intended doc in the top three retrieved snippets.

### Duplicate / clutter reduction

- **same-source-family duplicate injection rate: 0 / 12**

Observed improvement:

- no prompt injected multiple `historical-starter-pack.md` or `public-report-starter-pack.md` variants from the same filename family
- this was a real pre-cleanup failure mode and is now effectively fixed

### Generic legacy fallback rate

- **generic legacy or broad auxiliary fallback still appeared in the injected set on 11 / 12 prompts**

Usually this appeared in the 4th slot, not the 1st slot. That is better than before, but it shows the approved pools are still cluttered.

### Excerpt usefulness

Qualitative rating across the 12 prompts:

- **useful / mechanism-rich:** 9
- **adequate but not ideal:** 2
- **poor:** 1

The poor case was still in FX, where the funding-stress playbook surfaced a source-bullet style excerpt rather than a reasoning paragraph.

## 3. Wins After Cleanup

## Routing is no longer the main drag

This is the largest improvement from the earlier vector-readiness audit.

Observed wins:

- FX divergence prompt routed to `FX Agent` without prompt rewrite
- Risk/Sentiment vol-fragility prompt routed correctly
- Equities regime prompt routed to `Equities Agent` despite heavy rates language
- prior fragile FX payroll/Fed wording still routed to `FX Agent`

## Same-family clutter is materially lower

The selected-snippet dedupe is doing real work:

- no duplicated starter-pack family variants inside the same prompt
- prompt budget is no longer being spent on multiple processed versions of the same source file

## Query-shape-aware ranking is helping

Examples:

- Rates term-premium query:
  - `Term Premium and Breakeven Interpretation Guide` ranked first
  - `Fed Repricing Playbook` stayed relevant but second
- FX divergence query:
  - `Central-Bank Divergence Playbook` ranked first
- Risk transmission query:
  - `Risk-On / Risk-Off Transmission Guide` ranked first

## Output quality remains strong even when top-1 is imperfect

The FX prior-fragile prompt is the clearest example:

- top-1 doc was not ideal
- but the routed answer still discussed carry and rate differentials
- that suggests the system is often resilient when the right doc is at least in the top three

## 4. Remaining Failure Modes

## A. Ranking failure

This is now the main failure class.

### Example 1 — FX broad payroll/Fed query

Prompt:

`NFP +178k sustains the Fed's hawkish grip and keeps long-end yields supported. For FX, does this still argue for dollar strength via carry and rate differentials, or is that the wrong frame now?`

Observed top ranks:

1. `Dollar Funding Stress and Intervention Playbook` — `103.0`
2. `Central-Bank Divergence Playbook` — `98.0`
3. `Carry and Rate Differential Framework` — `78.0`

Classification:

- **ranking failure**
- not a routing failure
- not a true semantic gap

Diagnosis:

- the query is broad and policy-heavy
- event-playbook boosts plus broad dollar/Fed overlap still let funding-stress win too often

## B. Ranking ambiguity from overlapping sharp docs

### Example 2 — Equities regime prompt

Observed top ranks:

1. `Sector Rotation and Market Leadership Playbook` — `149.0`
2. `Equity Regime Framework: Rates, Growth, Liquidity, Earnings` — `149.0`

Classification:

- **ranking ambiguity**
- not a true miss

Diagnosis:

- the prompt mixes regime language and leadership language almost perfectly
- both docs are genuinely relevant
- ordering is unstable when both should be present

## C. Excerpt failure

### Example 3 — FX funding-stress excerpt choice

Observed excerpt:

- `Dollar Funding Stress and Intervention Playbook` surfaced a source-bullet style block beginning with NY Fed swap-line material rather than the cleanest mechanism paragraph

Classification:

- **excerpt failure**

Diagnosis:

- ranking was correct
- the selected passage was still suboptimal
- this remains a non-vector problem

## D. Pool clutter / fallback contamination

### Example 4 — broad legacy or auxiliary docs still take the 4th slot

Examples observed:

- Rates injected a `Public Report Starter Pack` fallback in the 4th slot
- Macro injected a `historical starter pack` fallback in the 4th slot
- Equities injected `TwelveData Watchlist` or `Census Retail` framework fallbacks in the 4th slot

Classification:

- **approved-pool clutter**

Diagnosis:

- dedupe fixed duplicate-family flooding
- but the long tail of broad approved docs is still large enough to occupy prompt budget

## E. Content gap

No high-confidence content-gap failure dominated this evaluation set.

That matters. The Wave 1 + Wave 2 content library is now broad enough that most targeted prompts found a sharp relevant doc.

## F. True semantic retrieval gap

No strong evidence that this is now the dominant class.

Indirect-wording prompts that still worked:

- `bond-vigilante selloff`, `Treasury supply indigestion`, `duration fatigue` → correctly surfaced `Term Premium and Breakeven Interpretation Guide`
- fractured cross-asset risk-off language → correctly surfaced `Risk-On / Risk-Off Transmission Guide`
- divergence wording around `laggard catch-up move` and `priced-in unwind` → correctly surfaced `Central-Bank Divergence Playbook`

## 5. Concrete Failure Examples By Type

| Failure type | Concrete example | Current diagnosis |
|---|---|---|
| Routing failure | None in the 12-prompt post-cleanup set | Routing improved enough that it is no longer the dominant failure in this sample |
| Ranking failure | FX payroll/Fed query ranked funding stress above carry/divergence | still real |
| Excerpt failure | FX funding-stress excerpt surfaced a source-bullet block | still real |
| Content gap | None clearly dominant in this set | currently secondary |
| True semantic retrieval gap | None clearly dominant; indirect probes mostly passed | currently secondary |

## 6. Whether True Semantic Misses Are Now Dominant

**No. They are still secondary.**

What dominates after cleanup:

1. ranking ambiguity between multiple good docs
2. residual fallback contamination from broad approved docs
3. excerpt quality inconsistency

What does **not** dominate yet:

- cases where the right doc exists but keyword/metadata retrieval cannot find it at all

The intended doc was top-3 in every prompt in this evaluation. That is not what a system looks like when semantic failure is the main bottleneck.

## 7. Recommendation

**Recommendation: stay non-vector for now.**

Why:

- routing is materially improved
- top-3 intended-doc rate is already `100%` on this mixed evaluation set
- same-family duplicate injection is now effectively solved
- the remaining misses are mostly ranking/excerpt/pool-governance problems

Vectors are not yet the cleanest next move because they would not directly solve:

- broad legacy docs occupying fallback prompt slots
- ambiguous ordering between two already-good docs
- source-bullet excerpt selection

## 8. What To Do Before Reopening Vectors

1. further reduce active-pool clutter
   - manually archive or demote redundant starter-pack and auxiliary docs
2. tighten excerpt selection again
   - especially for bullet-heavy or source-heavy sections
3. collect a larger held-out retrieval set
   - at least 40-60 prompts, not 12
4. measure actual within-agent semantic misses
   - cases where intended doc falls **outside** top-3 despite being present

If those steps still leave the system with frequent same-agent semantic misses, then vectors become easier to justify with real evidence.
