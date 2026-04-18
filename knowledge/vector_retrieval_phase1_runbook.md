# Vector Retrieval Phase 1 Runbook

## What was implemented

Phase 1 adds semantic retrieval for approved knowledge documents without removing the existing non-vector retrieval system.

The system now uses:

- Cloudflare Workers AI embedding model: `@cf/baai/bge-base-en-v1.5`
- Cloudflare Vectorize index: `market-room-knowledge`
- One shared index with one namespace per agent (`namespace = agent.id`)
- Existing D1 `knowledge_processing_job_items` remains the source of truth
- Existing metadata-aware keyword scoring remains active as fallback and ranking stabilizer

## Files changed

- `apps/api/wrangler.jsonc`
- `apps/api/src/index.ts`
- `apps/api/src/lib/services/vectorKnowledgeService.ts`
- `apps/api/src/lib/services/knowledgeSnippetService.ts`
- `apps/api/src/lib/services/adminService.ts`
- `apps/api/src/routes/router.ts`
- `apps/api/src/lib/repositories/knowledgeProcessingJobsRepository.ts`

## Retrieval path

1. `findRelevantKnowledgeSnippets()` loads approved docs from D1.
2. It embeds the current query/headline using Workers AI.
3. It queries Vectorize using the agent namespace.
4. Returned vector matches receive a score boost on top of the existing lexical/governance score.
5. Existing source-family dedupe, fallback suppression, governance penalties, and excerpt selection still apply.
6. If Vectorize or Workers AI fails, the function logs the failure and falls back to lexical retrieval.

## Backfill path

Admin endpoint:

```text
POST /api/admin/knowledge/vector-backfill
```

This endpoint:

- lists all agents
- lists each agent's approved knowledge docs
- embeds each approved doc
- upserts vectors into `market-room-knowledge`
- uses `namespace = agent.id`
- sets `agents.vector_store_id = market-room-knowledge`

## Logs to inspect

Vector query:

```text
[knowledge-vector:{agent}] query namespace={agentId} matches=...
```

Vector fallback:

```text
[knowledge-vector:{agent}] query failed — falling back to lexical retrieval: ...
```

Vector backfill:

```text
[knowledge-vector:{agent}] backfilled indexed=... skipped=...
```

Combined retrieval scoring:

```text
[knowledge:{agent}] score=... base=... vector=0.742#1 ... adj=+vector:...
```

## What vectors solve now

- Conceptual wording gaps where the correct doc exists but query terms do not overlap cleanly.
- Cross-domain phrasing like "yen carry unwind" matching funding/carry stress docs.
- Better top-1 ranking when semantic meaning is clearer than keyword overlap.

## What vectors do not solve

- Wrong-agent routing.
- Missing documents.
- Weak answer formatting.
- Bad or stale source data.
- Over-broad prompts that ask for stock-picking without enough market context.

## Validation

Use Ask Market prompts with indirect wording:

1. FX: "USD/JPY is selling off even though US yields are high. Is this a carry unwind or intervention-risk story?"
2. Risk/Sentiment: "If vol stays calm but crowded winners start selling together, is that real risk-off or just positioning?"
3. Equities: "A software company beat revenue but margins and cash flow disappointed. Why did the stock fall?"

Pass condition:

- intended agent routes correctly
- `[knowledge-vector:{agent}]` appears
- intended specialist doc appears in top 3
- output uses mechanism language from the retrieved doc

## Rollback

Set `KNOWLEDGE_VECTOR_RETRIEVAL` to `false` in Worker vars and redeploy. The lexical retrieval path remains intact.
