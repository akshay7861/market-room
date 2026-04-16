---
agent: Equities
doc_type: instrument-guide
priority: high
topics:
  - thematic equity baskets
  - stock idea generation
  - green energy stocks
  - energy equities
  - AI infrastructure stocks
  - ETF alternatives
  - false-signal filtering
instruments:
  - FSLR
  - ENPH
  - SEDG
  - NEE
  - BEP
  - ETN
  - PWR
  - ALB
  - SQM
  - XOM
  - CVX
  - SLB
  - XLE
  - TAN
  - ICLN
  - QCLN
market_regimes:
  - falling real yields
  - rising real yields
  - commodity supply shock
  - capex supercycle
  - duration-sensitive equity selloff
  - risk-on thematic rally
trigger_patterns:
  - user asks which stocks or names to buy or watch
  - user asks for green stocks or clean energy stocks
  - user asks for energy stocks benefiting from oil
  - user asks for AI infrastructure or data-center beneficiaries
  - user asks for ETFs instead of single-name risk
use_when:
  - Ask Market stock-name questions
  - user requests a watchlist
  - user asks for sector beneficiaries
  - user asks for what to buy but live valuation data is incomplete
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.sec.gov/edgar/search/
  - https://www.eia.gov/outlooks/steo/
  - https://www.iea.org/reports/renewables-2023
  - https://www.federalreserve.gov/publications/financial-stability-report.htm
---

# Thematic Equity Basket Guide

## Why this matters

When a user asks "which stocks," "names," "watchlist," "what to buy," or "green stocks," the Equities agent must not answer only with macro context. The correct output is a named basket with market drivers, risk filters, and false-signal logic.

The agent should be clear that it is giving a thematic screen, not personalized financial advice or a live valuation-ranked recommendation.

## Core mechanism

Stock-name questions require three layers:

1. **Theme identification**
   - What economic or market force is the user trying to express?
   - Examples: clean-energy adoption, higher oil, AI capex, lower rates, grid investment.

2. **Basket construction**
   - Separate direct plays from second-order beneficiaries.
   - Separate quality/core names from high-beta/speculative names.
   - Offer ETFs when single-name risk is high.

3. **Regime filter**
   - A good theme can still be a bad trade if the regime is hostile.
   - Clean energy often benefits from policy and adoption, but suffers when real yields rise.
   - Energy equities can benefit from oil, but not if oil is rising because of demand destruction or broad risk-off.
   - AI infrastructure can have strong revenue growth, but margins and free cash flow matter if capex expectations are too high.

## What to watch

### Green / clean-energy basket

- Solar manufacturers / equipment: `FSLR`, `ENPH`, `SEDG`, `RUN`
- Renewable utilities / operators: `NEE`, `BEP`, `IBE.MC`, `ORSTED.CO`
- Grid and electrification: `ETN`, `SU.PA`, `PWR`, `ABBNY`
- Batteries / lithium: `ALB`, `SQM`, `LAC`, `PCRFY`
- ETFs: `TAN`, `ICLN`, `QCLN`

Watch:

- real yields and financing conditions
- policy credits / subsidy visibility
- module pricing and inventory
- residential solar demand
- lithium price cycle
- grid and data-center capex

### Energy-equity basket

- Integrated majors: `XOM`, `CVX`, `SHEL`, `TTE`
- Upstream / E&P beta: `COP`, `EOG`, `DVN`, `FANG`
- Oilfield services: `SLB`, `HAL`, `BKR`
- Midstream / pipelines: `ENB`, `KMI`, `WMB`, `ET`
- ETFs: `XLE`, `XOP`, `OIH`

Watch:

- WTI / Brent trend
- curve backwardation vs contango
- OPEC discipline
- shale production response
- refining margins
- capital returns and balance sheets

### AI infrastructure basket

- Accelerators / semis: `NVDA`, `AMD`, `AVGO`, `MRVL`
- Foundry / equipment: `TSM`, `ASML`, `AMAT`, `LRCX`
- Power / cooling / electrification: `ETN`, `VRT`, `PWR`, `SU.PA`
- Cloud platforms: `MSFT`, `AMZN`, `GOOGL`

