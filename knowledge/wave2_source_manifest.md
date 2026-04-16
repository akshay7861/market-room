# Wave 2 Knowledge Library — Source Manifest

**Generated:** 2026-04-10
**Status:** Planning — no docs written yet
**Docs:** 9 (FX: 3, Risk/Sentiment: 3, Equities: 3)
**Agents covered:** FX, Risk/Sentiment, Equities
**Prerequisite:** Wave 1 (Macro, Rates, Commodities) fully uploaded and validated

---

## Quick Reference Table

| # | Filename | Agent | Doc Type | Admin Category | Batch | Market Cases | Priority | Status |
|---|----------|-------|----------|----------------|-------|--------------|----------|--------|
| 1 | `carry-and-rate-differential-framework.md` | FX | framework | `frameworks` | **1** | Yes | P1 | todo |
| 2 | `positioning-and-crowding-framework.md` | Risk/Sentiment | framework | `frameworks` | **1** | Yes | P1 | todo |
| 3 | `equity-regime-framework-rates-growth-liquidity-earnings.md` | Equities | framework | `frameworks` | **1** | Yes | P1 | todo |
| 4 | `volatility-regime-and-fragility-playbook.md` | Risk/Sentiment | event-playbook | `event_playbooks` | **2** | Yes | P2 | todo |
| 5 | `central-bank-divergence-playbook.md` | FX | event-playbook | `event_playbooks` | **2** | Yes | P2 | todo |
| 6 | `sector-rotation-and-market-leadership-playbook.md` | Equities | event-playbook | `event_playbooks` | **2** | Yes | P2 | todo |
| 7 | `dollar-funding-stress-and-intervention-playbook.md` | FX | event-playbook | `event_playbooks` | **3** | No | P3 | todo |
| 8 | `risk-on-risk-off-transmission-guide.md` | Risk/Sentiment | foundation | `foundations` | **3** | No | P3 | todo |
| 9 | `earnings-quality-and-margin-pressure-interpretation-guide.md` | Equities | foundation | `foundations` | **3** | No | P3 | todo |

---

## Per-Doc Detail

---

### 1 · `carry-and-rate-differential-framework.md`

| Field | Value |
|-------|-------|
| **Agent** | FX |
| **Doc type** | framework |
| **Admin category** | `frameworks` |
| **Batch** | 1 |
| **Suggested path** | `knowledge/fx/frameworks/carry-and-rate-differential-framework.md` |
| **Market cases** | Yes |
| **Priority** | P1 |
| **Status** | todo |

**Objective:** Encode the FX agent's core carry and rate differential reasoning. The doc must cover: (1) the carry trade anatomy (borrow low-rate currency, hold high-rate currency, pocket the differential net of hedging cost), (2) covered vs uncovered interest parity — why CIP deviations signal dollar funding stress, (3) the carry unwind regime (risk-off → high-yield EM FX sell-off → dollar and JPY bid), (4) specific currency pairs and their carry characteristics (JPY, CHF = funding currencies; MXN, ZAR, AUD = carry vehicles), (5) when carry stops working — the crowding and crash risk framework.

**False signals the doc must address:**
- High positive carry does not mean the trade is safe — correlation to risk-off events determines drawdown risk
- Rate differential widening alone does not drive currency appreciation if the higher-rate country's growth is slowing
- Covered interest parity deviations in dollar markets signal banking stress, not carry opportunity

**Post/update/comment/silence logic:**
- ≥ 25 bps shift in a 2-year rate differential between two G10 pairs → update existing thesis or post
- Carry unwind: high-beta EM FX selling >2% in a single session with JPY strengthening >1% simultaneously → post, frame as carry unwind not isolated move
- Rate differential narrows by < 10 bps → comment only

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.bis.org/statistics/rpfx22.htm` | BIS Triennial Central Bank Survey of FX and OTC Derivatives Markets, 2022 | Authoritative on FX market structure, carry positioning by currency pair, and volume distribution. The primary benchmark for FX market mechanics. |
| `https://www.bis.org/publ/work317.htm` | BIS Working Paper 317 — "Carry Trades and Currency Crashes" (Brunnermeier, Nagel, Pedersen) | The foundational academic paper on carry crash risk — documents skewness, crash risk pricing, and the crowding-to-unwind sequence. Required for the false-signal section on crowded carry. |
| `https://www.federalreserve.gov/releases/h10/` | Federal Reserve H.10 Foreign Exchange Rates | Official daily FX rate data used to construct bilateral rate differentials. The base data source for any carry framework calibration. |
| `https://www.imf.org/en/Publications/GFSR` | IMF Global Financial Stability Report | Systematic coverage of carry trade risk as a financial stability issue — provides regime-level carry risk assessments, positioning estimates, and historical unwind episodes. |
| `https://www.newyorkfed.org/research/staff_reports/sr963` | NY Fed Staff Report 963 — CIP Deviations, the Dollar, and Frictions in International Capital Markets (Liao, 2020) | Documents covered interest parity deviations and explains why dollar carry dynamics differ from textbook UIP — essential for the "CIP deviation = funding stress" rule. |

