# Retrieval Cleanup Runbook

## 1. Files Changed

### Code

- `/Users/akshaysingh/Documents/New project/apps/api/src/lib/services/knowledgeSnippetService.ts`

### Docs

- `/Users/akshaysingh/Documents/New project/knowledge/retrieval_cleanup_and_ranking_plan.md`
- `/Users/akshaysingh/Documents/New project/knowledge/retrieval_cleanup_runbook.md`

## 2. What Ranking Logic Changed

### Added query-shape awareness

The scorer now detects whether a query looks more like:

- an event / catalyst query
- a framework / mechanism query
- a broad foundational query

Effects:

- event-heavy queries get a small lift for `event_playbooks`
- mechanism / regime queries get a small lift for `frameworks`
- broad low-specificity questions can still let `foundations` compete

### Added generic legacy penalties

When query specificity is medium or high, the scorer now demotes broad legacy docs such as:

- `starter pack`
- `historical starter`
- `public report starter`
- `long-term memory`

This does not remove them from retrieval. It lowers their chance of outranking sharper Wave docs.

### Added broad auxiliary penalties

Broad auxiliary documents such as:

- `census retail`
- `retail spending`
- `watchlist pack`
- `historical regime anchors`

are lightly penalized when they are not the clearest match for the query.

### Added selected-snippet dedupe by source filename

Only one snippet per source-file family is now injected into the prompt.

This prevents the prompt from being flooded by multiple variants of:

- `historical-starter-pack.md`
- `public-report-starter-pack.md`
- `census-retail-industry-pack.md`

## 3. What Excerpt Logic Changed

### Candidate passages are now section-aware

The selector now evaluates:

- a heading plus the following block
- standalone blocks

This lets it choose section-level passages instead of random paragraph fragments only.

### Mechanism-rich sections get a boost

Preference is given to passages from:

- `Core mechanism`
- `What to watch`
- `False positives / traps`
- `Cross-asset implications`
- `How this should affect agent behavior`

### Low-value passages are penalized

The excerpt scorer now demotes:

- metadata header blocks
- source lists
- URL-heavy blocks
- table-heavy fragments
- storage metadata such as `- Agent:` and `- Sector:`

## 4. What Docs Were Effectively Demoted Or Deprioritized

No docs were deleted or archived in code.

But these families are now effectively deprioritized on specific queries:

- `historical-starter-pack.md` variants
- `public-report-starter-pack.md` variants
- `census-retail-industry-pack.md` variants
- `twelvedata-equity-watchlist-pack.md` variants

Wave 1 and Wave 2 docs remain fully active and are now more likely to occupy the highest prompt slots on specific queries.

## 5. What The Logs Now Show

`[knowledge:*]` logs now include:

- total score
- base score
- selected excerpt label
- scoring adjustments

Example shapes:

```text
[knowledge:Rates Agent]   score=113.0 base=110.5 cat=frameworks excerpt=block adj=+framework-query title="Term Premium and Breakeven Interpretation Guide" excerpt="..."
```

```text
[knowledge:Macro Agent]   score=154.0 base=162.0 cat=foundations excerpt=block adj=-generic-legacy title="Macro historical starter pack — durable foundations for regime comparison" excerpt="..."
```

This makes it much easier to see:

- whether a doc won because it matched the query well
- whether it was penalized as generic legacy context
- which passage type was chosen for prompt injection

## 6. How To Validate Improvement

### 1. Run targeted prompts from the existing validation runbooks

Good first checks:

- Rates term-premium / bond-vigilante prompt
- Macro inflation / labor continuity prompt
- FX divergence vs funding-stress prompt

### 2. Inspect the knowledge logs

Look for:

- fewer duplicate starter-pack variants in injected snippets
- visible penalties on broad legacy docs
- Wave docs still ranking first or near-first
- cleaner excerpt labels where possible

### 3. Compare injected snippet sets before vs after

Expected improvements:

- only one snippet from the same starter-pack file family
- fewer generic docs in the top injected set
- sharper Wave docs occupying prompt slots earlier

### 4. Check excerpt quality manually

Good excerpt signs:

- mechanism-rich paragraph
- trap / threshold paragraph
- behavior / implication paragraph

Bad excerpt signs:

- source list
- metadata block
- generic title/header fragment
- redundant table row with little prose

## 7. Known Remaining Limits

This cleanup does **not** solve:

- wrong-agent routing
- true semantic misses
- analog retrieval quality
- all low-value broad-doc ranking contamination

It improves non-vector retrieval precision, but it does not pretend to solve every miss class.

## 8. Suggested Metrics Before Reopening Vectors

Collect:

1. duplicate-doc injection rate
2. generic-starter-pack injection rate on specific queries
3. top-1 retrieval accuracy on held-out prompts
4. top-3 retrieval accuracy
5. excerpt usefulness rate

If those still look bad after this cleanup, then vectors become easier to justify with real evidence.
