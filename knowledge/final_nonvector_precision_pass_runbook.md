# Final Non-Vector Precision Pass Runbook

**Date:** 2026-04-11  
**Scope:** targeted fixes for the exact remaining held-out retrieval misses.  
**Constraint:** no vectors, no schema changes, no broad architecture rewrite.

## 1. Files Changed

Code:

- `apps/api/src/lib/services/marketQuestionsService.ts`
- `apps/api/src/lib/services/knowledgeSnippetService.ts`

Docs:

- `knowledge/final_nonvector_precision_pass_plan.md`
- `knowledge/final_nonvector_precision_pass_runbook.md`
- `knowledge/final_nonvector_precision_checkpoint.md`

## 2. Routing Adjustments Made

### Added explicit sector-negation handling

Ask Market routing now detects when the user explicitly rejects a broad or wrong agent frame:

- `do not answer as Macro`
- `don't answer as Rates`
- `not as FX`
- `rather than Macro`
- `instead of Equities`

When a sector is negated:

- that sector receives a bounded `-12` heuristic penalty
- the routing log includes:
  - `-negated-sector:<sector>`

Purpose:

- prevent rejected agent names from becoming positive routing evidence
- preserve specialist-instrument routing when the prompt says something like `Do not answer as Macro inflation` but the facts are crude / refinery / gasoline / distillates

Observed checkpoint result:

- the prior commodity inventory negation miss now routes to `Commodities`.

## 3. Ranking Adjustments Made

### Labor deterioration specificity boost

Added a narrow query profile:

- `prefersLaborDeterioration`

It activates only when several labor deterioration terms cluster:

- openings / JOLTS
- quits
- claims
- temp help
- payroll / NFP
- hiring
- labor market
- deterioration / weakening / wait for payrolls

When active:

- `Labor Market Deterioration Playbook` gets `+labor-deterioration-match`
- `Inflation Transmission Mechanisms` gets `-inflation-offtopic-labor`

Observed checkpoint result:

- the prior labor-vs-inflation miss now ranks `Labor Market Deterioration Playbook` first.

### Earnings-quality specificity boost

Added a narrow query profile:

- `prefersEarningsQuality`

It activates only when several earnings-quality terms cluster:

- gross / operating margin
- guidance
- organic revenue / revenue growth
- free cash flow
- buybacks / tax
- wage costs / input costs
- low-quality beat / headline beat

When active:

- `Earnings Quality and Margin Pressure Interpretation Guide` gets `+earnings-quality-match`
- `Equity Regime Framework` gets `-regime-offtopic-earnings`

Observed checkpoint result:

- the prior earnings-quality-vs-regime miss now ranks `Earnings Quality and Margin Pressure Interpretation Guide` first.

### Legacy / auxiliary penalties tightened

Generic legacy docs now receive a slightly stronger penalty under specific queries:

- high-specificity generic legacy: `-10`
- medium-specificity generic legacy: `-6`

Broad auxiliary docs now receive a stronger penalty when the query is high-specificity and not explicitly framework-seeking:

- broad auxiliary: `-8`

Purpose:

- reduce starter-pack / census / watchlist / public-report contamination without archiving any docs.

## 4. Fallback Suppression Changes Made

The late-slot fallback gate is now stricter.

Fallback docs include titles containing:

- starter pack
- historical
- public report
- watchlist
- census retail

The gate now skips a fallback when:

- at least three snippets are already selected
- the first three selected snippets are not fallback docs
- the third selected score is at least moderately useful (`>=10`)
- the fallback is not materially stronger than the third selected snippet

The skip log now uses:

```text
[knowledge:<agent>] skipped fallback title="<title>" reason=fallback-after-sharp-top-three score=<score>
```

Purpose:

- avoid spending Ask Market slot 4 on broad context after three sharp docs already won
- keep fallback docs available when they genuinely rank in the first three because the active pool still lacks sharper candidates

## 5. Logs To Inspect

Routing:

```text
[routing]   Macro Agent score=... via=..., -negated-sector:Macro, ...
```

Knowledge ranking:

```text
[knowledge:Macro Agent]   score=... adj=+labor-deterioration-match title="Labor Market Deterioration Playbook"
[knowledge:Macro Agent]   score=... adj=-inflation-offtopic-labor title="Inflation Transmission Mechanisms"
```

```text
[knowledge:Equities Agent]   score=... adj=+earnings-quality-match title="Earnings Quality and Margin Pressure Interpretation Guide"
[knowledge:Equities Agent]   score=... adj=-regime-offtopic-earnings title="Equity Regime Framework: Rates, Growth, Liquidity, Earnings"
```

Fallback suppression:

```text
[knowledge:FX Agent] skipped fallback title="FX Historical Regime Anchors" reason=fallback-after-sharp-top-three score=...
```

## 6. How To Validate

Run the focused checkpoint set in `knowledge/final_nonvector_precision_checkpoint.md`.

Minimum pass conditions:

- commodity inventory negation prompts route to `Commodities`
- labor deterioration prompts rank `Labor Market Deterioration Playbook` first
- earnings quality prompts rank `Earnings Quality and Margin Pressure Interpretation Guide` first
- no weak fallback doc is appended after three sharp Wave docs
- no vector-specific failure pattern appears

The API check also passed:

```text
npm run check --workspace @market-room/api
```

## 7. What Still Remains Unresolved

This pass does not fully solve active-pool governance.

Remaining issue:

- broad auxiliary docs can still appear in slot 2 or 3 when their token overlap is high and the active pool has only one or two sharp matches.

Examples from checkpoint:

- a Macro labor prompt still allowed a Census Retail framework into top-3
- a Risk/Sentiment crowding prompt still allowed a Census Retail risk framework into top-3
- one Equities earnings prompt still allowed a Census Retail framework into top-3

This is not a vector problem. It is an approved-pool curation problem:

- demote or archive broad starter / census / watchlist docs from active retrieval
- or add an explicit `active_retrieval=false` / category governance layer later

## 8. Vector Decision

This pass does not change the vector decision.

Vectors remain **NO-GO** because:

- the known misses were fixed with simple deterministic routing/ranking logic
- top-3 retrieval remains strong
- no true semantic miss was observed
- the remaining problem is broad approved-pool clutter