---

### 2 · `positioning-and-crowding-framework.md`

| Field | Value |
|-------|-------|
| **Agent** | Risk/Sentiment |
| **Doc type** | framework |
| **Admin category** | `frameworks` |
| **Batch** | 1 |
| **Suggested path** | `knowledge/risk-sentiment/frameworks/positioning-and-crowding-framework.md` |
| **Market cases** | Yes |
| **Priority** | P1 |
| **Status** | todo |

**Objective:** Encode how the Risk/Sentiment agent reads positioning data and identifies crowding risk. Must cover: (1) CFTC Commitments of Traders — the three report types (Legacy, Disaggregated, TFF) and which to use for which market, (2) what "crowded" means operationally — net non-commercial position as % of open interest, percentile vs 52-week range, (3) the crowding-to-fragility sequence (crowded → catalyst → forced unwind → overshoot beyond fundamental value), (4) dealer positioning as a distinct signal from spec positioning — dealer short = market maker risk aversion = liquidity premium, (5) the difference between a position reaching an extreme and a position starting to reverse — the reversal signal is the thesis, not the extreme.

**False signals the doc must address:**
- Extreme positioning alone is not a timing signal — markets can remain crowded for months
- Low VIX + high spec longs is not the same as high VIX + high spec longs — the fragility level differs
- Short covering is not the same as new buying — distinguish in the response

**Post/update/comment/silence logic:**
- CFTC spec net position crosses 90th percentile of 3-year range in any major asset class AND has begun reversing (week-on-week decline) → post fragility thesis
- Position at extreme but no reversal yet → comment only, flag as a watch
- Position reverting from extreme toward neutral → update: fragility signal fading

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm` | CFTC Commitments of Traders — weekly report | The only authoritative public source for non-commercial and commercial positioning across futures markets. All COT-based positioning analysis originates here. |
| `https://home.treasury.gov/data/treasury-international-capital-tis-program` | US Treasury TIC Data (Treasury International Capital) | Tracks foreign holdings of US securities weekly and monthly — the key source for identifying foreign crowding in US Treasuries and equities, distinct from CFTC. |
| `https://www.newyorkfed.org/markets/desk-operations/primary-dealer-statistics` | NY Fed Primary Dealer Statistics | Weekly dealer positioning in Treasuries, agency MBS, and corporate bonds — the best proxy for dealer risk appetite and balance sheet capacity, which determines market liquidity in stress. |
| `https://www.federalreserve.gov/publications/financial-stability-report.htm` | Federal Reserve Financial Stability Report (semi-annual) | Covers leverage, crowding, and systemic positioning risk with the Fed's own risk-appetite indicators and hedge fund leverage estimates. Provides the institutional framework for reading crowding as a macro risk. |
| `https://www.imf.org/en/Publications/GFSR` | IMF Global Financial Stability Report | Cross-asset positioning risk analysis, emerging market flow data, and crowding signals in global credit and equity markets — provides the international dimension absent from CFTC/TIC data. |

---

### 3 · `equity-regime-framework-rates-growth-liquidity-earnings.md`

| Field | Value |
|-------|-------|
| **Agent** | Equities |
| **Doc type** | framework |
| **Admin category** | `frameworks` |
| **Batch** | 1 |
| **Suggested path** | `knowledge/equities/frameworks/equity-regime-framework-rates-growth-liquidity-earnings.md` |
| **Market cases** | Yes |
| **Priority** | P1 |
| **Status** | todo |

**Objective:** Encode the four-quadrant equity regime framework: (1) the two primary axes — growth (accelerating vs decelerating) and rates/liquidity (tightening vs easing), (2) the four regimes and their equity implications: Goldilocks (growth up + rates stable = multiple expansion), Inflationary boom (growth up + rates rising = earnings growth but multiple compression), Stagflation (growth down + rates rising = worst quadrant), and Soft landing/easing (growth down + rates falling = multiple re-expansion), (3) where we enter and exit each regime and what signals the transition, (4) the earnings vs multiple decomposition — which regime drives which component of total returns, (5) equity risk premium as the through-line: when ERP is compressed, rate sensitivity is highest.

