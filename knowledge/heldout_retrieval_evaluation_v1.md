# Held-Out Retrieval Evaluation V1

**Date:** 2026-04-11  
**Scope:** Larger held-out evaluation of the cleaned non-vector retrieval system after Routing Phase 1, retrieval cleanup, and Retrieval Precision Phase 2.  
**Decision context:** determine whether vectors are now justified by actual observed misses.

## 1. Evaluation Set Design

The evaluation used `42` held-out prompts, `7` per agent, across:

- direct specialist prompts
- indirect wording prompts
- cross-asset contamination prompts
- routing-sensitive prompts
- Market Room-style catalyst prompts
- Ask Market-style user questions

Method:

- Routing was observed through live local Ask Market calls to `POST /api/market-questions` on the running local API.
- Retrieval scoring was measured against the current local D1 approved knowledge pool using the cleaned `knowledgeSnippetService.ts` ranking logic:
  - metadata-aware keyword scoring
  - query-shape-aware ranking
  - generic legacy penalties
  - source-family dedupe
  - section-aware excerpt selection
  - Retrieval Precision Phase 2 intent boosts and fallback controls
- One transient `503` route observation on `R02` was re-run successfully and routed to `Rates`.
- No vectors, embeddings, schema changes, or retrieval architecture changes were used.

Doc code legend:

| Code | Document |
|---|---|
| ITM | Inflation Transmission Mechanisms |
| LMD | Labor Market Deterioration Playbook |
| CBRF | Central Bank Reaction Function Framework |
| FRP | Fed Repricing Playbook |
| TPB | Term Premium and Breakeven Interpretation Guide |
| YCM | Yield Curve Mechanics and Interpretation |
| OSD | Oil Supply-Demand and Inventory Framework |
| OGS | OPEC and Geopolitical Shock Playbook |
| CCS | Commodity Curve Shape and Physical Tightness Guide |
| CAR | Carry and Rate Differential Framework |
| CBD | Central-Bank Divergence Playbook |
| DFS | Dollar Funding Stress and Intervention Playbook |
| PCF | Positioning and Crowding Framework |
| VRF | Volatility Regime and Fragility Playbook |
| ROF | Risk-On / Risk-Off Transmission Guide |
| ERF | Equity Regime Framework: Rates, Growth, Liquidity, Earnings |
| SRM | Sector Rotation and Market Leadership Playbook |
| EQM | Earnings Quality and Margin Pressure Interpretation Guide |
| LEG | legacy / starter / auxiliary approved doc |

## 2. Summary Metrics

| Metric | Result |
|---|---:|
| Prompt count | `42` |
| Routing accuracy | `41 / 42` = `97.6%` |
| Strict primary doc top-1 | `39 / 42` = `92.9%` |
| Acceptable intended-doc top-1 | `40 / 42` = `95.2%` |
| Strict primary doc top-3 | `41 / 42` = `97.6%` |
| Acceptable intended-doc top-3 | `41 / 42` = `97.6%` |
| Excerpt usefulness | `42 / 42` = `100%` useful or adequate |
| Mechanism-rich excerpts | `34 / 42` = `81.0%` |
| Adequate but not ideal excerpts | `8 / 42` = `19.0%` |
| Poor excerpts | `0 / 42` |
| Legacy / auxiliary doc in top-3 | `13 / 42` = `31.0%` |
| Legacy / auxiliary doc in top-4 | `41 / 42` = `97.6%` |

Strict failure counts:

| Failure class | Count | Share of prompts | Share of strict failures |
|---|---:|---:|---:|
| Routing failure | `1` | `2.4%` | `33.3%` |
| Ranking failure | `2` | `4.8%` | `66.7%` |
| Excerpt failure | `0` | `0%` | `0%` |
| Content gap | `0` | `0%` | `0%` |
| True semantic miss | `0` | `0%` | `0%` |

## 3. Per-Prompt Results

