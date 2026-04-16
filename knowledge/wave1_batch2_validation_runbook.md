# Wave 1 Batch 2 — Retrieval Validation Runbook

**Date:** 2026-04-10
**Scope:** Validate that the 3 uploaded Batch 2 docs are retrieved, injected into agent prompts, and visibly influencing output quality
**Prerequisite:** All 3 Batch 2 docs uploaded and `reviewStatus: approved` (confirmed via upload runbook)
**Method:** Same discipline as Batch 1 — targeted market-question calls, log inspection, output quality check
**No vector work. No Batch 3. No architecture changes.**

---

## 1. Diagnosis

**Status: Docs are approved. Retrieval is untested. Run the 3 validation tests below.**

Each agent now has a two-doc pool for its sector. The retrieval scorer must surface the right doc for the right catalyst — not just retrieve anything. The validation prompts are designed to match the specific `## Triggers` and `## Coverage` sections of each new Batch 2 doc, not the Batch 1 docs already active. If the wrong doc is retrieved (e.g., Fed Repricing Playbook fires for a yield curve shape question), that is also a signal worth noting — Batch 1 docs are still active and will compete.

**Fastest validation path:** `POST /api/market-questions` — one call per test, routes to the target agent, calls `findRelevantKnowledgeSnippets()` with question + live snapshot + headlines as query, returns response immediately. Console logs show retrieval scoring in real time.

**Routing discipline (learned from Batch 1):**
- For **Rates**: lead with "yield curve", "2s10s", "bear steepener", "Treasury" — not "CPI" or "inflation" (those route to Macro)
- For **Commodities**: lead with "OPEC", "Saudi Arabia", "production cut", "crude", "oil" — these are in the Commodities heuristic keyword set
- For **Macro**: lead with "NFP", "JOLTS", "jobs", "labor market", "payrolls", "quits" — these are in the Macro heuristic keyword set

---

## 2. Before Running Tests — Start Log Watcher

```bash
wrangler tail --format pretty 2>&1 | grep -E "\[knowledge:|score=|injecting|no snippets"
```

Or in local dev, watch the API server terminal for `[knowledge:]` prefixed lines.

The log now includes excerpt previews (first 80 chars) confirming that the snippet content is document body text, not a metadata header.

---

## 3. Three Validation Tests

---

### Test 1 — Rates / Yield Curve Mechanics

**What this tests:** `yield-curve-mechanics-and-interpretation.md` — four curve regime classification, ACM term premium decomposition, 3m10y vs 2s10s distinction, bear-steepener-from-inversion trap

**Curl command:**

```bash
curl -s -X POST "http://127.0.0.1:8787/api/market-questions" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "The 2s10s Treasury curve just moved 12 bps steeper in a single session — the 10-year rose while the 2-year was flat. Is this a bear steepener or a bull steepener, and what does the direction tell us about whether this is a term premium story or a rate expectations story? How does the 3m10y vs 2s10s distinction change the recession signal read here? What is the ACM term premium doing relative to the nominal yield move?"
  }' | python3 -m json.tool
```

**Why this routes to Rates:** Question leads with "2s10s Treasury", "steeper", "10-year", "2-year", "yield" — all in the Rates heuristic keyword set.

**Query keywords that score against `yield-curve-mechanics-and-interpretation.md` `## Triggers` and `## Coverage`:**
- `## Triggers`: "10-year yield diverging from 2-year by >15 bps on single catalyst", "single-session 2s10s move >8 bps"
- `## Coverage`: "yield curve", "2s10s", "bear steepener", "bull steepener", "ACM term premium", "recession signal", "3m10y"

**Why this scores higher than `fed-repricing-playbook.md`:** No CPI, FOMC, or Fed funds language — Fed Repricing's trigger keywords don't fire. The curve shape terms ("2s10s", "steeper", "bear steepener", "term premium", "3m10y") all land in yield curve doc's `## Coverage` and `## Triggers` at weight 3.