**False signals the doc must address:**
- Earnings beats do not equal a bull market in a multiple-compression regime — the denominator matters more than the numerator
- Rate cuts are not automatically bullish if cuts are driven by growth deterioration (soft landing ≠ recession cut)
- High P/E alone is not a short signal — ERP relative to real yields determines whether expensive is stretched

**Post/update/comment/silence logic:**
- Regime transition (confirmed by 2+ consecutive macro data prints): post new thesis
- Earnings season reveals multiple-compression vs earnings-growth split: post with regime attribution
- Single macro data point that conflicts with the established regime → comment only
- Regime unchanged but ERP moves >30 bps in a week → update existing thesis

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.federalreserve.gov/publications/financial-stability-report.htm` | Federal Reserve Financial Stability Report | Covers equity market valuation (ERP, CAPE comparisons), leverage in equity markets, and the rate-equity relationship — provides the Fed's own framework for assessing equity regime sustainability. |
| `http://www.econ.yale.edu/~shiller/data.htm` | Robert Shiller Online Data — CAPE, P/E10, earnings, dividend data | The primary public source for long-run CAPE and equity risk premium data. Required for calibrating what "expensive" means in context — absolute P/E alone is insufficient without CAPE and ERP. |
| `https://www.newyorkfed.org/research/data_indicators/equity-risk-premium` | NY Fed Equity Risk Premium model data | Provides the NY Fed's real-time ERP estimate — the most operationally useful ERP signal for regime assessment, updated with each major data release. |
| `https://www.bls.gov/ppi/` | Bureau of Labor Statistics — Producer Price Index | PPI is the primary input cost data for margin pressure — essential for the earnings growth vs multiple expansion decomposition when cost pressures are rising. |
| `https://www.imf.org/en/Publications/GFSR` | IMF Global Financial Stability Report | Cross-asset regime analysis — provides the global liquidity dimension of the equity regime framework (EM flows, dollar liquidity, global ERP compression) that domestic sources miss. |

---

### 4 · `volatility-regime-and-fragility-playbook.md`

| Field | Value |
|-------|-------|
| **Agent** | Risk/Sentiment |
| **Doc type** | event-playbook |
| **Admin category** | `event_playbooks` |
| **Batch** | 2 |
| **Suggested path** | `knowledge/risk-sentiment/event-playbooks/volatility-regime-and-fragility-playbook.md` |
| **Market cases** | Yes |
| **Priority** | P2 |
| **Status** | todo |

**Objective:** Encode the Risk/Sentiment agent's volatility regime framework. Must cover: (1) VIX level interpretation — the three regimes (complacency: VIX <15; normal: 15–25; stress: >25; crisis: >35) with what each implies for positioning, hedging flows, and cross-asset correlation, (2) the vol spike anatomy — the gamma/vanna hedging cascade that amplifies initial moves, (3) vol-of-vol (VVIX) as a leading indicator of the next spike regime, (4) term structure of vol — VIX9D vs VIX vs VIX3M and what an inverted vol term structure signals vs a steep one, (5) the "vol selling is crowded" trap — when implied vol is depressed and the market's short vol positioning makes the next spike disproportionately large, (6) recovery patterns after a vol spike — how quickly VIX mean-reverts and what determines the path.

**False signals the doc must address:**
- A VIX spike to 25 during a risk-off move is not the same as a VIX spike from a complacent sub-15 base — the starting point determines the structural risk
- VIX dropping back from a spike does not mean the underlying risk is resolved
- High VIX is not always bad for equities — if VIX is high and falling, it is the most historically bullish vol signal

**Post/update/comment/silence logic:**
- VIX crossing 25 from below → post fragility thesis if positioning doc also shows crowding
- VIX crossing 35 → immediate post regardless of other conditions
- Vol term structure inverts (VIX9D > VIX > VIX3M) → post: market pricing near-term shock
- VIX falling from 30+ back through 20 → update: stress regime exiting

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.cboe.com/tradable_products/vix/` | CBOE VIX Product Page and Methodology | The definitive source for VIX methodology, VVIX, VIX9D, VIX3M term structure, and historical data. Required for any vol regime doc — CBOE is the primary market. |
| `https://www.federalreserve.gov/publications/financial-stability-report.htm` | Federal Reserve Financial Stability Report | Contains the Fed's framework for interpreting elevated vol as a systemic risk signal vs a healthy repricing — provides the institutional validation layer for vol-regime thesis-grade thresholds. |
| `https://www.imf.org/en/Publications/GFSR` | IMF Global Financial Stability Report | Covers vol regime analysis cross-asset and cross-border — EMBI spread spikes, EM vol, and contagion from DM vol events. Provides the global fragility dimension. |
| `https://www.newyorkfed.org/research/data_indicators/term_premia` | NY Fed ACM Term Premium | Rates vol and equity vol correlate strongly during stress — the term premium spike is often the leading indicator of equity vol regime shift. Required for cross-asset fragility logic. |
| `https://www.bis.org/publ/qtrpdf/` | BIS Quarterly Review | Covers vol regime episodes in detail (2018 volmageddon, 2020 COVID crash, 2022 rate vol spike) with mechanism analysis — essential for the false-signal and recovery pattern sections. |

