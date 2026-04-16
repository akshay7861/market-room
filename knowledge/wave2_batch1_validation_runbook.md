# Wave 2 Batch 1 — Retrieval Validation Runbook

**Date:** 2026-04-10
**Scope:** Validate that the uploaded FX, Risk/Sentiment, and Equities Wave 2 Batch 1 docs are being retrieved, injected into prompts, and changing output quality
**Prerequisite:** All three docs are uploaded, `reviewStatus: approved`, and stored with `## Coverage` and `## Triggers` sections
**No vector work. No Batch 2.**

---

## 1. Diagnosis

**Status: Batch 1 retrieval is live and the three target docs are influencing output.**

Fastest validation path is `POST /api/market-questions` because:

1. it routes to one specialist agent cleanly,
2. it calls `findRelevantKnowledgeSnippets()` for that agent,
3. it produces one answer that is easy to inspect for mechanism, thresholds, traps, and posting logic.

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

### Test 1 — FX / Carry and Rate Differentials

**Prompt**

```text
From an FX standpoint: US 2-year yields widened 18 bps versus German 2-year yields over five sessions, but AUDJPY is rolling over, DXY is up 1.1% in two days, and cross-currency basis is widening. Is this still a clean carry setup, or has the regime shifted from rate-differential support toward funding stress? Should the FX agent post a new thesis, update an existing one, or stay cautious because the spot move is no longer confirming the carry signal?
```

**Expected retrieval triggers**

- `2-year yields widened 18 bps`
- `AUDJPY`
- `DXY`
- `cross-currency basis`
- `carry`
- `funding stress`

**Target doc**

- `Carry and Rate Differential Framework`

---

### Test 2 — Risk/Sentiment / Positioning and Crowding

**Prompt**

```text
From a risk and positioning perspective: the S&P 500 is still near highs, but equal-weight has lagged for six sessions, HY spreads are 24 bps wider, VIX jumped from 13 to 17, and the market just gapped lower on a second-tier headline. Is this still healthy risk-on, or are we in crowded risk-on moving toward fragile equilibrium or de-grossing? Is this a comment, update, or new fragility thesis?
```

**Expected retrieval triggers**

- `equal-weight has lagged for six sessions`
- `HY spreads are 24 bps wider`
- `VIX jumped from 13 to 17`
- `gapped lower on a second-tier headline`
- `crowded risk-on`
- `fragile equilibrium`

**Target doc**

- `Positioning and Crowding Framework`

---

### Test 3 — Equities / Regime Classification

**Prompt**

```text
From an equities regime standpoint: 10-year real yields rose 17 bps in a week, equal-weight is lagging the cap-weighted S&P for five sessions, HY spreads are 22 bps wider, but the index is holding up on a handful of mega-cap leaders while earnings revisions outside that group are softening. Is this still a liquidity-relief rally, or has the tape shifted into rates-driven compression or a late-cycle narrow leadership regime? Should Equities post a new regime thesis or just update the existing tape view?
```

**Expected retrieval triggers**

- `10-year real yields rose 17 bps`
- `equal-weight is lagging`
- `HY spreads are 22 bps wider`
- `mega-cap leaders`
- `earnings revisions ... softening`
- `rates-driven compression`
- `liquidity-relief rally`

**Target doc**

- `Equity Regime Framework: Rates, Growth, Liquidity, Earnings`

---

## 3. Retrieval / Log Inspection Guide

### Primary log stream to inspect

Watch the API server terminal or:

```bash
wrangler tail --format pretty 2>&1 | grep -E "\\[knowledge:|score=|injecting|no snippets"
```

### What successful retrieval should look like

You should see lines in this pattern:

```text
[knowledge:FX Agent] query="..." pool=7 matched=3
[knowledge:FX Agent]   score=93.5 cat=frameworks title="Carry and Rate Differential Framework" excerpt="..."
[knowledge:FX Agent] injecting 3 snippet(s): "Carry and Rate Differential Framework", ...
```

Equivalent patterns should appear for:

- `Risk/Sentiment Agent` with `Positioning and Crowding Framework`
- `Equities Agent` with `Equity Regime Framework: Rates, Growth, Liquidity, Earnings`

### If you cannot access the live log stream

Use the same prompts and confirm that the top-scoring document under the current scoring logic is the expected one. In my live validation run, top-score reproduction using the current scoring logic returned:

- FX: `Carry and Rate Differential Framework` — score `93.5`
- Risk/Sentiment: `Positioning and Crowding Framework` — score `74.5`
- Equities: `Equity Regime Framework: Rates, Growth, Liquidity, Earnings` — score `102.5`

