# Wave 3 Knowledge Library — Source Manifest

**Generated:** 2026-04-15  
**Status:** Planning only — no Wave 3 docs written yet  
**Docs:** 18 total, 3 per agent  
**Agents covered:** Macro, Rates, Commodities, FX, Risk/Sentiment, Equities  
**Primary goal:** Make each agent's coverage universe concrete: what it owns, what it watches, what triggers action, what signals are false positives, and when it should hand off to another agent.

---

## Repo Folder Findings

The following agent folders already exist:

| Agent | Existing folders | Proposed Wave 3 folder additions |
|---|---|---|
| Macro | `foundations/`, `frameworks/`, `event-playbooks/`, `house-view-notes/` | `instrument-guides/`, `regime-checklists/` |
| Rates | `foundations/`, `frameworks/`, `event-playbooks/`, `house-view-notes/` | `instrument-guides/` |
| Commodities | `foundations/`, `frameworks/`, `event-playbooks/`, `house-view-notes/` | `instrument-guides/` |
| FX | `foundations/`, `frameworks/`, `event-playbooks/`, `house-view-notes/` | `instrument-guides/` |
| Risk/Sentiment | `foundations/`, `frameworks/`, `event-playbooks/`, `house-view-notes/` | `instrument-guides/` |
| Equities | `foundations/`, `frameworks/`, `event-playbooks/`, `house-view-notes/`, `instrument-guides/` | none required for this manifest |

Wave 3 should create the proposed folders only when the final docs are written. This manifest does not create those docs.

---

## Quick Reference

| # | Agent | Filename | Doc Type | Suggested Batch | Priority | Status |
|---|---|---|---|---|---|---|
| 1 | Macro | `macro-indicator-universe-and-release-map.md` | instrument-guide | 1 | P1 | todo |
| 2 | Rates | `rates-instrument-universe-and-signal-map.md` | instrument-guide | 1 | P1 | todo |
| 3 | Commodities | `commodities-instrument-universe-and-driver-map.md` | instrument-guide | 1 | P1 | todo |
| 4 | FX | `fx-pair-universe-and-driver-map.md` | instrument-guide | 1 | P1 | todo |
| 5 | Risk/Sentiment | `risk-sentiment-indicator-universe-and-signal-map.md` | instrument-guide | 1 | P1 | todo |
| 6 | Equities | `equity-universe-and-sector-coverage-map.md` | instrument-guide | 1 | P1 | todo |
| 7 | Macro | `macro-regime-classification-checklist.md` | regime-checklist | 2 | P2 | todo |
| 8 | Rates | `treasury-auction-and-supply-playbook.md` | event-playbook | 2 | P2 | todo |
| 9 | Commodities | `natural-gas-and-lng-framework.md` | framework | 2 | P2 | todo |
| 10 | FX | `g10-fx-central-bank-and-real-yield-playbook.md` | event-playbook | 2 | P2 | todo |
| 11 | Risk/Sentiment | `credit-spread-and-liquidity-stress-playbook.md` | event-playbook | 2 | P2 | todo |
| 12 | Equities | `single-stock-movement-interpretation-playbook.md` | event-playbook | 2 | P2 | todo |
| 13 | Macro | `fiscal-policy-and-liquidity-transmission-framework.md` | framework | 3 | P3 | todo |
| 14 | Rates | `sofr-fed-funds-ois-market-guide.md` | instrument-guide | 3 | P3 | todo |
| 15 | Commodities | `metals-growth-and-energy-transition-playbook.md` | event-playbook | 3 | P3 | todo |
| 16 | FX | `em-fx-risk-and-dollar-liquidity-framework.md` | framework | 3 | P3 | todo |
| 17 | Risk/Sentiment | `flows-positioning-and-degrossing-framework.md` | framework | 3 | P3 | todo |
| 18 | Equities | `valuation-growth-quality-factor-framework.md` | framework | 3 | P3 | todo |

---

## Wave 3 Source Manifest