---

### 5 · `central-bank-divergence-playbook.md`

| Field | Value |
|-------|-------|
| **Agent** | FX |
| **Doc type** | event-playbook |
| **Admin category** | `event_playbooks` |
| **Batch** | 2 |
| **Suggested path** | `knowledge/fx/event-playbooks/central-bank-divergence-playbook.md` |
| **Market cases** | Yes |
| **Priority** | P2 |
| **Status** | todo |

**Objective:** Encode FX moves driven by central bank policy divergence. Must cover: (1) the divergence taxonomy — Fed ahead of ECB (USD strong vs EUR), Fed cutting while BOJ exiting NIRP (USD/JPY directional pressure reversal), EM central banks ahead of or behind DM on the cycle, (2) the rate differential vs FX relationship — when it works (carry follows rate path) and when it breaks (growth/current account override), (3) how divergence ends — convergence through one central bank reversing course, and what FX signal precedes it, (4) specific historical episodes: 2014–2015 USD bull run (Fed hiking, ECB doing QE), 2022–2023 BOJ YCC defence, 2024–2025 BOJ normalisation and USD/JPY volatility, (5) the "priced-in divergence" trap — when the rate path gap is already in the currency and the marginal move requires a surprise, not a continuation.

**False signals the doc must address:**
- A rate hike by Country A does not automatically strengthen its currency if the hike was fully priced
- Divergence can persist for longer than the carry trade is funded — crowding reversal risk is the binding constraint
- ECB/BOJ policy surprises move the major crosses by more than Fed surprises at equivalent bps magnitude — because the USD is already the global anchor

**Post/update/comment/silence logic:**
- Central bank meeting where guidance shifts materially vs consensus → post new divergence thesis
- Rate differential widens beyond the 90th percentile of the prior 2-year range → post thesis or update
- Divergence narrows by <15 bps on data → comment only
- Convergence begins (trailing central bank moves toward frontrunner) → new thesis: divergence trade closing

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm` | Federal Reserve FOMC Meeting Calendar, Statements, and Press Conferences | Primary source for Fed policy path — the anchor leg of all G10 central bank divergence analysis. |
| `https://www.ecb.europa.eu/pub/economic-bulletin/html/index.en.html` | ECB Economic Bulletin (bi-weekly) | Official ECB policy communication and staff projections — the primary source for ECB-Fed divergence signals. Covers the euro area economic outlook, inflation projections, and rate path guidance. |
| `https://www.boj.or.jp/en/mopo/mpmdeci/index.htm` | Bank of Japan Monetary Policy Decisions | BOJ policy meeting outcomes — the key source for BOJ-Fed divergence, the largest and most consequential current DM divergence trade (USD/JPY). |
| `https://www.imf.org/en/Publications/WEO` | IMF World Economic Outlook | Cross-country growth and inflation forecast divergence — provides the fundamental driver layer beneath the rate differential. A rate divergence without growth divergence is unsustainable; WEO confirms which is in place. |
| `https://www.bis.org/publ/arpdf/` | BIS Annual Economic Report | Comprehensive cross-country monetary policy analysis with FX implications — provides multi-cycle historical framing for divergence episodes and their resolution patterns. |

---

### 6 · `sector-rotation-and-market-leadership-playbook.md`

| Field | Value |
|-------|-------|
| **Agent** | Equities |
| **Doc type** | event-playbook |
| **Admin category** | `event_playbooks` |
| **Batch** | 2 |
| **Suggested path** | `knowledge/equities/event-playbooks/sector-rotation-and-market-leadership-playbook.md` |
| **Market cases** | Yes |
| **Priority** | P2 |
| **Status** | todo |

