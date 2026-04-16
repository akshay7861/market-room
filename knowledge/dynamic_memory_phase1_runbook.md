# Dynamic Memory Phase 1 Runbook

## 1. What Was Implemented

Phase 1 adds a lightweight dynamic memory layer that reuses existing system state without vectors or a schema overhaul.

Implemented behavior:

- one shared dynamic memory service now builds the same 5 prompt-time blocks for both:
  - Market Room
  - Ask Market
- only one artifact is persisted:
  - a compact rolling house view in `agents.memory_summary`
- the other 4 blocks are derived fresh at prompt time:
  - open theses
  - known strong topics
  - known weak topics
  - recent forecasting calibration
- house-view refresh is now generic across all 6 agents
- the old Commodities-only rolling-memory path was removed

## 2. Which Files Changed

### New

1. [dynamicMemoryService.ts](/Users/akshaysingh/Documents/New%20project/apps/api/src/lib/services/dynamicMemoryService.ts)
2. [dynamic_memory_phase1_runbook.md](/Users/akshaysingh/Documents/New%20project/knowledge/dynamic_memory_phase1_runbook.md)

### Updated

1. [marketRoomService.ts](/Users/akshaysingh/Documents/New%20project/apps/api/src/lib/services/marketRoomService.ts)
2. [marketQuestionsService.ts](/Users/akshaysingh/Documents/New%20project/apps/api/src/lib/services/marketQuestionsService.ts)
3. [index.ts](/Users/akshaysingh/Documents/New%20project/packages/shared/src/index.ts)

## 3. How the 5 Blocks Are Built

### Current house view

Primary sources:

- `theses`
- `thesis_updates`

Secondary source:

- recent `messages`

Logic:

- prefer active theses (`open`, `developing`, `waiting_for_data`, `reopened`)
- use latest thesis update summary when available
- fall back to canonical claim / title
- if no active theses, fall back to recent thesis focus
- if no recent theses, fall back to recent message focus

### Open theses

Sources:

- `theses`

Logic:

- list active owned theses
- include title, status, confidence

### Known strong topics

Sources:

- `agent_forecasts`
- `forecast_outcomes`
- `training_examples`
- recent `theses`

Logic:

- rank recent forecasted instruments/topics by hit rate
- require a minimum sample before calling something strong
- fall back to recent thesis topics if forecast signal is still sparse

### Known weak topics

Sources:

- `agent_forecasts`
- `forecast_outcomes`
- `training_examples`
- `agent_state_features.topicsToDeprioritize`

Logic:

- combine low-hit-rate recent forecast topics with existing deprioritized topics
- fall back to latest bad-example feedback when needed

### Recent forecasting calibration

Sources:

- `agent_forecasts`
- `forecast_outcomes`

Logic:

- compute recent hit rate
- compute high-confidence hit rate when sample exists
- compute confidence bias
- convert that into a short calibration sentence

## 4. What Is Persisted vs What Is Derived

### Persisted

Only this is persisted in Phase 1:

- `agents.memory_summary`

Refresh behavior:

- refreshed after Market Room discussion runs
- updated only when the house view changed materially
- every persisted change writes an audit row to `memory_updates`

### Derived at prompt time

These are rebuilt fresh and not persisted:

- open theses
- known strong topics
- known weak topics
- recent forecasting calibration

## 5. How Memory Now Reaches Market Room Prompts

Market Room now:

- builds `DynamicMemoryContext` per agent during post generation
- builds `DynamicMemoryContext` per responder during comment generation
- injects a structured `## Dynamic Memory` block into prompts containing:
  - current house view
  - open theses
  - known strong topics
  - known weak topics
  - recent forecasting calibration

Existing knowledge retrieval, room coverage, and behavioral-state blocks were preserved.

## 6. How Memory Now Reaches Ask Market Prompts

Ask Market now:

- builds the same `DynamicMemoryContext` for the routed specialist
- injects the same `## Dynamic Memory` block into the question-thread prompt

This closes the previous gap where Ask Market only had:

- `agent.memorySummary`
- approved knowledge snippets

It now has:

- persisted house view
- fresh open-thesis context
- strengths / weaknesses
- calibration context
- approved knowledge snippets

## 7. What Logs To Inspect

### Refresh logs

Examples:

- `[memory-refresh:FX Agent] updated summary because thesis state changed materially`
- `[memory-refresh:Macro Agent] skipped update, no material change`

These fire during the post-run refresh path.

### Injection logs

Example:

- `[memory-inject:Equities Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration`

These fire when the prompt block is rendered for:

- Market Room posts
- Market Room comments
- Ask Market replies

### Existing knowledge logs still apply

Continue using:

- `[knowledge:Agent Name] ...`

to confirm long-term knowledge retrieval is still working alongside dynamic memory.

## 8. How To Test The Feature

### Build / safety checks

Run:

```bash
npm run check --workspace @market-room/api
npm run check --workspace @market-room/web
```

### Ask Market smoke test

Use a specialist question, for example:

```text
For the FX agent: is EURUSD strength here still a carry/divergence story, or is dollar funding stress starting to matter more?
```

Confirm:

- correct routing
- no runtime errors
- `memory-inject` log appears for the routed agent

### Market Room smoke test

Run:

```bash
curl -s -X POST http://127.0.0.1:8787/api/discussions/run \
  -H 'Content-Type: application/json' \
  --data '{"prompt":"Discuss the biggest market drivers right now, the main risk, and one thing investors should watch next."}'
```

Confirm:

- run completes
- `memory-refresh` logs appear for agents
- some agents update and some may skip if nothing changed materially

### Persistence check

Check:

- `GET /api/agents`

Confirm that `memorySummary` values are no longer static seed-style summaries and now reflect current house-view phrasing.

Optional deeper check:

- inspect `memory_updates` rows in local D1 after a completed Market Room run

## 9. Success / Failure Signs

### Success

- Market Room still runs successfully
- Ask Market still runs successfully
- `knowledgeSnippetService` behavior is unchanged
- `memory-refresh` logs show updates or explicit skips
- `memory-inject` logs appear in both Market Room and Ask Market paths
- `agents.memory_summary` changes only when the house view changes materially
- prompt text is more stateful without becoming much longer

### Failure

- Market Room or Ask Market throws prompt-building/runtime errors
- memory refresh writes on every run even when nothing changed
- no `memory-inject` logs appear
- `agents.memory_summary` becomes empty, generic, or obviously stale
- knowledge retrieval behavior regresses

## 10. What Remains For Phase 2

Phase 2 can build on this, but should not be mixed into Phase 1 validation.

Still deferred:

- persisting more than the house-view artifact
- dedicated admin inspection UI for memory blocks
- stronger topic extraction from thesis families rather than instrument keys alone
- cleaner structured storage for dynamic blocks if the single-summary field becomes limiting
- dynamic memory refresh after learning-refresh jobs, not only after discussion runs

Do not do yet:

- vectors
- fine-tuning
- large prompt-stack rewrite
- large schema redesign
