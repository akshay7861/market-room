# Wave 1 Knowledge Docs — Retrieval Test Plan

**Date:** 2026-04-09
**Purpose:** Validate that uploaded Wave 1 docs are retrieved correctly for the 6 most common catalyst types
**Prerequisite:** All 9 Wave 1 docs uploaded and approved. Use `GET /api/admin/agents/{agentId}/knowledge-processing/jobs` to confirm `review_status = approved` for all items.

---

## How to Run Each Test

There is no isolated retrieval endpoint. The fastest way to test is:

1. Trigger a market discussion via `POST /api/discussions/run` with a mock market snapshot matching the catalyst description
2. Check the decision log via `GET /api/admin/decision-log` — look for the `knowledge_snippets` field to see which docs were retrieved
3. Read the generated post — check that the agent cites the mechanism described in the expected docs, not just the headline number

Alternatively, read `findRelevantKnowledgeSnippets()` directly in a test script by passing a query string and confirming the returned titles.

---

## Test 1 — CPI Surprise

**Catalyst:** "Core CPI came in at +0.4% MoM vs +0.3% consensus — supercore accelerated"

**Query string passed to retrieval (approximate):**
`"CPI inflation surprise core PCE supercore services shelter OER wage growth"`

**Expected docs retrieved (in priority order):**

| Rank | Doc | Agent | Why it should match |
|------|-----|-------|---------------------|
| 1 | `inflation-transmission-mechanisms.md` | Macro | Coverage: "CPI, PCE, PPI, supercore, wage spiral". Triggers: "core CPI beats consensus by ≥0.1% MoM", "supercore (services ex-shelter) above 0.4% MoM". Strongest match on `cpi`, `supercore`, `inflation`. |
| 2 | `fed-repricing-playbook.md` | Rates | Triggers: "CPI core MoM surprise ≥ ±0.1% vs consensus". Coverage: "Fed funds futures, SOFR futures, rate repricing, hawkish surprise". Matches `cpi`, `surprise`, `repricing`. |
| 3 | `central-bank-reaction-function-framework.md` | Macro | Coverage: "FOMC, dual mandate, average inflation targeting". Use When: "CPI/PCE that materially changes rate path". Matches `inflation`, `cpi`. |

**What the agent post should show:**
- Macro agent should classify the print by channel (is this supercore-driven demand-pull, or OER lag artifact?)
- Rates agent should translate the CPI beat to bps of repricing and name which FOMC meetings shifted
- Neither agent should post a thesis if the beat is entirely OER-driven with flat supercore

**Pass condition:** At least docs 1 and 2 appear in the retrieved snippets. Agent post cites "supercore" or "OER" to classify the inflation channel — not just "CPI was hot."

---

## Test 2 — Weak Payrolls / Labour Deterioration

**Catalyst:** "NFP missed by 65k; JOLTS openings fell 480k from prior month; quits rate dropped to 1.9%"

**Query string passed to retrieval (approximate):**
`"NFP payrolls JOLTS job openings quits rate labor market deterioration claims unemployment"`

**Expected docs retrieved:**

| Rank | Doc | Agent | Why it should match |
|------|-----|-------|---------------------|
| 1 | `labor-market-deterioration-playbook.md` | Macro | Coverage: "NFP, JOLTS, initial jobless claims, quits rate, unemployment rate, Sahm Rule". Triggers: "JOLTS openings more than 500k below cycle peak", "quits rate below 2.0%". Direct match on `nfp`, `jolts`, `quits`. |
| 2 | `central-bank-reaction-function-framework.md` | Macro | Coverage: "FOMC, dual mandate, terminal rate". Use When: "CPI/PCE that materially changes rate path". Matches `labor` (implied in dual mandate), `unemployment`. |
| 3 | `fed-repricing-playbook.md` | Rates | Triggers: "NFP surprise ≥ ±75k with AHE directionally confirming". Coverage: "rate repricing, dovish surprise, 2-year Treasury". Matches `nfp`, `payroll`. |

**What the agent post should show:**
- Macro agent should identify which step in the deterioration sequence this data represents (Step 1–2: JOLTS and quits inflecting is the post trigger; Step 4 NFP alone is not)
- Post should note the quits rate at 1.9% (below the 2.0% threshold that triggers a thesis)
- Should NOT build a recession thesis from a single weak NFP without JOLTS/claims confirmation