**Objective:** Encode the Equities agent's sector rotation framework across the business cycle. Must cover: (1) the canonical sector rotation sequence across cycle phases — early cycle (Financials, Consumer Discretionary, Industrials outperform), mid cycle (Technology, Communications), late cycle (Energy, Materials, Healthcare defensives), recession (Utilities, Consumer Staples, Healthcare), (2) how rate moves override cycle positioning — when rates spike, rate-sensitive sectors (Utilities, REITs) compress regardless of cycle phase, (3) leadership breadth as a market health signal — narrow leadership (one sector or mega-cap cohort) is a fragility signal; broadening leadership is a risk-on confirmation, (4) the growth vs value rotation — when it signals genuine regime shift vs a rates-driven mean reversion, (5) sector-specific threshold signals: XLF relative performance at 52-week highs = credit expansion thesis; XLU underperforming sharply = rates rising faster than growth improving.

**False signals the doc must address:**
- Energy outperforming early in a cycle does not mean the cycle is late — check if it is supply-driven (OPEC) or demand-driven (industrial activity)
- Technology leading does not mean growth is robust — in a QE/liquidity-driven market, duration-sensitive growth stocks lead regardless of economic fundamentals
- Defensive outperformance in a single week is a comment, not a regime signal — requires 3–4 week trend to be thesis-grade

**Post/update/comment/silence logic:**
- Sector rotation confirmed by 3+ consecutive weeks of relative performance shift with cross-asset confirmation → post
- One sector hits 52-week relative high vs SPX with sector-specific catalyst → update
- Single-week defensive rotation without macro catalyst → comment only

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.nber.org/research/business-cycle-dating` | NBER Business Cycle Dating Committee | Official US recession dating — the authoritative reference for cycle phase identification. Required for calibrating where each rotation phase begins and ends. |
| `https://www.federalreserve.gov/monetarypolicy/beige-book-default.htm` | Federal Reserve Beige Book (8x per year) | Qualitative sector-by-sector economic conditions report — the best leading indicator of sector-level activity changes before hard data confirms. Covers manufacturing, retail, services, real estate, banking, and labour by district. |
| `https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/` | ISM Report on Business (Manufacturing and Services PMI) | The PMI new orders component is the cleanest early-cycle indicator for industrials and materials rotation. ISM >55 and rising = early-to-mid cycle sector signal. |
| `https://www.bea.gov/data/gdp/gross-domestic-product` | BEA GDP by Industry (quarterly) | GDP contributions by sector confirm or deny macro-driven sector rotation narratives — prevents misattributing index-level moves to a sector when output data tells a different story. |
| `https://www.federalreserve.gov/publications/financial-stability-report.htm` | Federal Reserve Financial Stability Report | Covers sector-level leverage, credit conditions by sector (corporate vs real estate vs financial), and concentration risk — the fragility dimension of sector leadership. |

---

### 7 · `dollar-funding-stress-and-intervention-playbook.md`

| Field | Value |
|-------|-------|
| **Agent** | FX |
| **Doc type** | event-playbook |
| **Admin category** | `event_playbooks` |
| **Batch** | 3 |
| **Suggested path** | `knowledge/fx/event-playbooks/dollar-funding-stress-and-intervention-playbook.md` |
| **Market cases** | No |
| **Priority** | P3 |
| **Status** | todo |

**Objective:** Encode the FX agent's framework for dollar funding stress events and central bank intervention episodes. Must cover: (1) the mechanics of dollar funding stress — cross-currency basis (EUR/USD, USD/JPY, USD/EM) widening as the primary signal; the FX swap market is how non-US banks fund dollar assets, and when it stresses, the basis blows out, (2) the anatomy of Fed swap line activation — threshold, timing, and market impact (basis compression within days of swap line announcement), (3) EM intervention playbook — when central banks intervene in spot markets vs derivatives markets vs rate hikes, what triggers each, and which is effective, (4) dollar wrecking ball episodes — dollar spike that tightens global financial conditions regardless of domestic monetary policy, (5) specific historical thresholds: EUR/USD basis below -30 bps = stress; below -60 bps = acute crisis; USD/JPY basis below -100 bps = systemic stress (as seen in March 2020).

**False signals the doc must address:**
- Cross-currency basis widening during quarter-end is a seasonal technical, not a stress signal
- EM FX intervention in the spot market by a central bank with low reserves is not credible — note reserves context
- Dollar strengthening during risk-off does not always reflect dollar funding stress — distinguish safe-haven demand from funding demand

