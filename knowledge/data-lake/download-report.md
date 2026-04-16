# Historical data download report

Generated: 2026-04-05T14:43:48.061Z
Historical floor: 1990-01-01

Successful series: 55
Failed series: 2

## Provider status

- fred: ok — Downloaded Headline CPI with 433 observations.
- fred: ok — Downloaded Core CPI with 433 observations.
- fred: ok — Downloaded Headline PCE with 433 observations.
- fred: ok — Downloaded Core PCE with 433 observations.
- fred: ok — Downloaded Unemployment rate with 434 observations.
- fred: ok — Downloaded Nonfarm payrolls with 435 observations.
- fred: ok — Downloaded Retail sales with 410 observations.
- fred: ok — Downloaded Industrial production with 434 observations.
- fred: ok — Downloaded Real GDP proxy with 144 observations.
- fred: ok — Downloaded Fed funds rate with 435 observations.
- fred: ok — Downloaded US 2Y yield with 9068 observations.
- fred: ok — Downloaded US 10Y yield with 9068 observations.
- fred: ok — Downloaded 10Y minus 2Y curve with 9069 observations.
- fred: ok — Downloaded 10Y breakeven inflation with 5817 observations.
- fred: ok — Downloaded VIX with 9156 observations.
- fred: ok — Downloaded US high-yield spread with 7639 observations.
- fred: ok — Downloaded Broad trade-weighted dollar with 5072 observations.
- fred: ok — Downloaded Copper spot with 410 observations.
- fred: ok — Downloaded Henry Hub natural gas with 7339 observations.
- eia: ok — Downloaded WTI crude spot with 435 observations.
- eia: ok — Downloaded Brent crude spot with 435 observations.
- eia: ok — Downloaded US crude oil ending stocks with 1891 observations.
- alpha_vantage: ok — Downloaded GLD monthly with 257 observations.
- alpha_vantage: ok — Downloaded SPY monthly with 317 observations.
- alpha_vantage: ok — Downloaded QQQ monthly with 317 observations.
- alpha_vantage: ok — Downloaded IWM monthly with 311 observations.
- alpha_vantage: ok — Downloaded XLE monthly with 317 observations.
- alpha_vantage: ok — Downloaded XLF monthly with 317 observations.
- alpha_vantage: ok — Downloaded XLK monthly with 317 observations.
- alpha_vantage: ok — Downloaded BTCUSD monthly with 189 observations.
- fred: ok — Downloaded EUR/USD with 6829 observations.
- fred: ok — Downloaded GBP/USD with 9093 observations.
- fred: ok — Downloaded USD/JPY with 9093 observations.
- fred: ok — Downloaded AUD/USD with 9093 observations.
- fred: ok — Downloaded USD/CAD with 9093 observations.
- fred: ok — Downloaded USD/CHF with 9093 observations.
- fred: ok — Downloaded NZD/USD with 9093 observations.
- fred: ok — Downloaded NOK/USD with 9093 observations.
- fred: ok — Downloaded SEK/USD with 9093 observations.
- fred: ok — Downloaded US 3M yield with 9068 observations.
- fred: ok — Downloaded US 1Y yield with 9068 observations.
- fred: ok — Downloaded US 5Y yield with 9068 observations.
- fred: ok — Downloaded US 7Y yield with 9068 observations.
- fred: ok — Downloaded US 20Y yield with 8129 observations.
- fred: ok — Downloaded US 30Y yield with 9068 observations.
- fred: ok — Downloaded 5Y TIPS real yield with 5816 observations.
- fred: ok — Downloaded 10Y TIPS real yield with 5816 observations.
- fred: ok — Downloaded ICE BofA IG OAS with 7638 observations.
- fred: ok — Downloaded ICE BofA BBB OAS with 7639 observations.
- fred: ok — Downloaded WTI crude daily with 9110 observations.
- fred: ok — Downloaded Brent crude daily with 9192 observations.
- fred: error — Failed Gold spot daily: HTTP 400
- fred: error — Failed Silver spot: HTTP 400
- fred: ok — Downloaded Aluminum with 410 observations.
- fred: ok — Downloaded Wheat with 410 observations.
- fred: ok — Downloaded TED spread with 7869 observations.
- fred: ok — Downloaded VIX near-term (9-day) with 4610 observations.
- bea: error — BEA key validation failed: This UserId is not active. Please activate it and try again.
- census: configured — Census key is configured. The starter pack currently uses FRED retail history while detailed Census retail-industry range pulls are deferred to phase 2 because the EITS API needs month-by-month pagination.

## Sector packs

- knowledge/macro/historical-starter-pack.md
- knowledge/equities/historical-starter-pack.md
- knowledge/commodities/historical-starter-pack.md
- knowledge/fx/historical-starter-pack.md
- knowledge/rates/historical-starter-pack.md
- knowledge/risk-sentiment/historical-starter-pack.md

## Failures

- Gold spot daily (fred): HTTP 400
- Silver spot (fred): HTTP 400

## Recommended next step

1. Review the generated sector markdown packs.
2. Upload the strongest packs and supporting reports through the Admin batch queue.
3. Approve only the processed notes and market cases that read cleanly.