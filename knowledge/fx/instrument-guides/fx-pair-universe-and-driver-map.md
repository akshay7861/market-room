---
agent: FX
doc_type: instrument-guide
priority: high
topics:
  - FX pair universe
  - G10 FX
  - EM FX
  - dollar index
  - carry
  - rate differentials
  - safe havens
  - funding stress
  - handoff rules
instruments:
  - EUR/USD
  - USD/JPY
  - GBP/USD
  - USD/CHF
  - AUD/USD
  - USD/CAD
  - NZD/USD
  - DXY
  - MXN
  - ZAR
  - CNH
market_regimes:
  - dollar bull trend
  - carry regime
  - carry unwind
  - safe-haven bid
  - central bank divergence
  - EM funding stress
trigger_patterns:
  - 2-year rate differential changes more than 15 bps
  - G10 currency moves more than 1 percent in one session
  - EM currency moves more than 2 percent in one session
  - JPY or CHF strengthens while risky FX sells off
  - DXY breaks out with front-end yield confirmation
  - central bank surprise changes pair-specific policy divergence
use_when:
  - user asks about currencies dollar yen euro sterling carry DXY or EM FX
  - Market Room headline includes FX pair central bank divergence intervention dollar funding or carry unwind
  - agent must decide whether FX owns the move or should hand off to Rates or Risk/Sentiment
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-15
source_urls:
  - https://www.bis.org/statistics/rpfx22_fx.htm
  - https://www.federalreserve.gov/releases/h10/current/
  - https://www.imf.org/en/Data
  - https://www.bis.org/statistics/gli.htm
---

# FX Pair Universe and Driver Map

## Why this matters

The FX agent should not sound like the Rates agent with currency names attached. FX has pair-specific drivers: policy spreads, real yields, external balances, funding stress, carry, reserve management, intervention risk, and safe-haven behavior.

The first question is always: which currency pair, which leg, and which driver?

## Core mechanism

FX moves through six driver families:

1. **Rate differential**
   - Short-end yield spreads drive G10 FX when growth and risk conditions are stable.
   - A 15 bps move in a 2-year differential is meaningful for majors.

2. **Real-yield differential**
   - Better for inflation-adjusted policy stance.
   - Important for USD, JPY, EUR, and gold-linked interpretations.

3. **Carry and funding**
   - High-yield currencies perform in calm markets.
   - They unwind when volatility rises or dollar funding tightens.

4. **Safe haven**
   - USD, JPY, and CHF can rally even when their domestic fundamentals are not strong.
   - The signal is risk aversion, not local growth.

5. **External balance and terms of trade**
   - Commodity exporters respond to oil, gas, metals, and China demand.
   - Current-account pressure matters more for EM FX.

6. **Policy intervention**
   - Intervention risk is highest when currency moves are rapid, politically visible, and disorderly.
   - Do not treat intervention headlines as trend reversal unless price action confirms.

## What to watch

| Pair / group | Main driver | Strong signal | Handoff |
|---|---|---|---|
| EUR/USD | Fed-ECB differential, growth gap, energy terms | 2y spread shift greater than 15 bps | Rates if bps path dominates |
| USD/JPY | US-Japan yield gap, intervention risk, global risk | JPY move greater than 1.5% with official comments | Risk if disorderly move |
| GBP/USD | BoE path, UK growth, risk beta | rates plus growth surprise align | Macro if UK data regime dominates |
| AUD/USD, NZD/USD | China/global growth, commodities, risk beta | commodity + risk-on confirmation | Commodities if metal demand is core |
| USD/CAD | oil plus BoC-Fed spread | CAD moves with crude and spreads | Commodities for oil mechanism |
| EM FX | carry, reserves, dollar liquidity, risk | 2% move with funding stress | Risk/Sentiment for crisis framing |

## Typical market path

1. Catalyst hits: central bank, CPI, jobs, commodity shock, intervention, risk-off.
2. Rate and real-yield differentials move.
3. The currency pair reacts depending on whether the pair is rates-sensitive, carry-sensitive, commodity-sensitive, or safe-haven-sensitive.
4. If volatility rises, carry logic can invert: high-yield FX sells despite positive carry.
5. FX posts only when the pair-specific driver is clear.

## False positives / traps

- **Dollar-up-equals-Fed trap:** USD can rise on safe-haven demand even when US yields fall.
- **Carry trap:** high yield is not bullish if the position is crowded and volatility is rising.
- **Single-leg trap:** EUR/USD can move because of the euro leg, dollar leg, or both.
- **Commodity currency trap:** CAD and AUD do not always follow oil or copper; rate spreads and risk appetite can dominate.
- **Intervention trap:** official concern is not the same as confirmed intervention or durable reversal.

## Cross-asset implications

- USD strength tightens global financial conditions and can pressure EM FX, commodities, and multinational earnings.
- JPY strength during risk-off can confirm carry unwind.
- Commodity FX can validate or reject commodity price moves.
- FX volatility can spill into Risk/Sentiment if it becomes disorderly.
- Currency moves can affect Equities through translation, margins, and sector exposures.

## How this should affect agent behavior

- Always name the currency pair and the leg driving it.
- Use rate differentials only when risk and funding conditions are stable.
- Hand off bps-path details to Rates.
- Hand off broad panic, crowded carry, and cross-asset stress to Risk/Sentiment.
- Hand off stock and sector implications to Equities.
- Stay silent if the question is purely about Treasury yields, oil inventories, or single-stock earnings with no FX transmission.

## Example historical episodes

### 2014-2015 dollar bull run

Fed tightening expectations diverged from ECB easing. The mechanism was policy divergence plus relative growth, not generic dollar strength.

### 2022 USD/JPY surge

US yields rose while Japan defended yield-curve control. The pair became a clean expression of central-bank divergence until intervention risk increased.

### March 2020 dollar funding squeeze

USD rose sharply despite falling US yields because global dollar funding demand dominated rate-differential logic.

### Carry unwind episodes

High-yield EM FX can sell quickly when volatility rises. The lesson is that positive carry becomes fragile when funding and positioning change.

## Checklist

- Which pair is involved?
- Which leg is moving?
- Is the driver rates, real yields, carry, risk, external balance, commodity exposure, or intervention?
- Are risk conditions calm enough for carry logic to work?
- Is this G10 or EM FX?
- Which agent should receive the handoff?
- Should FX post, update, comment, or stay silent?

## Sources

- BIS Triennial FX Survey for FX market structure and pair liquidity.
- Federal Reserve H.10 for official foreign exchange rates.
- IMF data for external balance, reserves, and cross-country macro context.
- BIS global liquidity indicators for dollar liquidity and funding stress.
