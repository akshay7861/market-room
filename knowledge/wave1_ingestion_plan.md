# Wave 1 Knowledge Library — Ingestion Plan

**Generated:** 2026-04-09
**Status:** Ready for upload
**Docs:** 9 (Macro: 3, Rates: 3, Commodities: 3)
**Agents covered:** Macro, Rates, Commodities
**Agents with `vector_store_id = NULL`:** All 6 — no retrieval is active yet

---

## Per-File Ingestion Table

| Filename | Agent | Doc Type | Batch | One-Line Description | Generate Market Cases | Suitability |
|----------|-------|----------|-------|---------------------|-----------------------|-------------|
| `fed-repricing-playbook.md` | Rates | event-playbook | 1 | Bps magnitude ladder, CME FedWatch calibration, and false-pivot pattern library for every CPI, NFP, and FOMC meeting | Yes | Both |
| `oil-supply-demand-and-inventory-framework.md` | Commodities | foundation | 1 | EIA weekly report interpretation — crude draw/build thresholds, Cushing levels, refinery utilization correction, and SPR distortion rules | No | Immediate upload |
| `inflation-transmission-mechanisms.md` | Macro | framework | 1 | Six-stage inflation transmission chain with three inflation type classification table and OER/energy/goods false-signal traps | Yes | Both |
| `yield-curve-mechanics-and-interpretation.md` | Rates | foundation | 2 | Four curve regime definitions (bear/bull flattener, bear/bull steepener), 3m10y vs 2s10s distinction, and bull-steepener-from-inversion trap | Yes | Both |
| `opec-and-geopolitical-shock-playbook.md` | Commodities | event-playbook | 2 | OPEC compliance gap mechanics, fiscal breakeven map, geopolitical shock anatomy (Day 0 through Month 6), and paper-cut false-positive rules | Yes | Both |
| `labor-market-deterioration-playbook.md` | Macro | event-playbook | 2 | Six-step labour market deterioration sequence (JOLTS → quits → claims → NFP → unemployment → Sahm Rule) with explicit agent posting rules per step | Yes | Both |
| `term-premium-breakeven-interpretation-guide.md` | Rates | framework | 3 | Three-level decomposition (nominal → real + breakeven → expected inflation + risk premium) with TIPS liquidity trap rules and ACM vs Cleveland Fed divergence guide | No | Immediate upload |
| `central-bank-reaction-function-framework.md` | Macro | framework | 3 | Dual mandate trade-off logic, dot plot interpretation rules (median dot shift thresholds), r-star anchor, and FOMC statement language glossary | Yes | Both |
| `commodity-curve-shape-and-physical-tightness-guide.md` | Commodities | framework | 3 | M1–M2 and M1–M13 calendar spread thresholds, roll yield mechanics, curve kink interpretation, and speculative vs physical backwardation distinction via CFTC COT | Yes | Both |

---

## Batch Rationale

### Batch 1 — Upload immediately
**Criterion:** Highest trigger frequency AND standalone utility (not dependent on other docs being understood first).

- **`fed-repricing-playbook.md`** — Triggered by every CPI release, every NFP, every FOMC meeting. The bps ladder table (`<5 bps = silent → ≥25 bps = immediate post`) is immediately usable without any prior knowledge retrieval.
- **`oil-supply-demand-and-inventory-framework.md`** — Triggered every Wednesday at 10:30am ET (EIA weekly). No doc dependency. The threshold rules (4M/5M bbl draw/build, Cushing 25M/45M bbl, utilization 85%) stand alone.
- **`inflation-transmission-mechanisms.md`** — Triggered every CPI and PCE release. The three inflation type table (cost-push / demand-pull / wage-spiral) immediately classifies any inflation headline. The OER false positive is the single most common misread across all three agents.

### Batch 2 — Upload after Batch 1 is retrieval-verified
**Criterion:** High trigger frequency but either references Batch 1 concepts or is a mid-priority doc with slightly lower trigger regularity.

- **`yield-curve-mechanics-and-interpretation.md`** — Foundation for Rates reasoning; should be uploaded before the term premium framework doc, which references curve regimes.
- **`opec-and-geopolitical-shock-playbook.md`** — High-velocity event-driven doc; OPEC meetings are quarterly and geopolitical events are irregular. Less frequently triggered than EIA weekly.
- **`labor-market-deterioration-playbook.md`** — NFP monthly, claims weekly, JOLTS monthly. Medium trigger frequency. Benefits from the Macro inflation doc being active first so agents can coordinate the inflation + labour dual-mandate read.

