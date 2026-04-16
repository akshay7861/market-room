# Final Non-Vector Precision Checkpoint

**Date:** 2026-04-11  
**Scope:** focused 15-prompt checkpoint after the final narrow non-vector precision pass.  
**Constraint:** no vectors, no schema changes, no broad architecture changes.

## 1. Checkpoint Set Used

The checkpoint targeted only the previously observed failure classes:

- routing negation prompts
- labor deterioration vs inflation prompts
- earnings quality vs equity regime prompts
- fallback contamination prompts

Method:

- live local Ask Market routing via `POST /api/market-questions`
- deterministic retrieval scoring against the current approved D1 knowledge pool
- same scoring profile as `knowledgeSnippetService.ts`
- local dev API on `127.0.0.1:8797`

## 2. Summary Metrics

| Metric | Result |
|---|---:|
| Prompt count | `15` |
| Routing accuracy | `15 / 15` = `100%` |
| Acceptable intended-doc top-1 | `15 / 15` = `100%` |
| Strict primary top-1 | `14 / 15` = `93.3%` |
| Strict primary top-3 | `15 / 15` = `100%` |
| Excerpt usefulness | `15 / 15` = `100%` |
| Fallback contamination in top-3 | `4 / 15` = `26.7%` |

The strict top-1 non-primary case was still acceptable:

- `N01` routed to `Commodities`
- top-1 was `Commodity Curve Shape and Physical Tightness Guide`
- intended `Oil Supply-Demand and Inventory Framework` was top-2
- this is acceptable because the prompt asked for the broader oil-market interpretation and had both inventory and curve/inference language

## 3. Observed Results

| ID | Focus | Intended agent | Routed agent | Intended doc | Top-1 | Top-3 | Fallback in top-3 | Result |
|---|---|---|---|---|---|---|---|---|
| N01 | routing negation | Commodities | Commodities | Oil Supply-Demand and Inventory Framework | Commodity Curve Shape and Physical Tightness Guide | CCS / OSD / OGS | no | pass |
| N02 | routing negation | Commodities | Commodities | Oil Supply-Demand and Inventory Framework | Oil Supply-Demand and Inventory Framework | OSD / CCS / OGS | no | pass |
| N03 | routing negation | Equities | Equities | Earnings Quality and Margin Pressure Interpretation Guide | Earnings Quality and Margin Pressure Interpretation Guide | EQM / ERF / SRM | no | pass |
| L01 | labor vs inflation | Macro | Macro | Labor Market Deterioration Playbook | Labor Market Deterioration Playbook | LMD / ITM / CBRF | no | pass |
| L02 | labor vs inflation | Macro | Macro | Labor Market Deterioration Playbook | Labor Market Deterioration Playbook | LMD / LEG / CBRF | yes | pass with pool clutter |
| L03 | labor vs inflation | Macro | Macro | Labor Market Deterioration Playbook | Labor Market Deterioration Playbook | LMD / CBRF / ITM | no | pass |
| E01 | earnings vs regime | Equities | Equities | Earnings Quality and Margin Pressure Interpretation Guide | Earnings Quality and Margin Pressure Interpretation Guide | EQM / ERF / SRM | no | pass |
| E02 | earnings vs regime | Equities | Equities | Earnings Quality and Margin Pressure Interpretation Guide | Earnings Quality and Margin Pressure Interpretation Guide | EQM / LEG / SRM | yes | pass with pool clutter |
| E03 | earnings vs regime | Equities | Equities | Earnings Quality and Margin Pressure Interpretation Guide | Earnings Quality and Margin Pressure Interpretation Guide | EQM / SRM / ERF | no | pass |
| F01 | fallback contamination | FX | FX | Dollar Funding Stress and Intervention Playbook | Dollar Funding Stress and Intervention Playbook | DFS / CAR / CBD | no | pass |
| F02 | fallback contamination | Macro | Macro | Inflation Transmission Mechanisms | Inflation Transmission Mechanisms | ITM / CBRF / LEG | yes | pass with pool clutter |
| F03 | fallback contamination | Risk/Sentiment | Risk/Sentiment | Positioning and Crowding Framework | Positioning and Crowding Framework | PCF / VRF / LEG | yes | pass with pool clutter |
| F04 | fallback contamination | Rates | Rates | Term Premium and Breakeven Interpretation Guide | Term Premium and Breakeven Interpretation Guide | TPB / FRP / YCM | no | pass |
| F05 | fallback contamination | Equities | Equities | Sector Rotation and Market Leadership Playbook | Sector Rotation and Market Leadership Playbook | SRM / ERF / breadth framework | no | pass |
| F06 | fallback contamination | Commodities | Commodities | Commodity Curve Shape and Physical Tightness Guide | Commodity Curve Shape and Physical Tightness Guide | CCS / OSD / OGS | no | pass |

