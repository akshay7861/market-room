# Dynamic Memory Phase 1 Retrospective

## 1. Goal Of Phase 1

Phase 1 was meant to solve a narrow but important problem:

- agents already had stronger specialist knowledge after Wave 1 and Wave 2
- they still did not have a durable, reusable working memory of their own current views
- the same agent could sound smart but not stateful

The goal was not to build a full memory platform. It was to add the smallest useful dynamic memory layer that:

- compounds from existing state
- works in both Ask Market and Market Room
- preserves the current knowledge-retrieval system
- is observable enough to validate cleanly

## 2. What Was Implemented

Phase 1 implemented one shared dynamic memory service and one shared prompt-time memory format.

Persisted:

- `agents.memory_summary`
  - now refreshed as a compact rolling house view
  - refreshed only when the house view changed materially
  - audited through `memory_updates`

Derived at prompt time:

- current house view
- open theses
- known strong topics
- known weak topics
- recent forecasting calibration

Scope:

- injected into Ask Market
- injected into Market Room
- logged through:
  - `[memory-refresh:{agent}]`
  - `[memory-inject:{agent}]`

What did **not** change:

- no vector work
- no schema overhaul
- no rewrite of knowledge retrieval
- no fine-tuning

## 3. What Was Proven

Phase 1 was proven at three levels.

### Prompt-level proof

Ask Market responses started explicitly using:

- existing house view
- open thesis continuity
- weak-topic caution
- recent calibration

Examples observed in validation:

- Macro reused the inflation-regime thesis instead of inventing a new macro frame
- Rates avoided a high-conviction bearish-duration stance because recent calls were mixed
- Risk/Sentiment treated Nasdaq as a weak recent topic instead of calling clean risk-on

### Persistence-level proof

`GET /api/agents` no longer returned mostly seed-style memory summaries.

It returned rolling state such as:

- `Inflation Regime reopened 85% ...`
- `Curve Shape developing 80% ...`
- `Crowding Positioning reopened 75% ...`

This is a meaningful change from static biographies.

### Log-level proof

Direct live logs were captured from a temporary local `wrangler dev` instance:

- Ask Market:
  - `[memory-inject:Rates Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration`
- Market Room:
  - multiple `[memory-inject:*]` lines
  - both refresh branches observed:
    - `updated summary because thesis state changed materially`
    - `skipped update, no material change`

That was enough to fully clear the phase.

## 4. What Improved In Ask Market

Ask Market improved the most.

Before Phase 1, Ask Market mainly had:

- static `agent.memorySummary`
- approved knowledge snippets

After Phase 1, it also had:

- current house view
- live open-thesis awareness
- topic-strength / topic-weakness cues
- recent calibration context

Observed effect:

- answers became more stateful
- agents were less likely to answer as if every question were a blank slate
- weak-topic questions started producing caution rather than generic confidence

This is probably the cleanest success of the phase.

## 5. What Improved In Market Room

Market Room improved, but less cleanly than Ask Market.

What improved:

- persisted summaries now roll after discussion runs
- some agents update while others skip, which is the intended behavior
- forum prompts now have a shared dynamic memory block instead of relying mostly on static identity + live knowledge snippets

What this changed behaviorally:

- more continuity around existing theses
- less total reset of agent point of view between runs
- better chance that the room updates an existing stance rather than creating a fresh one

What did **not** fully improve:

- Market Room is still shaped heavily by orchestration, routing, catalyst selection, and comment-assignment logic
- that means prompt-level memory influence is real, but less directly visible than in Ask Market

## 6. What Still Feels Weak

Phase 1 worked, but several weaknesses remain.

### 1. House view quality is uneven

Some summaries are useful:

- `Inflation Regime reopened 85% ...`
- `Curve Shape developing 80% ...`

Some are still noisy or oddly phrased because they inherit thesis naming and update-summary quality from the existing thesis layer.

### 2. Strong / weak topics are still instrument-heavy

The current logic mainly ranks forecast topics by instrument labels and recent outcomes.

