# Wave 1 Knowledge Docs — Pipeline Readiness

**Date:** 2026-04-09
**Scope:** 9 Wave 1 markdown docs for Macro, Rates, Commodities agents

---

## Current Status

**Ready to upload.** The Wave 1 docs can now be uploaded through the existing admin workflow and will be retrieved by agents during market discussions. `vector_store_id` is not required and is not used anywhere in the current codebase — the local keyword retrieval path is the only active path.

---

## How the Pipeline Works (End to End)

```
1. Admin uploads .md file via POST /api/admin/agents/{agentId}/knowledge-store
2. File is stored as distilled_markdown in knowledge_processing_job_items
3. review_status is set to 'approved' immediately (no manual review needed for .md)
4. During a market discussion, findRelevantKnowledgeSnippets() queries the DB
5. Approved docs are scored against the market headline + discussion context
6. Top-8 scoring docs are included in the agent's forum post prompt as:
   "Approved long-term memory snippets: 1. [Title] [category] [excerpt]"
7. The agent generates its post with those snippets in context
```

---

## What Was Blocking Wave 1 Docs

Three issues existed before the fixes below were applied. None required schema changes.

### Blocker 1 — YAML frontmatter stored verbatim in content
**Before:** `buildDirectUploadMarkdown()` stored the raw file content as-is, including the full `---` YAML block. The excerpt selector could surface a YAML field block (e.g., `agent: Rates\ndoc_type: foundation\ntopics:\n  - yield curve`) as the best excerpt for some queries. That text is not useful in the agent's prompt.

**After:** `parseFrontmatter()` strips the YAML block before storage. The `distilled_markdown` field now contains only the readable document body.

### Blocker 2 — Title derived from filename only
**Before:** `directUploadTitle("yield-curve-mechanics-and-interpretation.md")` → `"Yield curve mechanics and interpretation"`. The title stored in the DB was always the filename stem. The `# Yield Curve Mechanics and Interpretation` heading in the file was ignored.

**After:** `extractMarkdownTitle()` finds the first `# Heading` in the document body and uses it as the stored title. Falls back to the filename stem for files without a heading (backward compatible).

### Blocker 3 — Summary was always generic
**Before:** `summary` was always `"Direct foundations upload for Rates."` — a constant that contributed nothing to retrieval scoring. The `scoreDocument()` function searches `title + summary + excerpt`, so this wasted one of the three scoring surfaces.

**After:** `summary` is now built from the first four `topics` values in the YAML frontmatter: `"foundations covering: yield curve, 2s10s, 3m10y, bear steepener."` For files without frontmatter, the old generic string is preserved.

### Gap — YAML metadata completely ignored in scoring
**Before:** The `topics`, `trigger_patterns`, `use_when`, and `instruments` YAML fields — which are the explicit signal map for each document — were not used in retrieval scoring at all.

**After:** These fields are converted to four searchable plain-text sections (`## Coverage`, `## Triggers`, `## Use When`, `## Instruments`) injected into the stored content. `extractMetadataIndex()` in the snippet service reads these sections, and `scoreDocument()` checks them with weight 3 (vs weight 2 for content matches). A document whose `trigger_patterns` explicitly mentions "CPI core MoM surprise" scores higher for a CPI headline than a document that only mentions CPI in passing.

---

## Changes Made

### `apps/api/src/lib/services/agentKnowledgeService.ts`

**Added (lines 14–107):**

`FrontmatterData` type — captures the five retrievable YAML list fields.

`parseFrontmatter(content)` — splits content at the `---` delimiter, parses the five list fields line by line. Non-list YAML keys (e.g., `agent`, `source_urls`, `quality_score`) are ignored. Returns `{ data: FrontmatterData, body: string }` where `body` is the markdown content below the YAML block.

`extractMarkdownTitle(body)` — finds the first `# Heading` in the body. Returns `null` if none found.

`buildMetadataSection(data)` — converts the parsed YAML lists into four named markdown sections: `## Coverage`, `## Triggers`, `## Use When`, `## Instruments`. Returns an empty string for files with no frontmatter (backward compatible).

**Modified: upload loop in `uploadAgentKnowledgeFiles()`**
- Reads file content once as `rawContent`
- Calls `parseFrontmatter()` to get `data` and `body`
- Sets `title` = extracted markdown heading OR filename stem
- Sets `summary` = first 4 topics joined, OR generic string for unfronmatted files
- Passes `title`, `data`, `body` to `buildDirectUploadMarkdown()` (signature changed)

