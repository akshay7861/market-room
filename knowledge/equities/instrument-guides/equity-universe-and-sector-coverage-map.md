---
agent: Equities
doc_type: instrument-guide
priority: high
topics:
  - equity universe
  - sectors
  - industries
  - single stocks
  - ETFs
  - ADRs
  - filings
  - factors
  - live quotes
  - handoff rules
instruments:
  - S&P 500
  - Nasdaq 100
  - Russell 2000
  - sector ETFs
  - single stocks
  - ADRs
  - thematic baskets
  - company filings
  - earnings releases
market_regimes:
  - earnings-led expansion
  - valuation compression
  - sector rotation
  - narrow leadership
  - quality rotation
  - small-cap stress
trigger_patterns:
  - user asks for stock names watchlist or what to buy
  - single stock moves more than 3 percent on news
  - sector ETF outperforms broad index by more than 1 percent
  - earnings guidance changes margin or revenue outlook
  - user asks about green energy AI banks semiconductors oil stocks or defensive stocks
use_when:
  - Ask Market stock-name questions
  - Market Room headline includes company earnings guidance upgrade downgrade buyback sector rotation or stock move
  - agent must connect live quote data to sector factor and fundamental context
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.sec.gov/edgar/search-and-access
  - https://www.sec.gov/search-filings/edgar-application-programming-interfaces
  - https://www.msci.com/our-solutions/indexes/gics
  - https://www.bls.gov/iag/
  - https://www.finra.org/finra-data/equity
---

# Equity Universe and Sector Coverage Map

## Why this matters

The Equities agent now has a large stock universe and live quote lookup. That is useful only if the agent knows how to map names into sectors, themes, factors, catalysts, and handoffs.

The agent should answer stock questions with names when appropriate, but it must not pretend that a live quote is a full investment recommendation. It should separate price action, business exposure, factor exposure, and fundamental evidence.

## Core mechanism

Equity questions need four layers:

1. **Universe match**
   - Identify whether the user asks for an index, sector, ETF, single stock, ADR, or theme.
   - Use live quotes when the question asks what is moving or which names to watch.

2. **Business exposure**
   - Map the company to sector, industry, revenue driver, margin driver, and macro sensitivity.
   - Do not classify a stock only by ticker familiarity.

3. **Catalyst type**
   - Earnings, guidance, rating change, buyback, macro rate shock, sector rotation, factor move, commodity input, or regulatory event.

4. **Regime filter**
   - The same stock news means different things in different regimes.
   - A high-growth stock can beat earnings and still fall if real yields rise and multiples compress.

## What to watch

| Equity object | What Equities owns | Strong signal | Handoff |
|---|---|---|---|
| Single stock | catalyst, business exposure, price move, earnings quality | move greater than 3% with identifiable catalyst | Macro/Rates if move is mostly discount-rate shock |
| Sector ETF | sector rotation, leadership, beta | outperformance greater than 1% vs index | Risk if broad de-risking drives it |
| Theme basket | named watchlist and regime filter | multiple names confirm same theme | Commodities for physical input story |
| Earnings | revenue, margin, guidance, cash flow | guidance changes forward thesis | Macro if sector-wide demand signal |
| ADR / international | company plus FX/geography | local market and FX confirm | FX if currency translation dominates |
| Broad index | breadth, factor, earnings, valuation | cap-weight and equal-weight align | Risk if fragility dominates |

## Typical market path

1. Stock or sector headline appears.
2. Live quote identifies magnitude and direction.
3. Equities classifies the catalyst: company-specific, sector-wide, factor-driven, or macro-driven.
4. The agent checks whether fundamentals confirm the move or whether it is mostly multiple/factor beta.
5. If the user asks for ideas, the agent provides a basket with work-if and risk conditions.

## False positives / traps

- **Quote-equals-recommendation trap:** a stock moving today is not automatically a good idea.
- **Ticker familiarity trap:** popular names are not always the cleanest exposure to a theme.
- **Macro hijack trap:** if the user asks for stocks, answer with stocks first, then add macro conditions.
- **Single-name causality trap:** a stock can move because of sector beta, factor beta, index flow, or rates, not only company news.
- **Theme trap:** a strong long-term theme can still be a bad trade if estimates, margins, or valuation are deteriorating.

## Cross-asset implications

- Rising real yields pressure long-duration growth and speculative themes.
- Commodity shocks affect energy, materials, airlines, chemicals, autos, and consumer margins differently.
- USD strength affects multinationals and ADRs through translation and competitiveness.
- Credit stress usually hits small caps and leveraged equities before mega-cap quality.
- Risk-on/risk-off determines whether stock-specific catalysts are rewarded or ignored.

## How this should affect agent behavior

- If the user asks for names, provide names.
- If live quote data is present, use it, but state whether it is price context or thesis evidence.
- Classify each answer by sector, theme, factor, and catalyst.
- Use watchlist language when valuation, earnings, or suitability data is incomplete.
- Hand off oil/gas physical drivers to Commodities, rate shocks to Rates, macro demand to Macro, FX translation to FX, and crowding/fragility to Risk/Sentiment.
- Stay silent on pure macro releases unless equity transmission is the question.

## Example historical episodes

### 2020-2021 long-duration growth rally

Low rates and easy liquidity supported high-multiple growth equities. The lesson is that regime can dominate near-term fundamentals.

### 2022 multiple compression

Many growth names fell despite still-growing revenue because discount rates rose. The lesson is to separate operating performance from valuation compression.

### 2022 energy equity outperformance

Energy equities benefited from commodity prices, capital discipline, and free cash flow. The lesson is that sector leadership can be earnings-led, not only beta-led.

### 2023-2024 AI leadership

Mega-cap and semiconductor leadership carried indices while breadth lagged at times. The lesson is to distinguish index strength from broad equity health.

## Checklist

- Did the user ask for stock names, tickers, ETFs, sectors, or themes?
- Did the answer provide names when requested?
- Is the catalyst company-specific, sector-wide, factor-driven, or macro-driven?
- Are live quotes used as context, not as the whole thesis?
- Did the answer include work-if and risk conditions?
- Did it avoid personalized financial advice?
- Which agent should receive the handoff?

## Sources

- SEC EDGAR and company facts API for filings and company-level fundamentals.
- MSCI GICS for sector and industry classification.
- BLS Industry at a Glance for industry-level context.
- FINRA equity data for market data and trading context.
