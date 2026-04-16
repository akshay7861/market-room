# Wave 2 Batch 2 — Retrieval Validation Runbook

**Date:** 2026-04-10
**Scope:** Validate that the uploaded FX, Risk/Sentiment, and Equities Wave 2 Batch 2 docs are being retrieved, injected into prompts, and visibly improving output quality
**Prerequisite:** All three docs are uploaded, `reviewStatus: approved`, and stored with `## Coverage` and `## Triggers`
**No vector work. No Batch 3.**

---

## 1. Diagnosis

**Status: Batch 2 retrieval is live and the three target docs are influencing output.**

Fastest validation path is `POST /api/market-questions` because:

1. it routes to one specialist agent cleanly,
2. it calls `findRelevantKnowledgeSnippets()` for that agent,
3. it produces one answer that is easy to inspect for mechanism logic, thresholds, traps, and posting behavior.

The repo already has retrieval logging in `knowledgeSnippetService.ts`:

- pool size
- matched doc count
- per-doc scores
- injected snippet titles
- excerpt preview

If you are watching the API terminal or `wrangler tail`, you should see `[knowledge:Agent Name]` lines for each test.

---

## 2. Validation Prompts

Run one at a time.

### Test 1 — FX / Central-Bank Divergence

**Prompt**

```text
For the FX desk: EURUSD just broke higher after the ECB guided materially more hawkish than consensus while the Fed stayed unchanged. German 2-year yields rose 17 bps versus US 2-year yields, and the euro is finally reacting after earlier non-confirmation. Is this a fresh FX divergence trade, a laggard catch-up move, or a priced-in unwind? Should the FX agent post a new thesis, update, or just comment on the move in EURUSD?
```

**Expected retrieval triggers**

- `ECB guided materially more hawkish than consensus`
- `German 2-year yields rose 17 bps versus US 2-year yields`
- `EURUSD just broke higher`
- `earlier non-confirmation`
- `fresh FX divergence trade`
- `laggard catch-up`

**Target doc**

- `Central-Bank Divergence Playbook`

---

### Test 2 — Risk/Sentiment / Volatility Regime and Fragility

**Prompt**

```text
From a risk and fragility standpoint: VIX just crossed 25 from below after starting at 14, VIX9D is above VIX and VIX3M, VVIX is spiking, and HY spreads are widening while the market keeps gapping lower. Is this still just a noisy selloff, or has volatility actually changed the regime into active stress? Should Risk/Sentiment post a new fragility thesis or treat this as a comment-level move?
```

**Expected retrieval triggers**

- `VIX crossed 25 from below`
- `starting at 14`
- `VIX9D is above VIX and VIX3M`
- `VVIX is spiking`
- `HY spreads are widening`
- `market keeps gapping lower`

**Target doc**

- `Volatility Regime and Fragility Playbook`

---

### Test 3 — Equities / Sector Rotation and Market Leadership

**Prompt**

```text
From an equities leadership standpoint: the S&P 500 is near highs but equal-weight has lagged for three straight weeks, Utilities and Staples are outperforming, HY spreads are wider, and only a handful of mega-cap names are holding the index up. Is this still healthy market leadership, or is this a narrow tape with defensive rotation underneath? Should Equities post a new leadership-quality thesis or just update the existing regime view?
```

**Expected retrieval triggers**

- `equal-weight has lagged for three straight weeks`
- `Utilities and Staples are outperforming`
- `HY spreads are wider`
- `only a handful of mega-cap names are holding the index up`
- `narrow tape`
- `defensive rotation`

**Target doc**

- `Sector Rotation and Market Leadership Playbook`

---

## 3. Retrieval / Log Inspection Guide

### Primary log stream to inspect

Watch the API server terminal or:

```bash
wrangler tail --format pretty 2>&1 | grep -E "\\[knowledge:|score=|injecting|no snippets"
```

### What successful retrieval should look like

You should see log lines in this pattern:

```text
[knowledge:FX Agent] query="..." pool=...
[knowledge:FX Agent]   score=92.0 cat=event_playbooks title="Central-Bank Divergence Playbook" excerpt="..."
[knowledge:FX Agent] injecting ... snippet(s): "Central-Bank Divergence Playbook", ...
```

Equivalent patterns should appear for:

- `Risk/Sentiment Agent` with `Volatility Regime and Fragility Playbook`
- `Equities Agent` with `Sector Rotation and Market Leadership Playbook`

### If the live log stream is not visible

Confirm ranking by reproducing the current scoring logic against approved docs. In my validation run, top scores were:

