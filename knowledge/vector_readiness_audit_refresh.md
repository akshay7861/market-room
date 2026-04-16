# Vector Readiness Audit Refresh

**Date:** 2026-04-10  
**Scope:** Refresh the earlier vector no-go decision after Routing Phase 1 and retrieval cleanup/ranking cleanup

## 1. What Changed Since The Earlier No-Go Audit

Three meaningful improvements landed after the earlier audit:

### A. Ask Market routing improved

Changes:

- weighted specialist routing terms
- lead-sentence weighting
- knowledge-aware routing boost
- better heuristic-vs-LLM tie-breaking
- explicit `[routing]` logs

Observed result:

- the prior FX-vs-Macro failure mode did not recur in the cleaned evaluation set
- routing accuracy in the 12-prompt post-cleanup set was `12 / 12`

### B. Retrieval ranking improved

Changes:

- query-shape-aware ranking
- generic legacy penalties
- broad auxiliary penalties
- selected-snippet dedupe by source filename family

Observed result:

- same-family duplicate injection rate fell to `0 / 12`
- intended docs ranked top-3 in `12 / 12` prompts

### C. Excerpt selection improved somewhat

Changes:

- section-aware passage construction
- section preferences for mechanism-rich blocks
- penalties for metadata/source-heavy passages
- better `[knowledge:*]` logs

Observed result:

- excerpt quality is better than before
- but still inconsistent in a few cases

## 2. What Non-Vector Cleanup Solved

Solved or materially improved:

- wrong-agent routing on specialist prompts
- duplicate starter-pack family flooding inside a single prompt
- top-slot contamination from generic docs in many queries
- observability of why a doc ranked
- observability of which passage was injected

The cleaned system now behaves like a sharper keyword/metadata retrieval system, not a noisy prototype.

## 3. What Still Remains Unsolved

## A. Residual ranking distortion

The clearest remaining example is still inside FX:

- broad payroll/Fed/dollar queries can over-reward the funding-stress playbook
- carry/divergence remain in top-3, but not always top-1

## B. Overlap among sharp docs

Some queries genuinely hit two good docs at once.

Example:

- Equities regime prompt produced a tie between:
  - `Sector Rotation and Market Leadership Playbook`
  - `Equity Regime Framework`

That is not a semantic miss. It is a ranking-governance problem.

## C. Pool clutter remains

Even after cleanup, broad docs still often occupy the last injected slot.

That is a curation and active-pool-governance issue.

## D. Excerpt quality is still uneven

The worst remaining excerpt issue is source-bullet or checklist-heavy passage selection when a tighter mechanism paragraph exists.

## 4. Whether Vectors Are Now Justified

**Not yet.**

The post-cleanup evidence does not show that true semantic misses are the main bottleneck.

Why this is still a no-go:

- intended doc top-3 rate is already `100%` on the mixed live set
- the system is usually finding the right neighborhood of documents
- the main misses are ranking order, excerpt choice, and leftover fallback clutter

That is not the right failure profile for immediate vector work.

## 5. What Vectors Would Solve If Added Today

Vectors would most likely help in a narrower subset of cases:

- lexically indirect but semantically related phrases
  - `duration fatigue`
  - `bond vigilante`
  - `offshore dollar squeeze`
  - `optical beat`
- ranking among multiple semantically close docs when token overlap is low

But that is not the bulk of the observed current error budget.

## 6. What Vectors Would Not Solve

Vectors would **not** directly solve:

- wrong-agent routing
- source-family duplication
- broad legacy docs occupying fallback prompt slots
- poor excerpt extraction from an already-correct document
- overlapping doc governance problems

Those remain non-vector problems.

## 7. If Still No-Go, Exactly What Needs To Happen First

Before any vector implementation, all of the following should happen:

1. **active-pool cleanup**
   - manually demote or archive redundant starter-pack and auxiliary docs
2. **excerpt cleanup round**
   - fix the remaining source-bullet / checklist-first failures
3. **larger held-out evaluation**
   - run at least `40-60` prompts across all 6 agents
4. **semantic-miss evidence**
   - collect repeated cases where:
     - routing is correct
     - the right doc exists
     - the intended doc falls outside top-3
     - the miss is not explained by clutter or excerpt issues

Without that evidence, vector work is still premature.

## 8. If The Decision Ever Flips To Go, The Narrow Scope Should Be

Not for implementation now, but the narrowest acceptable Phase 1 vector scope would be:

- embed only approved Wave docs and a curated subset of unique legacy docs
- preserve hard filters by:
  - agent
  - approval status
  - category
- keep current metadata and logs
- use vectors only as a reranker or supplementary candidate generator, not as a full replacement

But the current audit does not justify doing that yet.

## 9. Explicit Go / No-Go Decision

**Decision: NO-GO**

Reason:

- the cleaned system still has ranking, excerpt, and pool-governance issues
- true semantic retrieval misses are still secondary
- current evidence does not justify the operational complexity of vectors yet

## 10. Criteria That Must Be Met Before Implementation

Vectors should not be implemented until all of the following are true:

1. routing remains stable on a larger held-out set
2. same-family duplication remains near zero
3. active-pool clutter has been materially reduced by governance, not just scoring penalties
4. excerpt quality is acceptable on most prompts
5. there is a documented set of repeated, within-agent, top-3 semantic misses that non-vector cleanup cannot explain

Until then, the better move is to keep improving the cleaned non-vector path.