That is useful, but it is still a rough proxy for actual topical strengths like:

- inflation decomposition
- curve interpretation
- FX funding stress
- leadership quality

### 3. Calibration is blunt

The calibration block is directionally useful, but it is still based on:

- recent resolved forecasts
- simple hit-rate / bias logic

That means:

- sparse samples can swing the tone too much
- partial outcomes dominate the record

### 4. Market Room still has more noise than Ask Market

This is not a failure of the memory layer. It is a consequence of the room being a multi-agent orchestration system with many competing controls.

But it means the clearest value of dynamic memory currently shows up in Ask Market first.

## 7. What Risks Remain

### Memory drift

If thesis titles or summaries are noisy, persisted house views can become noisy too.

### Self-reinforcement from weak signals

If forecast outcomes or training examples are mediocre, strong/weak topic labeling can become too confident.

### Prompt bloat

The 5-block format is still compact, but it adds another structured section to already-large prompts.

### Over-crediting memory for orchestration outcomes

Some observed improvements come from better consistency, but Market Room behavior is still jointly determined by:

- dynamic memory
- knowledge retrieval
- behavioral state
- coverage state
- novelty scoring
- posting decision logic

The system should not pretend the memory layer alone caused every improvement.

## 8. What Should Not Be Changed Yet

Do not change these yet:

- the approved-knowledge retrieval path
- the vector strategy
- the basic 5-block shape
- the “persist only `agents.memory_summary`” rule
- the material-change gate on refresh

Also do not add:

- autonomous summary rewriting by an LLM
- more persisted memory tables
- a larger memory taxonomy

Phase 1 succeeded partly because it stayed small.

## 9. What The Next Bottleneck Appears To Be

The next bottleneck is not vectors.

The next bottleneck is **memory quality and governance**, especially:

- better synthesis of house view from thesis state
- better normalization of strong/weak topics
- better calibration signals
- better use of thesis ownership and update discipline in Market Room

In other words:

- Phase 1 proved that dynamic memory is worth having
- the next challenge is improving the quality of the memory signals, not replacing retrieval infrastructure

## 10. Recommendation: What Should Come Next

The next step should be a narrow Dynamic Memory Phase 2, not vector work.

Recommended priorities:

1. improve house-view synthesis quality
   - cleaner thesis titles
   - cleaner thesis update summaries
   - better compression rules for `memory_summary`

2. improve topic normalization
   - move from mostly instrument labels toward topic labels where possible

3. strengthen calibration logic
   - better treatment of partial outcomes
   - sample-size guards
   - per-topic calibration where available

4. use memory to influence update-vs-new-thesis discipline more explicitly
   - especially in Market Room

If that works, then the system will have:

- stronger specialist knowledge
- real dynamic working memory
- better stateful behavior

Only after that should vector work be reconsidered.

## Top 5 Lessons

1. The repo already had enough state for dynamic memory; the missing piece was consolidation, not more data collection.
2. Ask Market was the fastest place to realize value because it had the biggest memory gap before Phase 1.
3. Persisting only one artifact was the right constraint; it kept the phase understandable and testable.
4. Direct logging mattered a lot. Without `memory-refresh` and `memory-inject`, the system would have been difficult to trust.
5. Memory quality now depends heavily on thesis quality. If the thesis layer is noisy, memory inherits that noise.

## What Still Does Not Require Vectors

These still do not require vectors:

- better house-view synthesis
- cleaner thesis titles and update summaries
- stronger weak-topic / strong-topic labeling
- better calibration logic
- more explicit reuse of open theses
- stricter update-vs-new-thesis behavior

All of those are memory-governance problems, not semantic-retrieval problems.

## Where Vectors Might Actually Help

Vectors may help later in narrower places:

- semantic matching between current thesis language and older analog cases
- retrieving the right knowledge doc when the query language is indirect rather than keyword-close
- surfacing related historical episodes that do not share obvious tokens

But none of those are the main blocker right now.

The current blocker is still: making agent memory cleaner, more durable, and more behaviorally useful from the state the system already has.