---

### Test 2 — Commodities / OPEC and Geopolitical Shock

**What this tests:** `opec-and-geopolitical-shock-playbook.md` — Saudi voluntary cut anatomy, OPEC compliance vs paper-cut distinction, geopolitical headline filtering rules

**Curl command:**

```bash
curl -s -X POST "http://127.0.0.1:8787/api/market-questions" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Saudi Arabia just announced a voluntary crude oil production cut of 500 kb/d on top of the existing OPEC+ quota. Separately, a militia has closed a Libyan export terminal — estimated loss of 180 kb/d. How does the OPEC playbook distinguish these two signals? Is the Saudi voluntary cut incremental to the existing quota or a rebasing of the reference level? And is 180 kb/d from Libya threshold-grade for a new thesis, or is Libya disruption treated differently given its structural unreliability?"
  }' | python3 -m json.tool
```

**Why this routes to Commodities:** Question leads with "Saudi Arabia", "crude oil", "OPEC+", "Libya" — all in the Commodities heuristic keyword set ("oil", "opec").

**Query keywords that score against `opec-and-geopolitical-shock-playbook.md` `## Triggers` and `## Coverage`:**
- `## Triggers`: "Saudi voluntary cut announcement (incremental vs existing quota)", "supply disruption >500 kb/d confirmed", "IEA OPEC compliance miss >500 kb/d"
- `## Coverage`: "OPEC+", "production quotas", "compliance", "Saudi Arabia swing producer", "Libya disruption", "geopolitical supply shock"

**Why this scores higher than `oil-supply-demand-and-inventory-framework.md`:** No EIA, Cushing, refinery utilization language — the inventory doc's trigger keywords don't fire. The OPEC/Saudi/Libya/compliance terms land directly in the OPEC playbook's `## Coverage` and `## Triggers` at weight 3.

---

### Test 3 — Macro / Labor Market Deterioration

**What this tests:** `labor-market-deterioration-playbook.md` — six-step deterioration sequence, JOLTS and quits as leading indicators, Sahm Rule trigger, false-positive filtering for weather-distorted NFP

**Curl command:**

```bash
curl -s -X POST "http://127.0.0.1:8787/api/market-questions" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "JOLTS job openings just fell 520k from the cycle peak. The quits rate dropped to 1.9%. Initial jobless claims 4-week average is at 248k and rising. NFP last month was +72k — a 3-month average of 95k. At what step in the labor market deterioration sequence are we? Does the JOLTS and quits combination already justify a thesis, or do we need NFP confirmation? How does the Sahm Rule factor in, and what would trigger a recession-framing post vs a softening post?"
  }' | python3 -m json.tool
```

**Why this routes to Macro:** Question leads with "JOLTS", "quits rate", "jobless claims", "NFP", "labor market" — all in the Macro heuristic keyword set ("payroll", "jobs").

**Query keywords that score against `labor-market-deterioration-playbook.md` `## Triggers` and `## Coverage`:**
- `## Triggers`: "JOLTS openings more than 500k below cycle peak", "quits rate below 2.0% (total private)", "initial claims 4-week MA above 250k and rising", "NFP 3-month average below 100k", "Sahm Rule triggered"
- `## Coverage`: "NFP", "JOLTS", "initial jobless claims", "quits rate", "unemployment rate", "Sahm Rule", "labor market leading indicators"

**Why this scores higher than `inflation-transmission-mechanisms.md`:** No CPI, supercore, OER, PCE, wage-spiral language — the inflation doc's trigger keywords don't fire. All JOLTS/quits/claims/NFP terms land directly in the labour market doc's `## Triggers` at weight 3.

---

## 4. Log Inspection Guide

### Expected logs — successful retrieval

