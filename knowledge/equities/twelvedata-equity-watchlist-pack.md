# Equities Twelve Data watchlist pack

Generated at: 2026-04-04T13:54:02.343Z
Coverage start target: 1990-01-01

This pack extends the equities agent with a curated live-equity watchlist built around breadth, sector rotation, and leadership markers.

## Why this pack matters

- It gives the equities agent more than just SPY and QQQ.
- It adds breadth checks like RSP and IWM.
- It adds sector rotation proxies like XLK, XLF, XLY, XLP, XLE, and XLV.
- It adds a few single-name leadership markers like NVDA, MSFT, AAPL, and JPM.

## Watchlist coverage

### SPY — S&P 500 proxy
- Role: Large-cap benchmark and headline index anchor.
- Themes: broad market, index leadership, beta
- Coverage: 2006-05-19 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_spy_daily.json

### QQQ — Nasdaq 100 proxy
- Role: Growth and long-duration leadership anchor.
- Themes: growth, AI concentration, duration
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_qqq_daily.json

### IWM — Russell 2000 proxy
- Role: Small-cap participation and domestic breadth proxy.
- Themes: breadth, small caps, cyclicals
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_iwm_daily.json

### RSP — Equal-weight S&P 500
- Role: Breadth check versus cap-weighted index strength.
- Themes: breadth, equal-weight, participation
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_rsp_daily.json

### XLK — Technology sector ETF
- Role: Growth and software/mega-cap tech leadership proxy.
- Themes: technology, leadership, multiple sensitivity
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xlk_daily.json

### SMH — Semiconductor ETF
- Role: AI and cyclical hardware leadership proxy.
- Themes: AI, semiconductors, capex cycle
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_smh_daily.json

### XLF — Financials sector ETF
- Role: Bank and financial-conditions transmission proxy.
- Themes: banks, credit, rates transmission
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xlf_daily.json

### KRE — Regional banks ETF
- Role: Smaller-bank stress and domestic credit pulse proxy.
- Themes: regional banks, credit stress, domestic lending
- Coverage: 2006-06-22 to 2026-04-02 (4976 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_kre_daily.json

### XLY — Consumer discretionary ETF
- Role: Consumer demand and cyclical spending proxy.
- Themes: consumer, discretionary, growth confidence
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xly_daily.json

### XLP — Consumer staples ETF
- Role: Defensive consumer rotation and inflation pass-through proxy.
- Themes: defensives, staples, rotation
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xlp_daily.json

### XLI — Industrials sector ETF
- Role: Cyclical manufacturing and capital-goods participation proxy.
- Themes: industrials, manufacturing, capex
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xli_daily.json

### XLB — Materials sector ETF
- Role: Commodity-linked equity sensitivity proxy.
- Themes: materials, commodity linkage, cyclicals
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xlb_daily.json

### XLV — Healthcare sector ETF
- Role: Defensive quality and lower-beta rotation proxy.
- Themes: healthcare, defensive quality, rotation
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xlv_daily.json

### XLU — Utilities sector ETF
- Role: Bond-sensitive defensive equity proxy.
- Themes: utilities, rates sensitivity, defensives
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xlu_daily.json

### XLE — Energy sector ETF
- Role: Commodity-led equity transmission proxy.
- Themes: energy, oil beta, inflation linkage
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xle_daily.json

### XLC — Communication services ETF
- Role: Internet platform and media leadership proxy.
- Themes: platforms, communication services, growth leadership
- Coverage: 2018-06-19 to 2026-04-02 (1958 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_xlc_daily.json

### NVDA — NVIDIA
- Role: Single-name AI leadership marker.
- Themes: AI, single-name leadership, crowding
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_nvda_daily.json

### MSFT — Microsoft
- Role: Mega-cap quality growth marker.
- Themes: mega-cap tech, quality growth, AI monetization
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_msft_daily.json

### AAPL — Apple
- Role: Mega-cap consumer-tech and index concentration marker.
- Themes: consumer tech, index concentration, hardware demand
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_aapl_daily.json

### JPM — JPMorgan
- Role: Large-bank leadership and credit-confidence marker.
- Themes: banks, credit confidence, financial leadership
- Coverage: 2006-05-18 to 2026-04-02 (5000 daily observations)
- Local normalized data file: knowledge/data-lake/normalized/td_jpm_daily.json

## How to use this pack

- Queue this file into the equities agent knowledge pipeline from /admin or with the batch queue.
- Treat it as a sector framework pack, not a replacement for live quote infrastructure.
- Use it to improve how the equities agent thinks about breadth, sector rotation, and leadership concentration.
