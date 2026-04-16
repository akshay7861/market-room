# Ask Market Stock-Idea Mode Runbook

## Problem

Ask Market could answer a stock-name question as a market-interpretation question. Example failure pattern:

- user asks for green stocks / names / what to buy / watchlist
- routing chooses Commodities because "green energy" or "energy" overlaps with commodity language
- answer discusses WTI, oil prices, or broad market conditions
- answer does not provide stock names

This made generic ChatGPT look more useful because ChatGPT supplied named stocks and sector buckets.

## What Changed

### Routing

Stock-name intent now strongly boosts the Equities agent when the user asks for:

- stocks
- tickers
- companies
- names
- ETFs
- what to buy
- watchlists
- thematic baskets
- green / clean-energy stocks
- energy stocks

Commodities is demoted when the prompt is asking for stocks rather than physical commodity mechanics.

### Prompt Behavior

When a routed Equities question has stock-name intent, the prompt now includes a `Stock-Idea Answer Mode` block.

That block requires the agent to:

- provide named candidates
- categorize the basket
- separate direct plays from second-order beneficiaries
- include ETFs when useful
- explain the market driver
- include false-signal logic
- avoid presenting the answer as personalized financial advice

### Curated Knowledge Asset

Created:

- `knowledge/equities/instrument-guides/thematic-equity-basket-guide.md`

This is an internal reasoning doc for stock-name / thematic basket questions. It covers:

- green / clean-energy baskets
- energy equity baskets
- AI infrastructure baskets
- ETFs
- false positives
- cross-asset regime filters

## Validation Prompts

### Test 1 — Green Stocks

```text
What green stocks should I watch right now? Give me names, not just macro or oil commentary, and explain what would make the basket work or fail.
```

Expected:

- routed to Equities
- includes named candidates such as `FSLR`, `ENPH`, `SEDG`, `NEE`, `BEP`, `ETN`, `PWR`, `ALB`, `SQM`, `TAN`, `ICLN`, `QCLN`
- says real yields / financing conditions matter
- says higher oil alone is a false signal

### Test 2 — Energy Stocks

```text
Which energy stocks benefit if WTI stays high? Give me stock names and split majors, E&P, services, midstream, and ETFs.
```

Expected:

- routed to Equities, not Commodities
- includes `XOM`, `CVX`, `SHEL`, `TTE`, `COP`, `EOG`, `DVN`, `FANG`, `SLB`, `HAL`, `BKR`, `ENB`, `KMI`, `WMB`, `ET`, `XLE`, `XOP`, `OIH`
- explains that WTI beta differs by subsector

### Test 3 — AI Infrastructure Names

```text
What AI infrastructure stocks should I look at beyond Nvidia? Split semis, equipment, power/grid, and cloud platforms.
```

Expected:

- routed to Equities
- includes named baskets
- explains capex, margin, free-cash-flow, and power bottleneck risks

## Logs To Inspect

Routing:

```text
[routing] heuristic top=Equities Agent ...
[routing]   Equities Agent ... via=..., stock-idea-intent
```

Knowledge:

```text
[knowledge:Equities Agent] ...
```

Memory:

```text
[memory-inject:Equities Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration
```

## Success Criteria

- stock-name prompts route to Equities
- answer provides names when names are requested
- answer does not stop at WTI / macro context
- answer includes risk filters and false-signal logic
- answer still uses live market context and memory

## Remaining Gap

The thematic basket doc must be uploaded through Admin to become part of the approved knowledge pool. Until then, the core green/energy/AI baskets are still injected through the Ask Market stock-idea prompt mode, so the live behavior improves immediately.
