# Wave 2 Batch 3 — Retrieval Validation Runbook

**Date:** 2026-04-10  
**Scope:** Validate that the uploaded FX, Risk/Sentiment, and Equities Wave 2 Batch 3 docs are being retrieved, injected into prompts, and visibly improving output quality  
**Prerequisite:** All three docs are uploaded, `reviewStatus: approved`, and stored with `## Coverage` and `## Triggers`  
**No vector work. No dynamic memory yet.**

---

## 1. Diagnosis

**Status: Batch 3 retrieval is live and the three target docs are influencing output.**

The fastest validation path remains `POST /api/market-questions` because:

1. it routes to one specialist agent,
2. it calls `findRelevantKnowledgeSnippets()` for that agent,
3. it produces one answer that is easy to inspect for mechanism logic, thresholds, traps, and posting behavior.

The repo already has retrieval logging in `knowledgeSnippetService.ts`:

- pool size
- matched doc count
- per-doc scores
- injected snippet titles
- excerpt preview

If you are watching the API server terminal or `wrangler tail`, you should see `[knowledge:Agent Name]` lines for each test.

Because the live server logs were not attached to this terminal thread, ranking was also confirmed by reproducing the current `knowledgeSnippetService.ts` scoring logic against the approved knowledge documents.

---

## 2. Validation Prompts

Run one at a time.

### Test 1 — FX / Dollar Funding Stress and Intervention

**Prompt**

```text
For the FX desk: DXY is up 1.4% in two sessions, EUR/USD cross-currency basis just widened to -34 bps outside quarter-end, USD/JPY basis is also deteriorating, and traders are talking about Fed swap-line usage if funding stress worsens. Is this still just a hawkish-dollar move, or has the regime shifted into real dollar funding stress? How should the FX agent classify this: new thesis, update, or comment only?
```

**Expected retrieval triggers**

- `EUR/USD cross-currency basis just widened to -34 bps outside quarter-end`
- `USD/JPY basis is also deteriorating`
- `Fed swap-line usage`
- `dollar funding stress`
- `hawkish-dollar move`

**Target doc**

- `Dollar Funding Stress and Intervention Playbook`

---

### Test 2 — Risk/Sentiment / Risk-On-Risk-Off Transmission

**Prompt**

```text
Risk/Sentiment hypothetical: ignore the current live market snapshot and classify this stress pattern on its own terms. S&P 500 down 1.8%, HY credit spreads +34 bps, EM FX selling off, USD and JPY both firmer, VIX through 22, and gold down because real yields are rising. Is this canonical risk-off or a fractured cross-asset regime? Should Risk/Sentiment post a new thesis or only comment?
```

**Expected retrieval triggers**

- `HY credit spreads +34 bps`
- `EM FX selling off`
- `USD and JPY both firmer`
- `VIX through 22`
- `gold down because real yields are rising`
- `fractured cross-asset regime`

**Target doc**

- `Risk-On / Risk-Off Transmission Guide`

---

### Test 3 — Equities / Earnings Quality and Margin Pressure

**Prompt**

```text
For the Equities agent on an earnings question: a stock just beat EPS, but gross margin missed by 80 bps, operating margin fell, free cash flow guidance was unchanged, and management said input costs are still rising even though revenue beat because price was up and volume was soft. Is this a high-quality earnings beat, or a low-quality equity beat with margin pressure building? Should Equities post a new thesis or just comment?
```

**Expected retrieval triggers**

- `gross margin missed by 80 bps`
- `operating margin fell`
- `free cash flow guidance was unchanged`
- `price was up and volume was soft`
- `high-quality earnings beat`
- `margin pressure building`

**Target doc**