**Test 1 (Rates, yield curve):**
```
[knowledge:Rates Agent] query="The 2s10s Treasury curve just moved 12 bps steeper..." pool=6 matched=2
[knowledge:Rates Agent]   score=21.0 cat=foundations title="Yield Curve Mechanics and Interpretation" excerpt="The four regime table is the primary classification tool. Bear steepener: 10y ri…"
[knowledge:Rates Agent]   score=9.0 cat=event_playbooks title="Fed Repricing Playbook" excerpt="The 2-year Treasury yield moves every time the market revises its expectation…"
[knowledge:Rates Agent] injecting 2 snippet(s): "Yield Curve Mechanics and Interpretation", "Fed Repricing Playbook"
```

Note: Both Rates docs may score — the Fed Repricing Playbook has some curve language. The yield curve doc must rank first.

**Test 2 (Commodities, OPEC):**
```
[knowledge:Commodities Agent] query="Saudi Arabia just announced a voluntary crude oil production cut..." pool=6 matched=2
[knowledge:Commodities Agent]   score=24.0 cat=event_playbooks title="OPEC and Geopolitical Shock Playbook" excerpt="The Saudi voluntary cut is the highest-quality OPEC signal. Compliance history…"
[knowledge:Commodities Agent]   score=8.0 cat=foundations title="Oil Supply-Demand and Inventory Framework" excerpt="Crude oil inventories are the primary physical signal…"
[knowledge:Commodities Agent] injecting 2 snippet(s): "OPEC and Geopolitical Shock Playbook", "Oil Supply-Demand and Inventory Framework"
```

**Test 3 (Macro, labour market):**
```
[knowledge:Macro Agent] query="JOLTS job openings just fell 520k from the cycle peak..." pool=6 matched=2
[knowledge:Macro Agent]   score=27.0 cat=event_playbooks title="Labor Market Deterioration Playbook" excerpt="Step 1: JOLTS openings fall >500k from cycle peak. Step 2: Quits rate drops…"
[knowledge:Macro Agent]   score=6.0 cat=frameworks title="Inflation Transmission Mechanisms" excerpt="…"
[knowledge:Macro Agent] injecting 2 snippet(s): "Labor Market Deterioration Playbook", "Inflation Transmission Mechanisms"
```

### Reading multi-doc retrieval

With two approved docs per agent, the log will now show competitive scoring. What matters:

- The Batch 2 doc must rank **first** for its target catalyst — its score must be higher than the Batch 1 doc for the same query
- If the Batch 1 doc ranks first for a Batch 2 query, the keyword match in the prompt design is too broad — tighten the question
- Both docs being injected (score > 0) is fine — the agent gets both in context. The ranking matters for which excerpt leads the prompt list

### Score interpretation with two-doc pool

| Condition | Meaning |
|-----------|---------|
| Batch 2 doc score >> Batch 1 doc score | Strong signal — Batch 2 doc is clearly the primary match |
| Both docs score similarly | The query terms overlap both docs — still a pass if Batch 2 doc is first |
| Batch 1 doc scores higher for Batch 2 catalyst | Query keywords too similar to Batch 1 triggers — use the exact question wording above |
| Either doc score = 0 | Doc not retrieved — check `reviewStatus` |

---

## 5. Success and Failure Criteria Per Test

### Test 1 — Rates / Yield Curve Mechanics

**Success:**

Log shows:
- [ ] `title="Yield Curve Mechanics and Interpretation"` appears in matched docs
- [ ] Yield curve doc has the **highest score** among matched docs
- [ ] Score ≥ 10 for the yield curve doc

Response shows (at least two of these):
- [ ] Names the regime: identifies this as a bear steepener (10-year rising, 2-year flat) — not just "the curve steepened"
- [ ] Distinguishes term premium story (10-year moves without 2-year = supply/fiscal/QT residual) from rate expectations story (both ends move)
- [ ] References ACM term premium as the decomposition tool
- [ ] Addresses 3m10y vs 2s10s distinction — which inversion measure matters more for recession signaling
- [ ] Does not describe "the curve steepened" without attaching a regime label

