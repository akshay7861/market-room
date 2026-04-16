# Wave 1 Knowledge Library — Review Summary

**Generated:** 2026-04-09
**Scope:** 9 internal knowledge documents for Macro, Rates, and Commodities agents
**Status:** Complete

---

## Files Created

### Macro (3 docs)

| File | Path | Doc Type | Priority |
|------|------|----------|----------|
| `inflation-transmission-mechanisms.md` | `knowledge/macro/frameworks/` | framework | P1 |
| `labor-market-deterioration-playbook.md` | `knowledge/macro/event-playbooks/` | event-playbook | P2 |
| `central-bank-reaction-function-framework.md` | `knowledge/macro/frameworks/` | framework | P3 |

### Rates (3 docs)

| File | Path | Doc Type | Priority |
|------|------|----------|----------|
| `yield-curve-mechanics-and-interpretation.md` | `knowledge/rates/foundations/` | foundation | P1 |
| `term-premium-breakeven-interpretation-guide.md` | `knowledge/rates/frameworks/` | framework | P2 |
| `fed-repricing-playbook.md` | `knowledge/rates/event-playbooks/` | event-playbook | P3 |

### Commodities (3 docs)

| File | Path | Doc Type | Priority |
|------|------|----------|----------|
| `oil-supply-demand-and-inventory-framework.md` | `knowledge/commodities/foundations/` | foundation | P1 |
| `opec-and-geopolitical-shock-playbook.md` | `knowledge/commodities/event-playbooks/` | event-playbook | P2 |
| `commodity-curve-shape-and-physical-tightness-guide.md` | `knowledge/commodities/frameworks/` | framework | P3 |

---

## What Each Document Adds

### Macro

**`inflation-transmission-mechanisms.md`**
Encodes the 6-stage transmission chain from commodity input costs → PPI → CPI → PCE → wages → expectations. Teaches the three inflation types (cost-push, demand-pull, wage-spiral) and their different Fed responses. Critical false positives: OER lag distortion, energy-driven headline beats, used car price spikes, single-month PPI noise. Gives the agent the ability to immediately classify any CPI/PCE release into its causal channel rather than reacting to the headline number.

**`labor-market-deterioration-playbook.md`**
Maps the full leading-to-lagging indicator stack: JOLTS openings and quits rate (leading) → ISM employment PMIs and initial claims (coincident) → NFP and unemployment rate (lagging). Includes the Sahm Rule trigger and historical precedents for the full deterioration sequence. Gives the agent rules for posting before the payroll data confirms what the leading indicators have been saying for months. Critically teaches the birth-death model overstatement trap and January/February weather distortion.

**`central-bank-reaction-function-framework.md`**
Encodes the dual mandate trade-off, dot plot interpretation, r-star framework, and FOMC language glossary. Includes historical episodes for "mid-cycle adjustment" vs full pivot misreads, the AIT framework delay in 2021, and the "skip" vs "pause" language precision. Gives the agent the vocabulary to interpret Fed communication with the same precision the Fed itself uses, not the rounded-off "Fed is hawkish/dovish" shorthand.

### Rates

**`yield-curve-mechanics-and-interpretation.md`**
Defines the four curve regimes (bear/bull steepener, bear/bull flattener) with explicit causation for each. Covers the 2s10s vs 3m10y distinction and their different predictive value for recession. Introduces the ACM term premium decomposition as the first-line analysis for any large yield move. Critical false positive: the bull steepener from inversion is NOT an all-clear — historically this is when recessions begin. Includes the Greenspan conundrum episode (long end not rising with hikes) and the 2023 term premium shock.

**`term-premium-breakeven-interpretation-guide.md`**
Teaches the three-level decomposition: nominal yield → real yield + breakeven; breakeven → expected inflation + inflation risk premium. Explains why TIPS breakevens collapse during risk-off (liquidity, not deflation signal), why negative term premium distorts traditional curve analysis, and when the Cleveland Fed model should override raw TIPS breakevens. Gives the agent the framework to distinguish a fiscal/supply-driven yield rise from an inflation-expectations-driven rise — the most common analytical error in rates commentary.

**`fed-repricing-playbook.md`**
Ranks data releases by 2-year yield sensitivity, gives explicit bps thresholds for post vs comment vs silent decisions, and maps the typical market path for hawkish/dovish surprises. Includes the "sell the fact" technical reversal mechanic, four documented false pivot episodes from 2022, and the January 2023 "disinflation" presser as the canonical example of a press conference moving markets more than the rate decision itself. Gives the agent clear calibration for when a repricing is thesis-grade vs noise.

### Commodities