Watch:

- AI capex revisions
- order backlog durability
- gross margin pressure
- free cash flow conversion
- export-control risk
- data-center power bottlenecks

## Typical market path

1. Theme narrative strengthens first.
2. High-beta names rally first if risk appetite is strong.
3. Quality/core names outperform if the theme survives a rates or volatility shock.
4. ETFs broaden participation if retail and passive flows join.
5. The trade fails when earnings revisions, financing costs, or margins contradict the story.

## False positives / traps

- **Oil-up-equals-green-stocks-up trap:** higher oil can help the transition narrative, but clean-energy equities are often more sensitive to real yields and financing costs.
- **Theme equals buy trap:** a good long-term theme is not a good near-term trade if valuations are stretched and estimates are falling.
- **ETF hiding weak internals:** a green-energy ETF can rise while most components remain weak if one or two large names dominate.
- **Revenue without margin trap:** AI or clean-tech growth can look strong while free cash flow deteriorates because capex or input costs rise faster.
- **Commodity beta confusion:** energy equities do not all move like WTI. Majors, E&Ps, services, and midstream have different betas.

## Cross-asset implications

- Falling real yields help long-duration clean energy and speculative growth more than oil majors.
- Rising real yields favor cash-generative energy and value names over unprofitable clean tech.
- A stronger dollar can pressure commodity-linked and international earnings exposures.
- Credit spread widening hurts high-beta thematic names before it hurts mega-cap quality.
- Oil backwardation supports energy equity cash-flow confidence; contango weakens the upstream thesis.

## How this should affect agent behavior

- If the user asks for stock names, provide names. Do not answer only with WTI, CPI, or market-index commentary.
- Start with a basket structure, then give the macro/risk filter.
- Use "watchlist" or "screen" language unless current valuation and earnings data are available.
- Include ETFs when the user likely wants theme exposure but has not specified risk tolerance.
- Separate direct plays from second-order beneficiaries.
- End with the one market condition that would make the basket work or fail.

## Example historical episodes

### 2020-2021 clean-energy rally

Clean-energy equities rallied as policy optimism, low yields, and risk appetite aligned. The key mechanism was not only climate adoption; it was also cheap capital supporting long-duration growth.

Lesson: clean-energy baskets can be highly rate-sensitive.

### 2022 clean-tech drawdown

Rising real yields and tighter financial conditions compressed long-duration equity valuations. Many clean-energy names sold off even though the long-term energy-transition narrative remained intact.

Lesson: theme strength does not override discount-rate pressure.

### 2022 energy equity outperformance

Oil and gas equities outperformed as commodity prices, capital discipline, and free cash flow aligned. The strongest names were not necessarily the most speculative producers; balance-sheet quality and capital returns mattered.

Lesson: in commodity equity baskets, cash return discipline can matter as much as spot price beta.

### 2023-2024 AI infrastructure broadening

AI leadership began with the clearest accelerator winners, then broadened into power, cooling, grid, and equipment beneficiaries as investors looked for second-order capex plays.

Lesson: a good thematic answer should include both direct winners and picks-and-shovels beneficiaries.

## Checklist

- Did the user ask for names, stocks, tickers, ETFs, watchlists, or what to buy?
- If yes, did the answer include named candidates?
- Did the answer separate direct plays from second-order beneficiaries?
- Did it include ETFs as basket alternatives?
- Did it state the key macro regime filter?
- Did it include at least one false signal?
- Did it avoid presenting a thematic screen as personalized financial advice?
- Did it explain what would invalidate the basket?

## Sources

- SEC EDGAR company filings for issuer-level business mix and risk factors.
- EIA Short-Term Energy Outlook for oil and energy-market context.
- IEA renewables reports for clean-energy deployment and policy context.
- Federal Reserve Financial Stability Report for valuation, leverage, and financial-condition regime context.