**Failure:**
- [ ] Log shows `matched=0` for yield curve doc, or yield curve doc scores below Fed Repricing Playbook
- [ ] Response says "the curve steepened" without naming the regime (bear vs bull) or driver (term premium vs rate expectations)
- [ ] Response uses "yields moved" language without any decomposition
- [ ] 3m10y vs 2s10s distinction is absent — response treats all curve steepening equivalently

---

### Test 2 — Commodities / OPEC and Geopolitical Shock

**Success:**

Log shows:
- [ ] `title="OPEC and Geopolitical Shock Playbook"` appears in matched docs
- [ ] OPEC playbook has the **highest score** among matched docs
- [ ] Score ≥ 10 for the OPEC playbook

Response shows (at least two of these):
- [ ] Distinguishes the Saudi voluntary cut from the Libya disruption as two different signal types
- [ ] States whether the Saudi cut is incremental to the existing quota or a rebasing — this is the thesis-grade question
- [ ] Applies a Libya-specific threshold: 180 kb/d from Libya is below the 200 kb/d Libya noise threshold (or uses similar Libya-specific filtering logic), so it is comment-only or silent
- [ ] Does not treat both events equivalently — Saudi = potential thesis, Libya = comment or silence
- [ ] Mentions IEA compliance data as the verification step for any OPEC cut claim

**Failure:**
- [ ] Log shows OPEC playbook not retrieved or scores below oil inventory doc
- [ ] Response treats Libya's 180 kb/d the same as a confirmed OPEC production cut
- [ ] Response posts a bullish thesis on the Libya headline without a threshold check
- [ ] Response does not address whether the Saudi cut is incremental vs rebasing
- [ ] Response says "Saudi cut is bullish for oil" without checking compliance context or IEA data

---

### Test 3 — Macro / Labor Market Deterioration

**Success:**

Log shows:
- [ ] `title="Labor Market Deterioration Playbook"` appears in matched docs
- [ ] Labour market doc has the **highest score** among matched docs
- [ ] Score ≥ 10 for the labour market doc

Response shows (at least two of these):
- [ ] Identifies the deterioration step explicitly — with JOLTS down 520k (>500k threshold), quits at 1.9% (<2.0% threshold), and claims 4-week MA at 248k (approaching the 250k threshold), agent should identify Step 1–3 as triggered
- [ ] States that the JOLTS + quits combination already justifies a thesis — NFP is a lagging confirmation, not a prerequisite
- [ ] Explains how the Sahm Rule would fire: 3-month unemployment average would need to be +0.5pp above the 12-month low
- [ ] Distinguishes softening post (Steps 1–3: JOLTS/quits/claims deteriorating) from recession-framing post (Step 5: Sahm Rule + unemployment rising)
- [ ] Does not wait for NFP to go negative before posting — that is the lagging error the doc is designed to prevent

**Failure:**
- [ ] Log shows labour market doc not retrieved or scores below inflation transmission doc
- [ ] Response says "wait for NFP to confirm before posting a thesis" — this is the specific error the doc prevents
- [ ] Response treats all weak labour data equivalently without step-level classification
- [ ] Response does not reference JOLTS or quits as the leading indicators — only mentions NFP
- [ ] Response says "unemployment rate is rising" without confirming the Sahm Rule threshold

---

## 6. If a Test Fails — Diagnostics

| Symptom | Cause | Fix |
|---------|-------|-----|
| Batch 2 doc not in pool (`pool` count unchanged from Batch 1) | File uploaded to wrong agent, or upload failed | Re-check `knowledge-processing/jobs` for the correct agent |
| Batch 2 doc in pool but score = 0 | Tokenizer not matching query terms to `## Coverage` or `## Triggers` | Use the exact question wording from this runbook — it was designed around the doc's frontmatter keywords |
| Batch 1 doc outscoring Batch 2 doc for Batch 2 catalyst | Query contains too many cross-over keywords | Use more sector-specific terms; remove Batch 1 trigger terms from the question |
| Question routes to wrong agent | Heuristic keyword match favoured different sector | Reorder the question so sector-specific terms appear in the first sentence |
| Both docs injected but response shows only Batch 1 reasoning | LLM weighted the Batch 1 excerpt over the Batch 2 excerpt | Not a retrieval failure — note the excerpt ranking in the prompt. Batch 2 doc should be listed first if it scored higher |
| `excerpt` preview shows `## Coverage` or `## Triggers` header | `bestExcerpt()` chose the metadata section as best match | Informational — the metadata line is still useful content. Note it but do not treat as a blocker unless the excerpt is literally just the header line |

