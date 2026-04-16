# Active Pool Governance Plan

**Date:** 2026-04-11  
**Scope:** lightweight governance for approved knowledge pools so broad legacy / auxiliary docs stop competing with sharper Wave docs.  
**Constraint:** no vectors, no schema overhaul, no retrieval architecture rewrite.

## 1. Approved-Pool Problems By Agent

### Macro

Primary active docs:

- `Inflation Transmission Mechanisms`
- `Labor Market Deterioration Playbook`
- `Central Bank Reaction Function Framework`

Problem docs:

- multiple `historical-starter-pack.processed.md` variants
- `public-report-starter-pack.processed.md`
- multiple `census-retail-industry-pack.processed.md` variants

Observed problem:

- Census / historical docs can still enter top-3 on labor and inflation prompts even after the sharp Wave docs win.

### Rates

Primary active docs:

- `Fed Repricing Playbook`
- `Yield Curve Mechanics and Interpretation`
- `Term Premium and Breakeven Interpretation Guide`

Problem docs:

- `historical-starter-pack.processed.md` variants
- `public-report-starter-pack.processed.md` variants

Observed problem:

- legacy public report packs still sit close enough to appear in later slots, especially on broad CPI / policy / employment wording.

### Commodities

Primary active docs:

- `Oil Supply-Demand and Inventory Framework`
- `OPEC and Geopolitical Shock Playbook`
- `Commodity Curve Shape and Physical Tightness Guide`

Problem docs:

- `historical-starter-pack.processed.md` variants
- `public-report-starter-pack.processed.md` variants

Observed problem:

- fallback docs are mostly suppressed after the final precision pass, but still remain in the candidate pool.

### FX

Primary active docs:

- `Carry and Rate Differential Framework`
- `Central-Bank Divergence Playbook`
- `Dollar Funding Stress and Intervention Playbook`

Problem docs:

- `historical-starter-pack.processed.md` variants
- `public-report-starter-pack.processed.md` variants

Observed problem:

- FX is cleaner than before, but historical regime anchors still compete in broad carry / divergence wording.

### Risk/Sentiment

Primary active docs:

- `Positioning and Crowding Framework`
- `Volatility Regime and Fragility Playbook`
- `Risk-On / Risk-Off Transmission Guide`

Problem docs:

- `historical-starter-pack.processed.md` variants
- `public-report-starter-pack.processed.md` variants
- `census-retail-industry-pack.processed.md` variants

Observed problem:

- Census retail / retail breadth docs can enter top-3 on crowding prompts because they share broad risk / breadth / demand language.

### Equities

Primary active docs:

- `Equity Regime Framework: Rates, Growth, Liquidity, Earnings`
- `Sector Rotation and Market Leadership Playbook`
- `Earnings Quality and Margin Pressure Interpretation Guide`

Problem docs:

- `historical-starter-pack.processed.md` variants
- `public-report-starter-pack.processed.md` variants
- `census-retail-industry-pack.processed.md` variants
- `twelvedata-equity-watchlist-pack.processed.md` variants

Observed problem:

- Census and watchlist docs still compete with Wave docs on earnings, breadth, leadership, and rotation prompts.

## 2. Proposed Active vs Fallback vs Legacy Categories

### Primary active retrieval docs

Definition:

- curated internal markdown docs uploaded from Wave 1 / Wave 2
- filenames are non-processed `.md`
- titles match the specialist reasoning docs

Behavior:

- full ranking participation
- no governance penalty
- preferred prompt slots

### Secondary fallback docs

Definition:

- broad auxiliary docs that may still be useful when no sharp Wave doc matches
- examples:
  - census retail packs
  - watchlist packs
  - broad breadth / retail / demand framework docs
  - historical regime anchor docs

Behavior:

- visible in logs as `tier=fallback`
- demoted on specific queries
- skipped from later prompt slots when enough primary active docs already matched

### Legacy archival docs

Definition:

- starter-pack and public-report processed docs
- mostly duplicated across uploads
- examples:
  - `historical-starter-pack.processed.md`
  - `public-report-starter-pack.processed.md`

Behavior:

- visible in logs as `tier=legacy`
- strongly demoted on medium/high-specificity queries
- skipped once sharper docs already exist
- still available if no active/fallback doc matches

## 3. Smallest Implementation Option

Implement retrieval-time governance in `knowledgeSnippetService.ts` only.

No schema changes.

Add:

- `getGovernanceTier(document)`:
  - `active`
  - `fallback`
  - `legacy`
- governance-aware ranking penalties:
  - fallback docs demoted on medium/high-specificity queries
  - legacy docs strongly demoted on medium/high-specificity queries
- governance-aware selection:
  - skip legacy docs after enough active docs already matched
  - skip fallback docs after enough active docs already matched unless clearly stronger
- governance-aware logs:
  - `tier=active`
  - `tier=fallback`
  - `tier=legacy`
  - skipped reason such as `governance-legacy-after-active` or `governance-fallback-after-active`

This is code-side ranking governance plus an implicit filename convention. It does not require admin changes yet.

## 4. Expected Gains

Expected outcomes:

- fewer starter/public/census/watchlist docs in top-3 and top-4
- Wave 1 / Wave 2 docs dominate cleanly when they match
- broad docs remain available for fallback cases
- easier logs for explaining why a document was demoted or skipped

Target focused checkpoint:

- top-1 sharp doc accuracy remains high
- top-3 legacy / auxiliary contamination falls below the prior `26.7%`
- fallback docs are still retrievable when the prompt is broad or no active doc matches

## 5. Risks

### Over-demotion

Some legacy docs may contain useful historical analog material. Over-demoting them could reduce context for broad questions.

Mitigation:

- do not remove or archive docs
- only skip after enough sharper docs already match
- keep fallback availability when active docs are weak

### Filename convention fragility

The governance tier depends on title/filename patterns.

Mitigation:

- keep patterns simple and visible in logs
- later add explicit metadata/admin conventions if needed

### Hidden dependence on broad docs

Some agents may still rely on legacy docs for gaps not yet covered by Wave docs.

Mitigation:

- fallback docs still participate when no primary active docs win

## 6. How To Validate

Run 12-20 prompts emphasizing:

- slot-4 fallback contamination
- broad legacy-vs-sharp-doc competition
- Wave-doc-dominant direct specialist queries
- broad questions where fallback docs should remain available

Inspect:

- `[knowledge:*]` logs for `tier=active|fallback|legacy`
- score adjustments:
  - `-governance-fallback`
  - `-governance-legacy`
- skipped logs:
  - `governance-legacy-after-active`
  - `governance-fallback-after-active`

Pass criteria:

- Wave docs still rank top-1/top-3 on specific prompts
- legacy / auxiliary docs appear less often in injected top-3/top-4
- no new semantic miss appears
- vectors remain no-go

## 7. Out Of Scope

This pass does not:

- implement vectors
- add embeddings
- add schema fields
- archive docs in D1
- change admin workflow
- change prompt construction
- solve all active-pool governance forever

Future improvement, if needed:

- add explicit admin metadata for `active`, `fallback`, `legacy`
- add a manual archive/demote button
- curate or delete duplicate processed starter-pack uploads