| ID | Type | Intended agent | Intended doc | Routed agent | Top-1 | Observed top-3 | Excerpt | LEG in top-3 | Failure |
|---|---|---|---|---|---|---|---|---|---|
| M01 | direct specialist | Macro | ITM | Macro | ITM | ITM/LMD/CBRF | useful | no | none |
| M02 | direct specialist | Macro | LMD | Macro | LMD | LMD/ITM/CBRF | adequate | no | none |
| M03 | Market Room catalyst | Macro | CBRF | Macro | CBRF | CBRF/ITM/LMD | useful | no | none |
| M04 | cross-asset contamination | Macro | ITM | Macro | ITM | ITM/CBRF/LEG | adequate | yes | none |
| M05 | indirect wording | Macro | LMD | Macro | ITM | ITM/LMD/LEG | adequate | yes | ranking |
| M06 | Ask Market question | Macro | CBRF | Macro | CBRF | CBRF/LMD/LEG | useful | yes | none |
| M07 | indirect wording | Macro | ITM | Macro | ITM | ITM/CBRF/LMD | adequate | no | none |
| R01 | direct specialist | Rates | FRP | Rates | FRP | FRP/YCM/TPB | useful | no | none |
| R02 | indirect wording | Rates | TPB | Rates | TPB | TPB/YCM/FRP | adequate | no | none |
| R03 | Market Room catalyst | Rates | YCM | Rates | YCM | YCM/TPB/FRP | useful | no | none |
| R04 | cross-asset contamination | Rates | TPB | Rates | TPB | TPB/YCM/LEG | adequate | yes | none |
| R05 | Ask Market question | Rates | FRP | Rates | FRP | FRP/TPB/YCM | useful | no | none |
| R06 | indirect wording | Rates | YCM | Rates | YCM | YCM/TPB/FRP | useful | no | none |
| R07 | direct specialist | Rates | TPB | Rates | TPB | TPB/YCM/FRP | useful | no | none |
| C01 | direct specialist | Commodities | OSD | Commodities | OSD | OSD/CCS/OGS | useful | no | none |
| C02 | Market Room catalyst | Commodities | OGS | Commodities | OGS | OGS/CCS/OSD | useful | no | none |
| C03 | direct specialist | Commodities | CCS | Commodities | CCS | CCS/OSD/OGS | useful | no | none |
| C04 | indirect wording | Commodities | OGS | Commodities | OGS | OGS/CCS/OSD | useful | no | none |
| C05 | cross-asset contamination | Commodities | OSD | Macro | CBRF | CBRF/LEG/LMD | useful | yes | routing |
| C06 | indirect wording | Commodities | CCS | Commodities | CCS | CCS/OGS/OSD | adequate | no | none |
| C07 | Ask Market question | Commodities | OGS | Commodities | OGS | OGS/OSD/CCS | useful | no | none |
| F01 | direct specialist | FX | CAR | FX | CAR | CAR/CBD/DFS | useful | no | none |
| F02 | Market Room catalyst | FX | CBD | FX | CBD | CBD/CAR/DFS | useful | no | none |
| F03 | direct specialist | FX | DFS | FX | DFS | DFS/CAR/CBD | useful | no | none |
| F04 | indirect wording | FX | DFS | FX | DFS | DFS/CAR/CBD | useful | no | none |
| F05 | cross-asset contamination | FX | CBD | FX | CBD | CBD/CAR/DFS | useful | no | none |
| F06 | Ask Market question | FX | CAR | FX | CAR | CAR/CBD/LEG | useful | yes | none |
| F07 | routing-sensitive | FX | CBD | FX | CBD | CBD/CAR/DFS | useful | no | none |
| S01 | direct specialist | Risk/Sentiment | PCF | Risk/Sentiment | PCF | PCF/VRF/LEG | useful | yes | none |
| S02 | Market Room catalyst | Risk/Sentiment | VRF | Risk/Sentiment | VRF | VRF/ROF/PCF | useful | no | none |
| S03 | cross-asset contamination | Risk/Sentiment | ROF | Risk/Sentiment | ROF | ROF/VRF/PCF | useful | no | none |
| S04 | indirect wording | Risk/Sentiment | PCF | Risk/Sentiment | PCF | PCF/LEG/VRF | useful | yes | none |
| S05 | direct specialist | Risk/Sentiment | VRF | Risk/Sentiment | VRF | VRF/PCF/ROF | useful | no | none |
| S06 | Ask Market question | Risk/Sentiment | ROF | Risk/Sentiment | ROF | ROF/PCF/VRF | useful | no | none |
| S07 | routing-sensitive | Risk/Sentiment | PCF | Risk/Sentiment | PCF | PCF/VRF/LEG | useful | yes | none |
| E01 | direct specialist | Equities | ERF | Equities | ERF | ERF/SRM/LEG | useful | yes | none |
| E02 | Market Room catalyst | Equities | SRM | Equities | SRM | SRM/ERF/LEG | useful | no | none |
| E03 | direct specialist | Equities | EQM | Equities | EQM | EQM/ERF/LEG | useful | yes | none |
| E04 | cross-asset contamination | Equities | ERF | Equities | ERF | ERF/SRM/LEG | adequate | yes | none |
| E05 | indirect wording | Equities | EQM | Equities | EQM | EQM/SRM/LEG | useful | yes | none |
| E06 | Ask Market question | Equities | SRM | Equities | SRM | SRM/ERF/LEG | useful | no | none |
| E07 | routing-sensitive | Equities | EQM | Equities | ERF | ERF/EQM/SRM | useful | no | ranking |

