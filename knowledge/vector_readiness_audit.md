# Vector Readiness Audit

## 1. Current Retrieval Strengths

The current retrieval stack is stronger than a typical keyword baseline.

### Storage and gating

- only approved docs are eligible
- retrieval is hard-filtered by agent
- uploaded markdown is normalized before storage:
  - YAML stripped
  - real title extracted
  - summary generated from topics
  - `## Coverage`
  - `## Triggers`
  - `## Use When`
  - `## Instruments`

### Ranking

`knowledgeSnippetService.ts` is not pure filename matching. It uses:

- title
- summary
- best excerpt
- metadata index extracted from the structured sections above
- category bonus:
  - `event_playbooks` = `+2`
  - `frameworks` = `+1.5`
  - `foundations` = `+1`

Metadata matches score higher than incidental text matches:

- content hit = `2`
- metadata hit = `3`

### Prompt injection

The system is operationally real, not theoretical:

- Ask Market calls `findRelevantKnowledgeSnippets()` and injects top docs into the prompt
- Market Room does the same for posts and comments
- logs show:
  - pool size
  - matched count
  - per-doc scores
  - injected titles
  - excerpt preview

### Validation evidence

Across Wave 1 and Wave 2 validations, most targeted prompts worked well:

- intended docs usually ranked first or near-first
- outputs showed mechanism logic traceable to uploaded docs
- there is no evidence that the local retrieval path is fundamentally broken

## 2. Current Retrieval Failure Modes

Current failures fall into four different buckets.

### A. Routing failure

This is still real and still upstream of retrieval.

Ask Market routing is still heuristic keyword matching with optional LLM routing. If the prompt is phrased too broadly or with the wrong sector cues, the correct agent never gets a chance to retrieve its docs.

### B. Ranking failure

The scorer sometimes retrieves the wrong *kind* of doc first even when the correct doc exists in the pool.

This is happening because:

- broad keyword overlap can outweigh actual intent
- duplicate starter-pack docs clutter the top ranks
- category bonus and token overlap can elevate the wrong family of documents

### C. Knowledge gap / pool hygiene problem

Some agents still have too many overlapping starter-pack variants and processed memory files in the approved pool.

This wastes prompt budget and creates noisy competition for the real Wave docs.

### D. Semantic similarity gap

There are some places where semantic retrieval would probably help, but the observed evidence so far says this is not the dominant failure mode yet.

In the probes run during this audit, indirect phrasing often still retrieved the intended doc correctly.

## 3. Concrete Miss Examples

## Example 1 — Routing failure, not vector failure

From Wave 2 Batch 2 validation:

- the first FX prompt for `Central-Bank Divergence Playbook` was misrouted to `macro-agent`
- reason: the prompt overemphasized `Fed` / `ECB` macro wording
- after rewriting the prompt with stronger FX-specific terms, routing was correct and retrieval passed

Diagnosis:

- this is not a retrieval miss
- vectors would not fix this
- better routing would

## Example 2 — Wrong doc ranked first inside FX

Observed directly in live logs on `2026-04-10` during a Market Room run:

Query context:

`NFP +178k Sustains Fed’s Hawkish Grip, Keeps Long-End Yields Supported`

Top FX retrieval ranks:

1. `Dollar Funding Stress and Intervention Playbook` — `357.0`
2. `Central-Bank Divergence Playbook` — `282.0`
3. `Carry and Rate Differential Framework` — `274.5`

Why this matters:

- this query is primarily payroll / Fed / policy language
- the most natural FX documents should be divergence or carry
- funding-stress ranking first is a real ranking miss or at least a ranking distortion

Diagnosis:

- this is a ranking problem inside the existing pool
- vectors might help only if the semantic signal better distinguishes funding-stress language from ordinary policy divergence
- but pool clutter and broad overlap are likely still larger causes

## Example 3 — Duplicate macro starter packs crowd the prompt

Observed directly in live logs:

For one Macro query, the top retrieved set included multiple near-duplicate documents:

