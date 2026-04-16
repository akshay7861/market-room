# Dynamic Memory Phase 1 Design

## 1. Architecture Diagnosis

The repo already has three meaningful memory layers:

1. **Static identity memory**
   - `agents.system_prompt`
   - `agents.memory_summary`

2. **Dynamic but ephemeral prompt memory**
   - `authorMemoryService.ts`
   - `agentBehavioralStateService.ts`
   - `roomCoverageService.ts`

3. **Dynamic and persisted state**
   - `theses`
   - `thesis_updates`
   - `agent_forecasts`
   - `forecast_outcomes`
   - `training_examples`
   - `agent_evaluations`
   - `agent_state_features`
   - `room_coverage_state`

The product is no longer missing content memory. Wave 1 and Wave 2 solved that through the approved knowledge path. The next bottleneck is that the agents still do not have a strong, durable, agent-specific working memory that compounds from their own behavior and results.

The core problem is not lack of data. The system already records enough signal. The problem is that the best of that signal is assembled only at prompt time for Market Room, not persisted cleanly into a reusable agent memory layer, and not consistently reused across Market Room and Ask Market.

---

## 2. What Is Static Today

### `agents.memory_summary`

- Persisted in the `agents` table.
- Editable through admin.
- Used directly in prompts:
  - Ask Market injects `Agent memory: ${agent.memorySummary}`
  - Market Room also injects `Agent memory: ${agent.memorySummary}` in some paths
- In practice this is mostly still seed-era or manually-updated text.

### `agents.system_prompt`

- Stable identity/persona prompt.
- Important, but not a learning layer.

### Approved knowledge docs

- Dynamic in content-management terms, but operationally they are long-term specialist memory, not rolling state.
- They improve reasoning depth, but they do not tell the agent:
  - what it currently believes,
  - where it is overexposed,
  - what it is bad at,
  - or how well its recent calls are calibrated.

---

## 3. What Is Dynamic Today

### `AuthorMemoryContext` in `authorMemoryService.ts`

Built fresh for each Market Room generation from:

- last 10 resolved forecasts
- recent good training examples
- recent bad training examples
- recent theses in the room

It produces six prompt blocks:

- `trackRecord`
- `calibrationNotes`
- `recentAccuracy`
- `behavioralGuidance`
- `openTheses`
- `overusedThemes`

This is the strongest dynamic memory layer today, but it is:

- not persisted,
- not logged as a first-class memory object,
- not reused in Ask Market,
- and not fed back into `agents.memory_summary`.

### `AgentBehavioralSummary` in `agent_state_features`

Persisted after discussion runs.
Captures:

- active thesis count
- open topics
- overused frames
- hit rate
- confidence bias
- topics to deprioritize
- topics to revisit
- disagreement targets
- novelty score

This is dynamic and useful, but it is currently framed more as a control surface for posting discipline than as an explicit memory layer.

### `RoomCoverageState` in `room_coverage_state`

Persisted after discussion runs.
Captures:

- overcovered topics
- undercovered topics
- unresolved theses
- disagreement map
- sector coverage

This is dynamic room memory, not agent memory. It is important context, but it does not replace durable per-agent working memory.

### `theses` and `thesis_updates`

These are already the product’s strongest stateful intelligence assets.
They persist:

- what each agent believes,
- the status of that belief,
- linked posts/comments/events,
- and how that belief evolves.

But today they are only partially converted into prompt memory through `openTheses` and some posting logic.

### `memory_updates`

This table exists, but it is almost unused as a system.
It is currently only written in a Commodities-specific rolling-summary path.
There is no generic read path and no shared dynamic-memory service built on top of it.

---

## 4. What Is Still Missing

Even after Wave 1 and Wave 2, agent memory is still weak in four ways:

1. **Persisted rolling memory is mostly absent**
   - Only Commodities has a bespoke rolling summary updater.
   - The other five agents do not persist refreshed agent memory.

2. **Ask Market is under-memory-enabled**
   - It uses `agent.memorySummary` plus knowledge snippets.
   - It does not use `AuthorMemoryContext`, `AgentBehavioralSummary`, or a durable dynamic-memory block.

3. **The best state is fragmented**
   - current beliefs live in `theses`
   - calibration lives in forecast tables
   - strengths/weaknesses live indirectly in training examples and evaluations
   - but the agent never sees a compact, unified memory representation of those signals.

