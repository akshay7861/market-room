---
agent: Commodities
doc_type: framework
priority: high
topics:
  - futures curve
  - contango
  - backwardation
  - calendar spread
  - M1-M2 spread
  - roll yield
  - physical tightness
  - WTI forward curve
  - curve kink
  - speculative positioning
  - storage economics
  - CFTC commitment of traders
instruments:
  - WTI crude M1 futures
  - WTI crude M2 futures
  - 12-month WTI calendar spread (M1 vs M13)
  - Brent 6-month spread
  - gasoline crack spread
  - heating oil crack spread
  - NYMEX WTI options (vol surface)
market_regimes:
  - structural backwardation (supply deficit)
  - flat / balanced curve
  - shallow contango (modest surplus)
  - deep contango (significant surplus / storage glut)
  - curve kink (front backwardation + back contango = temporary disruption)
trigger_patterns:
  - M1-M2 WTI spread crossing ±$1.00/bbl
  - M1-M13 WTI spread crossing ±$3.00/bbl
  - M1-M13 spread moving >$2 in 2 weeks (regime shift speed)
  - contango flattening from -$5 to -$2 over 3 weeks (inventory draw starting)
  - curve kink appearing (front month moving independently of deferred months)
  - speculative net longs at 5-year high combined with curve still in contango
use_when:
  - every Wednesday post-EIA release (Cushing data updates curve interpretation)
  - any large intraday WTI move (check if curve structure is moving or just front month)
  - after OPEC cut announcement (check if market believes it via curve)
  - monthly STEO release (compare STEO supply/demand balance to curve shape)
  - CFTC Commitment of Traders release (every Friday, covers prior Tuesday)
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-09
source_urls:
  - https://www.cmegroup.com/markets/energy/crude-oil/light-sweet-crude.html
  - https://www.eia.gov/steo/
  - https://www.iea.org/data-and-statistics
  - https://www.cmegroup.com/education/courses/introduction-to-energy/introduction-to-crude-oil.html
---

# Commodity Curve Shape and Physical Tightness Guide

## Why this matters

The spot price of crude oil is the number that appears in headlines. The *shape* of the futures curve is what the market actually believes about supply and demand. A commodity market in backwardation — where prompt delivery is worth more than deferred delivery — tells you something no weekly inventory report can capture in real-time: physical buyers are paying a premium to receive oil now, and sellers refuse to lock in future delivery at a discount. Interpret price levels alongside curve shape. When the two diverge — spot elevated but curve flat or in contango, or spot soft but backwardation deepening — the curve is almost always the leading signal.

## Core mechanism

**Contango and backwardation defined precisely:**

**Backwardation:** Front-month price > deferred-month price. The curve slopes downward from near to far maturities. Holders of physical commodity refuse to sell forward at a discount — because the prompt barrel is scarce. The cost-of-carry model predicts that, in the absence of tightness, prices should be in contango (deferred price = spot + storage + financing). When the market is in backwardation, physical scarcity is overriding the cost-of-carry relationship.

**Contango:** Front-month price < deferred-month price. The curve slopes upward. Storage is being incentivised — buyers can purchase the spot barrel cheaply and sell it forward at a profit that covers storage and financing. Contango signals a near-term surplus: supply exceeds current demand and inventory accumulation is the market-clearing mechanism.

**The cost-of-carry relationship:**
In a normally functioning market with no supply/demand imbalance, the deferred price = spot + storage cost + financing cost (approximately $0.30–0.50/bbl/month for crude oil, depending on interest rates and tank rates). Any deviation from this carry cost reflects the physical supply-demand imbalance: positive deviation (backwardation) = scarcity; negative deviation (contango beyond full carry) = storage incentive active.

**The operative spreads:**