- `Macro historical starter pack — durable foundations for regime comparison`
- the same title or near-identical title appeared multiple times
- all were injected into the same prompt

Why this matters:

- this is not a semantic miss
- this is approved-pool clutter
- it consumes top-8 prompt slots that could go to more differentiated docs

Diagnosis:

- vectors do not solve duplicated or redundant documents
- dedupe / curation / ranking hygiene does

## Example 4 — FX indirect wording did not fail

Probe run in this audit:

Prompt:

`For the FX agent: is this an offshore dollar squeeze with emergency liquidity stress, or just another policy-divergence move? Basis is blowing out and spot is starting to gap.`

Observed ranks:

1. `Dollar Funding Stress and Intervention Playbook` — `106.0`
2. `Carry and Rate Differential Framework` — `80.5`
3. `Central-Bank Divergence Playbook` — `80.0`

Diagnosis:

- this is an indirect phrase (`offshore dollar squeeze`, `basis is blowing out`) rather than a literal metadata copy
- the right doc still ranked first
- this is evidence against an immediate “we need vectors now” conclusion

## Example 5 — Rates indirect wording did not fail

Probe run in this audit:

Prompt:

`For the Rates agent: this looks like a bond-vigilante selloff driven by Treasury supply indigestion and duration fatigue, not a clean inflation-expectations story. Should you treat this as term-premium steepening or a different regime?`

Observed ranks:

1. `Term Premium and Breakeven Interpretation Guide` — `111.5`
2. `Fed Repricing Playbook` — `103.0`
3. `Rates: Public Report Starter Pack — event playbook memory` — `81.0`
4. `Yield Curve Mechanics and Interpretation` — `79.0`

Diagnosis:

- the intended doc still ranked first under indirect wording
- however, `Fed Repricing Playbook` was still too high for a term-premium / supply / duration-fatigue query
- that suggests ranking contamination more than fundamental semantic failure

## Example 6 — Excerpt selection is often low-quality even when ranking is correct

Observed in live logs:

- `Dollar Funding Stress and Intervention Playbook` surfaced an excerpt beginning with a source bullet:
  - `NY Fed — Central Bank Liquidity Swap Operations...`
- `Risk-On / Risk-Off Transmission Guide` surfaced a table row
- several other docs surfaced metadata-like or table fragments rather than the cleanest reasoning paragraph

Diagnosis:

- this is an excerpt-selection problem
- vectors do not solve poor excerpt extraction by themselves

## 4. What Vectors Would Solve

Vectors would help in narrower cases:

### 1. Lexically indirect but semantically related queries

Examples:

- `duration fatigue` vs `term premium expansion`
- `bond vigilante` vs `Treasury supply premium`
- `offshore dollar squeeze` vs `cross-currency basis widening`

### 2. Historical analog retrieval

Vectors would likely help more for analog and episode retrieval than for the current Wave docs, especially when the same mechanism is described with different wording.

### 3. Better ranking among multiple similar docs

If the pool remains moderately cluttered after cleanup, vector similarity can help separate:

- funding-stress language
- policy-divergence language
- carry language

when they all share generic FX tokens like `dollar`, `yield`, `Fed`, `basis`, `carry`

## 5. What Vectors Would Not Solve

Vectors would not solve:

### 1. Wrong-agent routing

If the prompt goes to Macro instead of FX, vector retrieval inside FX never runs.

### 2. Duplicate approved docs

Embedding five overlapping starter-pack variants does not improve retrieval quality.

### 3. Bad excerpt selection

If the system still picks a source bullet or a table row as the snippet, embeddings do not fix that unless chunking and excerpt logic are redesigned too.

### 4. Weak or noisy metadata governance

If titles, categories, and document variants are messy, vectors can make ranking more opaque without fixing the underlying pool quality.

### 5. Missing content

If a concept is not documented, vectors cannot retrieve it.

## 6. Recommended Vector Architecture If Go

This should only happen after the no-go blockers below are addressed.

