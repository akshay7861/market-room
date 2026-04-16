# Equity Universe Quote Lookup Runbook

## What Was Implemented

The backend now supports a lightweight equity universe and on-demand quote lookup for Ask Market Equities questions.

This is not a full global real-time terminal. It is a free-first quote layer designed to make the Equities Agent answer stock-name and stock-movement questions with live/near-live prices for the relevant subset of names.

## Source Universe

Imported from:

`/Users/akshaysingh/Desktop/Universe stocks.xlsx`

Generated backend file:

`apps/api/src/lib/equities/equityUniverse.json`

Universe size:

- `7,075` rows
- includes Bloomberg ticker, RIC ticker, resolved Yahoo symbol, company name, and region

## Quote Provider

Current quote provider:

`Yahoo Finance chart API`

Endpoint pattern:

`https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=1d&interval=1d`

No API key is required.

## How It Works

When Ask Market routes a question to the Equities Agent and detects equity quote intent, the system:

1. Searches the 7,075-stock universe.
2. Adds curated ETF / ADR entries that were missing from the Excel universe.
3. Selects up to `30` relevant candidates.
4. Fetches live/near-live Yahoo quotes.
5. Caches each quote for `20 minutes`.
6. Injects a `## Relevant Equity Universe Prices` block into the Equities prompt.

## Trigger Examples

Quote lookup triggers for prompts like:

- `What green stocks should I watch?`
- `Which energy stocks benefit if WTI stays high?`
- `Why is NVDA moving today?`
- `Compare FSLR and ENPH.`
- `What AI infrastructure stocks are leading?`

## Curated Themes

The service has preferred baskets for:

- green energy
- energy equities
- AI infrastructure
- banks
- semiconductors

These baskets are only a first layer. The full universe is still searched by ticker, company name, region, and prompt terms.

## Prompt Injection

The Equities prompt now receives rows like:

```text
## Relevant Equity Universe Prices
Universe match: green_energy. Use these live/near-live quote rows when explaining stock movement.
Live quote candidates:
- FSLR | First Solar Inc | US | $181 | +1.24% | source=Yahoo Finance chart
- ENPH | Enphase Energy Inc | US | $58 | -0.80% | source=Yahoo Finance chart
```

The agent is instructed to use live moves when the user asks for stocks or movement.

## Important Limits

- The system does not fetch all 7,075 prices on every question.
- It fetches only the top relevant subset, capped at 30 symbols.
- Quotes are cached for 20 minutes.
- Yahoo symbols are resolved from Bloomberg tickers first, with RIC fallback.
- Some non-US symbols may still fail because global ticker conventions are messy.

## Logs To Inspect

Look for:

```text
[equity-quotes] queryType=green_energy candidates=30 live=24 symbols=FSLR,ENPH,...
```

Also inspect:

```text
[routing] ... equity-quote-intent
[knowledge:Equities Agent] ...
[memory-inject:Equities Agent] ...
```

## Success Criteria

- Stock-name questions route to Equities.
- The answer includes actual stock names and live/near-live moves.
- The agent interprets the move by theme, sector, and regime.
- The answer does not stop at generic macro or WTI commentary.
- If some quotes fail, the answer can still use available quotes and label the rest as unavailable.

## Remaining Gaps

- No persistent D1 quote table yet.
- No Admin UI for managing universe symbols yet.
- No full global exchange validation.
- No fundamentals, valuation, earnings estimate, or revision data yet.
- No pre-market / after-hours handling beyond what Yahoo chart metadata returns.

## Recommended Next Phase

Add theme tags and Admin governance:

- clean energy
- energy equities
- AI infrastructure
- banks
- semiconductors
- defense
- uranium
- luxury
- autos
- miners
- utilities

That would make universe search sharper than name/token matching alone.
