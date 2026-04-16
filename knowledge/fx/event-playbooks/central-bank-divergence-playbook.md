---
agent: FX
doc_type: event-playbook
priority: high
topics:
  - central bank divergence
  - policy path repricing
  - rate differential exhaustion
  - priced-in divergence
  - Fed versus ECB
  - Fed versus BOJ
  - convergence trades
  - guidance surprise
  - major cross moves
  - USD anchor effects
instruments:
  - EURUSD
  - USDJPY
  - GBPUSD
  - DXY
  - US 2-year Treasury
  - German 2-year Schatz
  - JGB yields
  - OIS curves
market_regimes:
  - Fed-leading divergence
  - ECB catch-up divergence
  - BOJ regime-shift divergence
  - priced-in divergence exhaustion
  - convergence / closing-gap regime
trigger_patterns:
  - central bank guidance shifts materially versus consensus
  - 2-year rate differential moves into the top decile of its 2-year range
  - USDJPY reprices violently after BOJ communication
  - EURUSD fails to follow a widening US-EU rate gap for 2 sessions
  - trailing central bank begins to converge toward the leader
use_when:
  - FOMC, ECB, BOJ, or BOE meeting days
  - major inflation or wage prints that reprice relative policy paths
  - large moves in front-end differentials
  - FX moves that feel too small or too large for the rate move
  - questions about whether divergence is still live or already priced
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
  - https://www.ecb.europa.eu/pub/economic-bulletin/html/index.en.html
  - https://www.boj.or.jp/en/mopo/mpmdeci/index.htm
  - https://www.imf.org/en/Publications/WEO
  - https://www.bis.org/publ/arpdf/
---

# Central-Bank Divergence Playbook

## Why this matters

The FX framework doc explains **how** rate differentials travel into currencies. This playbook explains **when** a central-bank event is important enough to create, extend, or close a divergence trade.

The recurring failure in FX commentary is to say "Fed more hawkish than ECB" without answering three harder questions:

1. is the divergence new or already priced,
2. is the market trading the leading central bank or the laggard catching up,
3. is the divergence widening, peaking, or starting to close.

Those are the questions that determine whether the FX agent should post a new thesis, update an existing one, comment, or stay quiet.

## Core mechanism

Central-bank divergence matters when relative policy paths change faster than the market expected. FX does not react to policy level alone. It reacts to the **change in the expected gap** between central banks.

### Divergence taxonomy

| Setup | What changes | Typical FX effect |
|---|---|---|
| Fed ahead of ECB | US front-end path reprices higher relative to euro area | USD stronger, EURUSD lower |
| Fed easing while BOJ normalizes | US-Japan differential compresses | USDJPY vulnerable lower |
| ECB catch-up | ECB path shifts hawkish relative to prior market view | EUR can rally even if Fed unchanged |
| EM ahead of DM | local central bank holds restrictive policy longer | carry support only if funding and credibility hold |

The important distinction is that FX trades the **incremental surprise**, not the fact that one central bank is already more hawkish than another.

### Three stages of a divergence trade

#### 1. Widening phase

This is when the policy-path gap is increasing:

- one central bank turns more hawkish or less dovish,
- front-end spreads widen,
- spot follows quickly,
- commentary should focus on why the gap is widening and whether it is early or already crowded.

#### 2. Mature / priced-in phase

This is when:

- the rate gap is already wide,
- spot has already moved,
- new data confirms the narrative but does not extend it much.

This is where many bad FX posts happen. The macro story is still correct, but the trade is no longer new. The agent should usually **update**, not post a fresh divergence thesis, unless the rate gap moves into a new percentile range or the lagging central bank surprises materially.

#### 3. Convergence / closing phase

This begins when:

- the trailing central bank starts catching up,
- the leading central bank softens,
- or the growth / external-balance backdrop begins to dominate the rate story.

This is often the highest-value FX post because the room is usually late to recognize that a strong divergence trend is ending.

### Event hierarchy

The FX agent should rank divergence catalysts in this order:

1. **guidance surprise**
2. **dot/projection revision**
3. **unexpected policy action**
4. **speech or interview repricing**
5. **data that only confirms what is already priced**

If the event is category 5, the default should be comment or silence unless the spot/rates relationship has changed.

## What to watch

1. **2-year spread percentile**
   - A widening spread matters more when it pushes into the top decile of the prior 2-year range.
   - If the spread only widens modestly inside an already-extreme band, the divergence may already be priced.

2. **Spot versus rates confirmation**
   - If EURUSD or USDJPY stops moving despite widening rate spreads, the market is tiring or another mechanism is taking over.
   - Two sessions of non-confirmation is a warning.

3. **Relative guidance language**
   - The question is not whether a statement is hawkish in absolute terms.
   - The question is whether it is more hawkish or less dovish than the market had priced versus the peer central bank.

4. **Laggard-catch-up risk**
   - Divergence ends when the laggard starts moving, not only when the leader pivots.
   - ECB catch-up and BOJ normalization are classic examples.

5. **Growth and external-balance override**
   - A currency can fail to strengthen on a hawkish surprise if growth, current-account deterioration, or political risk offsets the rate story.

### Useful operating thresholds

| Signal | Threshold | Interpretation |
|---|---|---|
| 2-year differential change | ≥15 bps in a week | thesis-grade widening or narrowing |
| Differential percentile | top or bottom 10% of 2-year range | divergence likely crowded or exhausted |
| Spot non-confirmation | 2 sessions | priced-in divergence or competing mechanism |
| Central-bank guidance shift | materially versus consensus | new divergence thesis candidate |
| Convergence move | differential narrows by ≥15 bps on policy shift | closing-trade thesis candidate |

