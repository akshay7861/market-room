---
agent: Commodities
doc_type: framework
priority: high
topics:
  - natural gas
  - LNG
  - Henry Hub
  - storage
  - weather
  - power burn
  - production
  - regional gas spreads
instruments:
  - Henry Hub natural gas
  - LNG
  - US natural gas storage
  - European gas
  - Asian LNG
  - gas futures curve
market_regimes:
  - winter withdrawal
  - summer injection
  - weather shock
  - LNG outage
  - storage surplus
  - regional gas stress
trigger_patterns:
  - storage surprise greater than 10 bcf versus consensus
  - storage deficit or surplus widens versus five-year average
  - LNG feedgas disruption or restart
  - weather forecast shifts heating or cooling demand
  - Henry Hub curve moves into acute backwardation or contango
use_when:
  - user asks about natural gas Henry Hub LNG storage weather or regional energy stress
  - Market Room headline includes gas storage LNG outage feedgas European gas or weather demand
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.eia.gov/naturalgas/weekly/
  - https://www.eia.gov/naturalgas/storage/
  - https://www.eia.gov/dnav/ng/hist/rngwhhdD.htm
  - https://www.iea.org/reports?topic=Gas
---

# Natural Gas and LNG Framework

## Why this matters

Natural gas is not oil with a different ticker. Gas is more regional, more weather-sensitive, more storage-constrained, and more infrastructure-dependent. LNG links regional gas markets, but liquefaction capacity, shipping, and import terminals create bottlenecks.

The Commodities agent should treat gas as its own balance sheet.

## Core mechanism

Gas prices move through:

1. **Storage**
   - Weekly EIA storage is the core US balance signal.
   - Compare the change to consensus and the level to the five-year range.

2. **Weather**
   - Heating degree days drive winter demand.
   - Cooling degree days drive summer power burn.
   - Weather forecasts can reverse quickly, so do not overstate one run.

3. **Production**
   - Associated gas, shale activity, freeze-offs, and pipeline constraints affect supply.

4. **Power burn and industrial demand**
   - Gas demand rises when power load rises or coal switching is limited.

5. **LNG link**
   - LNG feedgas connects US gas to Europe and Asia.
   - Outages can depress US gas while tightening global LNG.

## What to watch

| Signal | Interpretation | Action |
|---|---|---|
| Storage surprise greater than 10 bcf | meaningful weekly balance surprise | comment/update |
| Storage surprise greater than 25 bcf | thesis-grade if weather-adjusted | post |
| Storage below five-year range | tight balance | post/update |
| Storage above five-year range | surplus pressure | update bearish |
| LNG outage | regional divergence | post if multi-week or large |
| Weather model reversal | demand uncertainty | comment unless confirmed |

## Typical market path

1. Weather model or storage data changes.
2. Front-month Henry Hub moves first.
3. Curve shape confirms whether the move is temporary or structural.
4. LNG feedgas and regional spreads determine whether US and global gas diverge.
5. Inflation and equity implications come second.

## False positives / traps

- **Oil analogy trap:** gas cannot be read through OPEC or global crude inventory logic.
- **Weather-run trap:** one weather model run can reverse; require persistence.
- **Storage-change trap:** the weekly injection/withdrawal matters only relative to season and expectations.
- **LNG outage trap:** an outage can be bearish US gas but bullish global LNG.
- **Spot-only trap:** front-month gas can spike while the full curve rejects a structural shortage.

## Cross-asset implications

- Gas shocks affect utilities, chemicals, fertilizer, industrial margins, and regional inflation.
- LNG stress can affect Europe more than the US.
- Gas-driven inflation is usually more regional than oil-driven inflation.
- Energy-equity implications belong to Equities after the gas balance is established.
- Severe regional gas stress can become Risk/Sentiment if it threatens industrial activity or credit.

## How this should affect agent behavior

- Own storage, weather, production, LNG, and curve interpretation.
- Name whether the signal is US gas, European gas, Asian LNG, or global LNG.
- Post when storage/weather/LNG align.
- Comment when only one input moves.
- Hand inflation implications to Macro and stock implications to Equities.

## Example historical episodes

### 2022 European gas crisis

Pipeline disruption and LNG competition drove European gas stress. The lesson is that regional infrastructure can dominate global energy narratives.

### US LNG outage episodes

Major export-terminal outages can loosen US Henry Hub while tightening global LNG. The lesson is to separate domestic and global gas effects.

### Winter freeze-offs

Cold weather can raise demand and disrupt production simultaneously. The lesson is that weather shocks hit both sides of the balance.

## Checklist

- Is this US gas, European gas, Asian LNG, or global LNG?
- Storage surprise versus consensus?
- Storage level versus five-year range?
- Weather-adjusted or raw surprise?
- Production or LNG feedgas disruption?
- Curve confirms temporary or structural tightness?
- Which agent owns the second-order implication?

## Sources

- EIA Natural Gas Weekly Update.
- EIA natural gas storage data.
- EIA Henry Hub spot price history.
- IEA gas market reports.