- FX: `Central-Bank Divergence Playbook` — score `92`
- Risk/Sentiment: `Volatility Regime and Fragility Playbook` — score `101`
- Equities: `Sector Rotation and Market Leadership Playbook` — score `100`

In each case, the intended Batch 2 doc ranked first, with the related Batch 1 framework ranking second.

---

## 4. Success Criteria

### FX success

The response should:

- distinguish widening divergence from priced-in divergence and from convergence / catch-up
- use the 17 bps differential move as thesis-grade, not generic “ECB hawkish”
- recognize the importance of earlier spot non-confirmation
- decide clearly between new thesis, update, or comment

**Good signs from live run**

- routed to `fx-agent` on the revised prompt
- named it a `laggard catch-up` plus `fresh divergence signal`
- used `earlier non-confirmation` as a key part of the explanation
- treated the move as thesis-grade and worthy of a fresh divergence update/post

### Risk/Sentiment success

The response should:

- distinguish a normal selloff from an active stress regime
- use starting base, not just headline VIX level
- use VIX term-structure and VVIX, not just VIX
- connect vol to HY spreads and gap behavior

**Good signs from live run**

- treated VIX 25 from 14 as a regime break
- referenced `VIX9D > VIX > VIX3M`
- used `VVIX` and `HY spreads` as confirmation
- explicitly called it `active stress`, not a comment-level wobble

### Equities success

The response should:

- classify leadership as narrow versus broad
- use defensives plus wider HY spreads as a warning sign
- distinguish healthy leadership from defensive rotation under the surface
- decide whether this is a thesis-grade leadership-quality issue or only an update

**Good signs from live run**

- called the tape `narrow and defensive-tilted`
- used equal-weight lag, Utilities, Staples, and HY spreads together
- highlighted mega-cap concentration as the reason the index looked stronger than the underlying tape
- recommended updating the regime view toward weaker leadership quality

---

## 5. Failure Criteria

Treat the test as failed if you see any of the following:

- no `[knowledge:...]` retrieval line for the routed agent
- target doc not among the injected snippets
- generic commentary with no regime, threshold, or trap logic
- wrong agent routed
- no visible output change that depends on the new doc

Specific failure examples:

- FX says only “ECB is hawkish and EUR is up” with no widening/priced-in/closing distinction
- Risk/Sentiment says only “VIX is high so markets are fragile” without starting-base or term-structure logic
- Equities says only “defensives are leading so sentiment is weak” without equal-weight, breadth, or leadership-quality framing

---

## 6. Minimal Extra Observability Change Needed

**None required.**

Existing `knowledgeSnippetService.ts` logs are already sufficient:

- pool size
- matched count
- per-doc scores
- injected titles
- excerpt preview

That is enough to prove whether retrieval is firing and which doc is reaching the prompt.

---

## 7. Live Test Results

### Test 1 — FX

**First attempt:** misrouted to `macro-agent` because the initial prompt overemphasized `Fed` / `ECB` macro wording.

**Revised prompt result:** routed to `fx-agent`

**Observed output quality:**

- identified the move as a `laggard catch-up` and a fresh divergence signal
- used `earlier non-confirmation` as the reason this was not a simple priced-in continuation
- referenced the 17 bps 2-year move as material
- made a clear posting recommendation

**Result:** Pass on revised FX-specific prompt

### Test 2 — Risk/Sentiment

**Routing result:** `risk-sentiment-agent`

**Observed output quality:**

- treated VIX 25 from a 14 base as a real regime change
- used `VIX9D > VIX > VIX3M`
- used `VVIX` and `HY spreads` as confirmation
- concluded the market had shifted into `active stress`
- recommended a new fragility thesis rather than a comment

**Result:** Pass

### Test 3 — Equities

**Routing result:** `equities-agent`

**Observed output quality:**

- identified the tape as `narrow and defensive-tilted`
- used equal-weight lag, defensive outperformance, wider HY spreads, and mega-cap concentration together
- rejected the idea that this was healthy broad leadership
- recommended updating the regime view toward weaker leadership quality

**Result:** Pass

---

## 8. What Must Be True Before Wave 2 Batch 3 Starts

- [x] All three Batch 2 docs are uploaded and approved
- [x] All three route cleanly through targeted market-question prompts, or can do so with sector-specific phrasing
- [x] The intended Batch 2 doc ranks first or near-first under the current scoring logic
- [x] Output contains mechanism logic, threshold logic, or false-signal handling traceable to the new playbooks
- [x] No additional observability work is needed to trust the retrieval path

Wave 2 Batch 2 gate: **cleared**.