**Pass condition:** Doc 1 is retrieved. Agent post references JOLTS and quits rate explicitly, identifies the deterioration stage, does not use "unemployment rate rising" (that's Step 5, lagging — not confirmed here).

---

## Test 3 — Hawkish Fed Repricing

**Catalyst:** "Fed dot plot raised median by 50 bps; Powell press conference struck hawkish tone; 2-year yield rose 18 bps on the session"

**Query string passed to retrieval (approximate):**
`"FOMC dot plot hawkish repricing 2-year yield Fed funds futures rate path terminal rate press conference"`

**Expected docs retrieved:**

| Rank | Doc | Agent | Why it should match |
|------|-----|-------|---------------------|
| 1 | `fed-repricing-playbook.md` | Rates | Coverage: "Fed funds futures, SOFR futures, rate repricing, hawkish surprise, 2-year Treasury, FOMC statement". Triggers: "2-year yield moves ≥15 bps in a single session", "FOMC statement word-level change in forward guidance". Direct match on `fomc`, `2-year`, `hawkish`, `repricing`. |
| 2 | `central-bank-reaction-function-framework.md` | Macro | Coverage: "FOMC, dot plot, dual mandate, terminal rate, forward guidance". Triggers: "FOMC meeting day", "dot plot (SEP) release", "Fed Chair press conference". Direct match on `fomc`, `dot`, `press conference`. |
| 3 | `yield-curve-mechanics-and-interpretation.md` | Rates | Triggers: "ACM term premium rising >50 bps in 6 weeks". Coverage: "yield curve, 2s10s, bear flattener". Use When: "FOMC meeting week". Matches `fomc`, `yield`, `2-year`. |

**What the agent post should show:**
- Rates agent should identify this as a ≥15 bps 2-year move → threshold for a new thesis post
- Should name which specific FOMC meetings repriced (not just "the Fed is hawkish")
- Macro agent should cite the dot plot shift (>50 bps = major thesis) and the press conference language
- Both agents should avoid duplicating the same "Fed is hawkish" observation

**Pass condition:** Docs 1 and 2 retrieved. Rates agent post cites specific bps of repricing; Macro agent post cites dot plot shift magnitude and specific language from the press conference.

---

## Test 4 — Large Crude Draw

**Catalyst:** "EIA weekly: crude stocks drew 6.2M bbl vs +0.5M expected; Cushing stocks fell to 24.8M bbl; refinery utilization at 91%"

**Query string passed to retrieval (approximate):**
`"EIA crude oil inventory draw Cushing refinery utilization WTI petroleum stocks weekly"`

**Expected docs retrieved:**

| Rank | Doc | Agent | Why it should match |
|------|-----|-------|---------------------|
| 1 | `oil-supply-demand-and-inventory-framework.md` | Commodities | Coverage: "EIA weekly petroleum report, crude oil inventories, Cushing Oklahoma, refinery utilization". Triggers: "crude draw >4M bbl vs consensus expectation", "Cushing stocks below 25M bbl". Direct match on `crude`, `cushing`, `refinery`, `eia`. |
| 2 | `commodity-curve-shape-and-physical-tightness-guide.md` | Commodities | Use When: "every Wednesday post-EIA release (Cushing data updates curve interpretation)". Coverage: "contango, backwardation, calendar spread, physical tightness, WTI forward curve". Matches `eia`, `crude`, `wti`, `cushing`. |
| 3 | `opec-and-geopolitical-shock-playbook.md` | Commodities | Coverage: "OPEC+, production quotas, fiscal breakeven, non-OPEC supply response". Use When: "OPEC meeting weeks (as context for supply picture)". Lower match — contextually relevant but not primary. |

**What the agent post should show:**
- Commodities agent should note: draw of 6.2M bbl exceeds the 4M bbl post threshold
- Should confirm: Cushing at 24.8M bbl is in the <25M bbl zone (physical tightness signal)
- Should confirm: refinery utilization at 91% (not depressed) → the draw reflects genuine demand, not a throughput artifact
- All three conditions confirming: agent should post a new thesis, not just comment

**Pass condition:** Doc 1 is retrieved. Agent post explicitly cites all three confirming conditions (draw threshold + Cushing level + utilization rate) — not just the headline crude number.

---

## Test 5 — OPEC Supply / Geopolitical Shock

**Catalyst:** "Saudi Arabia announces voluntary cut of 500 kb/d on top of existing group quota; Libya export terminal closed by militia"

**Query string passed to retrieval (approximate):**
`"OPEC Saudi Arabia production cut supply disruption Libya geopolitical oil barrels spare capacity"`

**Expected docs retrieved:**

| Rank | Doc | Agent | Why it should match |
|------|-----|-------|---------------------|
| 1 | `opec-and-geopolitical-shock-playbook.md` | Commodities | Coverage: "OPEC+, production quotas, Saudi Arabia swing producer, geopolitical supply shock, Libya disruption, fiscal breakeven". Triggers: "Saudi voluntary cut announcement", "supply disruption >500 kb/d confirmed". Direct match on `opec`, `saudi`, `supply`, `geopolitical`. |
| 2 | `oil-supply-demand-and-inventory-framework.md` | Commodities | Coverage: "crude oil inventories, WTI vs Brent spread, US crude production". Instruments: "WTI crude futures, Brent crude futures". Contextually relevant for cross-checking spare capacity via EIA/STEO. Matches `supply`, `crude`. |
| 3 | `commodity-curve-shape-and-physical-tightness-guide.md` | Commodities | Coverage: "contango, backwardation, calendar spread, physical tightness, WTI forward curve, OPEC". Triggers: "M1-M2 WTI spread crossing ±$1.00/bbl". Use When: "after OPEC cut announcement (check if market believes it via curve)". Matches `opec`, `supply`. |

**What the agent post should show:**
- Agent should distinguish: Saudi voluntary cut (highest quality signal — Saudi compliance is reliable) vs Libya closure (comment-level, not thesis — Libya is structural noise below 200 kb/d threshold)
- Agent should note Libya is below the 200 kb/d Libya-specific threshold for a thesis
- For the Saudi cut: agent should check whether this is incremental vs existing quota, and check IEA compliance context

**Pass condition:** Doc 1 is retrieved. Agent post correctly distinguishes the Saudi signal from the Libya signal — does not treat Libya as thesis-grade, does treat the Saudi voluntary cut as thesis-grade if confirmed incremental.

---

## Test 6 — Curve Steepening / Breakeven Move

**Catalyst:** "10-year yield rose 14 bps while 2-year was flat; ACM term premium rose 22 bps on the session; 5y5y breakeven widened 8 bps"

**Query string passed to retrieval (approximate):**
`"yield curve steepening bear steepener term premium ACM breakeven TIPS real yield 10-year 2-year"`

**Expected docs retrieved:**

| Rank | Doc | Agent | Why it should match |
|------|-----|-------|---------------------|
| 1 | `term-premium-breakeven-interpretation-guide.md` | Rates | Coverage: "term premium, ACM model, TIPS breakevens, real yields, inflation expectations, 5y5y forward, inflation risk premium". Triggers: "ACM term premium rising >50 bps in 6 weeks", "10-year real yield crossing 0%", "5y5y breakeven above 2.5%". Instruments: "10-year TIPS, 5y5y inflation forward". Direct match on `term`, `premium`, `acm`, `breakeven`. |
| 2 | `yield-curve-mechanics-and-interpretation.md` | Rates | Coverage: "yield curve, 2s10s, bear steepener, bull steepener, ACM term premium". Triggers: "ACM term premium rising >50 bps in 6 weeks", "10-year yield diverging from 2-year by >15 bps". Instruments: "2-year Treasury, 10-year Treasury". Matches `bear steepener`, `10-year`, `2-year`, `acm`. |
| 3 | `inflation-transmission-mechanisms.md` | Macro | Coverage: "TIPS breakevens, 5y5y inflation forwards, inflation expectations". Triggers: "5y5y breakeven crossing 2.5%". Matches `breakeven`, `inflation`. |

**What the agent post should show:**
- Rates agent should identify this as a bear steepener driven by term premium (10y moving without 2y = not a rate expectations story)
- Agent should cite the ACM term premium rising 22 bps and identify the driver (fiscal/supply, QT, foreign demand) vs inflation expectations
- Agent should distinguish: nominal yield rise with stable or falling real yield = breakeven widening (inflation story); both rising proportionally = rate expectations story
- 8 bps breakeven move alone is below threshold for a new thesis (threshold is above 2.5% on 5y5y level)

**Pass condition:** Docs 1 and 2 retrieved. Rates agent post uses the term "bear steepener" and attributes the move to term premium expansion — not just "yields rose." Post does not misattribute a term premium shock to inflation expectations.

---

## Retrieval Failure Diagnostics

If a test fails to retrieve the expected docs, check in this order:

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| No snippets returned at all | `review_status` not `approved`, or `distilled_markdown` is NULL | Check DB record via admin jobs endpoint |
| Wrong agent's docs returned | `agent_id` filter mismatch — docs uploaded to wrong agent | Re-upload to the correct agent |
| Correct doc is returned but excerpt is useless (YAML block) | Doc uploaded before the frontmatter fix was deployed | Delete and re-upload the file |
| Correct doc is not ranked first | `## Coverage` / `## Triggers` sections are missing | Doc was uploaded before fix — re-upload |
| Score is always 0 for a doc | Tokenizer drops short tokens (<3 chars) — query terms too short | Use longer query terms in test |
| `is_new_information` is always false in decision log | Agents not posting because catalyst is not novel — separate issue from retrieval | Check novelty scoring threshold |
