# Retrieval Cleanup And Ranking Plan

## 1. Approved Pool Problems By Agent

### Macro

Problems:

- four approved `historical-starter-pack.md` variants in `foundations`
- three approved `census-retail-industry-pack.md` variants in `frameworks`
- one broad `public-report-starter-pack.md` in `event_playbooks`

Effect:

- duplicate starter-pack docs can occupy multiple top prompt slots
- broad historical / retail docs compete with:
  - `Inflation Transmission Mechanisms`
  - `Central Bank Reaction Function Framework`
  - `Labor Market Deterioration Playbook`

### Rates

Problems:

- three approved `historical-starter-pack.md` variants in `foundations`
- three approved `public-report-starter-pack.md` variants in `event_playbooks`

Effect:

- `Fed Repricing Playbook` is sometimes accompanied by multiple generic policy/CPI starter packs
- term-premium queries still pull broad repricing / public-report docs too high

### Commodities

Problems:

- three approved `historical-starter-pack.md` variants in `foundations`
- three approved `public-report-starter-pack.md` variants in `event_playbooks`

Effect:

- Wave docs are strong, but prompt slots can still be wasted by generic EIA/STEO packs

### FX

Problems:

- three approved `public-report-starter-pack.md` variants in `event_playbooks`
- three approved `historical-starter-pack.md` variants in `foundations`

Effect:

- broad dollar / Fed / historical docs stay too competitive in ranking
- the funding-stress playbook can outrank divergence/carry too aggressively on broad macro-policy wording

### Risk/Sentiment

Problems:

- three approved `public-report-starter-pack.md` variants in `event_playbooks`
- three approved `historical-starter-pack.md` variants in `foundations`
- three approved `census-retail-industry-pack.md` variants in `frameworks`

Effect:

- multiple “retail breadth” and historical risk docs compete with the main Wave docs
- crowded pool makes ranking harder to interpret

### Equities

Problems:

- three approved `census-retail-industry-pack.md` variants in `frameworks`
- two approved `twelvedata-equity-watchlist-pack.md` variants in `frameworks`
- three approved `historical-starter-pack.md` variants in `foundations`
- three approved `public-report-starter-pack.md` variants in `event_playbooks`

Effect:

- framework pool is the noisiest in the system
- strong Wave docs still rank well, but prompt slots are often consumed by overlapping supporting docs

## 2. Cleanup Recommendations

Policy labels:

- `keep`
- `demote`
- `archive from active retrieval`
- `merge conceptually`

### Keep

Keep fully active:

- all Wave 1 and Wave 2 docs
- any unique specialist doc with clear mechanism value

### Demote

Demote in ranking:

- generic `historical-starter-pack` variants
- generic `public-report-starter-pack` variants
- broad `census-retail-industry-pack` variants
- duplicate `twelvedata-equity-watchlist-pack` variants

These are still useful fallback context, but they should not outrank sharper docs on specific queries.

### Archive From Active Retrieval

Not implemented in this phase, but recommended later:

- exact or near-exact duplicates where one variant clearly dominates the others

This should be a curation action, not an automated code decision.

### Merge Conceptually

Recommended later:

- consolidate multiple starter-pack variants per agent/source into one canonical historical doc and one canonical report-playbook doc

This is the best long-term cleanup, but it is content-governance work, not ranking logic.

## 3. Ranking Changes Proposed

### A. Penalize generic legacy docs when the query is specific

When query specificity is high, demote:

- starter packs
- historical packs
- broad census/watchlist packs

Rationale:

- if the query has explicit trigger language, the sharp playbook/framework should win
- generic docs should remain available but lower-ranked

### B. Add lightweight query-shape preferences

If the query looks event-specific:

- prefer `event_playbooks`

If the query looks interpretive / regime / mechanism-oriented:

- prefer `frameworks`

If the query is broad and low-specificity:

- allow `foundations` to compete more normally

### C. Dedupe selected snippets by source filename

Only one snippet per `source_filename` family should be injected into the prompt.

Rationale:

- most duplicate contamination comes from repeated processing of the same source file
- this reduces prompt waste without deleting any approved docs

## 4. Excerpt-Selection Changes Proposed

### A. Prefer mechanism-rich sections

Favor passages from:

- `## Core mechanism`
- `## What to watch`
- `## False positives / traps`
- `## Cross-asset implications`
- `## How this should affect agent behavior`

### B. Penalize low-value blocks

Avoid selecting:

- metadata header blocks
- source lists
- pure table fragments when a better prose passage exists
- broad opening filler when a more trigger-specific section matches

### C. Log which section won

Log the selected excerpt section label or passage type so retrieval debugging is easier.

## 5. What Will Remain Unresolved After This Phase

Still unresolved after ranking cleanup:

- wrong-agent routing
- true semantic misses where wording differs but metadata overlap is weak
- analog retrieval quality
- noisy thesis titles influencing dynamic memory and possibly prompt framing

## 6. How To Test The Improvements

### Primary checks

1. run targeted Ask Market prompts from the existing Wave 1 / Wave 2 validation runbooks
2. inspect `[knowledge:*]` logs
3. confirm:
   - the intended Wave doc still ranks first or near-first
   - duplicate starter-pack variants no longer dominate injection slots
   - excerpt text is more mechanism-rich

### Specific regression checks

- FX broad macro-policy query should not let funding-stress swamp divergence/carry unless stress wording is explicit
- Macro queries should not inject multiple historical-starter-pack duplicates
- Rates term-premium queries should prefer:
  - `Term Premium and Breakeven Interpretation Guide`
  - `Yield Curve Mechanics and Interpretation`
  over generic public-report packs

## 7. What Metrics To Collect Before Vectors

Collect these before reopening vectors:

1. top-1 retrieval accuracy on a held-out prompt set
2. top-3 retrieval accuracy
3. duplicate-doc injection rate
4. generic-starter-pack injection rate on high-specificity queries
5. excerpt usefulness rate:
   - mechanism paragraph
   - table / source / header fragment

## 8. Recommended This-Phase Scope

Implement only:

- ranking penalties for broad legacy docs on specific queries
- lightweight query-shape doc-type preference
- selected-snippet dedupe by filename
- better excerpt scoring and logging

Do not implement:

- vectors
- schema changes
- document deletion
- broad retrieval redesign