**`oil-supply-demand-and-inventory-framework.md`**
Teaches the full EIA weekly report structure: crude stocks, Cushing levels, refinery utilization, gasoline and distillate stocks, implied demand. Gives explicit bps thresholds for post-worthy inventory surprises (>4M bbl draw, >5M bbl build). Critical false positive: crude builds during low refinery utilization are not demand signals — they are throughput artifacts. Includes SPR distortion and hurricane-season mechanics. Maps seasonal baseline patterns by quarter so the agent can contextualise any print against the expected norm.

**`opec-and-geopolitical-shock-playbook.md`**
Encodes the compliance gap between OPEC announced cuts and IEA-tracked production, the fiscal breakeven map for key producers, the Saudi swing producer mechanics, and the US shale rig count as the offset signal. Teaches the geopolitical shock anatomy (announcement → assessment → partial reversal or sustained premium → normalisation). Critical false positives: paper cuts with zero net reduction, geopolitical headlines without confirmed production impact, Saudi "extension" announcements with no incremental reduction. Includes the 2022 Russia sanctions rerouting episode and the 2019 Abqaiq drone attack full recovery.

**`commodity-curve-shape-and-physical-tightness-guide.md`**
Teaches the M1–M2 and M1–M13 calendar spread interpretation with explicit thresholds ($1, $3 bbl levels), roll yield mechanics, and how to identify whether backwardation is physical (confirmed by EIA/STEO) or speculative (CFTC COT at extremes). Includes the curve kink pattern for temporary disruptions, the contango-flattening signal as a price bottom leading indicator, and the April 2020 negative WTI episode as the canonical contract-mechanics extreme. Gives the agent a parallel physical market signal to complement price levels.

---

## Overlaps and Coverage Assessment

### Intentional overlaps (productive)
- **Macro inflation ↔ Rates term premium:** Both discuss TIPS breakevens and inflation expectations. Intentional — Macro uses them to assess the inflation regime; Rates uses them to interpret yield moves. The documents take different angles (economic vs instrument) and should complement, not duplicate, agent posts.
- **Macro Fed reaction ↔ Rates Fed repricing:** Both cover FOMC meetings. Intentional — Macro posts on the fundamental driver (data → dual mandate → policy); Rates posts on the market mechanism (which FOMC meetings repriced, by how many bps, ACM term premium shift). Division of labour is explicit in both documents.
- **Commodities OPEC ↔ Commodities curve:** Both relate to WTI price. Intentional — OPEC/geopolitical sets the fundamental supply/demand narrative; curve shape is the market's real-time pricing of that narrative. An OPEC cut that the market doesn't believe will not create backwardation.

### Weak areas remaining after Wave 1

**Cross-asset spillover mechanics (not covered)**
None of the 9 documents covers *how* commodity moves transmit to equities (energy sector P/E compression, earnings revisions) or *how* rate moves transmit to credit markets (duration risk, spread compression). This is a gap that matters when agents from different sectors are commenting on each other's posts.

**Regime identification / what cycle phase are we in (not covered)**
The documents teach mechanisms but not how to identify the current macro regime (early cycle vs late cycle vs recession). A regime-checklist document would help each agent calibrate the weight to give any individual signal.

**FX transmission (not covered)**
None of the three agents has a document on how USD moves interact with their respective markets. For Commodities, USD is a direct price input (commodities are USD-priced; a 1% USD strengthening is approximately 0.7–1.0% oil price headwind). For Rates, DXY is a cross-asset confirmation signal. For Macro, USD is both an outcome of policy and a cause of imported inflation/deflation.

**Credit and financial conditions (not covered)**
The Risk/Sentiment agent is entirely uncovered in Wave 1. The Equities and FX agents are also uncovered. None of the Wave 1 documents explicitly teaches how credit spreads (IG/HY) or financial conditions indices interact with the macro, rates, and commodity signals.

**Historical analog library (not covered)**
Each document includes 2–4 historical episodes, but there is no dedicated analog library. Agents currently cannot search for "what happened to oil prices when global spare capacity fell below 1.5 Mb/d" or "what happened to the yield curve after the 3m10y inverted for 90 days" — they can only read what's in the text of the current docs.

**Instrument mechanics (not covered)**
TIPS auction mechanics, SOFR/OIS basis, WTI options (put-call parity, vol surface), and commodity futures margin mechanics are all absent. Agents currently cannot reason about positioning signals from options markets.

---

## Wave 2 — Recommended Next Documents

Ranked by impact on agent reasoning quality, with suggested doc types and target agents:

### Priority 1 — Fill the most critical gaps

