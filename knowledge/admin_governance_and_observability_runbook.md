# Admin Governance And Observability Runbook

**Date:** 2026-04-11  
**Scope:** first minimal admin-facing governance controls for approved knowledge docs.  
**Constraint:** no vectors, no schema migration, no retrieval architecture rewrite.

## 1. Files Changed

Shared types:

- `packages/shared/src/index.ts`

API:

- `apps/api/src/lib/repositories/knowledgeProcessingJobsRepository.ts`
- `apps/api/src/lib/services/agentKnowledgeService.ts`
- `apps/api/src/lib/services/adminService.ts`
- `apps/api/src/lib/services/knowledgeSnippetService.ts`
- `apps/api/src/routes/router.ts`

Web:

- `apps/web/src/lib/api.ts`
- `apps/web/src/components/AgentKnowledgeManager.tsx`

Docs:

- `knowledge/admin_governance_and_observability_plan.md`
- `knowledge/admin_governance_and_observability_runbook.md`

## 2. Controls Added

The Admin knowledge panel now shows governance status for every approved knowledge file.

Per file:

- title
- filename
- category
- status
- governance tier
- governance source
- governance reason
- governance priority
- summary when available

Controls:

- `Mark active`
- `Demote fallback`
- `Mark legacy`

The controls call:

```text
PATCH /api/admin/agents/:agentId/knowledge-store/:itemId/governance
```

Request body:

```json
{
  "tier": "fallback",
  "priority": -5
}
```

Response:

```json
{
  "knowledgeStore": { "...": "refreshed store" }
}
```

## 3. How Governance Is Stored

No schema was added.

Manual governance uses existing `knowledge_processing_job_items.review_notes`.

Stored format:

```text
governance:tier=active;priority=0
governance:tier=fallback;priority=-5
governance:tier=legacy;priority=-15
```

This is intentionally simple and reversible.

## 4. How Governance Is Determined

### Manual override

If `review_notes` contains a valid governance string, it wins.

Admin shows:

```text
manual governance
Governance: manual review_notes override
```

### Derived tier

If there is no manual override, retrieval derives tier from title and filename.

Active:

- curated Wave `.md` docs
- non-processed files that are not starter / census / watchlist families

Fallback:

- census retail
- retail spending
- watchlist
- historical regime anchors
- breadth and sector rotation framework
- other processed docs not classified legacy

Legacy:

- historical starter packs
- historical foundation packs
- public report starter packs
- durable / long-term memory starter docs

## 5. Observability Added

Admin panel:

- active / fallback / legacy count summary per agent
- tier badge per file
- governance source and reason per file
- manual priority value per file

Retrieval logs already include:

```text
tier=active
tier=fallback
tier=legacy
```

Governance score adjustments:

```text
-governance-fallback:12
-governance-legacy:22
governance-priority:-15
```

Governance skip reasons:

```text
governance-fallback-after-active
governance-legacy-after-active
fallback-after-sharp-top-three
```

Admin mutation logs:

```text
[knowledge-governance:Macro Agent] item=<itemId> tier=legacy priority=-15
```

## 6. How To Test

API check:

```text
npm run check --workspace @market-room/api
```

Web check:

```text
npm run check --workspace @market-room/web
```

Manual Admin test:

1. Open `/admin`.
2. Expand an agent.
3. Confirm `Retrieval governance` shows active / fallback / legacy counts.
4. Find a processed starter-pack or census doc.
5. Click `Mark legacy`.
6. Confirm the row changes to `legacy` and `manual governance`.
7. Ask a specialist question and inspect `[knowledge:*]` logs.
8. Confirm the doc appears as `tier=legacy` with governance penalty or is skipped after active docs.
9. Click `Mark active` to reverse if needed.

## 7. What Remains For Later

Not implemented yet:

- persisted retrieval event analytics
- top retrieved docs by agent over time
- docs most often in top-3 over time
- docs rarely used over time
- active-vs-active conflict dashboard
- explicit database columns for governance tier / priority
- bulk demotion controls
- delete/archive workflows

Recommended later phase:

- add a persisted lightweight `knowledge_retrieval_events` table only if logs are no longer enough
- add bulk actions after observing real admin usage
- migrate from `review_notes` convention to explicit columns only if manual governance becomes core workflow

## 8. Vector Decision

Vectors remain **NO-GO**.

This work improves operational governance and visibility of the approved pool. It does not change retrieval architecture and does not create evidence that embeddings are needed.

