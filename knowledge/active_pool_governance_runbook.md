# Active Pool Governance Runbook

**Date:** 2026-04-11  
**Scope:** retrieval-time active-pool governance for approved knowledge docs.  
**Constraint:** no vectors, no schema changes, no admin workflow changes.

## 1. Files Changed

Code:

- `apps/api/src/lib/services/knowledgeSnippetService.ts`

Docs:

- `knowledge/active_pool_governance_plan.md`
- `knowledge/active_pool_governance_runbook.md`
- `knowledge/active_pool_governance_checkpoint.md`

## 2. Governance Logic Added

The retrieval scorer now classifies every approved knowledge doc into one of three tiers:

- `active`
- `fallback`
- `legacy`

This is computed at retrieval time from title and filename patterns. No database fields were added.

### Active docs

Active docs are the curated Wave 1 / Wave 2 internal knowledge docs.

Typical signal:

- non-processed `.md` filename
- not a starter-pack / public-report / census / watchlist family

Examples:

- `Inflation Transmission Mechanisms`
- `Fed Repricing Playbook`
- `Oil Supply-Demand and Inventory Framework`
- `Carry and Rate Differential Framework`
- `Positioning and Crowding Framework`
- `Equity Regime Framework: Rates, Growth, Liquidity, Earnings`

Behavior:

- no governance penalty
- allowed to occupy all prompt slots

### Fallback docs

Fallback docs are broad auxiliary docs that may still be useful when no sharper Wave doc matches.

Patterns:

- `census-retail`
- `census retail`
- `retail spending`
- `watchlist`
- `historical regime anchors`
- `breadth and sector rotation framework`
- other `.processed.md` docs not classified as legacy

Behavior:

- scored, but demoted:
  - high-specificity query: `-governance-fallback:12`
  - medium-specificity query: `-governance-fallback:7`
  - broad query: `-governance-fallback:2`
- skipped after two active docs have already matched unless the fallback is clearly stronger

### Legacy docs

Legacy docs are broad starter / public-report docs that should almost never beat curated Wave docs.

Patterns:

- `historical-starter-pack`
- `historical starter`
- `historical foundation`
- `public-report-starter-pack`
- `public report starter`
- `public report pack`
- `durable memory`
- `long-term memory`

Behavior:

- scored, but strongly demoted:
  - high-specificity query: `-governance-legacy:22`
  - medium-specificity query: `-governance-legacy:14`
  - broad query: `-governance-legacy:6`
- skipped after two active docs have already matched unless the legacy doc is clearly stronger

## 3. Selection Changes

The selection pass now applies governance after source-family dedupe:

- if two active docs are already selected, a legacy doc is skipped unless it beats the second active doc by more than `8` points
- if two active docs are already selected, a fallback doc is skipped unless it beats the second active doc by more than `3` points
- the older late-slot fallback rule remains as a backstop after three selected docs

Skip reasons:

- `governance-legacy-after-active`
- `governance-fallback-after-active`
- `fallback-after-sharp-top-three`

This preserves fallback availability while preventing broad docs from filling prompt slots once the active Wave docs already provide enough context.

## 4. Logs To Inspect

Scored-doc logs now include governance tier:

```text
[knowledge:Macro Agent]   score=42.0 base=50.0 tier=legacy cat=foundations excerpt=... adj=-governance-legacy:22,...
```

Active docs:

```text
tier=active
```

Fallback docs:

```text
tier=fallback adj=-governance-fallback:12
```

Legacy docs:

```text
tier=legacy adj=-governance-legacy:22
```

Suppressed docs:

```text
[knowledge:Equities Agent] skipped fallback title="Census Retail Industry Pack — Frameworks for Equities Analysts" reason=governance-fallback-after-active score=...
```

## 5. How To Validate Improvement

Run prompts where Wave docs should dominate:

- Macro labor deterioration
- Macro sticky inflation
- Rates term premium
- Commodities inventory / curve / OPEC
- FX funding / divergence
- Risk/Sentiment positioning / risk-off
- Equities earnings quality / sector rotation / regime

Check:

- top-3 contains active docs only on specific prompts
- skipped logs show fallback / legacy suppression
- no intended Wave doc falls out of top-3
- broad docs still appear in logs with scores, just not injected when active docs are sufficient

## 6. Validation Command Used

Typecheck and dry-run deploy passed:

```text
npm run check --workspace @market-room/api
```

Focused checkpoint:

- local dev API: `127.0.0.1:8798`
- 15 prompt set
- routing observed via Ask Market
- retrieval scored against current approved D1 pool

## 7. What Still Remains Unresolved

This pass does not remove broad docs from the database.

Still unresolved:

- active pool still physically contains duplicate processed starter packs
- admin has no explicit `active/fallback/legacy` field
- broad questions may still legitimately use fallback docs
- strict top-1 can still be ambiguous among active docs when a query spans multiple mechanisms

Those are acceptable for this phase.

## 8. Vector Decision

Vectors remain **NO-GO**.

This pass again showed that the problem was not semantic candidate discovery. It was approved-pool governance.

