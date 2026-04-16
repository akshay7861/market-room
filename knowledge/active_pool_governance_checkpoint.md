# Active Pool Governance Checkpoint

**Date:** 2026-04-11  
**Scope:** focused validation after retrieval-time active/fallback/legacy governance.  
**Constraint:** no vectors, no schema changes.

## 1. Checkpoint Set Used

The checkpoint used `15` prompts emphasizing:

- later-slot fallback contamination
- broad legacy-vs-sharp-doc competition
- queries where Wave docs should dominate cleanly
- one known routing-negation style prompt to ensure routing behavior remained stable

Prompt families:

- Macro labor deterioration
- Macro inflation transmission
- Macro reaction function
- Rates term premium
- Rates Fed repricing
- Commodities inventory
- Commodities curve shape
- Commodities OPEC / paper cut
- FX dollar funding
- FX central-bank divergence
- Risk/Sentiment positioning
- Risk/Sentiment risk-off transmission
- Equities earnings quality
- Equities sector rotation
- Equities regime

Method:

- live local Ask Market routing via `POST /api/market-questions`
- retrieval scoring against current approved D1 knowledge pool
- governance-aware scoring and selection matching `knowledgeSnippetService.ts`

## 2. Observed Results

| Metric | Result |
|---|---:|
| Prompt count | `15` |
| Routing accuracy | `15 / 15` = `100%` |
| Strict primary top-1 | `12 / 15` = `80.0%` |
| Strict primary top-3 | `15 / 15` = `100%` |
| Fallback / legacy docs in top-3 | `0 / 15` = `0%` |
| Fallback / legacy docs in top-4 | `0 / 15` = `0%` |
| Governance-skipped docs | `117` |

The top-1 misses were all active-doc ambiguities, not legacy contamination:

- Macro reaction-function prompt ranked `Labor Market Deterioration Playbook` first, with `Central Bank Reaction Function Framework` top-2.
- Commodity inventory prompt ranked `Commodity Curve Shape and Physical Tightness Guide` first, with `Oil Supply-Demand and Inventory Framework` top-2.
- Risk-off transmission prompt ranked `Positioning and Crowding Framework` first, with `Risk-On / Risk-Off Transmission Guide` top-2.

In all three cases, the intended doc remained in top-3 and no fallback/legacy doc displaced it.

## 3. Per-Prompt Results

| ID | Intended agent | Routed agent | Intended doc | Top-1 | Top-3 tiers | Skipped docs | Result |
|---|---|---|---|---|---|---:|---|
| G01 | Macro | Macro | Labor Market Deterioration Playbook | Labor Market Deterioration Playbook | active / active / active | 8 | pass |
| G02 | Macro | Macro | Inflation Transmission Mechanisms | Inflation Transmission Mechanisms | active / active / active | 8 | pass |
| G03 | Macro | Macro | Central Bank Reaction Function Framework | Labor Market Deterioration Playbook | active / active / active | 8 | top-2 active ambiguity |
| G04 | Rates | Rates | Term Premium and Breakeven Interpretation Guide | Term Premium and Breakeven Interpretation Guide | active / active / active | 6 | pass |
| G05 | Rates | Rates | Fed Repricing Playbook | Fed Repricing Playbook | active / active / active | 6 | pass |
| G06 | Commodities | Commodities | Oil Supply-Demand and Inventory Framework | Commodity Curve Shape and Physical Tightness Guide | active / active / active | 6 | top-2 active ambiguity |
| G07 | Commodities | Commodities | Commodity Curve Shape and Physical Tightness Guide | Commodity Curve Shape and Physical Tightness Guide | active / active / active | 6 | pass |
| G08 | Commodities | Commodities | OPEC and Geopolitical Shock Playbook | OPEC and Geopolitical Shock Playbook | active / active / active | 6 | pass |
| G09 | FX | FX | Dollar Funding Stress and Intervention Playbook | Dollar Funding Stress and Intervention Playbook | active / active / active | 6 | pass |
| G10 | FX | FX | Central-Bank Divergence Playbook | Central-Bank Divergence Playbook | active / active / active | 6 | pass |
| G11 | Risk/Sentiment | Risk/Sentiment | Positioning and Crowding Framework | Positioning and Crowding Framework | active / active / active | 9 | pass |
| G12 | Risk/Sentiment | Risk/Sentiment | Risk-On / Risk-Off Transmission Guide | Positioning and Crowding Framework | active / active / active | 9 | top-2 active ambiguity |
| G13 | Equities | Equities | Earnings Quality and Margin Pressure Interpretation Guide | Earnings Quality and Margin Pressure Interpretation Guide | active / active / active | 11 | pass |
| G14 | Equities | Equities | Sector Rotation and Market Leadership Playbook | Sector Rotation and Market Leadership Playbook | active / active / active | 11 | pass |
| G15 | Equities | Equities | Equity Regime Framework: Rates, Growth, Liquidity, Earnings | Equity Regime Framework: Rates, Growth, Liquidity, Earnings | active / active / active | 11 | pass |

## 4. Was Later-Slot Clutter Reduced?

Yes.

Before this governance pass:

- final precision checkpoint fallback contamination in top-3: `4 / 15` = `26.7%`
- held-out fallback / auxiliary in top-3: `13 / 42` = `31.0%`
- held-out fallback / auxiliary in top-4: `41 / 42` = `97.6%`

After this governance pass:

- fallback / legacy in top-3: `0 / 15`
- fallback / legacy in top-4: `0 / 15`
- skipped fallback / legacy docs: `117`

This is a large improvement in active-pool cleanliness.

## 5. Do Sharp Docs Dominate More Cleanly?

Yes.

Every selected top-3 document in the checkpoint was an active Wave 1 / Wave 2 doc.

Important nuance:

- strict top-1 was not perfect, but misses were active-vs-active ambiguities
- no starter pack, public report, census pack, historical pack, or watchlist pack displaced a Wave doc
- the intended primary doc remained in top-3 for every prompt

This is the correct outcome for governance: it cleans the pool without pretending that every multi-mechanism prompt has only one valid active doc.

## 6. Whether Vectors Remain No-Go

Vectors remain **NO-GO**.

Reason:

- the contamination problem was solved with retrieval-time governance
- no true semantic miss appeared
- intended docs stayed top-3 in all checkpoint prompts
- remaining misses are active-doc ranking ambiguities, not candidate-discovery failures

## 7. Remaining Work

Still useful later:

- add explicit admin metadata for active / fallback / legacy
- add a review screen to demote or archive duplicate processed docs
- consider deleting duplicate starter-pack uploads after backup
- run a new 40-60 prompt held-out eval after this governance layer

Not needed yet:

- vectors
- embeddings
- schema overhaul
- new retrieval infrastructure