**Post/update/comment/silence logic:**
- EUR/USD basis below -30 bps (not quarter-end) → post: dollar funding stress signal
- Fed swap line activated for a major central bank → post: acute stress, policy response in train
- EM central bank intervening spot market with >$3bn in a single session → post thesis on FX defence credibility
- Basis widening < -15 bps near quarter-end → comment only (seasonal)

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.newyorkfed.org/markets/international-market-operations/central-bank-liquidity-swaps` | NY Fed — Central Bank Liquidity Swap Operations | The official source for Fed swap line usage, terms, and historical take-up. The primary intervention tool in dollar funding crises — any playbook on this topic must start here. |
| `https://www.federalreserve.gov/releases/h41/` | Federal Reserve H.4.1 — Factors Affecting Reserve Balances (weekly) | Shows swap line drawings in real time under "central bank liquidity swaps" — the live data source for tracking dollar funding stress escalation and resolution. |
| `https://www.bis.org/statistics/gli.htm` | BIS Global Liquidity Indicators | Quarterly data on dollar-denominated credit globally, cross-border bank claims, and FX swap market size — the structural backdrop for understanding why dollar funding stress has global transmission. |
| `https://www.imf.org/en/Publications/GFSR` | IMF Global Financial Stability Report | Covers dollar funding market episodes (March 2020, September 2019 repo stress, 2008 interbank freeze) with mechanism analysis — provides the historical false-signal and escalation-vs-resolution pattern library. |
| `https://www.newyorkfed.org/markets/reference-rates/effr` | NY Fed EFFR (Effective Fed Funds Rate) | EFFR spikes above IOER/ON RRP are the earliest domestic dollar funding stress signal — the rates market signal that precedes FX swap basis widening. |

---

### 8 · `risk-on-risk-off-transmission-guide.md`

| Field | Value |
|-------|-------|
| **Agent** | Risk/Sentiment |
| **Doc type** | foundation |
| **Admin category** | `foundations` |
| **Batch** | 3 |
| **Suggested path** | `knowledge/risk-sentiment/foundations/risk-on-risk-off-transmission-guide.md` |
| **Market cases** | No |
| **Priority** | P3 |
| **Status** | todo |

**Objective:** Encode the foundational cross-asset transmission logic for risk-on and risk-off regimes. Must cover: (1) the classic risk-on configuration (equities up, high-yield spreads tight, EM FX up, JPY and CHF down, gold flat, VIX sub-20) vs risk-off (equities down, spreads wide, EM FX down, JPY and CHF up, gold up, VIX elevated), (2) the sequence — what typically leads in a risk-off episode (credit spreads, then EM FX, then equities) vs what leads in a risk-on recovery, (3) fractured risk-off signals — when the classic correlation breaks (e.g., gold down during equity stress = dollar funding demand; USD down during equity sell-off = dollar weakness not a safe-haven signal), (4) the regime identification problem — distinguishing a temporary risk-off event from a regime change, (5) specific correlation thresholds: SPX-VIX 90-day correlation below -0.75 = normal regime intact; above -0.50 = correlation breakdown = unusual market.

**False signals the doc must address:**
- Gold up does not always mean risk-off — gold can rally in a reflationary risk-on environment if real yields are falling
- JPY strengthening does not always mean risk-off — BOJ policy changes drive JPY independently of global risk appetite
- High-yield spread widening of <25 bps in a single session is a comment, not a regime signal

**Post/update/comment/silence logic:**
- At least 3 of the 5 canonical risk-off signals triggering simultaneously → post: risk-off regime
- Fractured signal (e.g., gold down + VIX up) → post: cross-asset dislocation thesis, name the fracture
- 1–2 signals → comment only
- Risk-on resumption: equities recovering + credit spreads tightening + EM FX stabilising → update: risk-off episode ending

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.imf.org/en/Publications/GFSR` | IMF Global Financial Stability Report | The IMF's GFSR measures global risk appetite with a composite indicator across asset classes and is the canonical reference for risk-on/risk-off regimes in an institutional context — used by central banks globally. |
| `https://www.federalreserve.gov/publications/financial-stability-report.htm` | Federal Reserve Financial Stability Report | The Fed's own cross-asset risk appetite assessment including credit spreads, equity vol, and funding conditions — provides the regulatory and systemic interpretation of risk regime shifts. |
| `https://www.bis.org/statistics/rpfx22.htm` | BIS Triennial FX Survey | Cross-asset correlation data in stressed markets — FX positioning during risk-off episodes (JPY, CHF, USD safe-haven flows vs EM selling) is documented here at the structural level. |
| `https://www.newyorkfed.org/research/data_indicators/term_premia` | NY Fed ACM Term Premium | Term premium spikes are a leading indicator of cross-asset risk-off — the rates market moves before equities in most historical risk-off episodes. The ACM model is the tool for identifying whether rates moves are risk-appetite driven or inflation-driven. |

---

### 9 · `earnings-quality-and-margin-pressure-interpretation-guide.md`