| agent | doc_title | doc_type | objective | approved source URLs | why these sources were chosen | suggested folder path | suggested filename | priority | status |
|---|---|---|---|---|---|---|---|---|---|
| Macro | macro-indicator-universe-and-release-map | instrument-guide | Define the Macro agent's owned indicator universe, release hierarchy, timing, revision risk, and handoff rules so it stops treating every economic datapoint as equally thesis-worthy. | [BLS CPI](https://www.bls.gov/cpi/)<br>[BLS Employment Situation](https://www.bls.gov/news.release/empsit.toc.htm)<br>[BLS JOLTS](https://www.bls.gov/jlt/)<br>[BEA GDP](https://www.bea.gov/data/gdp/gross-domestic-product)<br>[Federal Reserve FOMC calendars](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm) | BLS and BEA provide the core official macro release universe; FOMC calendars connect macro releases to policy reaction windows. Together they support release priority, timing, revisions, and post/comment/silence thresholds. | `knowledge/macro/instrument-guides/` | `macro-indicator-universe-and-release-map.md` | P1 | todo |
| Macro | macro-regime-classification-checklist | regime-checklist | Give Macro a compact regime classifier for expansion, slowdown, recession, stagflation, disinflation, and reflation, with explicit evidence thresholds and cross-agent handoff triggers. | [BEA GDP](https://www.bea.gov/data/gdp/gross-domestic-product)<br>[BLS CPI](https://www.bls.gov/cpi/)<br>[BLS unemployment rate](https://www.bls.gov/charts/employment-situation/civilian-unemployment-rate.htm)<br>[Federal Reserve Financial Stability Report](https://www.federalreserve.gov/publications/financial-stability-report.htm)<br>[FRED 10Y-2Y Treasury spread](https://fred.stlouisfed.org/series/T10Y2Y) | These sources cover growth, inflation, labor slack, financial stability, and curve signal inputs needed to classify regimes without relying on narrative labels alone. | `knowledge/macro/regime-checklists/` | `macro-regime-classification-checklist.md` | P2 | todo |
| Macro | fiscal-policy-and-liquidity-transmission-framework | framework | Teach Macro how Treasury issuance, deficits, TGA swings, QT, RRP drain, and fiscal impulse affect liquidity, yields, risk assets, and when the issue belongs to Rates instead. | [Treasury Quarterly Refunding](https://home.treasury.gov/policy-issues/financing-the-government/quarterly-refunding)<br>[Daily Treasury Statement](https://fiscaldata.treasury.gov/datasets/daily-treasury-statement/)<br>[Federal Reserve balance sheet trends](https://www.federalreserve.gov/monetarypolicy/bst_recenttrends.htm)<br>[NY Fed Treasury market operations](https://www.newyorkfed.org/markets/desk-operations/treasury-securities) | Treasury sources define issuance and cash-balance mechanics; Fed and NY Fed sources explain balance-sheet and market-operation channels. This gives Macro a fiscal/liquidity bridge without duplicating Rates auction mechanics. | `knowledge/macro/frameworks/` | `fiscal-policy-and-liquidity-transmission-framework.md` | P3 | todo |
| Rates | rates-instrument-universe-and-signal-map | instrument-guide | Map the Rates agent's full instrument universe: Treasury curve tenors, bills, futures, SOFR, OIS, TIPS, breakevens, swaps, term premium, and what each instrument says. | [Treasury interest rate statistics](https://home.treasury.gov/policy-issues/financing-the-government/interest-rate-statistics)<br>[Federal Reserve H.15](https://www.federalreserve.gov/releases/h15/)<br>[NY Fed SOFR](https://www.newyorkfed.org/markets/reference-rates/sofr)<br>[TreasuryDirect auctions](https://www.treasurydirect.gov/auctions/)<br>[CME Interest Rates](https://www.cmegroup.com/markets/interest-rates.html) | Treasury, Fed, NY Fed, TreasuryDirect, and CME cover the official and exchange-traded rates universe. The doc should teach what each price is useful for and which signals are noise. | `knowledge/rates/instrument-guides/` | `rates-instrument-universe-and-signal-map.md` | P1 | todo |
| Rates | treasury-auction-and-supply-playbook | event-playbook | Teach Rates how to interpret auction tails, bid-to-cover, indirect/direct demand, dealer takedown, refunding changes, supply shocks, and when a bad auction is thesis-grade. | [TreasuryDirect auction results](https://www.treasurydirect.gov/auctions/announcements-data-results/)<br>[Treasury Quarterly Refunding](https://home.treasury.gov/policy-issues/financing-the-government/quarterly-refunding)<br>[NY Fed primary dealer statistics](https://www.newyorkfed.org/markets/primarydealer_statistics)<br>[Treasury debt management overview](https://home.treasury.gov/system/files/276/Debt-Management-Overview.pdf) | These sources provide auction data, issuance plans, dealer balance sheet context, and debt-management mechanics. The doc should prevent overreacting to one weak auction while catching genuine supply/demand stress. | `knowledge/rates/event-playbooks/` | `treasury-auction-and-supply-playbook.md` | P2 | todo |
| Rates | sofr-fed-funds-ois-market-guide | instrument-guide | Explain SOFR, effective fed funds, OIS, futures-implied policy, repo stress, RRP, and when money-market plumbing should change the Rates thesis. | [NY Fed SOFR averages](https://www.newyorkfed.org/markets/reference-rates/sofr-averages-and-index)<br>[Federal Reserve H.15](https://www.federalreserve.gov/releases/h15/)<br>[NY Fed reverse repo operations](https://www.newyorkfed.org/markets/desk-operations/reverse-repo)<br>[CME Three-Month SOFR Futures](https://www.cmegroup.com/markets/interest-rates/stirs/three-month-sofr.html) | NY Fed sources define SOFR and repo plumbing; Fed H.15 anchors official rates; CME connects the signals to traded futures. This doc should keep plumbing stress separate from normal policy repricing. | `knowledge/rates/instrument-guides/` | `sofr-fed-funds-ois-market-guide.md` | P3 | todo |
| Commodities | commodities-instrument-universe-and-driver-map | instrument-guide | Define the Commodities agent's coverage beyond WTI: Brent, refined products, gas, LNG, metals, agriculture proxies, curves, inventories, spreads, and handoffs to Macro/Risk. | [EIA petroleum](https://www.eia.gov/petroleum/)<br>[EIA natural gas](https://www.eia.gov/naturalgas/)<br>[IEA Oil Market Report](https://www.iea.org/reports/oil-market-report)<br>[CME Energy markets](https://www.cmegroup.com/markets/energy.html)<br>[CME Metals markets](https://www.cmegroup.com/markets/metals.html) | EIA and IEA cover physical supply/demand and inventory data; CME defines liquid futures instruments. The doc should stop the agent from answering every commodity prompt as WTI-only. | `knowledge/commodities/instrument-guides/` | `commodities-instrument-universe-and-driver-map.md` | P1 | todo |
| Commodities | natural-gas-and-lng-framework | framework | Give Commodities a gas-specific framework for Henry Hub, European gas, LNG flows, storage, weather, power burn, production, and why gas cannot be interpreted like oil. | [EIA Natural Gas Weekly Update](https://www.eia.gov/naturalgas/weekly/)<br>[EIA natural gas storage](https://www.eia.gov/naturalgas/storage/)<br>[EIA Henry Hub spot price](https://www.eia.gov/dnav/ng/hist/rngwhhdD.htm)<br>[IEA Gas Market Reports](https://www.iea.org/reports?topic=Gas) | These official sources provide gas prices, storage, weekly balances, and global LNG context. The doc should teach seasonality, weather sensitivity, and regional bottlenecks as distinct from crude logic. | `knowledge/commodities/frameworks/` | `natural-gas-and-lng-framework.md` | P2 | todo |
| Commodities | metals-growth-and-energy-transition-playbook | event-playbook | Teach the agent how to interpret copper, gold, silver, aluminum, lithium, and critical minerals as growth, real-yield, dollar, inventory, and energy-transition signals. | [CME Metals markets](https://www.cmegroup.com/markets/metals.html)<br>[USGS Mineral Commodity Summaries](https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries)<br>[IEA critical minerals](https://www.iea.org/topics/critical-minerals)<br>[London Metal Exchange warehouse reports](https://www.lme.com/en/Market-data/Reports-and-data/Warehouse-and-stocks-reports) | CME covers traded metals; USGS and IEA cover physical supply and transition demand; LME warehouse data anchors inventory tightness. The doc should separate growth metals from monetary metals. | `knowledge/commodities/event-playbooks/` | `metals-growth-and-energy-transition-playbook.md` | P3 | todo |
| FX | fx-pair-universe-and-driver-map | instrument-guide | Define the FX agent's pair universe, including G10 majors, crosses, EM FX, dollar index logic, carry pairs, safe havens, and when to hand off to Rates or Risk. | [BIS Triennial FX Survey](https://www.bis.org/statistics/rpfx22_fx.htm)<br>[Federal Reserve H.10](https://www.federalreserve.gov/releases/h10/current/)<br>[IMF Data](https://www.imf.org/en/Data)<br>[BIS global liquidity indicators](https://www.bis.org/statistics/gli.htm) | BIS defines market structure and turnover; H.10 provides official FX reference rates; IMF and BIS liquidity data add reserve, balance-of-payments, and dollar-liquidity context. | `knowledge/fx/instrument-guides/` | `fx-pair-universe-and-driver-map.md` | P1 | todo |
| FX | g10-fx-central-bank-and-real-yield-playbook | event-playbook | Teach FX how to translate G10 policy surprises into currency moves using front-end differentials, real yields, surprise vs priced path, and cross-specific sensitivity. | [Federal Reserve FOMC calendars](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm)<br>[ECB monetary policy decisions](https://www.ecb.europa.eu/press/govcdec/mopo/html/index.en.html)<br>[Bank of Japan monetary policy](https://www.boj.or.jp/en/mopo/)<br>[Bank of England monetary policy](https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes)<br>[BIS central bank policy rates](https://www.bis.org/statistics/cbpol.htm) | These sources anchor the major central bank decision set and policy-rate comparisons. The doc should make FX reaction conditional on surprise, real-yield direction, and already-priced divergence. | `knowledge/fx/event-playbooks/` | `g10-fx-central-bank-and-real-yield-playbook.md` | P2 | todo |
| FX | em-fx-risk-and-dollar-liquidity-framework | framework | Give FX a framework for EM currencies: carry, reserves, current account, terms of trade, dollar funding, intervention risk, and risk-off beta. | [IMF Global Financial Stability Report](https://www.imf.org/en/Publications/GFSR)<br>[BIS international banking statistics](https://www.bis.org/statistics/about_banking_stats.htm)<br>[Federal Reserve H.10](https://www.federalreserve.gov/releases/h10/current/)<br>[NY Fed central bank swap arrangements](https://www.newyorkfed.org/markets/international-market-operations/central-bank-swap-arrangements) | IMF and BIS capture EM funding vulnerability; H.10 anchors FX rates; NY Fed swap lines explain dollar-liquidity backstops. The doc should prevent the agent from treating EM FX as simple carry trades. | `knowledge/fx/frameworks/` | `em-fx-risk-and-dollar-liquidity-framework.md` | P3 | todo |
| Risk/Sentiment | risk-sentiment-indicator-universe-and-signal-map | instrument-guide | Define the Risk/Sentiment agent's indicator map: VIX complex, credit spreads, MOVE/rates vol, equity breadth, COT, fund flows, liquidity, and cross-asset stress handoffs. | [CBOE VIX](https://www.cboe.com/tradable_products/vix/)<br>[CFTC COT](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm)<br>[Federal Reserve Financial Stability Report](https://www.federalreserve.gov/publications/financial-stability-report.htm)<br>[FRED credit spread categories](https://fred.stlouisfed.org/categories/32297)<br>[FINRA fixed income data](https://www.finra.org/finra-data/fixed-income) | These sources cover volatility, positioning, credit, and financial stability. The doc should make Risk/Sentiment measurable instead of generic risk-on/risk-off commentary. | `knowledge/risk-sentiment/instrument-guides/` | `risk-sentiment-indicator-universe-and-signal-map.md` | P1 | todo |
| Risk/Sentiment | credit-spread-and-liquidity-stress-playbook | event-playbook | Teach Risk/Sentiment how to read IG/HY spreads, funding stress, liquidity gaps, dealer balance-sheet strain, and when credit confirms or contradicts equity volatility. | [Federal Reserve Financial Stability Report](https://www.federalreserve.gov/publications/financial-stability-report.htm)<br>[FRED ICE BofA High Yield OAS](https://fred.stlouisfed.org/series/BAMLH0A0HYM2)<br>[FRED ICE BofA IG OAS](https://fred.stlouisfed.org/series/BAMLC0A0CM)<br>[FINRA fixed income data](https://www.finra.org/finra-data/fixed-income)<br>[NY Fed SOFR](https://www.newyorkfed.org/markets/reference-rates/sofr) | Fed and FRED provide spread and stability anchors; FINRA gives bond-market transaction context; SOFR adds funding stress. The doc should distinguish equity-led volatility from credit-led systemic stress. | `knowledge/risk-sentiment/event-playbooks/` | `credit-spread-and-liquidity-stress-playbook.md` | P2 | todo |
| Risk/Sentiment | flows-positioning-and-degrossing-framework | framework | Explain flow stress, hedge-fund deleveraging, CTA trend breaks, dealer gamma constraints, foreign flows, and how to identify forced selling vs discretionary risk reduction. | [CFTC COT](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm)<br>[Treasury TIC data](https://home.treasury.gov/data/treasury-international-capital-tic-system)<br>[NY Fed primary dealer statistics](https://www.newyorkfed.org/markets/primarydealer_statistics)<br>[IMF Global Financial Stability Report](https://www.imf.org/en/Publications/GFSR) | CFTC, TIC, and primary-dealer data capture futures, foreign holdings, and dealer positioning; IMF adds systemic leverage and flow-risk framing. The doc should help the agent detect forced flow regimes. | `knowledge/risk-sentiment/frameworks/` | `flows-positioning-and-degrossing-framework.md` | P3 | todo |
| Equities | equity-universe-and-sector-coverage-map | instrument-guide | Define the Equities agent's coverage universe: single stocks, sectors, industries, factors, indices, ADRs, ETFs, and when live quotes are enough vs when fundamentals are needed. | [SEC EDGAR search](https://www.sec.gov/edgar/search-and-access)<br>[SEC company facts API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)<br>[MSCI GICS](https://www.msci.com/our-solutions/indexes/gics)<br>[BLS industry at a glance](https://www.bls.gov/iag/)<br>[FINRA equity data](https://www.finra.org/finra-data/equity) | SEC sources anchor company filings and facts; GICS structures sector/industry ownership; BLS provides industry context; FINRA adds market-data context. This doc should connect the 7,075-stock universe to agent ownership and handoffs. | `knowledge/equities/instrument-guides/` | `equity-universe-and-sector-coverage-map.md` | P1 | todo |
| Equities | single-stock-movement-interpretation-playbook | event-playbook | Teach Equities how to interpret single-stock moves: earnings, guidance, rating changes, buybacks, insider filings, sector beta, factor beta, index moves, and false causality. | [SEC EDGAR search](https://www.sec.gov/edgar/search-and-access)<br>[SEC Forms List](https://www.sec.gov/about/forms/sec-forms-list-pdf-version)<br>[FINRA equity data](https://www.finra.org/finra-data/equity)<br>[Nasdaq Trader trade halts](https://www.nasdaqtrader.com/Trader.aspx?id=TradeHalts) | SEC filings define event truth; FINRA and Nasdaq Trader help interpret trading, halts, and market-structure context. The doc should prevent one-headline stock narratives when factor or sector beta explains the move. | `knowledge/equities/event-playbooks/` | `single-stock-movement-interpretation-playbook.md` | P2 | todo |
| Equities | valuation-growth-quality-factor-framework | framework | Give Equities a factor-level framework for valuation, growth, quality, profitability, leverage, momentum, rates sensitivity, and when factor moves should override stock-specific narratives. | [Federal Reserve Financial Stability Report](https://www.federalreserve.gov/publications/financial-stability-report.htm)<br>[BEA corporate profits](https://www.bea.gov/data/income-saving/corporate-profits)<br>[BLS productivity and costs](https://www.bls.gov/productivity/)<br>[NY Fed equity risk premium model](https://www.newyorkfed.org/research/data_indicators/equity-risk-premium)<br>[SEC company facts API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Fed and NY Fed sources anchor valuation and risk premium; BEA and BLS anchor profits and costs; SEC company facts connects factor logic to company fundamentals. | `knowledge/equities/frameworks/` | `valuation-growth-quality-factor-framework.md` | P3 | todo |

---

## Recommended Batch Order

### Batch 1 — Coverage universe maps

Write these first because every later Wave 3 doc depends on clear ownership, instrument coverage, and handoff rules.

1. `knowledge/macro/instrument-guides/macro-indicator-universe-and-release-map.md`
2. `knowledge/rates/instrument-guides/rates-instrument-universe-and-signal-map.md`
3. `knowledge/commodities/instrument-guides/commodities-instrument-universe-and-driver-map.md`
4. `knowledge/fx/instrument-guides/fx-pair-universe-and-driver-map.md`
5. `knowledge/risk-sentiment/instrument-guides/risk-sentiment-indicator-universe-and-signal-map.md`
6. `knowledge/equities/instrument-guides/equity-universe-and-sector-coverage-map.md`

### Batch 2 — High-frequency specialist playbooks

These should come second because they convert coverage into live trigger behavior.

1. `knowledge/macro/regime-checklists/macro-regime-classification-checklist.md`
2. `knowledge/rates/event-playbooks/treasury-auction-and-supply-playbook.md`
3. `knowledge/commodities/frameworks/natural-gas-and-lng-framework.md`
4. `knowledge/fx/event-playbooks/g10-fx-central-bank-and-real-yield-playbook.md`
5. `knowledge/risk-sentiment/event-playbooks/credit-spread-and-liquidity-stress-playbook.md`
6. `knowledge/equities/event-playbooks/single-stock-movement-interpretation-playbook.md`

### Batch 3 — Synthesis and edge-case frameworks

These should come third because they are useful after ownership and core trigger logic are already active.

1. `knowledge/macro/frameworks/fiscal-policy-and-liquidity-transmission-framework.md`
2. `knowledge/rates/instrument-guides/sofr-fed-funds-ois-market-guide.md`
3. `knowledge/commodities/event-playbooks/metals-growth-and-energy-transition-playbook.md`
4. `knowledge/fx/frameworks/em-fx-risk-and-dollar-liquidity-framework.md`
5. `knowledge/risk-sentiment/frameworks/flows-positioning-and-degrossing-framework.md`
6. `knowledge/equities/frameworks/valuation-growth-quality-factor-framework.md`

---

## Which 6 Docs Should Be Written First

The first six should be the Batch 1 coverage-universe maps:

| Agent | First doc | Why first |
|---|---|---|
| Macro | `macro-indicator-universe-and-release-map.md` | Macro needs release hierarchy and ownership boundaries before adding more regimes. |
| Rates | `rates-instrument-universe-and-signal-map.md` | Rates needs a clean map across cash Treasuries, futures, SOFR, OIS, TIPS, and breakevens. |
| Commodities | `commodities-instrument-universe-and-driver-map.md` | Commodities needs to stop being oil-only and learn which non-oil markets it owns. |
| FX | `fx-pair-universe-and-driver-map.md` | FX needs pair-level coverage so it does not collapse into generic dollar/rates commentary. |
| Risk/Sentiment | `risk-sentiment-indicator-universe-and-signal-map.md` | Risk/Sentiment needs measurable indicators so "risk-on/risk-off" becomes evidence-based. |
| Equities | `equity-universe-and-sector-coverage-map.md` | Equities needs to connect the 7,075-stock universe to sectors, factors, filings, and handoff rules. |

---

## Biggest Coverage Risk Per Agent

| Agent | Biggest coverage risk | How Wave 3 should reduce it |
|---|---|---|
| Macro | Macro becomes the default catch-all for any economic or market question. | Define a release universe, regime checklist, and handoff rules to Rates, FX, Equities, and Risk/Sentiment. |
| Rates | Rates over-focuses on Fed policy and under-explains instrument-specific signals like auctions, SOFR, OIS, TIPS, and curve tenors. | Add a rates instrument map plus auction and money-market guides. |
| Commodities | Commodities stays too oil-centric and misses natural gas, LNG, metals, inventories, and non-oil curve signals. | Add a broad commodities universe map, gas/LNG framework, and metals playbook. |
| FX | FX becomes "Rates with currency names" instead of pair-specific, flow-aware, funding-aware FX analysis. | Add pair universe, G10 real-yield playbook, and EM FX/dollar liquidity framework. |
| Risk/Sentiment | Risk/Sentiment stays vague, using broad risk-on/risk-off language without measurable thresholds. | Add indicator map, credit stress playbook, and flow/degrossing framework. |
| Equities | Equities has live quotes but may not connect stocks to sectors, factors, filings, margins, and regime context. | Add equity universe map, single-stock movement playbook, and valuation/growth/quality factor framework. |

---

## Notes For Writing Wave 3 Docs Later

- Use the same frontmatter and section structure as Waves 1 and 2.
- Each doc should include explicit "owns vs handoff" logic.
- Each doc should include at least one "do not answer as this agent if..." rule.
- The coverage maps should be concise but operational: source, instrument, trigger, ownership, false signal, handoff.
- Do not upload any Wave 3 doc until Batch 1 is written, tightened, and reviewed.
