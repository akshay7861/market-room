# FX Agent — Market Frameworks & Playbooks

_Last updated: 2026-04-17. Sector memory for the FX Agent. Use these frameworks to reason about dollar direction, carry, and policy divergence — not just to describe cross levels._

---

## Dollar Regime Framework

Dollar direction is driven by three forces in order of dominance: **real yield differentials**, **risk appetite**, and **current account / capital flow dynamics**. When these three align, the move is durable. When they conflict, the move is corrective and should be faded.

**Dollar bull conditions (all three aligned):**
- US 2Y yield rising faster than G10 peers (real rate differential expanding)
- VIX below 18 and stable (risk-on = dollar less needed as safe haven, but carry attractiveness dominates)
- US current account deficit narrowing OR capital inflows accelerating

**Dollar bear conditions:**
- US real yields peaking or falling (10Y TIPS declining from >1.5%)
- VIX rising above 20 with HY spreads widening (safe haven flows go to JPY and CHF, not USD, in genuine risk-off)
- Current account deficit widening without offsetting capital flows (structural dollar supply)

**The trap**: high nominal yields alone are NOT sufficient for sustained dollar strength. When real yields peak, the dollar reversal tends to be sharp — 5–8% over 6–10 weeks. Missing the turn in real yields is the single biggest FX timing error.

---

## Carry Trade Mechanics — Be Precise

Carry trades are directional bets on yield differentials, not just yield levels. Get the direction right:

**EM carry trade (borrowing low-yield USD to invest in high-yield EM):**
- Works when: US yields stable/falling + EM yields steady + VIX below 18 + dollar stable
- Unwinds when: USD strengthens sharply OR VIX spikes above 22 OR EM country-specific stress (current account deterioration, inflation shock)
- Unwind mechanics: EM investors sell EM assets → sell EM currency → buy USD → USD strengthens further → unwind accelerates. Self-reinforcing.
- Typical unwind speed: 50–70% of the carry gain reverses in 2–3 weeks during stress episodes.

**JPY carry trade (borrowing cheap JPY to invest in USD or EM):**
- Funded in JPY because BOJ held rates near zero for decades. USD/JPY above 145 is the stress zone where BOJ intervention risk rises.
- When VIX spikes above 25, JPY carry unwind is fast and violent — USD/JPY typically drops 3–5% in 1–2 weeks.
- The JPY carry unwind signal: USD/JPY falling sharply WHILE equities are also falling = genuine risk-off. USD/JPY falling with equities rising = BOJ policy change (different driver).

**What "carry compression" actually means:**
- Carry compression = the yield spread between the high-yield and low-yield currency is NARROWING. Either the high-yield country's rates are falling, or the low-yield country's rates are rising.
- High US yields by themselves do NOT compress EM carry — they widen the spread in USD's favour. Compression happens when EM central banks cut, or when US yields rise faster than EM yields (rare).
- Always name WHICH side of the spread is moving.

---

## Policy Divergence Playbook

Policy divergence is the most powerful medium-term FX driver. The timing sequence:

1. **Pre-divergence**: market is pricing the same policy path for both central banks. Moves are driven by short-term data surprises.
2. **Divergence signal**: one central bank signals a different path (e.g., ECB cuts while Fed holds). EUR/USD typically drops 3–5% in the 3 months following the first divergent cut — but the first 1–2% is usually given back as the market "tests" the divergence.
3. **Sustained divergence**: 3+ meetings of different outcomes. The FX move is now structural, not tradeable by fading.
4. **Convergence**: both central banks realign. This typically happens faster than the market expects — policy divergence rarely lasts more than 18 months at the extreme.

**Current relevance**: Fed at 3.64% vs ECB sub-2% = 150+bps differential. This gap is historically extreme and has never been sustained for more than 2 years without convergence. EUR/USD at 1.17 reflects some of this already — the question is whether the US growth story deteriorates fast enough to close the gap via Fed cuts.

---

## Safe Haven Flow Mechanics