### What to embed

Embed only:

- approved long-term knowledge docs
- chunked into semantically coherent sections, not full-file blobs
- ideally chunked by headings / subheadings, not fixed token windows

Preferred chunk candidates:

- `## Core mechanism`
- `## What to watch`
- `## False positives / traps`
- `## Cross-asset implications`
- `## How this should affect agent behavior`
- tightly bounded historical episode chunks

### What metadata must remain hard filters

Keep these hard filters even with vectors:

- `agent_id`
- `review_status = approved`
- category
- source filename / title

Potential soft filters:

- prefer `event_playbooks` for catalyst-heavy query shapes
- prefer `frameworks` for regime / mechanism questions
- prefer `foundations` when no better match exists

### Query path if go

Recommended path:

1. route to agent first
2. apply hard filters on that agent’s approved pool
3. run hybrid retrieval:
   - lexical score
   - vector score
4. rerank
5. pass a smaller, cleaner top set into excerpt selection

Do **not** replace lexical matching entirely.

### What not to embed

Do not embed:

- `agents.memory_summary`
- dynamic memory blocks
- raw user prompts
- raw messages
- duplicate starter-pack variants before cleanup
- unreviewed or pending knowledge docs

## 7. Metadata Filters To Preserve

These should survive any vector implementation:

1. agent-level hard filter
2. approved-only hard filter
3. category awareness
4. structured fields from the current upload pipeline:
   - `Coverage`
   - `Triggers`
   - `Use When`
   - `Instruments`

Those fields still matter even in a vector world because they are:

- interpretable
- auditable
- useful for fallback ranking

## 8. Go / No-Go Recommendation

### Recommendation: No-Go for immediate vector implementation

Vectors are **not yet** the clearest next step.

Why:

1. most validated targeted prompts already retrieve the right doc
2. the strongest observed miss was a routing miss, not a semantic-retrieval miss
3. the second strongest issue is pool clutter and duplicate starter-pack competition
4. excerpt quality is still weak in places
5. indirect-wording probes in this audit still retrieved the intended docs correctly

The current biggest bottlenecks are:

- routing quality
- ranking hygiene
- approved-pool cleanup / dedupe
- better excerpt selection

Vectors may become justified later, but the current evidence does not show that they are the highest-leverage fix right now.

## 9. Exact Criteria That Must Be Met Before Implementation

Only proceed to vector implementation if all of the following are true:

### A. Pool hygiene criteria

- duplicate starter-pack variants are pruned or downranked
- each agent’s approved pool is intentionally curated
- prompt slots are not being wasted by near-duplicate docs

### B. Routing criteria

- repeated wrong-agent routing cases are reduced
- remaining misses are clearly *within-agent* retrieval misses, not routing mistakes

### C. Retrieval evidence criteria

Collect at least 10 concrete within-agent misses where:

- the correct doc existed in the approved pool
- the prompt was routed to the correct agent
- lexical / metadata retrieval ranked the wrong doc first or missed the right doc entirely
- manual review says the failure was semantic rather than simply bad metadata or duplicate clutter

### D. Measurement criteria

Before implementation, define success as:

- top-1 retrieval accuracy on a held-out retrieval set
- top-3 retrieval accuracy
- reduction in wrong-doc-first cases
- improved prompt evidence quality, not just higher similarity scores

### E. Non-go criteria

Do **not** implement vectors if:

- routing is still the main miss source
- the approved pools are still cluttered
- excerpt quality remains poor
- the evidence for semantic misses is anecdotal rather than repeated

## Bottom Line

The current retrieval system is good enough that vectors cannot yet be justified as the obvious next move.

The evidence says:

- real strengths: structured metadata + approval gating + shared logs
- real weaknesses: routing misses, duplicate doc clutter, ranking contamination, weak excerpting
- real semantic gap: present, but not yet dominant

So the correct call today is:

- **No-Go on vectors now**
- clean the pool
- tighten ranking / excerpting / routing
- then reassess with a real miss set
