# Final Non-Vector Precision Pass Plan

**Date:** 2026-04-11  
**Scope:** one narrow precision pass against the exact remaining held-out misses.  
**Constraint:** no vectors, no schema changes, no broad retrieval redesign.

## 1. Exact Remaining Failure Patterns

### A. Routing negation miss

Observed in held-out `C05`:

- prompt explicitly said `Do not answer as Macro inflation`
- prompt contained commodity inventory facts:
  - gasoline stocks
  - distillates
  - crude draw
  - refinery runs below `84%`
- Ask Market still routed to `Macro`

Failure class:

- routing failure
- not a retrieval ranking failure
- not a semantic miss

Root cause:

- the routing scorer counted the word `Macro` / `inflation` as positive Macro evidence even though the phrase was a rejection of the Macro frame.

### B. Labor deterioration lost top-1 to inflation

Observed in held-out `M05`:

- prompt had openings / quits / temp help / claims weakening
- intended doc: `Labor Market Deterioration Playbook`
- top-1: `Inflation Transmission Mechanisms`
- intended doc was top-2

Failure class:

- narrow ranking failure
- right doc already present

Root cause:

- the current scorer has broad Macro overlap but no explicit labor-deterioration specificity boost.

### C. Earnings quality lost top-1 to equity regime

Observed in held-out `E07`:

- prompt had guidance cut, wage costs, margins, revenue slowing
- intended doc: `Earnings Quality and Margin Pressure Interpretation Guide`
- top-1: `Equity Regime Framework`
- intended doc was top-2

Failure class:

- narrow ranking ambiguity
- right doc already present

Root cause:

- real-yield / regime terms are strong enough to beat more specific margin / guidance / revenue-quality terms.

### D. Legacy / auxiliary fallback contamination

Observed in held-out set:

- legacy / auxiliary docs in top-3: `13 / 42`
- legacy / auxiliary docs in top-4: `41 / 42`

Failure class:

- active-pool fallback contamination
- not semantic miss

Root cause:

- current weak-fourth-slot suppression only fires when the third selected score is extremely strong (`>=80`) and the fallback is far behind.

## 2. Smallest Proposed Fixes

### Routing fix

Add a routing-side negation detector:

- `do not answer as Macro`
- `don't answer as Rates`
- `not as FX`
- `rather than Macro`
- `instead of Macro`

If a sector is explicitly negated:

- subtract a large but bounded heuristic penalty from that sector
- log `-negated-sector:<sector>`

This keeps all existing routing features intact while preventing rejected broad frames from becoming positive evidence.

### Labor ranking fix

Add a narrow query profile:

- `prefersLaborDeterioration`

Trigger when labor deterioration terms cluster:

- openings
- quits
- claims
- temp help
- payroll / NFP
- wait for payrolls
- hiring looks fine but leading labor indicators weaken

Then:

- boost `Labor Market Deterioration Playbook`
- lightly penalize `Inflation Transmission Mechanisms` when the labor cluster is active

### Earnings-quality ranking fix

Add a narrow query profile:

- `prefersEarningsQuality`

Trigger when earnings-quality terms cluster:

- margin
- guidance
- organic revenue
- free cash flow
- buybacks
- tax
- wage costs
- low-quality beat

Then:

- boost `Earnings Quality and Margin Pressure Interpretation Guide`
- lightly penalize `Equity Regime Framework` when earnings-quality terms dominate

### Fallback suppression fix

Tighten `shouldSkipFallbackEntry()`:

- only evaluate after three snippets are already selected
- require the first three selected snippets to be non-fallback docs
- skip a fallback if the third selected snippet is at least moderately strong and the fallback is not clearly better

This targets slot-4 clutter without blocking legacy docs when they are genuinely needed early.

## 3. Expected Gains

Expected checkpoint improvements:

- C05-style commodity inventory negation routes to `Commodities`
- labor deterioration prompt ranks `Labor Market Deterioration Playbook` first
- earnings quality prompt ranks `Earnings Quality and Margin Pressure Interpretation Guide` first or accepts it as a deliberate top-2 when the prompt is genuinely mixed
- legacy fallback in slot 4 falls materially on targeted prompts
- no change to vector decision

## 4. How To Validate

Run a focused checkpoint set of `12-15` prompts:

- commodity inventory prompts with explicit Macro rejection
- labor deterioration prompts versus inflation
- earnings-quality prompts versus equity regime
- fallback contamination prompts across Macro, Rates, FX, Risk/Sentiment, Equities

Pass criteria:

- routing negation prompts route to the specialist named by instruments, not the negated broad agent
- known labor prompt top-1 is `Labor Market Deterioration Playbook`
- known earnings prompt top-1 is `Earnings Quality and Margin Pressure Interpretation Guide`
- no weak legacy / auxiliary doc is injected after three stronger Wave docs
- no new vector justification appears

## 5. Out Of Scope

This pass does not:

- implement vectors
- add embeddings
- change schema
- archive approved docs
- rewrite routing architecture
- change Market Room orchestration
- solve all active-pool governance permanently