**Modified: `buildDirectUploadMarkdown()`**
- New signature: `(agent, category, filename, title, frontmatterData, body)`
- Strips the leading `# Title` from the body (the header block already owns it)
- Injects the metadata section between the header block and the document body
- The stored `distilled_markdown` structure is now:

```
# Yield Curve Mechanics and Interpretation

- Agent: Rates Agent
- Sector: Rates
- Category: foundations
- Source file: yield-curve-mechanics-and-interpretation.md
- Uploaded at: 2026-04-09T...Z

## Coverage
yield curve, 2s10s, 3m10y, bear steepener, bull steepener, bear flattener, bull flattener, curve inversion, recession signal, ACM term premium, Greenspan conundrum

## Triggers
2s10s crossing zero (inversion or disinversion); 3m10y inverted >90 consecutive days; single-session 2s10s move >8 bps; ACM term premium rising >50 bps in 6 weeks; 10-year yield diverging from 2-year by >15 bps on single catalyst

## Use When
any Treasury market movement >8 bps in a single tenor; FOMC meeting week; major macro data surprise (CPI, NFP); Treasury auction results; Fed QT/QE policy changes

## Instruments
2-year Treasury, 10-year Treasury, 30-year Treasury, 3-month T-bill, Treasury futures, IRS (interest rate swaps)

## Why this matters
The yield curve is not a single number — it is a structure that encodes...

[rest of document body]
```

### `apps/api/src/lib/services/knowledgeSnippetService.ts`

**Added: `extractMetadataIndex(content)`**
Scans `distilled_markdown` for the four injected sections using line-start regex anchors (`/^## Coverage\n(.+)$/m` etc.). Concatenates matched lines into a single lowercase search string. Returns `""` for documents without these sections (backward compatible with pre-Wave-1 uploads).

**Modified: `scoreDocument()`**
Adds `metaIndex = extractMetadataIndex(document.content)` and changes keyword scoring from a flat `+2 per hit` to `Math.max(inContent, inMeta)` where `inContent = 2` and `inMeta = 3`. A keyword that matches the explicit metadata scores 3; one that matches only the title/summary/excerpt scores 2. The higher weight ensures that a document whose trigger patterns explicitly describe the current catalyst surfaces above one that merely mentions the keyword in passing.

---

## How Wave 1 Docs Now Reach Prompts

1. **Upload:** POST each `.md` file to `/api/admin/agents/{agentId}/knowledge-store` with the correct `category`. The file is parsed, frontmatter is stripped, metadata sections are injected, and the result is auto-approved.

2. **Retrieval:** On each discussion round, `findRelevantKnowledgeSnippets()` is called with the discussion profile label + market headline + sector headlines as the query. The query is tokenized and scored against all approved docs for that agent.

3. **Scoring path for Wave 1 docs:**
   - The `## Coverage` section (YAML `topics`) provides explicit topic keywords → weight 3
   - The `## Triggers` section (YAML `trigger_patterns`) provides catalyst-specific phrases → weight 3
   - The `title` (from `# Heading` in the file) and `summary` (from first 4 topics) provide the base scores → weight 2
   - `event_playbooks` category gets a +2 bonus; `frameworks` gets +1.5

4. **Prompt inclusion:** Top-8 scoring docs are included in the forum post prompt as:
   ```
   Approved long-term memory snippets:
   1. Fed Repricing Playbook [event_playbooks] [best matching excerpt from content]
   2. Inflation Transmission Mechanisms [frameworks] [best matching excerpt]
   ...
   ```

---

## What Is NOT Changed

- No schema changes (zero migrations)
- No architecture changes
- No vector search, no embeddings, no new external dependencies
- The LLM-based processing pipeline (`researchProcessingService`) is untouched — PDFs and complex files still go through Gemini distillation
- The admin review workflow for processed files is untouched
- All pre-Wave-1 uploaded files continue to work identically (the new functions degrade gracefully when no frontmatter is present)

---

## Category Mapping Note

The admin UI requires selecting a `category` on upload. The Wave 1 YAML uses `doc_type` (not `category`). Map as follows when uploading:

| YAML `doc_type` | Select in admin UI |
|-----------------|-------------------|
| `foundation` | `foundations` |
| `framework` | `frameworks` |
| `event-playbook` | `event_playbooks` |

The `doc_type` field in the YAML is not parsed by the pipeline — it is only documentary. The `category` the admin selects at upload time is what gets stored.