## 4. Strongest Improvements Since Earlier Retrieval Phases

### Routing is mostly holding

The system routed `41 / 42` prompts correctly. The earlier FX-vs-Macro and Equities-vs-Rates failure modes did not recur in this held-out set.

### Top-1 precision is now good

Strict primary top-1 was `92.9%`. Acceptable top-1 was `95.2%`, because one Equities case was genuinely mixed between earnings quality and equity-regime classification.

### Top-3 recall is no longer the bottleneck

The intended primary doc appeared in top-3 for `41 / 42` prompts. The one top-3 miss was caused by wrong-agent routing, not within-agent retrieval.

### Excerpt quality improved materially

No top-1 excerpt was poor. The section-aware passage scorer is now usually selecting `Core mechanism`, `How this should affect agent behavior`, `False positives / traps`, `Cross-asset implications`, or equivalent mechanism-rich prose.

### FX cleanup worked

FX had `7 / 7` correct routing and `7 / 7` strict primary top-1. The earlier funding-stress-overranking issue did not recur in this held-out set.

## 5. Remaining Failure Modes

### A. One routing failure: commodity prompt captured by Macro

Prompt family:

`C05`: crude draw / gasoline build / distillates draw / refinery runs below 84%, with explicit instruction not to answer as Macro inflation.

Observed:

- intended agent: `Commodities`
- routed agent: `Macro`
- top-1 after route: `Central Bank Reaction Function Framework`
- intended oil inventory doc was unavailable because the wrong agent pool was selected

Classification:

- routing failure
- not ranking failure
- not semantic retrieval failure

Diagnosis:

- The wording included `Macro inflation`, which likely overpowered the commodity inventory terms despite the negation.
- This is a routing negation / specialist-instrument priority problem.

### B. Two strict ranking failures

#### M05: labor deterioration vs inflation

Prompt family:

- headline payrolls still fine
- openings, quits, temp help, and claims weakening
- asks whether to wait for payrolls before posting

Observed:

- intended primary: `Labor Market Deterioration Playbook`
- top-1: `Inflation Transmission Mechanisms`
- top-2: `Labor Market Deterioration Playbook`

Classification:

- ranking failure
- not semantic miss

Diagnosis:

- The query uses broad macro labor terms, but the current scorer still lets inflation win through generic macro overlap.
- The right doc is already top-2, so vectors are not the missing layer.

#### E07: earnings quality vs equity regime

Prompt family:

- guidance cut
- wage pressure on margins
- revenue slowing
- real yields compress multiples
- asks whether thesis is earnings quality or rates

Observed:

- intended primary: `Earnings Quality and Margin Pressure Interpretation Guide`
- top-1: `Equity Regime Framework`
- top-2: `Earnings Quality and Margin Pressure Interpretation Guide`

Classification:

- ranking ambiguity
- acceptable top-1 pass but strict primary top-1 miss

