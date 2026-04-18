export const STARTER_DEFAULT_START_DATE = "1990-01-01";
export const ALPHA_VANTAGE_REQUEST_DELAY_MS = 1500;

export const AGENT_PACKS = {
  "macro-agent": {
    slug: "macro",
    title: "Macro historical starter pack",
    focus:
      "Inflation, labour, growth, policy, and recession-regime context that helps the macro agent compare today with prior tightening, easing, and slowdown phases."
  },
  "equities-agent": {
    slug: "equities",
    title: "Equities historical starter pack",
    focus:
      "Index and sector proxy history that helps the equities agent read leadership, breadth concentration, and rotation across market regimes."
  },
  "commodities-agent": {
    slug: "commodities",
    title: "Commodities historical starter pack",
    focus:
      "Commodity spot prices and inventory anchors that help the commodities agent reason about supply shocks, inflation impulse, and margin pressure."
  },
  "fx-agent": {
    slug: "fx",
    title: "FX historical starter pack",
    focus:
      "Dollar and cross-asset regime anchors that help the FX agent compare current moves with prior dollar squeeze, carry unwind, and policy-divergence episodes."
  },
  "rates-agent": {
    slug: "rates",
    title: "Rates historical starter pack",
    focus:
      "Yield curve, policy, inflation, and duration-stress history that helps the rates agent frame repricing waves and curve shifts."
  },
  "risk-sentiment-agent": {
    slug: "risk-sentiment",
    title: "Risk / Sentiment historical starter pack",
    focus:
      "Volatility, credit, cross-asset proxy, and crypto regime history that helps the risk agent spot positioning stress and risk-on or risk-off transitions."
  }
};

