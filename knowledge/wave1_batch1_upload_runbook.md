# Wave 1 Batch 1 — Upload Runbook

**Date:** 2026-04-10
**Scope:** Upload and approval confirmation for 3 files only
**Admin UI:** Admin panel → find the agent → AgentKnowledgeManager panel
**No testing, no vector work, no Batch 2 steps in this document**

---

## 1. Diagnosis

**Status: Ready to upload now. No blockers.**

All three files exist on disk with correct YAML frontmatter. The pipeline changes (`agentKnowledgeService.ts` and `knowledgeSnippetService.ts`) that strip frontmatter, inject metadata sections, and build topic-aware summaries are in place. `.md` files are auto-approved on upload — no manual review step is needed. The active retrieval path is local keyword scoring (`findRelevantKnowledgeSnippets()`); `vector_store_id` is not used anywhere in the codebase and does not need to be set.

**One naming risk to watch:** The YAML `doc_type` field inside each file uses hyphens (`event-playbook`, `foundation`, `framework`). The admin UI dropdown uses underscores or no hyphens (`event_playbooks`, `foundations`, `frameworks`). These do not match. Select the admin UI value — the YAML `doc_type` field is not read by the pipeline.

---

## 2. Batch 1 Upload List

Upload in this order. One file at a time.

| # | File (full path from repo root) | Agent | Admin category to select | Agent ID |
|---|--------------------------------|-------|--------------------------|----------|
| 1 | `knowledge/rates/event-playbooks/fed-repricing-playbook.md` | Rates | **`event_playbooks`** | `rates-agent` |
| 2 | `knowledge/commodities/foundations/oil-supply-demand-and-inventory-framework.md` | Commodities | **`foundations`** | `commodities-agent` |
| 3 | `knowledge/macro/frameworks/inflation-transmission-mechanisms.md` | Macro | **`frameworks`** | `macro-agent` |

---

## 3. Category Mapping — Critical

The YAML `doc_type` in each file does **not** match the admin dropdown. Map as follows:

| YAML `doc_type` (inside the file) | Select in admin UI |
|-----------------------------------|-------------------|
| `event-playbook` | `event_playbooks` |
| `foundation` | `foundations` |
| `framework` | `frameworks` |

If you select the wrong category, the doc uploads but will receive a lower retrieval score (no category bonus) and appear under the wrong filter in admin. Fix: delete the item and re-upload with the correct category.

---

## 4. Exact Admin Upload Steps

The admin UI is a web panel. Each upload follows the same 6 steps — only the agent and category change per file.

---

### File 1 — `fed-repricing-playbook.md` → Rates → `event_playbooks`

**Step 1.** Open the admin panel in your browser.

**Step 2.** Find the **Rates** agent section. The agent is listed as `rates-agent` in the database; in the UI it appears as **"Rates Agent"** or similar.

**Step 3.** Open the **AgentKnowledgeManager** panel for this agent (it may be labelled "Knowledge Store", "Knowledge Files", or similar within the agent editor row).

**Step 4.** In the **Knowledge category** dropdown, select **`event_playbooks`**.
- Do NOT select `foundations`, `frameworks`, or `house_view_notes`.

**Step 5.** In the file input, select the file:
```
knowledge/rates/event-playbooks/fed-repricing-playbook.md
```
The file is 10 MB or under — it will pass size validation.

**Step 6.** Submit / click Upload. Wait for the success response. The file is processed inline and auto-approved. No further action needed for approval.

**What gets stored:**
- Title: `"Fed Repricing Playbook"` (extracted from the `# Fed Repricing Playbook` heading)
- Summary: built from first 4 topics — `"event playbooks covering: Fed funds futures, SOFR futures, OIS forwards, CME FedWatch."`
- Content: document body only (YAML stripped) with injected `## Coverage`, `## Triggers`, `## Use When`, `## Instruments` sections
- `review_status`: `approved` immediately
- `category`: `event_playbooks`

---

### File 2 — `oil-supply-demand-and-inventory-framework.md` → Commodities → `foundations`

**Step 1–3.** Open admin panel. Find the **Commodities** agent (`commodities-agent` / "Commodities Agent"). Open its AgentKnowledgeManager panel.

**Step 4.** In the **Knowledge category** dropdown, select **`foundations`**.

**Step 5.** Select the file:
```
knowledge/commodities/foundations/oil-supply-demand-and-inventory-framework.md
```

**Step 6.** Submit / upload. Wait for success.

**What gets stored:**
- Title: extracted from the `# Oil Supply-Demand and Inventory Framework` heading
- Summary: built from first 4 topics — `"foundations covering: EIA weekly petroleum report, crude oil inventories, Cushing Oklahoma, refinery utilization."`
- `review_status`: `approved` immediately
- `category`: `foundations`