Not all risk-off episodes are the same. The currency flow depends on the TYPE of risk:

| Risk type | Safe havens | Avoid |
|-----------|------------|-------|
| US-specific (recession fear, credit stress) | JPY, CHF | USD — the problem is US-based |
| Global growth shock | JPY, CHF, USD | Commodity FX (AUD, CAD, NOK) |
| EM crisis/contagion | USD, JPY | EM FX, commodity-linked FX |
| Geopolitical (Middle East) | USD, gold | EUR, EM |
| European banking stress | USD, CHF | EUR, GBP |

**Identification rule**: if USD is strengthening AND JPY is strengthening simultaneously → genuine risk-off, not just dollar strength. If USD strengthens but JPY weakens → it's a US real yield / carry trade move, not fear.

---

## Cross Playbooks — Key Pairs

**EUR/USD:**
- Primary driver: ECB vs Fed policy differential (2Y spread is best proxy)
- Level context: 1.10 = strong dollar / rate differential zone; 1.20+ = dollar weakness regime
- Rule: EUR/USD below 1.05 historically coincides with European recession or energy shock. At 1.17, the market is pricing some Fed convergence toward ECB rates.

**USD/JPY:**
- Primary driver: US-Japan 10Y yield differential
- BOJ intervention zone: USD/JPY above 145–150. BOJ has intervened 3 times since 2022.
- Rule: when USD/JPY exceeds 150 and VIX is below 20, the upside is capped by intervention risk. When VIX spikes above 25 with USD/JPY at 145+, the unwind is typically fast and severe (2022 episode: dropped 10% in 3 weeks).

**AUD/USD:**
- Primary driver: China industrial activity proxy (iron ore, copper demand) + risk appetite
- Rule: AUD/USD rising with copper flat = pure risk-on signal. AUD/USD falling with WTI falling = China demand destruction signal — more bearish than just risk-off.

**USD/CAD:**
- Primary driver: WTI crude direction + BOC/Fed differential
- Rule: WTI YoY >+20% historically correlates with CAD strength (USD/CAD lower) within 2–3 months. The oil-CAD relationship breaks when US growth fears dominate (both WTI and CAD weaken together against USD).

---

## Stored Data Correlation — Dollar/Oil

The data lake can provide a computed Broad Dollar YoY% vs WTI YoY% correlation for the current run/window. Use that exact stored-data value when it is present and relevant to an oil-dollar or commodity-FX mechanism. Do not treat any single coefficient as a permanent house constant.

**Implication**: if calling dollar strength, the commodity-FX complex (AUD, CAD, NOK, BRL) should underperform. If those crosses are NOT moving as expected, question the dollar thesis.

---

## Failure Modes to Avoid

**1. Treating EUR/USD as the only dollar proxy.** The broad dollar index (trade-weighted) is more accurate. EUR/USD can be distorted by European-specific flows. When USD/JPY and USD/CNH are both moving with EUR/USD, the dollar move is real. When only EUR/USD moves, it may be Euro-specific.

**2. Assuming dollar strength persists just because US yields are high.** Real yield LEVEL matters less than the DIRECTION. Once real yields start falling, the dollar typically reverses within 4–6 weeks — missing this turn by one month costs the entire move. Watch the direction of TIPS yields, not just the level.

---

## Key Levels Reference

| Cross | Current | Regime note |
|-------|---------|------------|
| Broad Dollar YoY% | -6.3% YoY | Dollar in weakening trend |
| EUR/USD | 1.17 | Above 1.15 = dollar weakness zone |
| USD/JPY | 159.22 | Above BOJ intervention watch zone (145–150) |
| AUD/USD | 0.71 | Risk-on supported; China proxy positive |
| USD/CAD | 1.38 | Oil-linked; watch WTI direction |
| USD/CHF | 0.79 | CHF near multi-year strength — safe haven bid intact |
| 10Y real yield | 1.89% | Still restrictive but below 2% peak |
| Fed Funds | 3.64% | 150bps above ECB — extreme divergence |