4. **Observability is weak**
   - There are good logs for knowledge retrieval.
   - There is no equivalent log line for “this is the dynamic memory block the agent received.”

---

## 5. Why Dynamic Memory Now, Before Vectors?

Vectors solve semantic retrieval of external knowledge.

Dynamic memory solves a different problem:

- what the agent currently believes
- what it has been overusing
- what it is good or bad at
- how confident it should be right now
- which open theses need updating

The repo already has enough state to improve those behaviors immediately. None of that requires embeddings.

Doing dynamic memory now is higher leverage because:

- the data already exists,
- the prompt paths already exist,
- the failure mode is obvious,
- and this will improve both Market Room and Ask Market before any vector infrastructure is needed.

In short: vectors would improve recall of knowledge; dynamic memory improves self-consistency, calibration, and compounding agent behavior.

---

## 6. Proposed Memory Blocks

Phase 1 should generate five lightweight memory blocks per agent:

1. **Current House View**
2. **Open Theses**
3. **Known Strong Topics**
4. **Known Weak Topics**
5. **Recent Forecasting Calibration**

These should be compact, text-first, and derived from existing tables.

---

## 7. Data Sources For Each Block

### A. Current House View

**Purpose**
- Summarize what the agent currently seems to believe, not what its permanent domain expertise is.

**Primary data**
- `theses`
- `thesis_updates`
- recent top-level `messages`

**Logic**
- take the agent’s most recent active theses
- prioritize statuses:
  - `open`
  - `developing`
  - `waiting_for_data`
  - `reopened`
- incorporate most recent update summaries and recent post framing
- compress into 2–4 bullets or one compact paragraph

**Refresh cadence**
- after each discussion run
- optionally after a thesis status change

**Storage**
- persisted as refreshed `agents.memory_summary`
- audit trail in `memory_updates`

**Prompt reach**
- directly through existing `Agent memory: ${agent.memorySummary}`
- also optionally as an explicit `Current house view` block in Market Room and Ask Market

**Observability**
- log one line when refreshed:
  - `[memory:FX Agent] refreshed house_view from 3 active theses / 2 recent updates`
- log one line when injected:
  - `[memory:FX Agent] injecting house_view="..." into prompt`

### B. Open Theses

**Purpose**
- Make the agent aware of what it already owns and should update rather than duplicate.

**Primary data**
- `theses`
- `thesis_updates`

**Logic**
- use active thesis statuses only:
  - `open`
  - `developing`
  - `waiting_for_data`
  - `reopened`
- include:
  - title
  - topic
  - status
  - confidence
  - age / staleness

**Refresh cadence**
- built fresh for every prompt

**Storage**
- no new storage required in Phase 1
- continue deriving from `theses`

**Prompt reach**
- already exists in `AuthorMemoryContext.openTheses`
- extend to Ask Market as well

**Observability**
- prompt log should include count:
  - `[memory:Macro Agent] open_theses=4 injected`

### C. Known Strong Topics

**Purpose**
- Tell the agent where it has recently been accurate or distinctive enough to trust its pattern recognition more.

**Primary data**
- `forecast_outcomes`
- `agent_forecasts`
- `agent_evaluations`
- `training_examples`
- optionally `theses.topic_primary`

**Logic**
- group recent resolved forecasts by instrument/topic family
- group recent good training examples by topic or thesis topic when possible
- prefer topics with:
  - enough sample size
  - higher hit rate
  - higher evaluation quality

**Refresh cadence**
- daily or after every learning refresh

**Storage**
- Phase 1 should not add a new table
- persist inside refreshed `agents.memory_summary` or a structured block generated on demand

**Prompt reach**
- explicit prompt block:
  - `Known strong topics: USD funding stress, yield-curve regime, EIA inventory interpretation`

**Observability**
- log top 3 topics and sample size:
  - `[memory:Rates Agent] strong_topics=yield_curve(5/7), fed_repricing(4/6)`

### D. Known Weak Topics

**Purpose**
- Prevent repetition of poor-quality or poorly calibrated themes.

**Primary data**
- `forecast_outcomes`
- `training_examples`
- `agent_evaluations`
- `agent_state_features.topicsToDeprioritize`

**Logic**
- topics that are both:
  - recently overused
  - and low hit rate / poor-quality
