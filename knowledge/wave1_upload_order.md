# Wave 1 Knowledge Docs — Upload Order

**For:** Human operator using the admin knowledge pipeline
**Docs:** 9 files across Macro, Rates, Commodities agents
**Rule:** Complete each batch and verify retrieval is firing before moving to the next

---

## Quick Reference Table

| # | File (under `knowledge/`) | Agent | Doc Type | Batch | Upload alone or paired | Market cases |
|---|--------------------------|-------|----------|-------|------------------------|--------------|
| 1 | `rates/event-playbooks/fed-repricing-playbook.md` | Rates | event-playbook | **1** | Alone | Yes |
| 2 | `commodities/foundations/oil-supply-demand-and-inventory-framework.md` | Commodities | foundation | **1** | Alone | No |
| 3 | `macro/frameworks/inflation-transmission-mechanisms.md` | Macro | framework | **1** | Alone | Yes |
| 4 | `rates/foundations/yield-curve-mechanics-and-interpretation.md` | Rates | foundation | **2** | Alone — upload before #7 | Yes |
| 5 | `commodities/event-playbooks/opec-and-geopolitical-shock-playbook.md` | Commodities | event-playbook | **2** | Alone | Yes |
| 6 | `macro/event-playbooks/labor-market-deterioration-playbook.md` | Macro | event-playbook | **2** | Alone | Yes |
| 7 | `rates/frameworks/term-premium-breakeven-interpretation-guide.md` | Rates | framework | **3** | After #4 is active | No |
| 8 | `macro/frameworks/central-bank-reaction-function-framework.md` | Macro | framework | **3** | After #3 and #6 are active | Yes |
| 9 | `commodities/frameworks/commodity-curve-shape-and-physical-tightness-guide.md` | Commodities | framework | **3** | After #2 is active | Yes |

---

## Batch 1 — Upload First

**Why these three:** Highest trigger frequency. Each fires on a recurring weekly or monthly schedule. No dependency on other Wave 1 docs — they stand alone.

**After uploading:** Set `vector_store_id` for Rates, Commodities, and Macro agents. Run a test discussion. Verify retrieval before starting Batch 2.

---

### 1 · `knowledge/rates/event-playbooks/fed-repricing-playbook.md`

| Field | Value |
|-------|-------|
| **Agent** | Rates |
| **Doc type** | event-playbook |
| **Upload alone or paired** | Alone |
| **Market cases** | **Yes** |
| **Triggers on** | Every CPI release, every NFP, every FOMC meeting (~20 major events/year) |

**Market case types to generate:**
- Hot CPI print → bps ladder decision (which threshold level does this hit?)
- False pivot scenario — soft data reprices cuts; subsequent data reverses it
- FOMC press conference language shift — statement unchanged, presser moves the market

---

### 2 · `knowledge/commodities/foundations/oil-supply-demand-and-inventory-framework.md`

| Field | Value |
|-------|-------|
| **Agent** | Commodities |
| **Doc type** | foundation |
| **Upload alone or paired** | Alone |
| **Market cases** | **No** |
| **Triggers on** | Every Wednesday 10:30am ET (EIA weekly petroleum report) — 52×/year |

**Note:** This is the highest trigger-frequency doc in the library. No market cases needed — it is a reference document used every week, not an episodic playbook.

---

### 3 · `knowledge/macro/frameworks/inflation-transmission-mechanisms.md`

| Field | Value |
|-------|-------|
| **Agent** | Macro |
| **Doc type** | framework |
| **Upload alone or paired** | Alone |
| **Market cases** | **Yes** |
| **Triggers on** | Every CPI release, every PCE release, PPI as leading indicator |

**Market case types to generate:**
- OER-driven hot CPI headline with flat supercore — agent should not post a new thesis
- Demand-pull CPI confirmed by wage data — agent should post
- PPI spike without CPI pass-through (2018 tariff analog) — agent should comment only

---

## Batch 2 — Upload Second

**Why these three:** Medium-to-high trigger frequency. Some light dependency on Batch 1 docs being active. Upload only after confirming Batch 1 retrieval is working.

**After uploading:** Run another test discussion targeting the new trigger types. Verify before starting Batch 3.

---

### 4 · `knowledge/rates/foundations/yield-curve-mechanics-and-interpretation.md`

| Field | Value |
|-------|-------|
| **Agent** | Rates |
| **Doc type** | foundation |
| **Upload alone or paired** | Alone — but **must be uploaded before #7** (term premium doc references curve regimes defined here) |
| **Market cases** | **Yes** |
| **Triggers on** | Any Treasury market move >8 bps, FOMC meetings, major macro surprises |

**Market case types to generate:**
- Bear flattener during active hiking cycle — agent identifies regime and tightening signal
- Bull steepener from deep inversion — agent posts recession-risk framing, not "all clear"
- Bear steepener with no change in 2-year yield — agent identifies as term premium story, not rate expectations

---

### 5 · `knowledge/commodities/event-playbooks/opec-and-geopolitical-shock-playbook.md`