## Typical market path

### Fed-leading USD divergence

The classic sequence is:

- US inflation or labor data surprise,
- FOMC guidance firms,
- US 2-year yields move first,
- DXY and USD crosses follow,
- then the move either extends on follow-through or stalls if it was fully priced.

The FX agent should focus on whether EURUSD and USDJPY are confirming at the same time. If only one pair confirms, the divergence story may be pair-specific rather than broad dollar strength.

### ECB catch-up episode

This sequence looks different:

- Fed unchanged,
- ECB surprises hawkish relative to weak expectations,
- bund / Schatz yields rise,
- EURUSD rallies even without a US move.

This is not a "USD weakens" story first. It is a "EUR reprices the laggard catching up" story.

### BOJ regime-shift episode

This is usually the most violent:

- BOJ tweaks YCC, exits NIRP, or changes language around normalization,
- JGB yields rise or are expected to rise,
- USDJPY becomes unstable,
- intervention risk and positioning make spot move larger than a simple yield-gap model would imply.

This is where the FX agent must combine divergence logic with the Batch 1 carry/funding framework.

## False positives / traps

### Trap 1 — Treating any hike as currency-positive

If the hike was fully priced, the currency may not move or can even weaken on "sell the fact" dynamics. The marginal surprise is what matters.

### Trap 2 — Ignoring crowded divergence

A valid divergence story can still be a poor fresh trade if the spread is already at an extreme and spot has already moved far. When divergence is crowded, the threshold for extension is much higher.

### Trap 3 — Treating Fed surprises and BOJ/ECB surprises as symmetric

They are not. USD is the anchor currency. ECB and BOJ surprises can move crosses disproportionately because the market often runs larger carry or structural funding positions through EUR and JPY.

### Trap 4 — Mistaking convergence for temporary noise

When the laggard central bank starts moving toward the leader, that is often the beginning of the closing trade, not a one-day interruption.

### Trap 5 — Reducing divergence to rates only

If growth expectations, current account dynamics, or intervention risk are working against the rate signal, spot can fail even while the spread still looks supportive.

## Cross-asset implications

| Divergence state | Rates | Equities | Credit | Commodities |
|---|---|---|---|---|
| Widening Fed-led divergence | US front-end leads | non-US risk can struggle under stronger USD | selective pressure on weaker credits | commodity FX can lag |
| ECB / BOJ catch-up | foreign front-end reprices | regional equity leadership can shift | local credit may tighten if growth holds | EUR/JPY-sensitive commodity demand narratives change |
| Priced-in divergence | rates still support old story but FX extension fades | cross-asset confirmation weakens | credit often stops worsening | commodities may stop following USD cleanly |
| Convergence | spread compresses | equity leadership may broaden outside US mega-cap | pressure eases on funding-sensitive credits | commodity FX can recover |

The FX agent should own the question: **is the currency moving because the divergence is widening, because the divergence is already priced, or because the divergence is closing?**

## How this should affect agent behavior

### When to post a new thesis

Post when:

- a meeting or guidance shift changes the expected policy gap materially,
- the 2-year spread moves by at least 15 bps,
- and spot confirms the new direction.

Examples:

- ECB surprises hawkish and EURUSD rallies despite no Fed move,
- BOJ normalization compresses USDJPY lower on a real policy shift,
- FOMC shifts more hawkish while peer central banks stay static.

### When to update

Update when:

- the divergence thesis is still right but the spread is no longer moving into a new range,
- spot confirms only partially,
- or the trade is becoming crowded and needs a risk-management note.

### When to comment

Comment when:

- the differential change is below 15 bps,
- the event mostly confirms what was already priced,
- or spot response is too small to treat as a regime move.

### When to stay silent

Stay silent when:

- one central bank delivers what futures already priced,
- spot does not respond,
- and no new convergence or divergence signal is created.

## Example historical episodes

### 2014-2015 Fed versus ECB

The Fed moved toward normalization while the ECB was deep in QE. EURUSD fell sharply as the policy gap widened. The lesson: this was a sustained widening-phase divergence, not a one-meeting shock.

### 2022-2023 BOJ YCC defense

The Fed remained restrictive while the BOJ defended YCC. USDJPY rose, but the move was not a clean carry story alone. It also embedded intervention risk and extreme positioning. The lesson: divergence can be right directionally and still fragile mechanically.

### 2024-2025 BOJ normalization volatility

As BOJ normalization expectations rose, USDJPY became much more unstable than a simple spread model would imply. The lesson: the closing phase of a crowded divergence trade can be faster than the widening phase.

## Checklist

- [ ] Which central bank is surprising versus consensus?
- [ ] Is the policy gap widening, already extreme, or starting to close?
- [ ] Did the 2-year spread move by at least 15 bps?
- [ ] Is the spread in the top or bottom decile of the prior 2-year range?
- [ ] Did spot confirm the spread move within 1-2 sessions?
- [ ] Is the move broad dollar strength or pair-specific repricing?
- [ ] Is the laggard central bank beginning to catch up?
- [ ] Is intervention, growth, or external-balance risk overriding the rate signal?
- [ ] Should this be a new thesis, an update, or only a comment?

## Sources

- Federal Reserve FOMC meeting calendars, statements, projections, and press conferences
- ECB Economic Bulletin and staff projections
- Bank of Japan monetary policy decisions
- IMF World Economic Outlook
- BIS Annual Economic Report