### Batch 3 — Upload last
**Criterion:** Builds on prior foundations, or lower standalone utility without other docs active.

- **`term-premium-breakeven-interpretation-guide.md`** — References yield curve regimes (from the foundation doc). Most useful when the Rates agent has already been trained to decompose curve moves via the yield curve doc.
- **`central-bank-reaction-function-framework.md`** — Supplements inflation and labour market docs; most relevant for FOMC meeting weeks. Batch 3 because the Fed's reaction function is best understood after the Macro agent has calibrated its inflation and labour signals.
- **`commodity-curve-shape-and-physical-tightness-guide.md`** — Supplements the EIA inventory foundation; the curve framework is more valuable once the agent has calibrated its EIA interpretation (Batch 1). The historical episodes (2007–2008 backwardation, 2015–2016 contango) are also strong analog-extraction candidates — consider extracting those before final upload.

---

## Generate Market Cases — Detail

For docs marked **Yes**, the following trigger types are suggested for synthetic case generation:

| Doc | Case types to generate |
|-----|----------------------|
| `fed-repricing-playbook.md` | (1) Hot CPI → bps ladder decision; (2) False pivot — soft print followed by reversal; (3) FOMC press conference language shift |
| `inflation-transmission-mechanisms.md` | (1) OER-driven hot CPI with flat supercore; (2) Demand-pull CPI with wage confirmation; (3) PPI spike without CPI pass-through |
| `yield-curve-mechanics-and-interpretation.md` | (1) Bear flattener during hiking cycle; (2) Bull steepener from inversion — recession framing; (3) Bear steepener driven by term premium vs growth |
| `labor-market-deterioration-playbook.md` | (1) JOLTS openings fall + quits rate drop — Step 1–2 post; (2) Sahm Rule trigger; (3) Weather-distorted NFP false alarm |
| `opec-and-geopolitical-shock-playbook.md` | (1) Saudi voluntary cut — genuine; (2) OPEC paper cut — compliance miss follow-up; (3) Geopolitical headline without confirmed production impact |
| `central-bank-reaction-function-framework.md` | (1) Dot plot median shift >25 bps; (2) "Skip" vs "pause" language distinction; (3) Mid-cycle adjustment vs pivot framing |
| `commodity-curve-shape-and-physical-tightness-guide.md` | (1) M1–M13 crossing +$3 with EIA confirmation; (2) Contango flattening — bottom signal; (3) CFTC positioning-driven backwardation — fragility case |

---

## Analog-Case Extraction Candidates

These historical episodes from the docs are rich enough to extract as standalone analog entries for a future Wave 2 analog library. Flag for extraction after upload.

| Doc | Episode | Extractable as |
|-----|---------|---------------|
| `fed-repricing-playbook.md` | Jan 2023 "disinflation" presser (-15 bps 2y in 30 min) | `analog/rates/2023-fomc-disinflation-presser.md` |
| `fed-repricing-playbook.md` | March 2023 SVB collapse (-103 bps 2y in 3 days) | `analog/rates/2023-svb-financial-stress-repricing.md` |
| `fed-repricing-playbook.md` | 2022 four false pivot episodes (4 entries) | `analog/rates/2022-false-pivot-series.md` |
| `labor-market-deterioration-playbook.md` | 2007–2008 JOLTS 6-month lead on NFP | `analog/macro/2007-jolts-leading-indicator.md` |
| `labor-market-deterioration-playbook.md` | 2022–2023 JOLTS -3.5M openings without recession | `analog/macro/2022-2023-soft-landing-jolts-rebalancing.md` |
| `opec-and-geopolitical-shock-playbook.md` | 2014–2016 OPEC market share war | `analog/commodities/2014-2016-opec-market-share-war.md` |
| `opec-and-geopolitical-shock-playbook.md` | 2022 Russia sanctions rerouting (0.5–1.0 Mb/d actual vs 3–4 Mb/d feared) | `analog/commodities/2022-russia-sanctions-rerouting.md` |
| `opec-and-geopolitical-shock-playbook.md` | 2019 Abqaiq drone attack — 5.7 Mb/d offline, full recovery in 2 weeks | `analog/commodities/2019-abqaiq-disruption-recovery.md` |
| `commodity-curve-shape-and-physical-tightness-guide.md` | 2007–2008 backwardation deepening from +$2 to +$9/bbl | `analog/commodities/2007-2008-backwardation-lead.md` |
| `commodity-curve-shape-and-physical-tightness-guide.md` | 2015–2016 deep contango storage play (-$8 to -$10) | `analog/commodities/2015-2016-contango-storage-play.md` |
| `yield-curve-mechanics-and-interpretation.md` | 2023 August–October term premium shock (+100 bps ACM in 8 weeks) | `analog/rates/2023-term-premium-shock.md` |
| `term-premium-breakeven-interpretation-guide.md` | 2013 Taper Tantrum — term premium +100 bps, breakevens barely moved | `analog/rates/2013-taper-tantrum-decomposition.md` |