- `Earnings Quality and Margin Pressure Interpretation Guide`

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
[knowledge:FX Agent]   score=99.0 cat=event_playbooks title="Dollar Funding Stress and Intervention Playbook" excerpt="..."
[knowledge:FX Agent] injecting ... snippet(s): "Dollar Funding Stress and Intervention Playbook", ...
```

Equivalent patterns should appear for:

- `Risk/Sentiment Agent` with `Risk-On / Risk-Off Transmission Guide`
- `Equities Agent` with `Earnings Quality and Margin Pressure Interpretation Guide`

### Ranking evidence from score reproduction

Using the current `knowledgeSnippetService.ts` scoring logic against approved docs, the top matches were:

- FX: `Dollar Funding Stress and Intervention Playbook` — score `99.0`
- Risk/Sentiment: `Risk-On / Risk-Off Transmission Guide` — score `91.0`
- Equities: `Earnings Quality and Margin Pressure Interpretation Guide` — score `113.0`

In each case, the active earlier Wave 2 docs for that agent ranked behind the new Batch 3 doc:

- FX: Carry framework second, divergence playbook third
- Risk/Sentiment: vol playbook second, positioning framework third
- Equities: regime framework second, sector rotation playbook third

That is the ranking shape we want.

---

## 4. Success Criteria

### FX success

The response should:

- distinguish policy divergence from true funding stress
- use the `-34 bps` basis move as above the real-stress threshold
- treat quarter-end seasonality as the false-signal test
- use swap-line chatter as escalation context rather than simple Fed hawkishness

**Good signs from live run**

- routed to `fx-agent`
- called the move an early warning signal for dollar funding stress
- explicitly noted that the basis move was outside typical technical windows
- treated the answer as an `update` to carry/divergence rather than a generic dollar-strength comment

### Risk/Sentiment success

The response should:

- identify that the move is mostly canonical risk-off but with a fracture
- use the simultaneous USD + JPY strength plus gold weakness as the fracture
- connect gold weakness to rising real yields rather than ignoring it
- decide clearly between new thesis and comment

**Good signs from live run**

- routed to `risk-sentiment-agent`
- identified the pattern as largely canonical risk-off with a nuanced fractured overlay
- explicitly tied gold weakness to rising real yields
- said the fractured safe-haven mix changes the quality of the regime call

### Equities success

The response should:

- classify the quarter as a low-quality beat
- use the `80 bps` gross-margin miss as the key threshold breach
- connect operating-margin decline and unchanged FCF guidance to weak quality
- distinguish headline EPS from real earnings quality

**Good signs from live run**

- routed to `equities-agent`
- called it a classic low-quality earnings beat
- used gross-margin miss, operating-margin decline, and unchanged FCF guidance together
- treated the setup as margin-compression risk rather than a simple positive earnings surprise

---

## 5. Failure Criteria

Treat the test as failed if you see any of the following:

- no `[knowledge:...]` retrieval line for the routed agent
- target doc not among the injected snippets
- generic commentary with no threshold, trap, or mechanism logic
- wrong agent routed
- no visible output change that depends on the new doc

Specific failure examples:

- FX says only “the dollar is strong because the Fed is hawkish” with no basis or swap-line discussion
- Risk/Sentiment says only “markets look risk-off” without naming the fractured gold / real-yield pattern
- Equities says only “the beat was mixed” without separating EPS, gross margin, and cash-flow quality

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

**Result:** pass

**Observed output quality:**

- routed to `fx-agent`
- identified the move as an early warning signal for funding stress
- used the basis widening outside quarter-end as the key evidence
- treated swap-line chatter as escalation context
- classified the setup as an `update`, not just generic dollar strength

### Test 2 — Risk/Sentiment

**Result:** pass

**Observed output quality:**

- routed to `risk-sentiment-agent`
- identified the move as broadly canonical risk-off with a fractured overlay
- used HY spreads, EM FX, USD + JPY strength, and VIX together
- explicitly used gold weakness plus rising real yields as the fracture signal
- recommended a thesis if persistent rather than flattening everything into a one-line selloff summary

### Test 3 — Equities

**Result:** pass

**Observed output quality:**

- routed to `equities-agent`
- labeled the quarter a low-quality beat
- used the `80 bps` gross-margin miss, operating-margin decline, and unchanged FCF guidance
- distinguished price-led revenue from strong demand quality
- recommended comment/caution rather than a fresh bullish thesis

---

## 8. What Must Be True for Wave 2 To Be Considered Complete

Wave 2 is complete only if all nine docs across FX, Risk/Sentiment, and Equities are:

- uploaded and approved,
- stored with clean markdown and metadata sections,
- retrievable by the current local knowledge pipeline,
- and validated through live prompts where the intended doc ranks first or near-first and visibly changes the answer.

That condition is now met if:

- Batch 1, Batch 2, and Batch 3 upload runbooks all pass
- Batch 1, Batch 2, and Batch 3 validation runbooks all pass
- outputs now show:
  - FX reasoning across carry, divergence, and dollar stress
  - Risk/Sentiment reasoning across crowding, volatility, and transmission
  - Equities reasoning across regime, leadership, and earnings quality