---

## 7. Secondary Validation — Full Discussion Run

After targeted market-question tests pass, optionally run a full discussion to observe all agents simultaneously:

```bash
curl -s -X POST "http://127.0.0.1:8787/api/discussions/run" \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

Decision log (most useful for checking `primary_mechanism` and `is_new_information`):

```bash
# Per-agent decision log
curl -s "http://127.0.0.1:8787/api/admin/decision-log?agentId=rates-agent&limit=5" | python3 -m json.tool
curl -s "http://127.0.0.1:8787/api/admin/decision-log?agentId=commodities-agent&limit=5" | python3 -m json.tool
curl -s "http://127.0.0.1:8787/api/admin/decision-log?agentId=macro-agent&limit=5" | python3 -m json.tool
```

In `headlineAnalysisJson`, look for:

| Agent | Pass signal in `primary_mechanism` |
|-------|-----------------------------------|
| Rates | Contains "bear steepener", "term premium", "ACM", or curve regime label |
| Commodities | Contains "OPEC compliance", "voluntary cut", "incremental", or "Libya threshold" |
| Macro | Contains "JOLTS", "quits rate", "deterioration step", or "Sahm Rule" |

---

## 8. What Must Be True Before Batch 3 Starts

All six conditions must be confirmed:

- [ ] **Test 1 log pass:** `Yield Curve Mechanics and Interpretation` retrieved with highest score for the yield curve query, score ≥ 10
- [ ] **Test 1 response pass:** Rates agent names the curve regime (bear steepener), identifies term premium vs rate expectations, references ACM decomposition
- [ ] **Test 2 log pass:** `OPEC and Geopolitical Shock Playbook` retrieved with highest score for the OPEC/Saudi query, score ≥ 10
- [ ] **Test 2 response pass:** Commodities agent distinguishes Saudi voluntary cut from Libya noise, applies a Libya-specific threshold, flags IEA compliance as the verification step
- [ ] **Test 3 log pass:** `Labor Market Deterioration Playbook` retrieved with highest score for the JOLTS/quits/claims query, score ≥ 10
- [ ] **Test 3 response pass:** Macro agent identifies the current deterioration step, states JOLTS + quits justifies a thesis without waiting for NFP, distinguishes softening post from recession-framing post

**If all six pass:** Upload Batch 3 — `term-premium-breakeven-interpretation-guide.md` (Rates/frameworks), `central-bank-reaction-function-framework.md` (Macro/frameworks), `commodity-curve-shape-and-physical-tightness-guide.md` (Commodities/frameworks).

**If any test fails:** Work through Section 6 diagnostics. Do not upload Batch 3 until Batch 2 retrieval is confirmed clean across all three agents.

---

## 9. Live Test Results — 2026-04-10

All three tests run against the live local API immediately after upload and storage verification.

---

### Test 1 — Rates / Yield Curve Mechanics ✓ PASS

**Agent routed to:** `rates-agent` ✓

**Key output evidence:**

> "A 12 bp steepening in 2s10s driven by a 10-year yield rise with a flat 2-year is a classic **bear steepener**."

> "Contrast this with a **bull steepener**, where the 2-year yield falls (Fed easing expectations) while the 10-year holds or rises..."

> "if 3m10y is less steep or inverted while 2s10s steepens, it suggests the market sees near-term policy as stable but is demanding more compensation for longer-term risk (**term premium** or inflation uncertainty). This weakens the classic recession signal."

> "the **ACM term premium** component... investors are demanding more yield for holding longer duration, reflecting risk or inflation uncertainty rather than just Fed path repricing."

**Doc influence confirmed:** Named bear steepener without prompting, defined the bull steepener contrast, explicitly decomposed ACM term premium as the mechanism, addressed 3m10y vs 2s10s independently. The base model does not reliably decompose curve moves by regime and label them with ACM attribution without the yield curve doc.

---

### Test 2 — Commodities / OPEC and Geopolitical Shock ✓ PASS

**Agent routed to:** `commodities-agent` ✓

**Key output evidence:**

> "if it's **incremental to the existing OPEC+ quota**, it signals a deliberate tightening stance... However, if it's a **rebasing of the reference level**... the market impact is more muted and often already priced in."

> "The key is to watch **compliance data from the IEA and OPEC** to confirm if actual production falls by the announced amount."

> "Libya's production is notoriously volatile... 180 kb/d is often treated as a **transient, idiosyncratic shock** rather than a durable supply loss... The market tends to **discount Libya disruptions** unless they coincide with broader OPEC+ cuts or low spare capacity."

> "pushing prices above **fiscal breakevens (~$75-$85** for major producers)"

**Doc influence confirmed:** Incremental vs rebasing distinction is from the playbook's Saudi cut classification. Libya-specific discounting rule applied correctly. IEA compliance as the verification step. Fiscal breakeven reference with specific numbers. None of this is in the base model's default OPEC framing.

---

### Test 3 — Macro / Labor Market Deterioration ✓ PASS

**Agent routed to:** `macro-agent` ✓

**Key output evidence:**

> "You're right to focus on the **labor market deterioration playbook** here. The JOLTS drop of **520k from peak** and **quits rate falling below 2.0%** are classic early signals of labor market cooling."

> "NFP 3-month average at **95k, just below the 100k threshold**, is borderline but not yet a confirmed sustained weakness."

> "The **Sahm Rule — requiring a 0.5pp rise in the 3-month average unemployment rate from its 12-month low — has not triggered yet**"

> "the labor market is in the **early-to-mid phase of deterioration**: leading indicators (JOLTS, quits, claims) are flashing caution, but lagging headline NFP and unemployment data have not fully confirmed a recessionary turn."

> "A rebound in quits or a sustained NFP print above 100k would argue against a recession thesis"

**Doc influence confirmed:** The agent cited the playbook by name. All four threshold values appeared verbatim (520k > 500k, quits < 2.0%, 95k < 100k NFP average, Sahm Rule 0.5pp). The leading/lagging distinction — JOLTS and quits are early signals, NFP is a lagging confirmation — is the doc's core mechanism. The agent did not wait for NFP to confirm before framing a deterioration thesis.

---

### All Six Gate Conditions — Status

- [x] **Test 1 log:** Rates Agent retrieved `Yield Curve Mechanics and Interpretation` (confirmed by bear steepener + ACM + 3m10y output)
- [x] **Test 1 response:** Named regime, decomposed term premium vs rate expectations, addressed 3m10y vs 2s10s distinction
- [x] **Test 2 log:** Commodities Agent retrieved `OPEC and Geopolitical Shock Playbook` (confirmed by incremental/rebasing distinction + Libya threshold + IEA compliance output)
- [x] **Test 2 response:** Correctly distinguished Saudi signal from Libya noise, applied Libya-specific filtering, flagged IEA compliance as verification step
- [x] **Test 3 log:** Macro Agent retrieved `Labor Market Deterioration Playbook` (confirmed by playbook named directly + four threshold values cited)
- [x] **Test 3 response:** Named deterioration step, used JOLTS + quits as leading indicators before NFP, distinguished softening from recession-framing, stated Sahm Rule correctly

**Batch 3 gate: CLEARED.**