---

## Which 3 Docs Are Strongest and Should Be Uploaded First

**1. `fed-repricing-playbook.md`**
Strongest of the 9. The bps magnitude ladder (`<5 bps = silent`, `5–10 = comment`, `10–15 = update`, `≥15 = new post`, `≥25 = immediate post`) is the only doc in the library that gives the agent a completely operationalised decision tree tied to observable market data. The four documented false pivot episodes from 2022 are the most specific false-signal library of any doc. Triggered by the highest-frequency catalysts: CPI (monthly), NFP (monthly), FOMC meetings (8 per year).

**2. `oil-supply-demand-and-inventory-framework.md`**
The most immediately and repeatedly useful doc in the library. Triggered every Wednesday at 10:30am ET — 52 times per year, more than any other trigger in the knowledge base. The threshold rules are unambiguous: >4M bbl draw = post, >5M bbl build = post, Cushing <25M bbl or >45M bbl = post. The refinery utilization <85% correction rule prevents the single most common misread in commodities commentary. Requires no other doc to be active first.

**3. `term-premium-breakeven-interpretation-guide.md`**
The most analytically rigorous doc in the library. It encodes the three-level decomposition (nominal → real + breakeven → expected inflation + risk premium) that prevents the most consequential analytical error in rates commentary: calling a fiscal/supply-driven yield rise an "inflation expectations" story. The TIPS liquidity trap rule (March 2020: 5y breakeven fell from 1.8% to 0.5% — not a deflation call, a TIPS bid-ask crisis) is the kind of false-signal guidance that no base-model LLM reliably produces without this document. The ACM term premium trigger thresholds (>50 bps in 6 weeks = post; 10y real yield crossing zero = post) are precise and directly actionable.

---

## Engineering Notes for Upload

**1. Upload process:**
All 9 documents should be uploaded to the vector store with their YAML frontmatter preserved. The `trigger_patterns`, `use_when`, `topics`, and `instruments` fields are designed as retrieval filter metadata — the retrieval system should parse these fields as first-pass filters before falling back to semantic similarity.

**2. Retrieval trigger verification (post-upload):**
After each batch upload, run a test market discussion (`POST /api/discussions/run`) and check:
- `decision_log.headline_analysis_json.is_new_information` is not always `false`
- Agent posts cite named mechanisms (e.g., "bear flattener," "supercore," "Cushing stocks")
- Agent posts reference specific thresholds (e.g., "NFP missed by 45k — below the 100k/month 3-month average threshold")
- False-signal acknowledgement appears in posts when a trap condition is active (e.g., "January NFP distorted by weather; discounting the headline")

**3. YAML metadata wiring:**
The `trigger_patterns` field should fire a retrieval query for the relevant doc when the agent's input matches a pattern. Example: when the Commodities agent processes a Wednesday EIA headline mentioning "crude inventory," the retrieval pipeline should match `oil-supply-demand-and-inventory-framework.md` via its `trigger_patterns: ["crude draw >4M bbl vs consensus expectation", ...]` field.

**4. Batch 1 `vector_store_id` assignments:**
After Batch 1 upload, set `vector_store_id` for:
- Rates agent (for `fed-repricing-playbook.md`)
- Commodities agent (for `oil-supply-demand-and-inventory-framework.md`)
- Macro agent (for `inflation-transmission-mechanisms.md`)

Verify retrieval is firing before uploading Batch 2.

**5. Document maintenance:**
These docs contain regime-specific thresholds (e.g., "quits rate below 2.0%", "5y5y breakeven above 2.7%") calibrated to the 2024–2026 macro environment. Review cadence: quarterly, or immediately following a regime-defining event (Fed pivot, recession onset, commodity cycle inflection). The `last_reviewed: 2026-04-09` field in the YAML frontmatter tracks this.