Legend:

- `ITM`: Inflation Transmission Mechanisms
- `LMD`: Labor Market Deterioration Playbook
- `CBRF`: Central Bank Reaction Function Framework
- `TPB`: Term Premium and Breakeven Interpretation Guide
- `FRP`: Fed Repricing Playbook
- `YCM`: Yield Curve Mechanics and Interpretation
- `OSD`: Oil Supply-Demand and Inventory Framework
- `OGS`: OPEC and Geopolitical Shock Playbook
- `CCS`: Commodity Curve Shape and Physical Tightness Guide
- `CAR`: Carry and Rate Differential Framework
- `CBD`: Central-Bank Divergence Playbook
- `DFS`: Dollar Funding Stress and Intervention Playbook
- `PCF`: Positioning and Crowding Framework
- `VRF`: Volatility Regime and Fragility Playbook
- `ERF`: Equity Regime Framework
- `SRM`: Sector Rotation and Market Leadership Playbook
- `EQM`: Earnings Quality and Margin Pressure Interpretation Guide
- `LEG`: broad legacy / starter / census / auxiliary doc

## 4. Were The Known Misses Fixed?

### Routing negation miss

Fixed.

Prior miss:

- commodity inventory prompt with `Do not answer as Macro inflation` routed to `Macro`

Checkpoint:

- `N01` routed to `Commodities`
- `N02` routed to `Commodities`
- `N03` routed to `Equities` despite explicit `Do not answer as Rates`

### Labor deterioration vs inflation miss

Fixed.

Checkpoint:

- `L01`, `L02`, and `L03` all ranked `Labor Market Deterioration Playbook` top-1.

Log evidence to look for:

```text
+labor-deterioration-match
-inflation-offtopic-labor
```

### Earnings quality vs regime miss

Fixed.

Checkpoint:

- `E01`, `E02`, and `E03` all ranked `Earnings Quality and Margin Pressure Interpretation Guide` top-1.

Log evidence to look for:

```text
+earnings-quality-match
-regime-offtopic-earnings
```

## 5. Did Later-Slot Fallback Contamination Improve?

Yes, but not completely.

Observed improvements:

- late-slot fallback docs were skipped aggressively when three sharp docs had already won
- many prompts logged `skipped fallback` counts between `6` and `9`
- FX, Rates, Commodities, and several Equities / Macro prompts had no legacy docs in top-3

Remaining fallback contamination:

- top-3 fallback appeared in `4 / 15` prompts
- these were mostly cases where the fallback ranked before the third sharp doc, not merely appended as slot 4

This means the slot-4 problem improved, but active-pool governance remains unfinished.

## 6. Whether Vectors Are Still A No-Go

Vectors remain **NO-GO**.

Reason:

- all known miss classes were fixed or materially improved with deterministic non-vector logic
- routing accuracy was `100%` on the focused checkpoint
- intended docs were in top-3 for `100%` of checkpoint prompts
- excerpt usefulness remained `100%`
- remaining failures are active-pool clutter, not semantic retrieval misses

## 7. What Remains Before Any Future Vector Reconsideration

Before vectors are reconsidered:

1. clean active approved pools
2. demote or archive broad starter / census / watchlist docs from live retrieval
3. rerun the 42-prompt held-out set plus a fresh adversarial extension
4. require repeated correct-agent, right-doc-exists, outside-top-3 semantic misses

That evidence still does not exist.

