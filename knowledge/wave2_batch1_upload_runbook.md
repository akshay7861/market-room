# Wave 2 Batch 1 Upload Runbook

## Status

Batch 1 is uploaded and stored correctly.

The current pipeline path used was the direct admin knowledge upload route:

`POST /api/admin/agents/{agentId}/knowledge-store`

This is the same path the Admin UI uses for `.md` files. It auto-completes and auto-approves direct markdown uploads. No vector configuration is involved.

---

## Exact Files Uploaded

1. `knowledge/fx/frameworks/carry-and-rate-differential-framework.md`
2. `knowledge/risk-sentiment/frameworks/positioning-and-crowding-framework.md`
3. `knowledge/equities/frameworks/equity-regime-framework-rates-growth-liquidity-earnings.md`

---

## Expected Agent / Category Mapping

| File path | Agent | Agent ID | Admin category | Generate market cases later |
|---|---|---|---|---|
| `knowledge/fx/frameworks/carry-and-rate-differential-framework.md` | FX | `fx-agent` | `frameworks` | Yes |
| `knowledge/risk-sentiment/frameworks/positioning-and-crowding-framework.md` | Risk/Sentiment | `risk-sentiment-agent` | `frameworks` | Yes |
| `knowledge/equities/frameworks/equity-regime-framework-rates-growth-liquidity-earnings.md` | Equities | `equities-agent` | `frameworks` | Yes |

---

## Exact Admin Steps

For each file:

1. Open the Admin page.
2. Find the correct agent row:
   - FX Agent
   - Risk/Sentiment Agent
   - Equities Agent
3. In the `AgentKnowledgeManager` upload form:
   - choose `Knowledge category`
   - select `Frameworks`
   - choose the `.md` file from disk
4. Submit through the direct upload form, not the processing or batch-queue forms.
5. Wait for the success message and refresh/load the knowledge store if needed.

Direct markdown uploads should:
- create a completed job,
- mark the item as approved immediately,
- store parsed markdown in the local knowledge store.

---

## Approval / Storage Confirmation Checklist

Each uploaded file passed the following checks:

### FX
- [x] `status = completed`
- [x] `reviewStatus = approved`
- [x] real title stored: `Carry and Rate Differential Framework`
- [x] YAML stripped from stored markdown
- [x] `## Coverage` present
- [x] `## Triggers` present

### Risk/Sentiment
- [x] `status = completed`
- [x] `reviewStatus = approved`
- [x] real title stored: `Positioning and Crowding Framework`
- [x] YAML stripped from stored markdown
- [x] `## Coverage` present
- [x] `## Triggers` present

### Equities
- [x] `status = completed`
- [x] `reviewStatus = approved`
- [x] real title stored: `Equity Regime Framework: Rates, Growth, Liquidity, Earnings`
- [x] YAML stripped from stored markdown
- [x] `## Coverage` present
- [x] `## Triggers` present

---

## Naming Mismatch Risk

There is one operator-facing naming mismatch to watch:

- YAML frontmatter uses `doc_type: framework`
- Admin UI category must be selected as `frameworks`

The YAML `doc_type` is documentary only. The stored category comes from the Admin dropdown or POST form field. For these three files, the correct upload category is always:

`frameworks`

Do not choose:
- `foundations`
- `event_playbooks`
- `house_view_notes`

---

## What To Verify Before Moving To Validation

- [x] All three files appear in the correct agent knowledge store under `frameworks`
- [x] All three have `status = completed`
- [x] All three have `reviewStatus = approved`
- [x] Stored titles use the markdown heading, not the filename slug
- [x] Stored markdown begins with the title/header block, not raw YAML
- [x] Metadata sections (`## Coverage`, `## Triggers`) were injected during ingestion

Wave 2 Batch 1 is ready for validation.