| Field | Value |
|-------|-------|
| **Agent** | Equities |
| **Doc type** | foundation |
| **Admin category** | `foundations` |
| **Batch** | 3 |
| **Suggested path** | `knowledge/equities/foundations/earnings-quality-and-margin-pressure-interpretation-guide.md` |
| **Market cases** | No |
| **Priority** | P3 |
| **Status** | todo |

**Objective:** Encode the Equities agent's framework for evaluating earnings quality and margin signals. Must cover: (1) the earnings quality hierarchy — GAAP EPS vs non-GAAP EPS vs free cash flow; when to trust each and what the divergence signals, (2) gross margin vs operating margin vs net margin — which is the leading indicator of pricing power and input cost pressure, (3) the accruals ratio — high accruals relative to cash flow signals earnings that are ahead of reality, (4) the revenue quality check — organic revenue growth vs acquisition-driven, volume vs price, domestic vs FX-translation-boosted, (5) margin pressure anatomy: input costs → gross margin → operating margin → EPS with lag; PPI is the forward signal, not the earnings release, (6) management guidance vs consensus — when to trust guidance cuts more than beat-and-raise quarters, (7) sector-specific margin interpretation: financials (NIM), tech (gross margin is the key line), energy (realised price vs breakeven), consumer staples (volume × price mix).

**False signals the doc must address:**
- EPS beat with margin compression is a warning, not a pass — the beat likely came from cost cuts or financial engineering, not pricing power
- Revenue beat with gross margin miss means pricing power is deteriorating even if the headline number was good
- Guidance raised but cash flow guidance not raised → earnings quality concern

**Post/update/comment/silence logic:**
- Gross margin misses by > 50 bps with management citing input cost pressure → post: margin compression thesis
- EPS beat + operating margin decline → comment: question the quality of the beat
- Clean beat across revenue, gross margin, operating margin, and FCF → update bullish thesis if in growth regime
- Beat entirely driven by lower share count (buyback) with flat revenue → comment only

**Approved source URLs:**

| URL | Source | Why chosen |
|-----|--------|-----------|
| `https://www.sec.gov/cgi-bin/browse-edgar` | SEC EDGAR — Company Filings Database | The primary source for actual company financial statements (10-K, 10-Q, 8-K) — any earnings quality doc must reference where the primary data lives. GAAP vs non-GAAP reconciliation tables are always in SEC filings. |
| `https://www.bls.gov/ppi/` | Bureau of Labor Statistics — Producer Price Index | PPI by final demand and intermediate inputs is the primary forward indicator of gross margin pressure — input costs flow through to corporate margins with a 1–2 quarter lag. Required for the "PPI leads margin compression" section. |
| `https://www.federalreserve.gov/monetarypolicy/beige-book-default.htm` | Federal Reserve Beige Book (8x per year) | Qualitative reporting by district on pricing power, labour costs, and margin pressure — the best non-quantitative signal of margin trends across sectors before quarterly earnings confirm. |
| `https://www.bea.gov/data/income-saving/corporate-profits` | BEA — Corporate Profits with IVA and CCA (quarterly) | Aggregate corporate profit data adjusted for inventory valuation and capital consumption — the macro-level proxy for economy-wide margin conditions, distinct from bottom-up earnings reports. |
| `https://efts.sec.gov/LATEST/search-index?q=%22non-GAAP%22&dateRange=custom&startdt=2020-01-01` | SEC EDGAR Full-Text Search — Non-GAAP reconciliation filings | Allows direct retrieval of non-GAAP to GAAP reconciliation tables from SEC filings — the primary analytical source for earnings quality assessment in any specific reporting quarter. |

---

## Batch Rationale

### Batch 1 — Upload First

**Criterion:** Highest trigger frequency AND standalone utility — these three docs fire on every major market event and do not depend on other Wave 2 docs being active first.

**`carry-and-rate-differential-framework.md` (FX):**
Fires on every central bank meeting, every major rate differential move, every risk-off episode that triggers carry unwind. An FX agent without carry logic produces generic "dollar strengthened on risk-off" commentary — indistinguishable from a news summary. This is the foundational reasoning tool for FX direction.

**`positioning-and-crowding-framework.md` (Risk/Sentiment):**
Fires every Friday with CFTC COT data, every time a crowded trade begins to unwind. This is the single most important false-signal prevention doc for the Risk/Sentiment agent — without it, the agent conflates price momentum with fundamental signal. The CFTC COT is weekly; this doc is triggered 52 times per year plus event-driven crowding signals.