**M1–M2 (front-month vs second month):**
The shortest-dated spread. Most sensitive to immediate physical conditions at Cushing and Gulf Coast delivery hubs. Below $0: contango. Above $0: backwardation. The threshold levels for market significance: M1-M2 above +$1.00/bbl = notable tightness; above +$2.00/bbl = acute tightness (refiners competing for prompt barrels). Below -$1.00/bbl = storage economics being activated; below -$2.00/bbl = meaningful surplus near-term.

**M1–M13 (12-month calendar spread):**
The more structural indicator. A 12-month spread in backwardation of +$3.00/bbl or more signals that the market believes the supply deficit is not a temporary blip but a multi-quarter condition. This is the curve structure that drives major OPEC pricing strategy, drives E&P capital allocation decisions, and anchors commodity fund positioning. It moves less frequently and more meaningfully than the M1–M2 spread.

**The curve kink:**
A "kink" occurs when the front of the curve is in backwardation while the deferred months are in contango (or a flatter backwardation). This shape signals a *temporary* supply disruption: the market believes the disruption will resolve. The front is tight because a specific near-term supply shortfall is real; the back is in contango because the market expects normalisation over the following 3–6 months. The duration and depth of the kink reveal how long the market expects the disruption to last.

**Roll yield mechanics:**
When an investor rolls a futures position from an expiring front month to the next month:
- In **backwardation**: sell the higher-priced near contract, buy the lower-priced deferred contract → positive roll yield. Long commodity positions *benefit* from holding in backwardation even if spot price is unchanged.
- In **contango**: sell the lower-priced near contract, buy the higher-priced deferred contract → negative roll yield. Long commodity ETFs and positions bleed money even if spot price is flat. This "contango bleed" was a persistent headwind for oil ETFs from 2010–2014.

The roll yield is the mechanism that realigns speculative futures prices with physical market reality over time: in backwardation, the futures price declines toward spot as the contract approaches expiry; in contango, the futures price rises toward (the higher) spot.

## What to watch

In order of signal reliability:

1. **M1–M13 spread level and direction** — most reliable tightness indicator; regime-defining
2. **M1–M2 spread level** — immediate physical conditions at the delivery hub; changes fastest
3. **STEO supply/demand balance vs curve shape** — when the EIA model and the curve agree, high confidence; when they diverge, post the discrepancy
4. **Cushing stocks vs Cushing curve implication** — Cushing levels below 25M bbl should be consistent with M1–M2 backwardation; if they're not aligned, one signal is wrong
5. **CFTC Commitment of Traders (COT)** — managed money net long position; if speculative longs are at a 5-year high but the curve is barely in backwardation, the backwardation is fragile (positioning-driven, not physical)
6. **Crack spreads (gasoline, heating oil)** — refinery margins. When crack spreads are wide (high), refiners are aggressively processing crude, which drains crude inventory and can shift curve from contango toward backwardation. Narrow cracks = refiners slowing throughput = crude builds
7. **WTI-Brent spread** — when WTI trades at a deep discount to Brent (>$5), US is in logistical surplus even if the physical global market is tight. Brent backwardation with WTI contango = regional divergence, worth a post

## Typical market path

**Contango flattening toward flat (supply/demand rebalancing):**
This is the most important transitional regime. Deep contango (M1–M13 at -$6) flattening toward -$2 over 6–8 weeks signals that inventory is being drawn down, the storage incentive is diminishing, and the market is approaching balance. This is the early signal of a potential price bottom in a down-cycle — it precedes the actual spot price recovery by weeks to months. The curve structure is the leading indicator; the spot price is the lagging outcome.

**Backwardation strengthening (tightening accelerating):**
M1–M13 moves from +$2 to +$5 over 3–4 weeks. Physical buyers are urgently seeking prompt barrels. Refiners are paying up. This accelerating backwardation often precedes a front-month price spike of 5–15% as the physical market clears at a higher price. The curve is pricing a near-term supply squeeze.

**Contango deepening (surplus building):**
M1–M13 moves from -$2 to -$6 over several weeks. Storage economics are being actively incentivised — physical players are simultaneously buying prompt crude and selling deferred futures to lock in the carry. Tank farms are filling. This accelerating contango is the market signalling that physical supply is significantly outpacing demand. The spot price will eventually follow, but the curve deterioration precedes the spot price move.