Diagnosis:

- This is a genuinely blended question. The top-1 regime framework is defensible, but the earnings-quality doc should arguably lead because margins, guidance, and revenue quality are more specific than the real-yield phrase.

### C. Legacy / auxiliary fallback contamination remains high

Observed:

- legacy / auxiliary doc in top-3: `13 / 42`
- legacy / auxiliary doc in top-4: `41 / 42`

This is now the largest remaining non-vector issue.

Interpretation:

- The top one to three docs are usually correct.
- The fourth slot, especially in Ask Market where four snippets are injected, is still often a broad starter-pack, public-report pack, watchlist, census, or historical anchor doc.
- This is active-pool governance plus fallback-slot policy, not a semantic retrieval problem.

### D. Excerpts are acceptable, but not always ideal

Observed:

- useful: `34 / 42`
- adequate: `8 / 42`
- poor: `0 / 42`

The remaining adequate cases often use a relevant historical episode or generic block when a tighter trigger-specific paragraph would be better. That is a passage-scoring refinement problem, not a vector problem.

## 6. Representative Examples

### Clean win: FX carry

Prompt:

`US 2-year yields rose 22 bps versus Japan while USDJPY breaks higher and risk sentiment is stable.`

Result:

- routed to `FX`
- top-1: `Carry and Rate Differential Framework`
- top-3: `CAR / CBD / DFS`
- excerpt: `Core mechanism`

Why it matters:

- The system correctly distinguishes carry from funding stress and central-bank divergence.

### Clean win: Rates term premium

Prompt:

`10-year sold off 24 bps while real yields did most of the move and breakevens barely changed.`

Result:

- routed to `Rates`
- top-1: `Term Premium and Breakeven Interpretation Guide`
- top-3: `TPB / YCM / FRP`

Why it matters:

- The system correctly maps indirect wording (`duration supply`, `real yields`, `breakevens barely changed`) to the term-premium doc.

### Remaining routing failure: commodity inventory vs Macro negation

Prompt:

`Do not answer as Macro inflation: gasoline stocks built, distillates drew, crude drew 3 million barrels, and refinery runs are below 84 percent.`

Result:

- routed to `Macro`
- top-1: `Central Bank Reaction Function Framework`

Why it matters:

- This is a negation-sensitive routing miss. It should be fixed in routing logic or prompt-side route hints, not vectors.

### Remaining ranking ambiguity: Equities margins vs regime

Prompt:

`Guidance was cut, wage costs are pressuring operating margins, revenue growth is slowing, and higher real yields compress multiples.`

Result:

- routed to `Equities`
- top-1: `Equity Regime Framework`
- top-2: `Earnings Quality and Margin Pressure Interpretation Guide`

Why it matters:

- The right doc is already top-2. The issue is specificity weighting inside Equities, not candidate discovery.

## 7. Are True Semantic Misses Dominant?

No.

The held-out set produced:

- `0` confirmed true semantic misses
- `1` routing failure
- `2` strict ranking failures
- `0` excerpt failures
- persistent fallback / active-pool clutter

The cleaned system is finding the right document neighborhood. The remaining misses are still mostly governance and precision problems:

- route specialist instruments despite negated macro language
- boost labor deterioration when openings/quits/claims/temp help appear together
- boost earnings quality when margins/guidance/revenue-quality terms dominate
- suppress legacy docs more aggressively from later prompt slots

Vectors would not directly solve those.

## 8. Recommendation

**Recommendation: keep non-vector. Do not implement vectors yet.**

The current evidence does not justify vector retrieval:

- strict primary top-3 is already `97.6%`
- acceptable top-1 is already `95.2%`
- no true semantic miss emerged in this 42-prompt set
- the only top-3 miss was caused by wrong-agent routing
- the biggest remaining issue is legacy fallback contamination, especially in slot 4

Next best work before any vector reconsideration:

1. tighten routing negation / specialist-instrument priority for commodity inventory prompts
2. add narrow labor-deterioration and earnings-quality specificity boosts
3. apply stricter active-pool governance or fallback-slot suppression for legacy docs
4. repeat a held-out eval after those changes

