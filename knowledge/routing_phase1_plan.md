# Routing Phase 1 Plan

## 1. Current Routing Weaknesses

The current Ask Market router was still too flat:

- mostly unweighted keyword counting
- broad Macro words like `fed`, `inflation`, `growth`, `payroll` could overpower more specific sector intent
- little recognition of lead-sentence importance
- no use of the uploaded knowledge library as a routing signal
- limited visibility into why a sector won

Concrete observed failure:

- FX divergence prompt was initially misrouted to Macro because the question overemphasized `Fed` / `ECB` wording before clear FX cues.

## 2. Proposed Improvements

### Better weighted sector signals

Add stronger signals for:

- FX: `eurusd`, `usdjpy`, `audjpy`, `carry`, `cross-currency basis`, `dollar funding`, `intervention`, `policy divergence`
- Rates: `term premium`, `breakeven`, `real yield`, `Treasury`, `duration`, `yield curve`, `bond vigilante`
- Equities: `equal-weight`, `sector rotation`, `earnings quality`, `free cash flow`, `leadership`, `margins`
- Risk/Sentiment: `VIX`, `HY spreads`, `crowding`, `fragility`, `de-grossing`, `positioning`

### Lead-sentence weighting

If the first sentence contains specialist language, weight it more heavily than later generic macro framing.

### Lightweight knowledge-aware routing tie-break

Use approved document titles / summaries / metadata as a small routing feature, not a new retrieval system.

### Better tie-breaking

If the heuristic is clearly confident, use it directly.
If the heuristic is close, let the LLM break ties with the heuristic ranking shown explicitly.

### Better logs

Log:

- top routing winner
- margin vs runner-up
- top 3 sector candidates
- which signals contributed to each score
- whether heuristic was trusted directly or LLM was used

## 3. Expected Gains

Expected improvements:

- fewer FX prompts swallowed by Macro
- fewer Equities questions swallowed by Macro just because they mention rates/inflation
- fewer Risk/Sentiment questions swallowed by broader market language
- less need to hand-craft prompts purely to satisfy the router

## 4. Test Prompts By Agent

### FX

```text
For the FX desk: EURUSD just broke higher after the ECB guided materially more hawkish than consensus while the Fed stayed unchanged. German 2-year yields rose 17 bps versus US 2-year yields, and the euro is finally reacting after earlier non-confirmation. Is this a fresh FX divergence trade, a laggard catch-up move, or a priced-in unwind?
```

### Rates

```text
For the Rates agent: this looks like a bond-vigilante selloff driven by Treasury supply indigestion and duration fatigue, not a clean inflation-expectations story. Should you treat this as term-premium steepening or a different regime?
```

### Equities

```text
From an equities leadership standpoint: the S&P 500 is near highs but equal-weight has lagged for three straight weeks, Utilities and Staples are outperforming, HY spreads are wider, and only a handful of mega-cap names are holding the index up. Is this still healthy market leadership, or is this a narrow tape with defensive rotation underneath?
```

### Risk/Sentiment

```text
From a risk and fragility standpoint: VIX just crossed 25 from below after starting at 14, VIX9D is above VIX and VIX3M, VVIX is spiking, and HY spreads are widening while the market keeps gapping lower. Is this still just a noisy selloff, or has volatility actually changed the regime into active stress?
```

## 5. What Routing Still Will Not Solve

Routing Phase 1 will not solve:

- wrong retrieval ranking inside the correct agent
- duplicate approved knowledge pools
- weak excerpt selection
- true semantic retrieval misses
- Market Room orchestration noise

It only improves the odds that the correct specialist gets the question first.
