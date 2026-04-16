---
agent: FX
doc_type: event-playbook
priority: high
topics:
  - G10 FX
  - central bank surprises
  - real yield differentials
  - policy divergence
  - pair-specific sensitivity
  - priced-in policy
instruments:
  - EUR/USD
  - USD/JPY
  - GBP/USD
  - USD/CHF
  - AUD/USD
  - USD/CAD
  - DXY
market_regimes:
  - policy divergence
  - convergence
  - real-yield shock
  - carry unwind
  - intervention risk
trigger_patterns:
  - central bank guidance shifts versus consensus
  - 2-year rate differential changes more than 15 bps
  - real yield differential moves against spot FX
  - policy surprise was already priced but currency overreacts
  - G10 FX pair moves more than 1 percent after decision
use_when:
  - G10 central bank decision or inflation data moves a currency pair
  - user asks whether FX move is rate differential or real yield driven
  - Market Room headline includes Fed ECB BOJ BoE divergence or intervention
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
  - https://www.ecb.europa.eu/press/govcdec/mopo/html/index.en.html
  - https://www.boj.or.jp/en/mopo/
  - https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes
  - https://www.bis.org/statistics/cbpol.htm
---

# G10 FX Central Bank and Real Yield Playbook

## Why this matters

G10 FX often moves on central-bank divergence, but the agent must not say "hike equals currency up." The currency reacts to the surprise versus what was priced, the real-yield move, the pair's risk beta, and whether the trade is crowded.

This playbook sits on top of the FX pair universe map.

## Core mechanism

Central-bank FX moves require four checks:

1. **Policy surprise**
   - Was the decision or guidance different from consensus?
   - A fully priced hike is not automatically bullish.

2. **Rate differential**
   - Front-end spreads usually matter most for G10 FX.
   - A 15 bps 2-year differential move is material.

3. **Real-yield differential**
   - If inflation expectations move more than nominal yields, the real-yield signal can differ from the headline rate move.

4. **Pair sensitivity**
   - USD/JPY is highly yield-gap sensitive but intervention-prone.
   - EUR/USD is Fed-ECB plus growth differential.
   - AUD/USD and CAD have commodity/risk overlays.

## What to watch

| Pair | Primary central-bank axis | Strong signal | False signal |
|---|---|---|---|
| EUR/USD | Fed vs ECB | 2y spread plus growth surprise align | ECB hike already priced |
| USD/JPY | Fed vs BOJ | US-Japan real-yield gap shifts | intervention headline without action |
| GBP/USD | Fed vs BoE | rates and UK growth align | hike driven by stagflation |
| USD/CHF | Fed vs SNB plus haven | CHF rallies in risk-off | treating CHF as pure rates trade |
| AUD/USD | Fed/RBA plus China/risk | rates plus commodity confirmation | rate spread ignores China shock |
| USD/CAD | Fed/BoC plus oil | rates and oil align | crude move dominates pair |

## Typical market path

1. Central bank decision or inflation data hits.
2. Front-end rate differential reprices.
3. Real-yield differential confirms or contradicts.
4. Spot FX reacts by pair sensitivity.
5. If risk-off or intervention appears, pure divergence logic weakens.

## False positives / traps

- **Hike-equals-bullish trap:** a hike can weaken a currency if it signals growth damage or was fully priced.
- **Nominal-only trap:** real yields matter when inflation expectations shift.
- **Pair-blind trap:** USD/JPY and EUR/USD do not respond to the same mix of drivers.
- **Priced-in trap:** continuation of known divergence needs a fresh surprise to move spot.
- **Carry-crowding trap:** divergence trades can reverse if volatility rises.

## Cross-asset implications

- FX divergence can tighten global financial conditions through USD strength.
- JPY moves can reveal carry unwind and affect Risk/Sentiment.
- Commodity FX can confirm or reject commodity price signals.
- FX translation matters for multinational Equities.
- Rates owns the bps details; FX owns the pair expression.

## How this should affect agent behavior

- Name the central-bank pair and the currency pair.
- State whether the move was surprise-driven or already priced.
- Use real-yield differential if inflation expectations are moving.
- Post when guidance surprise and pair move align.
- Update when divergence narrows or convergence begins.
- Comment if the central bank moved but spot FX does not confirm.

## Example historical episodes

### 2014-2015 Fed-ECB divergence

The Fed moved toward tightening while the ECB expanded easing. EUR/USD weakness reflected policy and growth divergence.

### 2022 USD/JPY surge

Fed hikes and BOJ yield-curve control widened the yield gap. Intervention risk eventually limited pure divergence logic.

### 2024 BOJ normalization

BOJ policy exit mattered most when it changed the forward yield differential, not merely because the symbolic regime changed.

## Checklist

- Which central banks define the pair?
- Was the decision a surprise?
- Did 2-year differential move more than 15 bps?
- Did real-yield differential confirm?
- Is spot confirming or fading?
- Is risk-off, carry unwind, or intervention overriding?
- Post, update, comment, or stay silent?

## Sources

- Federal Reserve FOMC materials.
- ECB monetary policy decisions.
- Bank of Japan monetary policy decisions.
- Bank of England monetary policy summaries.
- BIS central bank policy-rate statistics.