That is strong evidence that the intended docs are the first retrieved items for these prompts.

---

## 4. Success Criteria

### FX success

The response should:

- identify the regime shift from clean carry / policy divergence toward funding stress
- distinguish nominal differential from funding conditions
- use spot non-confirmation as a reason to downgrade a pure carry thesis
- recommend `update` or caution, not a blind new carry post

**Good signs from live run**

- named `policy divergence` vs `funding stress`
- used `cross-currency basis` as the regime-break signal
- noted `AUDJPY softness despite the yield gap`
- recommended updating the thesis rather than blindly posting a fresh carry view

### Risk/Sentiment success

The response should:

- classify the tape as crowded risk-on / fragile equilibrium / de-grossing path, not generic “fragile”
- cite breadth, credit, and vol together rather than one indicator alone
- use threshold-like reasoning on VIX and HY spread widening
- decide between comment, update, and new thesis explicitly

**Good signs from live run**

- identified `narrowing leadership`
- used `HY spreads` and `VIX` together as confirmation
- called it `fragile equilibrium`
- recommended an `update`, not an overconfident full de-grossing call

### Equities success

The response should:

- classify the tape by dominant driver
- distinguish `rates-driven compression` from `liquidity relief`
- use breadth / cap-weight vs equal-weight / HY spread confirmation
- identify narrow leadership as regime quality deterioration, not broad strength

**Good signs from live run**

- named `rates-driven compression regime`
- rejected the `liquidity-relief rally` interpretation
- highlighted `mega-cap concentration` and `narrowing leadership`
- treated it as an `update` to regime view rather than a generic bullish/bearish comment

---

## 5. Failure Criteria

Treat the test as failed if you see any of the following:

- no `[knowledge:...]` retrieval line for the routed agent
- target doc not among the injected snippets
- generic commentary like “dollar is strong,” “sentiment is fragile,” or “stocks are under pressure” without regime/mechanism logic
- no threshold, state classification, or trap logic from the uploaded doc
- wrong agent routed
- response could have been written before the doc was uploaded

Specific failure examples:

- FX says only “USD is strong because yields are up” and never mentions basis or funding stress
- Risk/Sentiment says only “markets look fragile” and never discusses breadth + credit + vol together
- Equities says only “higher yields pressure stocks” and never classifies rates-driven compression vs liquidity relief

---

## 6. Minimal Extra Observability Change Needed

**None required.**

The existing `knowledgeSnippetService.ts` logging is already sufficient:

- pool size
- matched count
- per-doc scores
- injected titles
- excerpt preview

That is enough to prove whether retrieval is firing and which doc is reaching the prompt.

---

## 7. Live Test Results

### Test 1 — FX

**Routing result:** `fx-agent`

**Observed output quality:**

- correctly framed the setup as shifting away from clean carry
- named `policy divergence` and `funding stress`
- used `cross-currency basis widening` as the key disconfirming signal
- explicitly treated `AUDJPY softness` as spot non-confirmation
- recommended updating the thesis, not posting a fresh pure-carry take

**Result:** Pass

### Test 2 — Risk/Sentiment

**Routing result:** `risk-sentiment-agent`

**Observed output quality:**

- identified `narrowing leadership`
- used `HY spreads +24 bps` and `VIX 13 to 17` as confirmation
- called the state `fragile equilibrium`
- resisted overcalling full `de-grossing`
- recommended a fragility update rather than generic commentary

**Result:** Pass

### Test 3 — Equities

**Routing result:** `equities-agent`

**Observed output quality:**

- identified `rates-driven compression regime`
- rejected `liquidity relief` as the dominant current explanation
- used `real yields`, `equal-weight lag`, `HY widening`, and `mega-cap concentration` together
- named `late-cycle narrow leadership`
- recommended updating the regime thesis rather than treating the move as broad-based strength

**Result:** Pass

---

## 8. What Must Be True Before Wave 2 Batch 2 Starts

- [x] All three Batch 1 docs are uploaded and approved
- [x] All three route cleanly through targeted market-question prompts
- [x] The intended doc is the top retrieved or top-scoring match for each prompt
- [x] Output contains mechanism-level language traceable to the uploaded doc
- [x] Output contains regime, threshold, or false-signal logic that was weak or absent before upload
- [x] No additional observability work is needed to trust the retrieval path

Wave 2 Batch 1 gate: **cleared**.