| Field | Value |
|-------|-------|
| **Agent** | Commodities |
| **Doc type** | event-playbook |
| **Upload alone or paired** | Alone — but the commodity curve doc (#9) is the complementary read; upload #9 soon after |
| **Market cases** | **Yes** |
| **Triggers on** | OPEC+ ministerial meetings (quarterly), extraordinary OPEC meetings, major geopolitical events in producing regions, monthly IEA Oil Market Report |

**Market case types to generate:**
- Saudi voluntary cut announcement — genuine incremental reduction; agent posts thesis
- OPEC paper cut — zero net reduction vs reference level; agent posts with caveat, updates on IEA data
- Geopolitical headline near oil infrastructure without confirmed production impact — agent stays silent or comments only

---

### 6 · `knowledge/macro/event-playbooks/labor-market-deterioration-playbook.md`

| Field | Value |
|-------|-------|
| **Agent** | Macro |
| **Doc type** | event-playbook |
| **Upload alone or paired** | Alone — pairs well with `inflation-transmission-mechanisms.md` (#3) which is already active |
| **Market cases** | **Yes** |
| **Triggers on** | Monthly NFP (first Friday), weekly initial jobless claims (Thursday), monthly JOLTS (~45-day lag) |

**Market case types to generate:**
- JOLTS openings >500k below peak with quits rate below 2.0% — Step 1–2 signal; agent posts before NFP confirms
- Sahm Rule trigger — unemployment 3m avg +0.5pp above 12m low; agent posts recession thesis
- Weak January NFP attributed to weather — agent should stay silent or comment only, not post a deterioration thesis

---

## Batch 3 — Upload Last

**Why these three:** These are analytical frameworks that build on the earlier foundations and playbooks. They add the most value when the earlier docs are already active in the vector store.

---

### 7 · `knowledge/rates/frameworks/term-premium-breakeven-interpretation-guide.md`

| Field | Value |
|-------|-------|
| **Agent** | Rates |
| **Doc type** | framework |
| **Upload alone or paired** | Upload **after #4** (`yield-curve-mechanics-and-interpretation.md`) is confirmed active — this doc references ACM decomposition and curve regimes introduced there |
| **Market cases** | **No** |
| **Triggers on** | Treasury auction weeks (10y, 30y), FOMC QT/QE decisions, CPI prints, fiscal deficit announcements, equity stress events |

**Note:** No market cases — the TIPS decomposition and ACM framework are analytical reference tools, not episodic triggers. The doc's value is in preventing misattribution errors (term premium shock misread as inflation expectations; TIPS liquidity squeeze misread as deflation).

---

### 8 · `knowledge/macro/frameworks/central-bank-reaction-function-framework.md`

| Field | Value |
|-------|-------|
| **Agent** | Macro |
| **Doc type** | framework |
| **Upload alone or paired** | Upload **after #3 and #6** are active — this doc synthesises both inflation and labour data into Fed policy logic |
| **Market cases** | **Yes** |
| **Triggers on** | Any FOMC meeting week, dot plot (SEP) releases, FOMC minutes, CPI/PCE that materially changes the rate path, Beige Book |

**Market case types to generate:**
- Dot plot median shift >25 bps — agent posts policy thesis citing language change
- "Skip" vs "pause" distinction at an FOMC meeting — agent uses the Fed's exact word and explains the difference
- Mid-cycle adjustment (75–100 bps max) vs full pivot — agent avoids calling it a new easing cycle

---

### 9 · `knowledge/commodities/frameworks/commodity-curve-shape-and-physical-tightness-guide.md`

| Field | Value |
|-------|-------|
| **Agent** | Commodities |
| **Doc type** | framework |
| **Upload alone or paired** | Upload **after #2** (`oil-supply-demand-and-inventory-framework.md`) is active — this doc adds curve structure interpretation on top of EIA inventory data |
| **Market cases** | **Yes** |
| **Triggers on** | Post-EIA Wednesdays (Cushing data updates curve read), large intraday WTI moves, OPEC cut announcements, monthly STEO release, CFTC COT release (Friday) |

**Market case types to generate:**
- M1–M13 crossing +$3/bbl with EIA inventory draws confirming — agent posts structural tightness thesis
- Contango flattening from -$6 to -$2 over 4 weeks — agent posts as leading indicator of price floor, not a bullish thesis yet
- CFTC speculative net longs at 5-year high with only shallow backwardation — agent flags fragility and stays silent on a new bullish thesis

---

## After Each Batch: Retrieval Check

Run a test market discussion and confirm these signals before uploading the next batch:

- [ ] Agent posts name the mechanism, not just the data point (e.g., "bear flattener" not "yields rose")
- [ ] Agent posts cite the specific threshold being crossed (e.g., "crude drew 4.7M bbl — above the 4M bbl post threshold")
- [ ] Agent stays silent or comments only when a false-positive trap condition is active (e.g., "January NFP, weather distortion likely — not posting a deterioration thesis")
- [ ] `is_new_information` in the decision log is not always `false`
- [ ] `vector_store_id` is set for all three agents before running the test

If retrieval is not firing after Batch 1: check `vector_store_id` assignment and confirm the YAML `trigger_patterns` field is being parsed as a retrieval filter.
