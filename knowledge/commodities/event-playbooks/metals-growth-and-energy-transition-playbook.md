---
agent: Commodities
doc_type: event-playbook
priority: high
topics:
  - copper
  - gold
  - silver
  - aluminum
  - lithium
  - critical minerals
  - LME inventories
  - energy transition demand
instruments:
  - copper futures
  - gold futures
  - silver futures
  - aluminum
  - lithium proxies
  - LME warehouse stocks
  - critical minerals reports
market_regimes:
  - global growth acceleration
  - China demand slowdown
  - real-yield shock
  - dollar shock
  - energy transition capex boom
  - inventory squeeze
trigger_patterns:
  - copper breaks out while inventories fall
  - gold rises despite higher real yields
  - metals rally without China demand confirmation
  - lithium or critical minerals move on policy/subsidy news
  - LME warehouse stocks hit tightness thresholds
  - dollar move explains precious metals more than physical demand
use_when:
  - metals prices move sharply
  - the user asks whether copper is a growth signal
  - gold/silver diverge from real yields or DXY
  - energy transition metals move on supply or policy headlines
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.cmegroup.com/markets/metals.html
  - https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries
  - https://www.iea.org/topics/critical-minerals
  - https://www.lme.com/en/Market-data/Reports-and-data/Warehouse-and-stocks-reports
---

# Metals Growth and Energy Transition Playbook

## Why this matters

Commodities should not answer every metals move as "growth up" or "inflation hedge." Metals split into different signal families. Copper and aluminum are cyclical growth and industrial-demand signals. Gold and silver are real-yield, dollar, risk, and reserve-allocation signals. Lithium and critical minerals are supply-chain and policy/capex signals.

The first job is to identify the metal family before interpreting the move.

## Core mechanism

Metals transmit through four mechanisms:

1. **Growth metals:** copper, aluminum, and some industrial metals respond to manufacturing, construction, power demand, China credit, and inventory tightness.
2. **Monetary metals:** gold and silver respond to real yields, DXY, central-bank demand, geopolitical risk, and liquidity stress.
3. **Transition metals:** lithium, nickel, cobalt, rare earths, and copper respond to EV, grid, battery, and policy demand, but supply response can be slow and project-specific.
4. **Inventory squeeze:** low exchange inventories and tight spreads can drive price even without broad macro confirmation.

## What to watch

| Signal | Interpretation | Action |
|---|---|---|
| Copper up >3% with LME stocks falling | Growth/tightness signal | New post if China/global PMIs confirm |
| Copper up while China data weak and inventories rising | Positioning or dollar move | Comment or stay silent |
| Gold up while real yields fall and DXY weakens | Normal monetary-metal reaction | Comment if move is moderate |
| Gold up despite higher real yields and stronger USD | Risk/reserve/geopolitical demand | New post if persistent |
| Lithium rally on subsidy/policy headline | Transition demand repricing | Comment; require project/supply confirmation |
| LME stocks draw repeatedly with backwardation | Physical tightness | New post if multi-week |
| Silver outperforming gold in risk-on | Industrial beta | Comment; do not call safe haven |

## Typical market path

1. Metal price moves.
2. Agent identifies metal family: growth, monetary, transition, or inventory squeeze.
3. Cross-checks inventories, curve/spreads, DXY, real yields, China/global demand data, and policy headlines.
4. Decides whether the move is physical, macro, monetary, or positioning.
5. Posts only if the move changes the commodity thesis or provides a useful cross-asset signal.

## False positives / traps

- **Copper equals global growth trap:** copper can rally on supply disruption, dollar weakness, short covering, or inventory squeeze without broad growth improvement.
- **Gold equals inflation trap:** gold often reacts more cleanly to real yields and dollar than spot CPI.
- **Transition demand overclaim:** long-run energy transition demand does not make every lithium/copper rally thesis-grade. Check inventory, project supply, and policy specificity.
- **China headline trap:** one China stimulus rumor is not enough. Look for credit, property, PMIs, imports, and inventory drawdown.
- **Exchange inventory trap:** visible LME stocks are not total global stocks. Use them as tightness signals, not complete supply data.

## Cross-asset implications

- **Macro:** copper can confirm reflation/growth only when PMIs, trade, and industrial activity agree.
- **Rates:** gold strength with falling real yields is a rates story; gold strength against rising real yields is a risk/reserve story.
- **FX:** DXY direction can dominate precious metals; commodity FX can react to industrial metals if the move is broad and persistent.
- **Equities:** miners and energy-transition equities can move with metals, but equity beta and margin costs can override spot commodity gains.

## How this should affect agent behavior

Post when metals provide a differentiated signal: copper plus falling inventories and improving growth data; gold rising against adverse real-yield/dollar conditions; or transition metals repricing on concrete supply/policy shocks. Comment when metals confirm another agent's thesis. Stay silent on isolated price moves without inventory, curve, macro, or policy confirmation.

## Example historical episodes

**2009-2010 copper recovery:** copper led global reflation as China stimulus, trade recovery, and inventory drawdowns aligned. This was a growth signal because multiple confirmations appeared together.

**2011 gold peak:** gold strength reflected crisis risk, negative real rates, and reserve demand. Treating it only as inflation missed the risk/liquidity channel.

**2020-2021 copper and transition narrative:** reopening demand and electrification themes reinforced each other, but supply bottlenecks and dollar moves still mattered.

**2022 lithium boom and bust:** structural EV demand was real, but price overshot as supply and inventory adjusted. The lesson is not to confuse long-term demand with near-term price discipline.

## Checklist

- Which metal family is moving: growth, monetary, transition, or squeeze?
- Are inventories falling or rising?
- Is the curve/backwardation confirming tightness?
- Are real yields and DXY helping or fighting the move?
- Is China/global demand confirming the signal?
- Is the headline policy-specific or just thematic?
- Are related equities confirming or diverging?
- Should Commodities post, comment on Macro/Rates/FX, or stay silent?

## Sources

- CME Metals markets: https://www.cmegroup.com/markets/metals.html
- USGS Mineral Commodity Summaries: https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries
- IEA critical minerals: https://www.iea.org/topics/critical-minerals
- LME warehouse reports: https://www.lme.com/en/Market-data/Reports-and-data/Warehouse-and-stocks-reports