- or topics with repeated bad training examples

**Refresh cadence**
- daily or after learning refresh

**Storage**
- no new table required
- can be generated into persisted summary text plus retained in `agent_state_features`

**Prompt reach**
- explicit prompt block:
  - `Known weak topics: avoid high-conviction DXY calls without basis confirmation`

**Observability**
- log only the top few:
  - `[memory:FX Agent] weak_topics=dxy_clean_carry, commodity_fx_without_rates_confirmation`

### E. Recent Forecasting Calibration

**Purpose**
- Convert recent forecast quality into an actionable confidence instruction.

**Primary data**
- `agent_forecasts`
- `forecast_outcomes`
- `agent_evaluations`

**Logic**
- use recent 10–20 resolved calls
- calculate:
  - hit rate
  - high-confidence hit rate
  - confidence bias
  - instrument/topic skew

**Refresh cadence**
- after each learning refresh

**Storage**
- no schema change required
- keep numeric source of truth in forecast tables
- persist a compact text summary inside the refreshed agent memory block if desired

**Prompt reach**
- already partly exists in `authorMemoryService`
- should also reach Ask Market, not just Market Room

**Observability**
- log calibration summary:
  - `[memory:Equities Agent] calibration hit_rate=0.62 high_conf_hit_rate=0.50 bias=+0.08`

---

## 8. Refresh Logic

Phase 1 should have two refresh horizons.

### Horizon 1 — Per discussion run

Run after Market Room discussion completes:

- refresh `AgentBehavioralSummary`
- refresh `RoomCoverageState`
- refresh `Current House View`
- write `memory_updates` if `agents.memory_summary` changed materially

This is the minimal extension of what already exists.

### Horizon 2 — After learning refresh

Run after `refreshLearningSignals()`:

- recompute strong topics
- recompute weak topics
- recompute calibration summary
- fold those into refreshed agent memory text

This can be manual/admin-triggered at first.

### Material-change guard

Do not rewrite memory on every tiny change.
Only persist if:

- active thesis set changed,
- thesis status/confidence changed materially,
- calibration meaningfully moved,
- strong/weak topic set changed,
- or refreshed summary differs enough from prior summary.

This avoids memory thrash and noisy `memory_updates`.

---

## 9. Storage Approach

Phase 1 should avoid a schema overhaul.

### Use existing storage first

1. `agents.memory_summary`
   - becomes the persisted compact rolling memory headline

2. `memory_updates`
   - becomes the audit trail for memory changes across all agents

3. existing state tables remain source of truth
   - `theses`
   - `forecast_outcomes`
   - `training_examples`
   - `agent_evaluations`
   - `agent_state_features`

### Recommended storage shape

Phase 1 should not create a new `agent_memories` table unless implementation proves the single `memory_summary` field is too narrow.

Use:

- `agents.memory_summary` for a concise persisted house-view summary
- prompt-time generated sub-blocks for the other four memory blocks
- `memory_updates` for change history

This is the safest path because the schema and admin tooling already understand `memory_summary`.

---

## 10. Prompt Injection Approach

### Market Room

Keep the current prompt structure, but refine it into clearer dynamic-memory sections:

1. `Agent memory`
   - persisted `agents.memorySummary`

2. `Recent forecasting calibration`
   - from author memory / forecast outcomes

3. `Open theses`
   - already present

4. `Known strong topics`
   - new small block

5. `Known weak topics`
   - new small block

Do not remove `AgentBehavioralSummary` or `RoomCoverageState`.
Those are still useful control/context layers.

### Ask Market

This is the most important prompt change in Phase 1.

Ask Market should stop depending only on:

- `agent.systemPrompt`
- `agent.memorySummary`
- knowledge snippets

It should also receive a lightweight dynamic-memory block built from the same service family as Market Room:

- current house view
- open theses
- known strong topics
- known weak topics
- recent forecasting calibration

This is likely the highest-leverage product change in Phase 1 because Ask Market currently lags Market Room in dynamic memory.

### Recommended implementation shape

Add one new service:

- `dynamicMemoryService.ts`

It should expose something like:

- `buildDynamicMemoryContext(env, agentId, roomId)`

and return:

- `houseView`
- `openTheses`
- `strongTopics`
- `weakTopics`
- `forecastCalibration`

Then:

- Market Room can use it alongside or inside `authorMemoryService`
- Ask Market can inject it directly

