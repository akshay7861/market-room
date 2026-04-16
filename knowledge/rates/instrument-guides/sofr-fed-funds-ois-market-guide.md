---
agent: Rates
doc_type: instrument-guide
priority: high
topics:
  - SOFR
  - effective fed funds
  - OIS
  - SOFR futures
  - repo stress
  - RRP
  - money-market plumbing
  - policy path
instruments:
  - SOFR
  - effective fed funds rate
  - overnight index swaps
  - three-month SOFR futures
  - reverse repo facility
  - repo rates
  - Treasury bills
market_regimes:
  - normal policy repricing
  - repo stress
  - reserve scarcity
  - front-end dislocation
  - money-market abundance
trigger_patterns:
  - SOFR trades materially above fed funds
  - SOFR futures reprice more than 10 bps
  - RRP balance drains rapidly
  - bill yields dislocate from OIS
  - repo rates spike around quarter-end
  - OIS path diverges from Fed communication
use_when:
  - the user asks about money-market plumbing
  - front-end rates move without a macro release
  - SOFR or repo markets show stress
  - Fed funds futures and SOFR futures imply different policy paths
source_type: curated_internal
quality_score: 5
last_reviewed: 2026-04-10
source_urls:
  - https://www.newyorkfed.org/markets/reference-rates/sofr-averages-and-index
  - https://www.federalreserve.gov/releases/h15/
  - https://www.newyorkfed.org/markets/desk-operations/reverse-repo
  - https://www.cmegroup.com/markets/interest-rates/stirs/three-month-sofr.html
---

# SOFR, Fed Funds, and OIS Market Guide

## Why this matters

Rates must separate **policy repricing** from **plumbing stress**. A front-end move caused by CPI, payrolls, or FOMC guidance is not the same as a move caused by repo scarcity, bill supply, quarter-end balance sheet constraints, or RRP drain.

Use this doc when the question is: "Did the expected Fed path change, or did the market plumbing change?"

## Core mechanism

The front end has three related but different signals:

1. **Effective fed funds:** where unsecured overnight interbank funding trades inside the Fed's target range. This is the policy anchor.
2. **SOFR:** secured overnight Treasury repo rate. This is collateral and balance-sheet sensitive.
3. **OIS / SOFR futures:** market-implied expected overnight rates over future periods. This is policy path plus risk/liquidity premium.

Normal repricing starts with expected Fed policy. Plumbing stress starts with repo/funding markets and can move SOFR without the Fed changing its reaction function.

## What to watch

| Signal | Interpretation | Action |
|---|---|---|
| 3m SOFR future reprices 10-15 bps after CPI/NFP | Policy path repricing | Use Fed Repricing Playbook |
| SOFR rises relative to fed funds with no macro catalyst | Repo/collateral stress | Comment; post if persistent |
| SOFR/fed funds gap widens around quarter-end then reverses | Balance-sheet window dressing | Usually stay silent |
| RRP drains while reserves stable | Liquidity cushion being used | Monitor, not thesis by itself |
| RRP low and reserves falling with repo firming | Reserve scarcity risk | New post if front-end spreads confirm |
| Bill yields richen sharply vs OIS | Collateral/cash imbalance | Comment if linked to TGA/refunding |
| OIS path diverges from Fed messaging | Market challenging Fed guidance | New post if move is persistent |

## Typical market path

1. Macro release or Fed communication shifts expected policy path.
2. OIS and SOFR futures reprice first; 2-year Treasury follows.
3. If the move is policy-based, the curve and breakevens confirm.
4. If the move is plumbing-based, SOFR/repo/bills move more than the expected policy path.
5. Rates decides whether to post policy repricing, plumbing stress, or stay silent.

## False positives / traps

- **SOFR spike equals Fed hike trap:** SOFR can rise from repo scarcity without a change in expected Fed policy.
- **Quarter-end trap:** quarter-end and year-end balance-sheet constraints can create temporary repo jumps. Do not turn them into a policy thesis without persistence.
- **RRP drain panic trap:** RRP falling is not automatically stress. It can simply mean money funds are moving into bills.
- **Futures-only trap:** SOFR futures include liquidity and risk premium. Cross-check OIS, fed funds probabilities, and Treasury bills.
- **Bill supply trap:** bill issuance can absorb cash and lift bill yields without changing the Fed path.

## Cross-asset implications

- **Macro:** plumbing stress becomes macro only if it tightens credit or financial conditions.
- **FX:** front-end yield repricing supports currency moves only if it reflects expected policy, not temporary repo noise.
- **Equities:** liquidity stress pressures high-multiple equities, but a policy-path repricing has cleaner duration implications.
- **Risk/Sentiment:** repo/funding stress belongs to Risk/Sentiment when it spills into credit, dealer balance sheets, or ETF liquidity.

## How this should affect agent behavior

Post when SOFR/OIS/futures show a persistent policy-path or funding-regime shift. Comment when the move explains another asset's behavior. Stay silent on routine quarter-end jumps, small futures moves below 5 bps, or one-day SOFR/fed funds noise.

If the query asks "how many cuts/hikes are priced," use SOFR futures and OIS. If it asks "why did SOFR move," inspect repo plumbing first.

## Example historical episodes

**September 2019 repo spike:** repo stress appeared before a macro thesis. The right framing was reserve scarcity and balance-sheet constraints, not a Fed policy surprise.

**March 2020 funding stress:** front-end dislocations were liquidity/funding problems. The policy path mattered, but the urgent signal was market functioning.

**2022-2023 hiking cycle:** SOFR futures repriced aggressively around CPI/FOMC. These were policy-path moves, not repo stress.

**2023-2024 RRP drain:** RRP decline cushioned QT. The risk was not the drain itself but what happens when reserves become the marginal liquidity variable.

## Checklist

- Did the front-end move follow macro data, FOMC communication, auction/refunding, or no obvious catalyst?
- Is SOFR moving relative to effective fed funds?
- Are bills dislocated versus OIS?
- Is RRP drain orderly or paired with reserve/repo stress?
- Did SOFR futures move more than 10 bps?
- Is the 2-year Treasury confirming the policy-path move?
- Is this policy repricing, collateral stress, or balance-sheet seasonality?
- Should Rates post, comment, or stay silent?

## Sources

- NY Fed SOFR averages and index: https://www.newyorkfed.org/markets/reference-rates/sofr-averages-and-index
- Federal Reserve H.15: https://www.federalreserve.gov/releases/h15/
- NY Fed reverse repo operations: https://www.newyorkfed.org/markets/desk-operations/reverse-repo
- CME Three-Month SOFR Futures: https://www.cmegroup.com/markets/interest-rates/stirs/three-month-sofr.html