---

### File 3 — `inflation-transmission-mechanisms.md` → Macro → `frameworks`

**Step 1–3.** Open admin panel. Find the **Macro** agent (`macro-agent` / "Macro Agent"). Open its AgentKnowledgeManager panel.

**Step 4.** In the **Knowledge category** dropdown, select **`frameworks`**.

**Step 5.** Select the file:
```
knowledge/macro/frameworks/inflation-transmission-mechanisms.md
```

**Step 6.** Submit / upload. Wait for success.

**What gets stored:**
- Title: extracted from the `# Inflation Transmission Mechanisms` heading
- Summary: built from first 4 topics — `"frameworks covering: CPI, PCE, PPI, OER."`
- `review_status`: `approved` immediately
- `category`: `frameworks`

---

## 5. Approval Confirmation Checklist

Run this after each individual file upload, before uploading the next.

### API check (direct)

```
GET /api/admin/agents/{agentId}/knowledge-processing/jobs
```

Replace `{agentId}` with the agent's ID:

| Agent | agentId |
|-------|---------|
| Rates | `rates-agent` |
| Commodities | `commodities-agent` |
| Macro | `macro-agent` |

**For each file, confirm all four:**

- [ ] A new job appears in the list with a timestamp matching the upload time
- [ ] `status` = `"completed"` (not `"pending"`, `"processing"`, or `"failed"`)
- [ ] The job item has `review_status` = `"approved"`
- [ ] `distilled_markdown` is not null and does not begin with `---`

If `distilled_markdown` starts with `---`, the frontmatter was not stripped — the updated `agentKnowledgeService.ts` is not deployed. Redeploy, then re-upload.

### UI check (admin panel)

In the AgentKnowledgeManager for each agent, the uploaded file should appear in the knowledge store list with:
- The correct title (not the raw filename stem)
- The correct category label
- Status: approved / active

---

## 6. Storage Confirmation Checklist

After all three files are uploaded and the approval check passes for each:

- [ ] **Title is a real title, not a filename slug.** `"Fed Repricing Playbook"` not `"Fed repricing playbook"` or `"fed-repricing-playbook"`
- [ ] **Summary contains topic keywords.** For Rates doc, the summary includes "Fed funds futures" or similar — not just `"Direct event_playbooks upload for Rates Agent."`
- [ ] **`distilled_markdown` contains the metadata sections.** The stored content includes `## Coverage`, `## Triggers`, `## Use When`, `## Instruments` sections above the document body. You can spot-check this by reading the `distilled_markdown` value from the jobs endpoint.
- [ ] **No YAML in stored content.** The stored content should not contain `---`, `doc_type:`, `agent: Rates`, or any YAML key-value lines.
- [ ] **Document body is present.** The stored content should include visible prose from the document (e.g., section headings like `## Why this matters`, `## Bps Magnitude Ladder`, `## Six-Step Sequence`).
- [ ] **All three agents each have exactly one new approved doc.** Rates has 1 new doc; Commodities has 1 new doc; Macro has 1 new doc.

---

## 7. Field Mapping and Naming Risks

| Risk | Detail | What to do |
|------|--------|-----------|
| Wrong category selected | `event-playbook` is visible in the YAML but is NOT a valid admin UI option | Select `event_playbooks` (with underscore, plural) |
| File uploaded to wrong agent | All three files go to different agents | Double-check agent name before each upload |
| Filename confusion | All three files are `.md` — no processing queue needed | Do NOT use the "Process and distill" or "Queue batch" upload modes. Use the direct knowledge file upload mode only |
| `house_view_notes` accidentally selected | It is in the dropdown; none of the 3 Batch 1 files belong there | Only use `event_playbooks`, `foundations`, `frameworks` |
| Old code still deployed | If `distilled_markdown` starts with `---`, frontmatter was not stripped | Redeploy `agentKnowledgeService.ts` before re-uploading |
| File size | All 3 Batch 1 docs are standard markdown — well under the 10 MB limit | No action needed |

---

## 8. Before Moving to Testing

Do not run any test discussions until all three items below are confirmed:

- [ ] All 3 files appear in their respective agents' knowledge-processing/jobs with `review_status = 'approved'`
- [ ] All 3 stored `distilled_markdown` values begin with `# [Title]` (not `---`)
- [ ] All 3 summaries contain real topic keywords (not the generic `"Direct foundations upload..."` string)

When all three pass: the docs are live and will be scored against every discussion the agents run. Move to `wave1_batch1_execution.md` for the retrieval verification steps.

---

## Batch 1 Ready for Upload Now

No blockers. The three files exist, the pipeline changes are in place, `.md` files are auto-approved, and the admin UI accepts the exact categories required. Upload can proceed immediately.