export const STARTER_SERIES_CATALOG = [
  {
    id: "fred_cpi_headline",
    source: "fred",
    sourceSeriesId: "CPIAUCSL",
    label: "Headline CPI",
    description: "Consumer Price Index for All Urban Consumers, monthly.",
    usageNote: "Use for inflation regime changes, policy pressure, and real-income squeeze context.",
    frequency: "monthly",
    agents: ["macro-agent", "rates-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_cpi_core",
    source: "fred",
    sourceSeriesId: "CPILFESL",
    label: "Core CPI",
    description: "Consumer Price Index less food and energy, monthly.",
    usageNote: "Use for sticky inflation persistence, policy credibility, and valuation stress context.",
    frequency: "monthly",
    agents: ["macro-agent", "rates-agent"]
  },
  {
    id: "fred_m1_monthly",
    source: "fred",
    sourceSeriesId: "M1SL",
    label: "M1 Money Stock",
    description: "M1 money supply (currency, demand deposits, other liquid deposits), monthly, seasonally adjusted.",
    usageNote: "Use for liquidity regime context, money supply expansion/contraction cycles, and correlation with inflation and asset prices.",
    frequency: "monthly",
    agents: ["macro-agent", "rates-agent", "fx-agent"]
  },
  {
    id: "fred_m2_monthly",
    source: "fred",
    sourceSeriesId: "M2SL",
    label: "M2 Money Stock",
    description: "M2 money supply (M1 plus savings, time deposits under $100k, retail money market funds), monthly, seasonally adjusted.",
    usageNote: "Use for broader liquidity regime and money supply growth rate context alongside M1.",
    frequency: "monthly",
    agents: ["macro-agent", "rates-agent", "fx-agent"]
  },
  {
    id: "fred_pce_headline",
    source: "fred",
    sourceSeriesId: "PCEPI",
    label: "Headline PCE",
    description: "Personal Consumption Expenditures price index, monthly.",
    usageNote: "Use for Fed-sensitive inflation framing and long-cycle disinflation or reflation shifts.",
    frequency: "monthly",
    agents: ["macro-agent", "rates-agent"]
  },
  {
    id: "fred_pce_core",
    source: "fred",
    sourceSeriesId: "PCEPILFE",
    label: "Core PCE",
    description: "Core Personal Consumption Expenditures price index, monthly.",
    usageNote: "Use for Fed reaction function analogs and inflation stickiness analysis.",
    frequency: "monthly",
    agents: ["macro-agent", "rates-agent"]
  },
  {
    id: "fred_unemployment",
    source: "fred",
    sourceSeriesId: "UNRATE",
    label: "Unemployment rate",
    description: "Civilian unemployment rate, monthly.",
    usageNote: "Use for recession risk, labour slack, and growth-scare analogs.",
    frequency: "monthly",
    agents: ["macro-agent", "rates-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_nonfarm_payrolls",
    source: "fred",
    sourceSeriesId: "PAYEMS",
    label: "Nonfarm payrolls",
    description: "All employees, total nonfarm payrolls, monthly.",
    usageNote: "Use for labour momentum, soft-landing versus recession comparisons, and policy durability.",
    frequency: "monthly",
    agents: ["macro-agent", "equities-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_retail_sales",
    source: "fred",
    sourceSeriesId: "RSAFS",
    label: "Retail sales",
    description: "Advance retail sales, monthly.",
    usageNote: "Use for consumer-strength, demand rotation, and growth breadth context.",
    frequency: "monthly",
    agents: ["macro-agent", "equities-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_industrial_production",
    source: "fred",
    sourceSeriesId: "INDPRO",
    label: "Industrial production",
    description: "Industrial Production Index, monthly.",
    usageNote: "Use for cyclical growth, manufacturing regime, and commodity-demand analogs.",
    frequency: "monthly",
    agents: ["macro-agent", "commodities-agent", "equities-agent"]
  },
  {
    id: "fred_manufacturing_employment",
    source: "fred",
    sourceSeriesId: "MANEMP",
    label: "Manufacturing employment",
    description: "All employees, manufacturing payrolls, monthly.",
    usageNote: "Use for manufacturing labor-cycle confirmation, ISM/PMI employment proxy context, and cyclical growth analogs when true PMI data is unavailable.",
    frequency: "monthly",
    agents: ["macro-agent", "equities-agent", "commodities-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_gdp",
    source: "fred",
    sourceSeriesId: "GDP",
    label: "Real GDP proxy",
    description: "Gross Domestic Product, quarterly.",
    usageNote: "Use for long-cycle growth regime comparisons and macro narrative anchoring.",
    frequency: "quarterly",
    agents: ["macro-agent", "equities-agent"]
  },
  {
    id: "fred_fedfunds",
    source: "fred",
    sourceSeriesId: "FEDFUNDS",
    label: "Fed funds rate",
    description: "Effective federal funds rate, monthly.",
    usageNote: "Use for tightening and easing cycle analogs, discount-rate framing, and carry context.",
    frequency: "monthly",
    agents: ["macro-agent", "rates-agent", "fx-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_us2y",
    source: "fred",
    sourceSeriesId: "DGS2",
    label: "US 2Y yield",
    description: "2-year Treasury constant maturity rate, daily.",
    usageNote: "Use for front-end repricing, policy path sensitivity, and FX rate-differential context.",
    frequency: "daily",
    agents: ["macro-agent", "rates-agent", "fx-agent"]
  },
  {
    id: "fred_us10y",
    source: "fred",
    sourceSeriesId: "DGS10",
    label: "US 10Y yield",
    description: "10-year Treasury constant maturity rate, daily.",
    usageNote: "Use for duration shock analogs, equity multiple pressure, and macro discount-rate context.",
    frequency: "daily",
    agents: ["macro-agent", "rates-agent", "equities-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_curve_10y2y",
    source: "fred",
    sourceSeriesId: "T10Y2Y",
    label: "10Y minus 2Y curve",
    description: "Treasury yield spread between 10Y and 2Y, daily.",
    usageNote: "Use for curve inversion or steepening analogs and recession timing context.",
    frequency: "daily",
    agents: ["macro-agent", "rates-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_breakeven_10y",
    source: "fred",
    sourceSeriesId: "T10YIE",
    label: "10Y breakeven inflation",
    description: "10-year breakeven inflation rate, daily.",
    usageNote: "Use for inflation expectations and real-rate regime comparisons.",
    frequency: "daily",
    agents: ["macro-agent", "rates-agent", "commodities-agent"]
  },
  {
    id: "fred_vix",
    source: "fred",
    sourceSeriesId: "VIXCLS",
    label: "VIX",
    description: "CBOE Volatility Index, daily.",
    usageNote: "Use for volatility spikes, de-risking episodes, and sentiment washout analogs.",
    frequency: "daily",
    agents: ["equities-agent", "risk-sentiment-agent", "macro-agent"]
  },
  {
    id: "fred_high_yield_spread",
    source: "fred",
    sourceSeriesId: "BAMLH0A0HYM2",
    label: "US high-yield spread",
    description: "ICE BofA US High Yield Index Option-Adjusted Spread, daily.",
    usageNote: "Use for credit stress, financing conditions, and cross-asset risk-off confirmation.",
    frequency: "daily",
    agents: ["risk-sentiment-agent", "macro-agent", "equities-agent"]
  },
  {
    id: "fred_broad_dollar",
    source: "fred",
    sourceSeriesId: "DTWEXBGS",
    label: "Broad trade-weighted dollar",
    description: "Nominal broad US dollar index, daily.",
    usageNote: "Use for dollar squeeze, global liquidity, and policy-divergence regime comparisons.",
    frequency: "daily",
    agents: ["fx-agent", "macro-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_copper",
    source: "fred",
    sourceSeriesId: "PCOPPUSDM",
    label: "Copper spot",
    description: "Global price of copper, daily.",
    usageNote: "Use for industrial cycle strength and China-sensitive growth analogs.",
    frequency: "daily",
    agents: ["commodities-agent", "macro-agent", "equities-agent"]
  },
  {
    id: "fred_nat_gas",
    source: "fred",
    sourceSeriesId: "DHHNGSP",
    label: "Henry Hub natural gas",
    description: "Henry Hub natural gas spot price, daily.",
    usageNote: "Use for energy inflation, utility pressure, and supply-shock analogs.",
    frequency: "daily",
    agents: ["commodities-agent", "macro-agent"]
  },
  {
    id: "eia_wti_monthly",
    source: "eia",
    label: "WTI crude spot",
    description: "Official EIA monthly WTI spot price series.",
    usageNote: "Use for commodity inflation regimes and crude-demand versus policy interactions.",
    frequency: "monthly",
    agents: ["commodities-agent", "macro-agent", "risk-sentiment-agent"],
    path: "/v2/petroleum/pri/spt/data/",
    params: {
      frequency: "monthly",
      "data[0]": "value",
      "facets[series][]": "RWTC"
    }
  },
  {
    id: "eia_brent_monthly",
    source: "eia",
    label: "Brent crude spot",
    description: "Official EIA monthly Brent spot price series.",
    usageNote: "Use for global oil shock comparisons and crude benchmark spread framing.",
    frequency: "monthly",
    agents: ["commodities-agent", "macro-agent"],
    path: "/v2/petroleum/pri/spt/data/",
    params: {
      frequency: "monthly",
      "data[0]": "value",
      "facets[series][]": "RBRTE"
    }
  },
  {
    id: "eia_us_crude_stocks",
    source: "eia",
    label: "US crude oil ending stocks",
    description: "Official EIA weekly US crude oil ending stocks.",
    usageNote: "Use for inventory tightness, supply cushion, and commodity-scarcity regime analogs.",
    frequency: "weekly",
    agents: ["commodities-agent", "macro-agent"],
    path: "/v2/petroleum/stoc/wstk/data/",
    params: {
      frequency: "weekly",
      "data[0]": "value",
      "facets[product][]": "EPC0",
      "facets[duoarea][]": "NUS",
      "facets[process][]": "SAE"
    }
  },
  {
    id: "av_gld_monthly",
    source: "alpha_vantage",
    label: "GLD monthly",
    description: "Gold proxy ETF monthly adjusted history.",
    usageNote: "Use for gold-risk, real-yield tension, and inflation-hedge analogs when spot history is not available from a stable free feed.",
    frequency: "monthly",
    agents: ["commodities-agent", "macro-agent", "risk-sentiment-agent"],
    functionName: "TIME_SERIES_MONTHLY_ADJUSTED",
    symbol: "GLD"
  },
  {
    id: "av_spy_monthly",
    source: "alpha_vantage",
    label: "SPY monthly",
    description: "S&P 500 proxy ETF monthly adjusted history.",
    usageNote: "Use for broad US equity trend, drawdown analogs, and cross-asset comparison.",
    frequency: "monthly",
    agents: ["equities-agent", "risk-sentiment-agent", "macro-agent"],
    functionName: "TIME_SERIES_MONTHLY_ADJUSTED",
    symbol: "SPY"
  },
  {
    id: "av_qqq_monthly",
    source: "alpha_vantage",
    label: "QQQ monthly",
    description: "Nasdaq 100 proxy ETF monthly adjusted history.",
    usageNote: "Use for growth leadership, duration sensitivity, and concentration regime analogs.",
    frequency: "monthly",
    agents: ["equities-agent", "risk-sentiment-agent"],
    functionName: "TIME_SERIES_MONTHLY_ADJUSTED",
    symbol: "QQQ"
  },
  {
    id: "av_iwm_monthly",
    source: "alpha_vantage",
    label: "IWM monthly",
    description: "Small-cap proxy ETF monthly adjusted history.",
    usageNote: "Use for domestic cyclicality, breadth, and financing-condition sensitivity.",
    frequency: "monthly",
    agents: ["equities-agent", "risk-sentiment-agent", "macro-agent"],
    functionName: "TIME_SERIES_MONTHLY_ADJUSTED",
    symbol: "IWM"
  },
  {
    id: "av_xle_monthly",
    source: "alpha_vantage",
    label: "XLE monthly",
    description: "Energy sector ETF monthly adjusted history.",
    usageNote: "Use for equity-energy linkage, oil beta, and inflation-through-margins analogs.",
    frequency: "monthly",
    agents: ["equities-agent", "commodities-agent"],
    functionName: "TIME_SERIES_MONTHLY_ADJUSTED",
    symbol: "XLE"
  },
  {
    id: "av_xlf_monthly",
    source: "alpha_vantage",
    label: "XLF monthly",
    description: "Financials sector ETF monthly adjusted history.",
    usageNote: "Use for bank-beta, rate-sensitivity, and curve-linked equity analogs.",
    frequency: "monthly",
    agents: ["equities-agent", "rates-agent", "risk-sentiment-agent"],
    functionName: "TIME_SERIES_MONTHLY_ADJUSTED",
    symbol: "XLF"
  },
  {
    id: "av_xlk_monthly",
    source: "alpha_vantage",
    label: "XLK monthly",
    description: "Technology sector ETF monthly adjusted history.",
    usageNote: "Use for long-duration equity leadership and policy-sensitivity analogs.",
    frequency: "monthly",
    agents: ["equities-agent", "risk-sentiment-agent", "rates-agent"],
    functionName: "TIME_SERIES_MONTHLY_ADJUSTED",
    symbol: "XLK"
  },
  {
    id: "av_btc_monthly",
    source: "alpha_vantage",
    label: "BTCUSD monthly",
    description: "Bitcoin monthly history in USD.",
    usageNote: "Use for speculative risk appetite, liquidity beta, and crypto-driven sentiment analogs.",
    frequency: "monthly",
    agents: ["risk-sentiment-agent", "macro-agent"],
    functionName: "DIGITAL_CURRENCY_MONTHLY",
    symbol: "BTC",
    market: "USD"
  },

  // ── FX Agent: G10 majors, DXY, cross rates ──────────────────────────
  {
    id: "fred_eurusd",
    source: "fred",
    sourceSeriesId: "DEXUSEU",
    label: "EUR/USD",
    description: "Euro to US dollar exchange rate, daily.",
    usageNote: "Use for rate-divergence regime, carry unwind, ECB vs Fed policy-divergence analogs.",
    frequency: "daily",
    agents: ["fx-agent", "macro-agent"]
  },
  {
    id: "fred_gbpusd",
    source: "fred",
    sourceSeriesId: "DEXUSUK",
    label: "GBP/USD",
    description: "British pound to US dollar exchange rate, daily.",
    usageNote: "Use for BOE policy divergence, UK growth differentials, and sterling risk-appetite analogs.",
    frequency: "daily",
    agents: ["fx-agent", "rates-agent"]
  },
  {
    id: "fred_usdjpy",
    source: "fred",
    sourceSeriesId: "DEXJPUS",
    label: "USD/JPY",
    description: "US dollar to Japanese yen exchange rate, daily.",
    usageNote: "Use for carry trade stress, BOJ policy shifts, yen intervention episodes, and liquidity shocks.",
    frequency: "daily",
    agents: ["fx-agent", "risk-sentiment-agent", "macro-agent"]
  },
  {
    id: "fred_audusd",
    source: "fred",
    sourceSeriesId: "DEXUSAL",
    label: "AUD/USD",
    description: "Australian dollar to US dollar exchange rate, daily.",
    usageNote: "Use for risk-on/off confirmation, China growth proxy, and commodity-demand-through-FX analogs.",
    frequency: "daily",
    agents: ["fx-agent", "risk-sentiment-agent", "commodities-agent"]
  },
  {
    id: "fred_usdcad",
    source: "fred",
    sourceSeriesId: "DEXCAUS",
    label: "USD/CAD",
    description: "US dollar to Canadian dollar exchange rate, daily.",
    usageNote: "Use for oil-linked FX moves, BOC divergence, and commodity-currency regime analogs.",
    frequency: "daily",
    agents: ["fx-agent", "commodities-agent"]
  },
  {
    id: "fred_usdchf",
    source: "fred",
    sourceSeriesId: "DEXSZUS",
    label: "USD/CHF",
    description: "US dollar to Swiss franc exchange rate, daily.",
    usageNote: "Use for safe-haven flow detection, SNB intervention episodes, and funding-stress analogs.",
    frequency: "daily",
    agents: ["fx-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_nzdusd",
    source: "fred",
    sourceSeriesId: "DEXUSNZ",
    label: "NZD/USD",
    description: "New Zealand dollar to US dollar exchange rate, daily.",
    usageNote: "Use for risk sentiment, RBNZ policy, and Asia-Pacific growth analogs.",
    frequency: "daily",
    agents: ["fx-agent"]
  },
  {
    id: "fred_nokusd",
    source: "fred",
    sourceSeriesId: "DEXNOUS",
    label: "NOK/USD",
    description: "Norwegian krone to US dollar exchange rate, daily.",
    usageNote: "Use for oil-driven carry, Norges Bank policy, and petrocurrency regime shifts.",
    frequency: "daily",
    agents: ["fx-agent", "commodities-agent"]
  },
  {
    id: "fred_sekusd",
    source: "fred",
    sourceSeriesId: "DEXSDUS",
    label: "SEK/USD",
    description: "Swedish krona to US dollar exchange rate, daily.",
    usageNote: "Use for European cyclicality, Riksbank policy shifts, and Nordic growth proxy.",
    frequency: "daily",
    agents: ["fx-agent"]
  },

  // ── Rates Agent: full curve + TIPS + credit spreads ─────────────────
  {
    id: "fred_us3m",
    source: "fred",
    sourceSeriesId: "DGS3MO",
    label: "US 3M yield",
    description: "3-month Treasury constant maturity rate, daily.",
    usageNote: "Use for money-market stress, Fed path pricing, and front-end inversion analogs.",
    frequency: "daily",
    agents: ["rates-agent", "macro-agent"]
  },
  {
    id: "fred_us1y",
    source: "fred",
    sourceSeriesId: "DGS1",
    label: "US 1Y yield",
    description: "1-year Treasury constant maturity rate, daily.",
    usageNote: "Use for near-term policy expectations and bill-to-coupon rotation dynamics.",
    frequency: "daily",
    agents: ["rates-agent", "macro-agent"]
  },
  {
    id: "fred_us5y",
    source: "fred",
    sourceSeriesId: "DGS5",
    label: "US 5Y yield",
    description: "5-year Treasury constant maturity rate, daily.",
    usageNote: "Use for belly repricing, intermediate policy sensitivity, and TIPS breakeven anchoring.",
    frequency: "daily",
    agents: ["rates-agent", "macro-agent"]
  },
  {
    id: "fred_us7y",
    source: "fred",
    sourceSeriesId: "DGS7",
    label: "US 7Y yield",
    description: "7-year Treasury constant maturity rate, daily.",
    usageNote: "Use for auction dynamics and belly-to-long transition analysis.",
    frequency: "daily",
    agents: ["rates-agent"]
  },
  {
    id: "fred_us20y",
    source: "fred",
    sourceSeriesId: "DGS20",
    label: "US 20Y yield",
    description: "20-year Treasury constant maturity rate, daily.",
    usageNote: "Use for long-end supply pressure and pension/insurance duration demand.",
    frequency: "daily",
    agents: ["rates-agent"]
  },
  {
    id: "fred_us30y",
    source: "fred",
    sourceSeriesId: "DGS30",
    label: "US 30Y yield",
    description: "30-year Treasury constant maturity rate, daily.",
    usageNote: "Use for long-duration repricing, inflation term premium, and pension rebalancing analogs.",
    frequency: "daily",
    agents: ["rates-agent", "macro-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_tips_5y",
    source: "fred",
    sourceSeriesId: "DFII5",
    label: "5Y TIPS real yield",
    description: "5-year Treasury Inflation-Indexed Security constant maturity rate, daily.",
    usageNote: "Use for real-rate regime shifts, inflation expectations decoupling, and equity multiple pressure.",
    frequency: "daily",
    agents: ["rates-agent", "macro-agent"]
  },
  {
    id: "fred_tips_10y",
    source: "fred",
    sourceSeriesId: "DFII10",
    label: "10Y TIPS real yield",
    description: "10-year Treasury Inflation-Indexed Security constant maturity rate, daily.",
    usageNote: "Use for real discount rate, gold-vs-real-yield tension, and equity valuation regime.",
    frequency: "daily",
    agents: ["rates-agent", "macro-agent"]
  },
  {
    id: "fred_ig_oas",
    source: "fred",
    sourceSeriesId: "BAMLC0A0CM",
    label: "ICE BofA IG OAS",
    description: "ICE BofA US Corporate Investment Grade Option-Adjusted Spread, daily.",
    usageNote: "Use for credit conditions, funding environment, and risk-off transitions distinct from HY.",
    frequency: "daily",
    agents: ["rates-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_bbb_oas",
    source: "fred",
    sourceSeriesId: "BAMLC0A4CBBB",
    label: "ICE BofA BBB OAS",
    description: "ICE BofA BBB US Corporate Option-Adjusted Spread, daily.",
    usageNote: "Use for fallen-angel risk, credit quality migration, and crossover stress episodes.",
    frequency: "daily",
    agents: ["rates-agent", "risk-sentiment-agent"]
  },

  // ── Commodities Agent: daily crude, precious metals, industrials ────
  {
    id: "fred_wti_daily",
    source: "fred",
    sourceSeriesId: "DCOILWTICO",
    label: "WTI crude daily",
    description: "West Texas Intermediate crude oil spot price, daily.",
    usageNote: "Use for daily oil regime, inflation impulse, and demand-supply dynamics at high frequency.",
    frequency: "daily",
    agents: ["commodities-agent", "macro-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_brent_daily",
    source: "fred",
    sourceSeriesId: "DCOILBRENTEU",
    label: "Brent crude daily",
    description: "Brent crude oil spot price, daily.",
    usageNote: "Use for global crude benchmark, WTI-Brent spread dynamics, and OPEC regime analogs.",
    frequency: "daily",
    agents: ["commodities-agent"]
  },
  {
    id: "fred_gold_daily",
    source: "fred",
    sourceSeriesId: "GOLDAMGBD228NLBM",
    label: "Gold spot daily",
    description: "Gold fixing price London Bullion Market, daily.",
    usageNote: "Use for real-yield tension, safe-haven flows, central-bank demand, and inflation-hedge analogs.",
    frequency: "daily",
    agents: ["commodities-agent", "risk-sentiment-agent"]
  },
  {
    id: "fred_silver",
    source: "fred",
    sourceSeriesId: "SLVPRUSD",
    label: "Silver spot",
    description: "Silver fixing price London Bullion Market, daily.",
    usageNote: "Use for industrial precious demand, solar/renewables exposure, and gold-silver ratio analogs.",
    frequency: "daily",
    agents: ["commodities-agent"]
  },
  {
    id: "fred_aluminum",
    source: "fred",
    sourceSeriesId: "PALUMUSDM",
    label: "Aluminum",
    description: "Global price of aluminum, monthly.",
    usageNote: "Use for industrial demand, autos/construction, China smelter capacity, and energy-cost transmission.",
    frequency: "monthly",
    agents: ["commodities-agent"]
  },
  {
    id: "fred_wheat",
    source: "fred",
    sourceSeriesId: "PWHEAMTUSDM",
    label: "Wheat",
    description: "Global price of wheat, monthly.",
    usageNote: "Use for food inflation, supply-shock analogs (drought, conflict), and agricultural regime shifts.",
    frequency: "monthly",
    agents: ["commodities-agent", "macro-agent"]
  },

  // ── Risk/Sentiment Agent: vol term structure, funding stress ────────
  {
    id: "fred_ted_spread",
    source: "fred",
    sourceSeriesId: "TEDRATE",
    label: "TED spread",
    description: "3-month LIBOR minus 3-month Treasury spread, daily.",
    usageNote: "Use for interbank funding stress, systemic risk episodes, and credit-crunch analogs.",
    frequency: "daily",
    agents: ["risk-sentiment-agent", "macro-agent"]
  },
  {
    id: "fred_vxvcls",
    source: "fred",
    sourceSeriesId: "VXVCLS",
    label: "VIX near-term (9-day)",
    description: "CBOE Near-Term Volatility Estimate (VIX9D), daily.",
    usageNote: "Use for vol term structure, hedging urgency, and short-dated fear spikes vs longer-dated vol.",
    frequency: "daily",
    agents: ["risk-sentiment-agent", "equities-agent"]
  }
];
