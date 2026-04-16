# Retrieval Precision Phase 2 Plan

**Date:** 2026-04-10  
**Scope:** Final small non-vector precision pass focused on top-1 ranking, excerpt quality, and weak fallback contamination

## 1. Remaining Failure Modes

The refreshed post-cleanup audit narrowed the remaining problems to three practical issues.

### A. Top-1 ranking misses inside the correct agent

The main example was FX:

- broad payroll / Fed / dollar wording still let `Dollar Funding Stress and Intervention Playbook` outrank carry or divergence more often than it should
- the right docs were still in top-3, but top-1 was unnecessarily off

The secondary example was Equities:

- regime-heavy prompts could tie between:
  - `Equity Regime Framework: Rates, Growth, Liquidity, Earnings`
  - `Sector Rotation and Market Leadership Playbook`

This is not a content gap. It is a ranking-precision problem.

### B. Excerpt selection still favored operational or low-signal blocks

Even after the earlier cleanup, some docs still surfaced:

- source-heavy bullets
- checklist blocks
- trigger tables

instead of the cleanest mechanism paragraph.

### C. Weak fallback contamination still occupied the last injected slot

Even when the top three docs were already strong and differentiated, broad legacy or auxiliary docs could still enter the prompt as the 4th snippet.

That is prompt-budget waste.

## 2. Exact Proposed Fixes

### A. Add lightweight intent nudges for ambiguous doc families

Use narrow query-vs-doc pattern boosts for:

- FX carry
- FX divergence
- FX funding stress
- Equities regime
- Equities leadership

Purpose:

- fix cases where the correct doc already ranks top-3 but loses top-1 due to broad overlap

### B. Add narrow off-topic penalty for FX funding-stress docs

If the query signals carry / dollar-strength / rate-differential framing but does **not** signal basis / funding / intervention stress, lightly penalize the funding-stress playbook.

Purpose:

- stop funding-stress from winning broad payroll/Fed dollar queries by default

### C. Tighten excerpt scoring further

Adjust excerpt selection to:

- boost `Core mechanism` more strongly
- penalize `Checklist`
- penalize bullet-heavy blocks
- penalize source- or operations-style bullet blocks
- better detect headings stored inline with body text

Purpose:

- move more excerpts toward clean mechanism prose instead of operational lists

### D. Add a 4th-slot fallback gate

If:

- the first three selected docs are already strong
- the next candidate is broad legacy / auxiliary fallback
- the score gap is large enough

then skip the 4th slot and log why.

Purpose:

- reduce weak prompt contamination without deleting any approved docs

## 3. Expected Gains

Expected improvements from this phase:

- FX broad macro-policy prompts should rank divergence/carry ahead of funding-stress more often
- Equities regime prompts should favor the regime framework when the wording is explicitly regime-oriented
- prompts with three strong docs should inject three, not automatically force a weak 4th fallback
- logs should make it easier to see:
  - why the winner beat the runner-up
  - why a fallback was skipped
  - what excerpt score and label were used

## 4. How To Validate

Primary regression prompts:

1. FX prior-fragile payroll / Fed / dollar query
2. FX funding-stress query with basis and swap-line language
3. Equities regime query mixing real yields + breadth + leadership
4. Macro inflation query with three already-strong top docs

Success signs:

- FX prior-fragile query:
  - `Central-Bank Divergence Playbook` or `Carry and Rate Differential Framework` wins top-1
- FX funding-stress query:
  - funding-stress doc remains top-1
  - fallback 4th slot is skipped if first three docs are already strong
- Equities regime query:
  - `Equity Regime Framework` wins top-1 over leadership playbook
- Macro inflation query:
  - only the three sharp docs are injected
  - generic historical 4th-slot fallback is skipped

## 5. What Still Will Not Be Solved After This Pass

This phase will **not** solve:

- true semantic misses if they later become dominant
- manual active-pool governance
- all excerpt imperfections
- all ambiguity between two genuinely relevant docs

It is a precision pass, not a redesign.