**`equity-regime-framework-rates-growth-liquidity-earnings.md` (Equities):**
Fires on every macro data release (CPI, NFP, GDP), every earnings season, and every Fed meeting. The Equities agent's primary job is to translate macro regime into equity implications — without this framework, it cannot do that translation reliably. The rate-equity relationship is the most consequential cross-asset interaction in the current environment.

---

### Batch 2 — Upload Second

**Criterion:** Event-driven playbooks with medium-to-high trigger frequency. Each has a light dependency on the Batch 1 framework doc for its agent being active first.

**`volatility-regime-and-fragility-playbook.md` (Risk/Sentiment):**
Best after the positioning doc is active — vol spikes are almost always crowding-driven, and the two docs work together. Fired by VIX level changes and vol term structure inversions.

**`central-bank-divergence-playbook.md` (FX):**
Best after the carry framework is active — divergence is the macro driver of carry; the carry doc explains the currency response mechanism, and this doc explains the central bank catalyst. Fired by every major central bank meeting across G10.

**`sector-rotation-and-market-leadership-playbook.md` (Equities):**
Best after the equity regime framework is active — sector rotation is the implementation layer of the regime framework. The agent needs the regime classification before it can apply sector rotation logic. Fired by sustained relative performance shifts across sectors.

---

### Batch 3 — Upload Last

**Criterion:** Reference and synthesis docs — highest analytical value when the earlier docs in the same agent's pool are already active.

**`dollar-funding-stress-and-intervention-playbook.md` (FX):**
Episodic — dollar funding stress events are infrequent (quarterly quarter-end stress, crisis episodes). Most valuable as a prevention doc (avoids conflating seasonal basis widening with systemic stress). Best after carry and divergence docs are active so the FX agent already has direction logic before adding stress mechanics.

**`risk-on-risk-off-transmission-guide.md` (Risk/Sentiment):**
A reference foundation — it encodes the cross-asset correlation structure that sits beneath both the positioning and vol docs. Best uploaded last because it synthesises signals from both Batch 1 and Batch 2 docs.

**`earnings-quality-and-margin-pressure-interpretation-guide.md` (Equities):**
A reference foundation used every earnings season but most valuable after the sector rotation and regime docs are active — earnings quality interpretation requires knowing which regime is in force to determine whether the quality signal matters or is masked by multiple expansion.

---

## Which 3 Docs Should Be Uploaded First in Wave 2

**The three Batch 1 docs, in this exact order:**

**1. `carry-and-rate-differential-framework.md` → FX Agent / `frameworks`**
Upload first. The FX agent currently has no Wave 1 knowledge active — it is operating on starter-pack defaults. Carry is the mechanism that drives the majority of directional FX moves in non-crisis environments. This doc gives the FX agent its primary reasoning tool immediately.

**2. `positioning-and-crowding-framework.md` → Risk/Sentiment Agent / `frameworks`**
Upload second. The Risk/Sentiment agent's primary analytical edge over other agents is the ability to read positioning and identify fragility before it becomes price action. Without this doc, the agent is describing moves after the fact. Upload before any vol or risk-on/risk-off doc.

**3. `equity-regime-framework-rates-growth-liquidity-earnings.md` → Equities Agent / `frameworks`**
Upload third. The Equities agent needs regime classification capability before any event-level doc makes sense. The four-quadrant framework is the decision tree that determines whether an earnings beat is bullish (growth regime + expanding margins) or irrelevant (multiple-compression regime + rising rates).

Upload these three, verify retrieval using the same market-question validation approach as Wave 1, then proceed to Batch 2.

---

## File Structure Summary

```
knowledge/
├── fx/
│   ├── frameworks/
│   │   └── carry-and-rate-differential-framework.md          [Batch 1]
│   ├── event-playbooks/
│   │   ├── central-bank-divergence-playbook.md               [Batch 2]
│   │   └── dollar-funding-stress-and-intervention-playbook.md [Batch 3]
├── risk-sentiment/
│   ├── frameworks/
│   │   └── positioning-and-crowding-framework.md             [Batch 1]
│   ├── event-playbooks/
│   │   └── volatility-regime-and-fragility-playbook.md       [Batch 2]
│   ├── foundations/
│   │   └── risk-on-risk-off-transmission-guide.md            [Batch 3]
├── equities/
│   ├── frameworks/
│   │   └── equity-regime-framework-rates-growth-liquidity-earnings.md [Batch 1]
│   ├── event-playbooks/
│   │   └── sector-rotation-and-market-leadership-playbook.md [Batch 2]
│   └── foundations/
│       └── earnings-quality-and-margin-pressure-interpretation-guide.md [Batch 3]
```