**Curve kink forming after a geopolitical event:**
Day 1 of a supply disruption: front month spikes; deferred months barely move. M1–M2 goes from flat to +$2 overnight. M1–M13 moves from flat to +$1. The kink is the market saying: "we believe the disruption is real but temporary." As the expected resolution timeline extends, the kink moves further out the curve (backwardation spreads to M1–M6, then M1–M9). If the kink disappears (front reverting to deferred), the market has concluded the disruption is over or overpriced.

## False positives / traps

**Trap 1 — Contract roll mechanics creating front-month price anomalies**
WTI contracts roll around the 15th–20th of each month. In the final days of a front-month contract's life, liquidity shifts to the second month, making the front contract thin and volatile. Large positions being rolled can temporarily push the M1 price well below M2 (apparent contango) or above M2 (apparent backwardation) that has nothing to do with physical supply and demand. The most extreme example: WTI went to -$37/bbl on April 20, 2020, because the May contract was expiring the next day, Cushing storage was completely full, and physical holders couldn't take delivery. This was a settlement mechanic and storage crisis, not a price signal about global oil value.
**Lesson:** Never interpret a front-month price extreme within 2–3 days of contract expiry as a physical supply signal. The M2–M3 spread is a cleaner read during roll periods.

**Trap 2 — Seasonal curve shape as a structural signal**
Heating oil (distillate) futures routinely go into seasonal backwardation in October–November as pre-winter demand rises. This is an expected pattern — it occurs every year to varying degrees and is not a new signal about supply fundamentals. Similarly, WTI often moves into slightly deeper backwardation in summer (peak refinery demand for crude) and flattens or moves toward contango in the fall refinery maintenance season. Comparing current curve shape to the same week in prior years is essential context.

**Trap 3 — Speculative positioning driving backwardation without physical confirmation**
In commodity markets, managed money (hedge funds) can drive the front of the curve into shallow backwardation through aggressive net long positioning without any change in physical supply/demand. When the CFTC COT report shows speculative net longs at multi-year highs and the M1–M2 spread is at +$0.50–$1.00 (backwardation), the backwardation may be entirely positioning-driven. It is fragile — a catalyst for position liquidation (margin calls, risk-off, disappointing EIA data) can reverse it sharply. Always check the COT positioning level before claiming the curve structure reflects physical tightness.

**Trap 4 — WTI curve in contango while Brent is in backwardation (regional divergence)**
WTI and Brent can be in different curve regimes simultaneously. This occurs when US-specific supply conditions diverge from global conditions. In 2012–2014, WTI was in persistent deep contango (Cushing landlocked surplus) while Brent was in backwardation (global market tight). US producers were unable to export (export ban in effect until 2015), so the US had a structural glut while the global market was tight. An agent interpreting WTI contango as a global bearish signal during this period was wrong — the global market (Brent) was bullish. The correct read: note the regional divergence and identify the logistical bottleneck driving it.

**Trap 5 — STEO balance projecting inventory draws with curve still in contango**
When the EIA STEO projects significant global inventory draws over the next 2 quarters but the WTI M1–M13 calendar spread is still in contango, one of them is wrong. Either the STEO demand assumptions are too optimistic, or the market hasn't yet repriced the physical tightness that the STEO is forecasting. This is the most productive source of a Commodities agent thesis: explicitly post the discrepancy between the model and the market, state which you think is more likely correct and why, and identify what data will resolve the divergence.

## Cross-asset implications

