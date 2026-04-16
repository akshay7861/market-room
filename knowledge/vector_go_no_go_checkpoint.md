# Vector Go / No-Go Checkpoint

**Date:** 2026-04-11  
**Basis:** held-out retrieval evaluation V1 on the cleaned non-vector system.

## 1. Current System State

The current retrieval system is still fully non-vector:

- `vector_store_id` remains unused.
- Approved knowledge docs are retrieved through local D1 storage.
- Ranking uses metadata-aware keyword scoring plus query-shape adjustments.
- Routing Phase 1 is active for Ask Market.
- Dynamic Memory Phase 1 is active, but is not part of vector retrieval.
- Retrieval cleanup and Retrieval Precision Phase 2 are implemented.

Current retrieval behavior:

- routed specialist agent first
- fetch approved docs for that agent
- score documents using title, summary, excerpt, and injected metadata sections
- dedupe source families
- choose section-aware excerpts
- inject selected snippets into Market Room / Ask Market prompts
- log `[routing]`, `[knowledge:*]`, and `[memory-inject:*]`

## 2. What Non-Vector Work Has Already Solved

### Routing is much better

Held-out result:

- routing accuracy: `41 / 42` = `97.6%`

This is a major improvement from the earlier failure pattern where FX and Equities prompts were frequently swallowed by Macro or Rates.

### Top-3 retrieval is strong

Held-out result:

- strict primary top-3: `41 / 42` = `97.6%`
- acceptable top-3: `41 / 42` = `97.6%`

The right document is almost always present once the route is correct.

### Top-1 retrieval is now good

Held-out result:

- strict primary top-1: `39 / 42` = `92.9%`
- acceptable top-1: `40 / 42` = `95.2%`

The system is no longer merely finding the right neighborhood; it usually selects the right top document.

### Excerpt selection is no longer a major blocker

Held-out result:

- useful or adequate excerpt: `42 / 42`
- poor excerpt: `0 / 42`

There is still room to improve adequate excerpts, but this is no longer a vector-justifying failure class.

### FX retrieval is materially fixed

In the held-out set:

- FX routing: `7 / 7`
- FX strict primary top-1: `7 / 7`
- no recurrence of the earlier funding-stress-overranking failure

That matters because FX was one of the strongest prior arguments for vector reconsideration. It is no longer showing that pattern.

## 3. What Still Remains Unsolved

### A. One routing miss

The remaining clear route failure:

- commodity inventory prompt with explicit `Do not answer as Macro inflation`
- routed to `Macro`
- should route to `Commodities`

This is not vector territory. Vectors do not decide which agent's pool is searched.

Likely fix:

- route negation handling
- stronger commodity inventory instrument priority:
  - crude
  - gasoline stocks
  - distillates
  - refinery runs
  - utilization
  - Cushing

### B. Two strict ranking misses

The two ranking misses:

1. `Labor Market Deterioration Playbook` lost top-1 to `Inflation Transmission Mechanisms`, despite being top-2.
2. `Earnings Quality and Margin Pressure Interpretation Guide` lost top-1 to `Equity Regime Framework`, despite being top-2.

Both are near-misses, not retrieval failures.

Likely fix:

- narrow labor deterioration boost when openings + quits + claims + temp help appear together
- narrow earnings-quality boost when margins + guidance + organic revenue / free cash flow appear together

### C. Active-pool fallback contamination remains high

Held-out result:

- legacy / auxiliary doc in top-3: `13 / 42` = `31.0%`
- legacy / auxiliary doc in top-4: `41 / 42` = `97.6%`

This is the biggest remaining retrieval hygiene problem.

It matters because:

- Ask Market injects four snippets.
- If slot 4 is usually a broad legacy doc, prompt budget is still being spent on context that is less sharp than the Wave 1 / Wave 2 docs.

This is a pool-governance and fallback-suppression problem, not a semantic retrieval problem.

### D. Adequate excerpts still exist

Held-out result:

- adequate but not ideal: `8 / 42`

The selected passages were not wrong, but some were historical-episode or generic-block excerpts rather than the cleanest trigger-specific mechanism paragraph.

This is section and passage scoring, not vectors.

## 4. Should Vectors Now Be Reconsidered?

Not yet.

The current evidence does not show that semantic similarity is the dominant remaining bottleneck.

Vectors are usually justified when:

- route is correct
- the right doc exists
- the query is semantically close but lexically different
- keyword / metadata ranking fails to place the right doc in top-3 repeatedly

That is not the observed failure profile.

In this held-out set:

- true semantic misses: `0`
- intended doc top-3: `41 / 42`
- the one top-3 miss came from routing to the wrong agent
- ranking misses were top-2 near-misses
- fallback contamination is still caused by active-pool clutter

## 5. Exact Go / No-Go Decision

**Decision: NO-GO on vectors.**

Reason:

The cleaned non-vector system is now performing well enough that vectors would add complexity before the observed error budget demands them.

The next retrieval bottleneck is not candidate discovery. It is:

- one route-negation / specialist-instrument miss
- narrow top-1 ranking specificity
- fallback slot contamination from legacy docs
- active-pool governance

## 6. If Still No-Go, What Must Happen Before Vectors

Vectors should not be implemented until the following are true:

1. **Routing is stable on another held-out set**
   - target: `>= 98%` routing accuracy
   - especially commodity inventory prompts with macro / inflation negation

2. **Fallback contamination is materially lower**
   - target: legacy / auxiliary docs in Ask Market top-4 below `25%`
   - current: `97.6%`

3. **Strict primary top-1 remains high after fallback cleanup**
   - target: `>= 90%`
   - current: `92.9%`

4. **Repeated true semantic misses appear**
   - route correct
   - right doc exists
   - right doc outside top-3
   - miss cannot be explained by routing, ranking weights, active-pool clutter, or content gaps

5. **There is a curated active embedding pool**
   - Wave 1 / Wave 2 docs first
   - no duplicate starter packs
   - no broad legacy packs unless explicitly curated

## 7. If Go Later, Narrowest Phase 1 Vector Scope

If a future audit flips to `GO`, the narrowest acceptable vector phase should be:

- embed only approved Wave 1 / Wave 2 docs plus explicitly curated unique legacy docs
- chunk by semantic section, not whole file
- keep hard filters:
  - agent
  - approval status
  - category
  - source family
  - doc type
- use vectors as a candidate generator or reranker, not a replacement for existing metadata scoring
- keep current `[knowledge:*]` scoring logs and add vector candidate logs beside them
- measure against the same held-out set before enabling in live prompts

Do not embed:

- duplicate processed starter-pack variants
- raw source reports
- low-value public-report packs
- upload runbooks
- validation runbooks
- internal operational docs

## 8. Recommendation

Stay non-vector for now.

Next best step:

1. fix the commodity inventory route-negation miss
2. add narrow labor and earnings specificity boosts
3. enforce stricter fallback suppression or active-pool demotion for legacy docs
4. rerun the 42-prompt held-out set plus 10 new adversarial prompts

Only reconsider vectors if the next eval shows repeated correct-agent, right-doc-exists, outside-top-3 semantic misses.

