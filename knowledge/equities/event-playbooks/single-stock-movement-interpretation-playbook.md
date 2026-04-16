---
agent: Equities
doc_type: event-playbook
priority: high
topics:
  - single stock moves
  - earnings
  - guidance
  - rating changes
  - buybacks
  - sector beta
  - factor beta
  - filings
  - false causality
instruments:
  - single stocks
  - sector ETFs
  - company filings
  - earnings releases
  - trade halts
  - ADRs
market_regimes:
  - earnings-led move
  - multiple compression
  - factor rotation
  - sector beta
  - idiosyncratic shock
  - liquidity-driven move
trigger_patterns:
  - single stock moves more than 3 percent on news
  - earnings beat but stock falls
  - guidance changes forward revenue or margin outlook
  - rating change moves stock without fundamental confirmation
  - stock move conflicts with sector or factor move
use_when:
  - user asks why a stock moved
  - Market Room headline includes earnings guidance upgrade downgrade buyback halt or single-stock catalyst
  - Equities must separate company-specific news from sector factor or macro beta
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.sec.gov/edgar/search-and-access
  - https://www.sec.gov/about/forms/sec-forms-list-pdf-version
  - https://www.finra.org/finra-data/equity
  - https://www.nasdaqtrader.com/Trader.aspx?id=TradeHalts
---

# Single-Stock Movement Interpretation Playbook

## Why this matters

Users often ask why a stock moved. A bad answer invents a simple story from the nearest headline. A good Equities answer separates company-specific catalyst, sector beta, factor beta, macro beta, and market-structure noise.

The agent should explain what likely drove the move and what evidence would confirm it.

## Core mechanism

Single-stock moves need five tests:

1. **Company catalyst**
   - Earnings, guidance, filing, rating change, buyback, M&A, regulation, management change.

2. **Sector context**
   - Did the whole sector move?
   - If yes, the stock may be beta, not idiosyncratic.

3. **Factor context**
   - Growth, value, quality, momentum, small-cap, high short interest, duration sensitivity.

4. **Macro context**
   - Rates, USD, commodity input, credit spreads, or risk appetite may dominate.

5. **Market structure**
   - Halt, short squeeze, index inclusion, options gamma, liquidity.

## What to watch

| Catalyst | Strong signal | False signal |
|---|---|---|
| Earnings | guidance changes forward estimates | beat on low-quality items |
| Rating change | move with estimate revisions | price target change only |
| Buyback | size material versus market cap | authorization with no execution |
| Sector beta | sector ETF moves same direction | assigning move to company news |
| Factor beta | factor basket confirms | assuming stock-specific cause |
| Halt / liquidity | exchange notice or unusual volume | treating halt as fundamental |

## Typical market path

1. Headline or filing appears.
2. Stock gaps or trends.
3. Sector and factor context reveal whether move is idiosyncratic.
4. Earnings/guidance/filing evidence confirms or rejects the story.
5. Agent answers with probability language, not certainty, unless source evidence is clear.

## False positives / traps

- **Headline causality trap:** the nearest headline may not be the actual driver.
- **Earnings beat trap:** stocks can fall on beats if guidance, margins, or backlog disappoint.
- **Upgrade trap:** analyst upgrade can follow price action rather than cause it.
- **Macro hijack trap:** high-multiple stocks can fall on rates even with good company news.
- **Squeeze trap:** high short interest and options flow can move price without fundamental change.

## Cross-asset implications

- Rate shocks affect long-duration equities and clean-energy names.
- Oil/gas moves affect energy, airlines, chemicals, and transports differently.
- USD moves affect multinational revenue translation.
- Credit spread widening hurts leveraged and small-cap stocks.
- Risk/Sentiment should join if the move is crowding, squeeze, or fragility-driven.

## How this should affect agent behavior

- Name the likely driver category before explaining.
- Provide stock-specific evidence if available.
- Compare the stock move to sector and factor context.
- If evidence is incomplete, say what would confirm the thesis.
- Give watchlist or basket answers when the user asks for names.
- Avoid pretending that a live quote alone proves causality.

## Example historical episodes

### Earnings beat but stock falls

High expectations, weak guidance, or margin pressure can overwhelm an EPS beat. The lesson is to look forward, not backward.

### Rate shock in growth stocks

High-quality growth companies can sell off when real yields rise. The lesson is that valuation duration can dominate fundamentals.

### Energy stock divergence

Energy stocks can lag oil if investors distrust capex, refining margins, or capital returns. The lesson is that commodity beta is not one-for-one.

### Short-squeeze moves

Price can move far beyond fundamentals when positioning and options flow dominate. The lesson is to hand off fragility to Risk/Sentiment.

## Checklist

- What moved: stock, sector, factor, or index?
- Is there a company-specific catalyst?
- Did the sector ETF move too?
- Did rates, USD, oil, or credit explain it?
- Is there filing or guidance evidence?
- Is market structure involved?
- Is the answer causal or probabilistic?
- Does another agent own a key driver?

## Sources

- SEC EDGAR for company filings.
- SEC forms list for event interpretation.
- FINRA equity data for market data context.
- Nasdaq Trader halt data for trade-halt confirmation.
