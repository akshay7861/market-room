# Admin Governance And Observability Plan

**Date:** 2026-04-11  
**Scope:** lightweight admin-facing controls and retrieval observability for knowledge governance.  
**Constraint:** no vectors, no schema overhaul, no retrieval architecture rewrite.

## 1. Current Limitations

The current Admin knowledge workflow can:

- upload direct markdown / text knowledge files
- queue raw files for processing
- approve or reject pending processed files
- list approved knowledge files per agent

It cannot yet:

- show whether an approved doc is treated as active, fallback, or legacy in retrieval
- manually demote a noisy approved doc without rejecting it
- manually restore a useful doc back to active retrieval
- apply a small manual priority override
- show which docs are being suppressed by governance rules
- summarize active-pool health by agent

Operationally, this matters because the current bottleneck is no longer document quality or vector retrieval. The problem is approved-pool governance:

- many processed starter-pack variants remain approved
- public-report starter packs are broad and duplicative
- census / watchlist docs are useful as fallback, but should not compete with Wave docs on specific prompts
- logs already reveal this, but Admin does not surface it

## 2. Proposed Admin Controls

### Control 1: governance tier badge

Show every approved doc as:

- `active`
- `fallback`
- `legacy`

Derived tiers should be visible as derived; manual overrides should be visible as manual.

### Control 2: mark active

Purpose:

- restore a doc to full retrieval competition

Stored as:

```text
governance:tier=active;priority=0
```

### Control 3: demote fallback

Purpose:

- keep a broad doc available, but stop it from crowding out Wave docs

Stored as:

```text
governance:tier=fallback;priority=-5
```

### Control 4: mark legacy

Purpose:

- keep a duplicate / broad starter-pack doc available only as deep fallback

Stored as:

```text
governance:tier=legacy;priority=-15
```

### Control 5: optional manual priority override

Phase 1 should keep this intentionally limited:

- active: priority `0`
- fallback: priority `-5`
- legacy: priority `-15`

A free-form priority editor can wait until the need is proven.

## 3. Proposed Observability Views

### Implement now

Admin should show:

- active / fallback / legacy counts per agent
- tier badge per approved doc
- governance source:
  - `derived`
  - `manual`
- governance reason:
  - curated direct markdown doc
  - starter/public/historical processed family
  - broad auxiliary processed family
  - manual review_notes override
- manual priority value when present

Retrieval logs should already show:

- scored doc tier
- governance ranking penalty
- governance skipped reason

### Later phase

Persisted retrieval analytics can wait.

Useful later views:

- top retrieved docs by agent over last N runs
- governance-skipped docs over last N runs
- docs most often appearing in top-3
- docs rarely used
- active-vs-active conflict pairs

Those require either persisted retrieval events or structured decision log integration. That is intentionally out of scope for this small pass.

## 4. Smallest Implementation Path

Use existing `review_notes` on `knowledge_processing_job_items`.

Why:

- no schema migration
- no new table
- reversible
- human-inspectable in D1
- keeps approved docs approved
- retrieval can read the override at scoring time

Implementation:

1. Extend approved knowledge rows to include `review_notes`.
2. Add governance profile parsing:
   - derived tier from filename/title
   - manual tier from `review_notes` when present
3. Include governance fields in `AgentKnowledgeStore.files`.
4. Add a small admin PATCH endpoint:
   - `PATCH /api/admin/agents/:agentId/knowledge-store/:itemId/governance`
5. Add three buttons in the Admin knowledge list:
   - Mark active
   - Demote fallback
   - Mark legacy
6. Keep retrieval logs showing `tier=active|fallback|legacy` and skip reasons.

## 5. Risks

### Review notes become multi-purpose

Risk:

- `review_notes` now carries governance metadata as well as human review notes.

Mitigation:

- use a clear machine-readable prefix:
  - `governance:tier=<tier>;priority=<n>`
- avoid parsing anything else

### Manual override can hide useful fallback context

Risk:

- marking a useful doc `legacy` can make it too weak on some broad questions.

Mitigation:

- the override is reversible in Admin
- legacy docs are still available when active docs are weak or absent

### No persisted retrieval analytics yet

Risk:

- Admin can show current governance state, but not historical retrieval frequency.

Mitigation:

- keep using `[knowledge:*]` logs for live observability
- defer persisted retrieval analytics until there is a real need

## 6. How To Validate Usefulness

Validation steps:

1. Open Admin for each agent.
2. Confirm the knowledge panel shows active / fallback / legacy counts.
3. Confirm each approved file shows:
   - title / filename
   - tier badge
   - derived or manual governance source
   - governance reason
4. Change one broad processed doc to `legacy`.
5. Reload the knowledge store and confirm it remains `legacy`.
6. Run a specialist prompt and inspect logs:
   - the doc should show `tier=legacy`
   - it should receive `-governance-legacy:<n>`
   - it should be skipped when stronger active docs already match
7. Mark the doc active again and confirm retrieval logs show `tier=active`.

Success criteria:

- no schema migration required
- admin can see and adjust governance state
- retrieval behavior remains backward compatible
- active Wave docs keep dominating specific prompts
- broad docs remain available as fallback