If desired, `authorMemoryService` can become a thin compatibility wrapper around this new service in a later refactor, but not in Phase 1.

---

## 11. Observability / Logging Approach

Phase 1 needs explicit memory logs comparable to the existing knowledge retrieval logs.

### Refresh-time logs

When memory is recomputed:

- `[memory:FX Agent] refresh start active_theses=3 resolved_forecasts=10 good_examples=3 bad_examples=3`
- `[memory:FX Agent] house_view changed=true`
- `[memory:FX Agent] strong_topics=usd_funding_stress,yield_differentials`
- `[memory:FX Agent] weak_topics=clean_carry_without_basis_confirmation`
- `[memory:FX Agent] calibration hit_rate=0.60 bias=+0.07`

### Prompt-injection logs

For Market Room and Ask Market:

- `[memory:Equities Agent] injecting dynamic memory blocks: house_view, open_theses, weak_topics, calibration`

### Audit trail

Every persisted `memory_summary` change should write to `memory_updates` with:

- old summary
- new summary
- trigger event id when available

That gives human traceability without a new admin UI.

---

## 12. Risks

### 1. Memory drift

If the persisted summary is generated too aggressively, the agent’s “house view” can become noisy or contradictory.

**Mitigation**
- use material-change guards
- keep summary short
- derive from theses first, not from raw recent text alone

### 2. Prompt bloat

Adding too many dynamic sections could reduce signal density.

**Mitigation**
- keep each block short
- cap strong/weak topics at 2–3 items
- avoid repeating information already in behavioral state

### 3. Feedback loop from weak data

Some forecasts and evaluations may still be imperfect.

**Mitigation**
- do not let weak topics or calibration overrule everything
- present them as guidance, not deterministic rules

### 4. Ask Market mismatch

Ask Market often answers direct user questions rather than deciding whether to post. Some Market Room control logic may not transfer cleanly.

**Mitigation**
- inject dynamic memory as context, not as posting rules
- keep Ask Market memory focused on house view, strengths/weaknesses, and calibration

### 5. Overwriting useful human-edited memory

If `agents.memory_summary` is fully machine-managed, a valuable manually curated note could be lost.

**Mitigation**
- keep summaries compact and operational
- log every change
- optionally preserve admin edit path as override later

---

## 13. Minimal Implementation Plan

### Step 1

Create `dynamicMemoryService.ts` that builds five blocks from existing tables:

- current house view
- open theses
- known strong topics
- known weak topics
- recent forecasting calibration

### Step 2

Generalize the Commodities-only rolling memory updater into an all-agent refresh path:

- replace `updateCommoditiesRollingMemory()` with a generic `refreshAgentRollingMemory()` loop
- persist compact summary to `agents.memory_summary`
- write `memory_updates`

### Step 3

Inject the new dynamic memory block into Ask Market prompts.

This is the most important product behavior change.

### Step 4

Optionally simplify `authorMemoryService` to reuse the new dynamic-memory builder for overlapping pieces.

Do not do this as a hard refactor first; keep compatibility and change as little as possible.

### Step 5

Add refresh and injection logs.

### Step 6

Validate with:

- one Market Room run per sector
- one Ask Market prompt per sector
- inspection of memory logs
- inspection of `memory_updates`

---

## 14. What Not To Do Yet

Do not do any of the following in Phase 1:

- no vector retrieval work
- no fine-tuning
- no new memory embedding store
- no large schema overhaul
- no autonomous self-rewriting long-form dossiers
- no attempt to merge knowledge docs and dynamic memory into one system
- no aggressive memory updates on every message

Phase 1 should stay narrow:

- persist compact house-view memory
- expose strong/weak topic and calibration blocks
- reuse existing tables
- improve Ask Market and Market Room with the same dynamic-memory layer

---

## 15. Phase 1 Recommendation

Phase 1 is ready to implement.

The repo already has enough source data, enough prompt plumbing, and enough persistence primitives to make this worthwhile without vectors or a major refactor.

The safest version is:

- persist a refreshed short `memory_summary` for every agent,
- derive four additional dynamic blocks at prompt time,
- inject them into both Market Room and Ask Market,
- and log both refresh and injection behavior explicitly.

That gives the system a real first dynamic memory layer while staying inside the existing D1 + Worker architecture.