| Curve regime | WTI/Brent spot | Energy equities | Energy ETFs (roll yield) | USD | Inflation narrative |
|-------------|----------------|-----------------|--------------------------|-----|---------------------|
| Deep backwardation (>$5 M1-M13) | Spot elevated and rising | E&P outperform; upstream rewarded | Long commodity ETFs benefit from positive roll | Slight bearish (commodity rally) | Headline CPI risk; macro inflation pressure |
| Shallow backwardation ($1-3 M1-M13) | Spot supported | Energy sector stable | Modest positive carry | Neutral | Limited macro inflation signal |
| Flat / balanced curve | Spot range-bound | Energy mixed | Roll yield near zero; ETFs tracking spot | Neutral | No directional inflation signal |
| Shallow contango (-$1 to -$3) | Spot soft or declining | Energy underperforms | Negative roll eroding ETF returns | Slightly bullish | Disinflation support |
| Deep contango (>-$5 M1-M13) | Spot falling; storage filling | E&P underperforms significantly | Severe contango bleed; ETFs fall faster than spot | USD supported | Deflationary commodity impulse |

**Cross-sector coordination:**
When the Macro agent posts on inflation risk from elevated oil prices, the Commodities agent adds curve structure: deep backwardation (M1–M13 above +$3) = physical tightness that is multi-quarter and a real CPI risk; spot price rise in a contango curve = speculative or technical, no staying power, limited headline CPI impact. Include the M1–M13 level and STEO balance direction in any cross-sector comment on oil prices — this is the information the Macro agent cannot derive from the spot price alone.

## How this should affect agent behavior

**When to post a new thesis:** M1–M13 spread crosses ±$3.00/bbl in a sustained move (10+ trading days) with physical data (EIA, STEO) confirming the directional signal. OR: The curve shifts regime (contango to backwardation or vice versa) with a clearly identifiable fundamental driver. OR: A significant STEO vs curve divergence emerges (3+ weeks of data diverging from the monthly model balance projection). State the curve level, the physical evidence, the STEO context, and the price implication with a timeframe.

**When to update an existing thesis:** EIA weekly data moves Cushing stocks in the direction the curve implied. STEO monthly update shifts the supply/demand balance in the same or opposite direction your thesis assumed. OPEC cut or production change that alters the balance the thesis depends on. Speculative positioning shift (COT) that either validates or threatens the fragility of curve backwardation.

**When to comment only:** M1–M2 moves between -$0.50 and +$1.00 without STEO confirmation. Seasonal curve shape adjustments in heating oil (October) or gasoline (April). Any other agent citing crude prices without noting the curve structure — add the M1–M13 and Cushing context to their thread.

**When to stay silent:** Front-month price moves within 3 days of contract expiry (roll mechanics). Intraday WTI moves on no structural catalyst where the deferred months are unchanged. Speculative positioning shifts alone (COT) without corroborating physical data. Any curve move that occurs entirely in the front month and does not extend to M3 or beyond (front-month noise, not structural).

## Example historical episodes

**2007–2008: Backwardation deepening ahead of the $147 Brent peak**
From late 2007 through mid-2008, the WTI 12-month calendar spread moved from approximately +$2 to +$9/bbl in backwardation — one of the deepest sustained backwardation periods in modern history. Physical demand was genuinely exceeding supply: Chinese demand was surging, OPEC spare capacity was at historic lows (~1.5 Mb/d by 2007), and US production was declining. The curve structure was telling the complete story 6–9 months before Brent peaked at $147 in July 2008. Agents watching only the front-month price would have seen a dramatic rise; agents watching the curve would have seen the physical tightness building throughout 2007.
**Lesson:** The deepening of the 12-month backwardation spread — not just the spot price level — is the most reliable leading indicator of structural supply tightness and eventual price extremes.

