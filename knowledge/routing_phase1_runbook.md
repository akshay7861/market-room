# Routing Phase 1 Runbook

## 1. Files Changed

### Code

- `/Users/akshaysingh/Documents/New project/apps/api/src/lib/services/marketQuestionsService.ts`

### Docs

- `/Users/akshaysingh/Documents/New project/knowledge/routing_phase1_plan.md`
- `/Users/akshaysingh/Documents/New project/knowledge/routing_phase1_runbook.md`

## 2. Routing Logic Added Or Adjusted

### Weighted sector terms and phrases

The Ask Market heuristic no longer counts all keywords equally.

It now gives stronger weights to specialist signals such as:

- FX:
  - `eurusd`
  - `usdjpy`
  - `carry`
  - `cross-currency basis`
  - `dollar funding`
  - `intervention`
  - `policy divergence`
- Rates:
  - `term premium`
  - `breakeven`
  - `real yield`
  - `duration`
  - `yield curve`
  - `bond vigilante`
- Equities:
  - `equal-weight`
  - `sector rotation`
  - `earnings quality`
  - `free cash flow`
  - `leadership`
  - `margins`
- Risk/Sentiment:
  - `VIX`
  - `HY spreads`
  - `crowding`
  - `fragility`
  - `de-grossing`
  - `positioning`

### Lead-sentence weighting

Signals in the first sentence now matter more than later generic macro wording.

This helps prevent:

- FX prompts being swallowed by Macro because they mention `Fed`
- Equities prompts being swallowed by Macro because they mention rates

### Lightweight knowledge-aware routing boost

The router now uses a small score from the approved knowledge pool per agent:

- titles
- summaries
- structured metadata sections

This is not a new retrieval system. It is just a small tie-break / confidence feature using knowledge already in the system.

### Better tie-breaking

If the heuristic is clearly ahead, it now wins directly.

If the routing is close, the LLM still gets a chance to break the tie, but it now sees the heuristic ranking and signal explanations.

## 3. Logging Added

New routing logs:

```text
[routing] heuristic top=FX Agent score=20.6 margin=12.1 question="..."
[routing]   FX Agent score=20.6 via=explicit-sector, term:eurusd, lead:eurusd, term:euro, knowledge:6.0
[routing]   Rates Agent score=8.5 via=term:2year, knowledge:6.0
[routing]   Macro Agent score=8.1 via=term:fed, lead:fed, knowledge:5.5
[routing] selected heuristic winner FX Agent without llm tie-break
```

These make it easy to inspect:

- who won
- how large the margin was
- which features mattered
- whether the heuristic was trusted directly or the LLM had to arbitrate

## 4. Validation Prompts

### FX / previously fragile case

```text
For the FX desk: EURUSD just broke higher after the ECB guided materially more hawkish than consensus while the Fed stayed unchanged. German 2-year yields rose 17 bps versus US 2-year yields, and the euro is finally reacting after earlier non-confirmation. Is this a fresh FX divergence trade, a laggard catch-up move, or a priced-in unwind?
```

Expected route:

- `FX Agent`

### Risk/Sentiment

```text
From a risk and fragility standpoint: VIX just crossed 25 from below after starting at 14, VIX9D is above VIX and VIX3M, VVIX is spiking, and HY spreads are widening while the market keeps gapping lower. Is this still just a noisy selloff, or has volatility actually changed the regime into active stress?
```

Expected route:

- `Risk/Sentiment Agent`

### Equities with rates language mixed in

```text
From an equities leadership standpoint: 10-year real yields rose 17 bps in a week, equal-weight has lagged for three straight weeks, Utilities and Staples are outperforming, HY spreads are wider, and only a handful of mega-cap names are holding the index up. Is this still healthy market leadership, or is this a narrow tape with defensive rotation underneath?
```

Expected route:

- `Equities Agent`

### Rates mechanism question

```text
For the Rates agent: this looks like a bond-vigilante selloff driven by Treasury supply indigestion and duration fatigue, not a clean inflation-expectations story. Should you treat this as term-premium steepening or a different regime?
```

Expected route:

- `Rates Agent`

## 5. Success Criteria

Routing Phase 1 is a success if:

1. the FX divergence prompt routes to `FX Agent` without needing prompt rewrites
2. risk/fragility prompts route to `Risk/Sentiment Agent`
3. equities leadership prompts route to `Equities Agent` even when rates language is present
4. rates mechanism prompts route to `Rates Agent`
5. logs clearly explain the winning sector and the runner-up margin

## 6. Failure Criteria

Treat the phase as failed if:

1. broad Macro wording still routinely beats clear specialist structure
2. logs do not make the decision inspectable
3. routing only improves when the user manually writes to the heuristic
4. the new logic creates obvious regressions on clean specialist prompts

## 7. Live Validation Results

Observed on `2026-04-10` with a local dev server on port `8793`:

### FX

- routed to `FX Agent`
- top routing margin over Macro was large
- decisive signals included:
  - `explicit-sector`
  - `eurusd`
  - knowledge-aware boost

### Risk/Sentiment

- routed to `Risk/Sentiment Agent`
- decisive signals included:
  - `vix`
  - `fragility`
  - `HY spreads`
  - knowledge-aware boost

### Equities

- routed to `Equities Agent`
- did not get swallowed by Macro or Rates despite `10-year real yields`
- decisive signals included:
  - `explicit-sector`
  - `leadership`
  - `equal-weight`

### Rates

- rates mechanism prompt remained routable to `Rates Agent`
- decisive signals included:
  - `bond vigilante`
  - `duration`
  - `term premium`
  - knowledge-aware boost

## 8. What Still Remains Unresolved After Routing Phase 1

Routing Phase 1 does not solve:

- wrong retrieval ranking inside the correct agent
- duplicate approved knowledge pools
- weak excerpt selection
- true semantic similarity misses
- Market Room orchestration behavior

It only improves first-hop specialist assignment for Ask Market.
