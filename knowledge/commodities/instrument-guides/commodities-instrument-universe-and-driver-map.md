---
agent: Commodities
doc_type: instrument-guide
priority: high
topics:
  - commodities universe
  - crude oil
  - refined products
  - natural gas
  - LNG
  - metals
  - inventories
  - futures curves
  - physical tightness
  - handoff rules
instruments:
  - WTI
  - Brent
  - RBOB gasoline
  - heating oil
  - Henry Hub natural gas
  - LNG
  - copper
  - gold
  - silver
  - aluminum
market_regimes:
  - physical shortage
  - inventory build
  - demand destruction
  - geopolitical supply shock
  - energy transition demand
  - weather-driven gas shock
trigger_patterns:
  - crude inventory draw greater than 4 million barrels
  - Cushing falls below 25 million barrels
  - gas storage surprise greater than 10 bcf versus consensus
  - front-month curve spread moves beyond 1 dollar per barrel in oil
  - copper or gold move diverges from dollar and real yields
  - headline references LNG outage refinery outage OPEC cut or metal warehouse draw
use_when:
  - user asks about oil gas metals commodities inventories curves or supply shocks
  - Market Room headline includes EIA IEA OPEC LNG Henry Hub copper gold Brent WTI or Cushing
  - agent must decide whether the signal is physical supply demand or macro/risk spillover
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.eia.gov/petroleum/
  - https://www.eia.gov/naturalgas/
  - https://www.iea.org/reports/oil-market-report
  - https://www.cmegroup.com/markets/energy.html
  - https://www.cmegroup.com/markets/metals.html
---

# Commodities Instrument Universe and Driver Map

## Why this matters

The Commodities agent must not answer every question as WTI. The commodity complex includes oil, products, gas, LNG, metals, and curve/inventory signals. Each market has different storage, transport, seasonality, and macro sensitivity.

The agent owns physical supply-demand interpretation. It should hand off when the question is mainly inflation, rates, equity stocks, FX, or broad risk appetite.

## Core mechanism

Commodity signals come from five layers:

1. **Spot price**
   - Shows current market direction.
   - Weak alone because it can be macro-driven.

2. **Futures curve**
   - Backwardation signals near-term scarcity.
   - Contango signals surplus or storage economics.
   - Curve shape is usually more informative than spot.

3. **Inventory**
   - EIA crude, product, gas storage, Cushing, and warehouse data confirm physical tightness.
   - Inventory surprises are thesis-grade only when utilization and demand data agree.

4. **Flow and capacity**
   - Pipelines, refineries, LNG terminals, shipping lanes, and export outages determine whether supply can reach the market.

5. **Macro overlay**
   - Dollar, real yields, growth expectations, and risk appetite can dominate gold, copper, and oil in short windows.

## What to watch

| Market | Primary signal | Posting threshold | Handoff risk |
|---|---|---|---|
| WTI / Brent | inventories, curve, OPEC, geopolitical supply | crude draw greater than 4M bbl or build greater than 5M bbl | Macro if inflation channel dominates |
| Refined products | gasoline, distillates, crack spreads, refinery utilization | product draw with utilization above 90% | Equities if refining stocks are focus |
| Natural gas | storage, weather, production, LNG feedgas | storage surprise greater than 10 bcf | Macro only if inflation impact is material |
| LNG | outages, Europe/Asia spreads, shipping | terminal outage changes regional balance | FX/Risk if geopolitical or sanctions-led |
| Copper | China demand, inventories, growth cycle | price move with inventory confirmation | Macro if growth thesis dominates |
| Gold | real yields, USD, central-bank demand, risk stress | gold rises despite real yields rising | Rates/Risk if safe-haven mechanism dominates |

## Typical market path

1. Headline hits: inventory, OPEC, outage, weather, shipping, sanctions, demand revision.
2. Spot price reacts first.
3. Curve and spreads reveal whether the move is physical or macro.
4. Inventory or flow data confirm or reject the price action.
5. Cross-asset reaction determines whether another agent should own the broader thesis.

## False positives / traps

- **WTI-only trap:** a user asking about "commodities" may mean gas, copper, gold, or broad inflation inputs.
- **Spot-price trap:** a 2% oil move without curve or inventory confirmation may be dollar/risk driven.
- **Headline-barrels trap:** announced barrels at risk are not the same as confirmed barrels offline.
- **Low-utilization inventory trap:** crude builds during refinery outages may not mean weak demand.
- **Gold macro trap:** gold is often Rates/Risk sensitive; Commodities should not force a physical supply-demand story onto gold.

## Cross-asset implications

- Oil and refined-product shocks feed Macro inflation if persistent.
- Gas shocks affect regional inflation and industrial margins more than global oil does.
- Copper helps Macro and Equities read growth and cyclicals.
- Gold links to real yields, dollar, and safe-haven demand.
- Commodity equity questions should be handed to Equities after the physical setup is described.

## How this should affect agent behavior

- Own physical balances, inventories, curves, spreads, and supply shocks.
- Name the specific commodity; do not say "commodities" when the signal is only oil.
- Use curve and inventory confirmation before making a strong thesis.
- Hand off inflation implications to Macro, yield/real-rate implications to Rates, stock names to Equities, and panic/geopolitics to Risk/Sentiment.
- Stay silent on pure stock upgrade, CPI, or Treasury-yield questions unless commodities are the causal input.

## Example historical episodes

### 2020 WTI negative settlement

The issue was storage, delivery, and contract mechanics, not a normal demand signal. The lesson is that curves and settlement structure can dominate spot.

### 2022 energy shock

Oil, gas, LNG, and refined products all moved for different reasons. The lesson is that "energy" is not one market.

### 2023 oil cuts versus demand risk

OPEC cuts mattered only when demand and inventories confirmed. The lesson is that supply headlines lose power when demand destruction dominates.

### 2024 copper and AI/grid narrative

Copper gained attention from electrification and grid demand, but the signal needed inventory and China-demand confirmation. The lesson is to separate structural narrative from current tightness.

## Checklist

- Which commodity is actually being discussed?
- Is the move spot-led, curve-led, inventory-led, or headline-led?
- Are inventories confirming?
- Are utilization, demand, and flow data consistent?
- Is this physical tightness or macro price action?
- Which other agent owns the second-order implication?
- Should Commodities post, update, comment, or stay silent?

## Sources

- EIA petroleum data for crude, product, refinery, and inventory signals.
- EIA natural gas data for storage, production, consumption, and Henry Hub.
- IEA Oil Market Report for global oil supply-demand balances.
- CME energy and metals markets for futures and curve instruments.