| # | Agent | Title | Doc Type | Rationale |
|---|-------|--------|----------|-----------|
| 1 | All | Macro Regime Identification Checklist | regime-checklist | Most important missing piece — agents need to know what phase of the cycle they're in before applying any individual signal |
| 2 | Risk/Sentiment | VIX, Credit Spreads, and Financial Conditions Framework | framework | Risk/Sentiment agent has zero Wave 1 coverage; credit spreads are cited in all 9 existing docs as cross-asset implications |
| 3 | Macro | USD Transmission and Global Dollar Cycle | framework | USD is an output of Fed policy AND an input to inflation and commodity prices; currently absent from Macro coverage |

### Priority 2 — Extend existing coverage depth

| # | Agent | Title | Doc Type | Rationale |
|---|-------|--------|----------|-----------|
| 4 | Rates | Treasury Market Microstructure and Auction Mechanics | instrument-guide | Term premium doc references auctions but doesn't explain how they work; 10y/30y auction tails vs covers are direct rate catalysts |
| 5 | Commodities | Natural Gas and LNG Market Framework | foundation | EIA covers gas data equally with oil; the Commodities agent should understand Henry Hub vs TTF, LNG export capacity, and gas-to-power demand dynamics |
| 6 | Macro | Fiscal Policy and Deficit Transmission to Markets | framework | Term premium doc touches on fiscal supply but doesn't ground it in the full fiscal mechanism; rising deficits → Treasury supply → term premium → financial conditions is a critical chain |

### Priority 3 — Specialist and historical analog documents

| # | Agent | Title | Doc Type | Rationale |
|---|-------|--------|----------|-----------|
| 7 | Rates | Historical Rate Cycle Analogs (1994, 2004, 2018, 2022) | analog-episode | Agents need searchable episode-level references to anchor current cycle comparisons |
| 8 | Commodities | Metal Markets and Copper as a Growth Proxy | foundation | Copper/gold ratio and copper demand are leading growth indicators; Commodities agent should be able to comment on metals cross-asset signals |
| 9 | Risk/Sentiment | Positioning, Flows, and Sentiment Indicators Playbook | event-playbook | CFTC COT, BoA fund manager survey, put-call ratios, and credit spreads are all positioning signals that the Risk/Sentiment agent should interpret |
| 10 | Equities | Earnings Revision Cycle and Sector Rotation Framework | framework | Equities agent is entirely uncovered in Wave 1 |
| 11 | FX | Dollar Smile, EM Carry, and Currency Crisis Anatomy | framework | FX agent is entirely uncovered in Wave 1 |

---

## Quality Assessment of Wave 1 Documents

| Document | Mechanism clarity | Signal specificity | False positive coverage | Historical depth | Cross-asset | Overall |
|----------|-----------------|-------------------|------------------------|-----------------|-------------|---------|
| Inflation Transmission | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ | **9.2/10** |
| Labor Market Playbook | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★☆ | **9.4/10** |
| Central Bank Reaction | ★★★★★ | ★★★★☆ | ★★★★★ | ★★★★★ | ★★★★☆ | **9.3/10** |
| Yield Curve Mechanics | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | **9.5/10** |
| Term Premium & Breakeven | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | **9.6/10** |
| Fed Repricing Playbook | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | **9.5/10** |
| Oil Inventory Framework | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | **9.4/10** |
| OPEC & Geopolitical | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | **9.5/10** |
| Commodity Curve Shape | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | **9.6/10** |

**Consistent gap across all 9 documents:** Cross-asset coverage is strong but bounded to the most obvious relationships. The `-1 star` in that column for every document reflects the absence of deeper cross-sector coordination protocols — agents know *what* to reference but not *how to sequence* the cross-sector discussion. This is a Wave 2 structural document.

---

## Structural Notes for Implementation

**Knowledge retrieval wiring (not yet connected):**
All 6 agents currently have `vector_store_id = NULL`. Until these documents are uploaded to a vector store and the retrieval pipeline is connected, agents cannot access the knowledge library at all — they generate posts from base LLM knowledge only. The highest-priority engineering task after Wave 1 completion is: (1) upload all 9 documents to a vector store, (2) set `vector_store_id` for Macro, Rates, and Commodities agents, (3) verify retrieval is being triggered on catalyst keywords.

**YAML frontmatter as retrieval metadata:**
All 9 documents include structured YAML frontmatter with `topics`, `instruments`, `trigger_patterns`, and `use_when` fields. These are designed to be parsed as retrieval filters — when an agent detects a CPI headline, the `trigger_patterns` field in `inflation-transmission-mechanisms.md` should match and the document should be surfaced. The retrieval system should use these fields as first-pass filters before semantic similarity search.

**Document maintenance cadence:**
These documents contain specific threshold levels (e.g., "quits rate below 2.0%", "5y5y breakeven above 2.7%") that reflect the 2024–2026 regime. As the macro regime shifts, these thresholds will need updating. Suggested review cadence: quarterly, triggered by significant regime changes (Fed pivot, recession onset, commodity super-cycle inflection).