**2015–2016: The deep contango and the storage play**
After OPEC decided not to cut production in November 2014, WTI fell from $75 to $26/bbl over 14 months. By early 2016, the 12-month WTI calendar spread was in deep contango of approximately -$8 to -$10/bbl. This incentivised the "storage play": traders simultaneously bought prompt crude at $30 and sold 12-month forward contracts at $38–40, locking in a $8–10/bbl profit over storage and financing costs. Land storage filled. Supertankers were chartered as floating storage. The contango itself was self-limiting: as storage filled, the cost of additional storage rose, eventually compressing the contango and removing the storage incentive. The reversal from deep contango (-$8) to flat (0) took approximately 18 months as OPEC+ formed and US production declined.
**Lesson:** Deep contango creates its own correction mechanism (storage fills → storage costs rise → carry trade no longer works → new supply is discouraged). When contango flattens from deeply negative levels, monitor closely — it often precedes a price floor and eventual recovery by 1–2 quarters.

**2022: Brent backwardation at multi-decade highs — and what it was pricing**
In mid-2022, the Brent 12-month calendar spread reached approximately +$15–18/bbl in backwardation — levels not seen since the early 2000s. This was pricing: (a) Russian supply disruption from sanctions, (b) OPEC spare capacity at historic lows after years of underinvestment, (c) post-COVID demand recovery still running hot. The curve structure was more bullish than even the elevated spot price suggested. But by late 2022 and into 2023, the backwardation began compressing as: Russian exports rerouted (supply didn't actually disappear), SPR releases added supply, and demand growth slowed. The curve moving from +$15 toward +$3 preceded the spot price decline from $130+ to $75 by approximately 3–4 months.
**Lesson:** Curve backwardation is a leading indicator — it peaks before spot prices peak, and the compression of backwardation is an early warning of the price decline to follow.

**April 2020: WTI goes negative — the ultimate contango event**
On April 20, 2020, the May 2020 WTI contract settled at -$37.63/bbl. Storage at Cushing was essentially full (~65M bbl). Demand had collapsed by 10 Mb/d globally due to COVID lockdowns. Holders of May contracts who could not take physical delivery at Cushing were forced to sell at any price — even negative. This is the extreme contango scenario: the cost of storage was so high (because no tank space was available) that prompt crude was literally worthless or less. The M1–M2 contango had reached -$50 at the intraday extreme. June contracts remained at +$20.
**Lesson:** The May 2020 event is a structural outlier driven by physical delivery mechanics, not a market signal. It was caused by a convergence of (a) COVID demand destruction, (b) OPEC production war ongoing at that specific moment, and (c) WTI contract settlement requiring physical delivery at a full hub. This event should be referenced when teaching the limits of WTI as a global price signal — it is specifically a Cushing-delivery contract, and Cushing conditions can diverge dramatically from the global market.

## Checklist

Before posting a curve-structure thesis:

- [ ] What is the current M1–M2 WTI spread? (Immediate physical conditions)
- [ ] What is the current M1–M13 (12-month calendar) spread? (Structural balance)
- [ ] Is this M1–M13 level above +$3 (structural backwardation / deficit) or below -$3 (structural surplus)?
- [ ] Is it within 3 days of front-month contract expiry? (If yes, discount the M1–M2 signal)
- [ ] Does the STEO supply/demand balance confirm the curve structure, or is there a divergence?
- [ ] Are Cushing stocks consistent with the curve signal? (<25M bbl should be backwardation; >45M bbl should be contango)
- [ ] What does the CFTC COT show? Are speculative net longs at extreme levels (fragility risk) or moderate (organic)?
- [ ] Is this a seasonal curve shape (heating oil in October, gasoline in April) or a structural shift?
- [ ] Are crack spreads wide (refinery demand pulling crude) or narrow (refinery throughput slowing)?
- [ ] Have I noted the WTI-Brent spread? Is the US in regional divergence from the global curve?

## Sources

- CME Group — WTI crude oil futures contract specs and settlement: https://www.cmegroup.com/markets/energy/crude-oil/light-sweet-crude.html
- EIA Short-Term Energy Outlook — monthly supply/demand balance projections: https://www.eia.gov/steo/
- IEA global stock data and oil market balance: https://www.iea.org/data-and-statistics
- CME Education — contango, backwardation, roll yield, storage economics: https://www.cmegroup.com/education/courses/introduction-to-energy/introduction-to-crude-oil.html
