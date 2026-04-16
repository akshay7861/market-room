# Wave 2 Batch 3 Upload Runbook

## Status

Batch 3 is uploaded and stored correctly.

The upload path used was the direct admin knowledge upload route:

`POST /api/admin/agents/{agentId}/knowledge-store`

This is the same path the Admin UI uses for `.md` files. Direct markdown uploads auto-complete and auto-approve. No vector configuration is involved.

---

## Exact Files Uploaded

1. `knowledge/fx/event-playbooks/dollar-funding-stress-and-intervention-playbook.md`
2. `knowledge/risk-sentiment/foundations/risk-on-risk-off-transmission-guide.md`
3. `knowledge/equities/foundations/earnings-quality-and-margin-pressure-interpretation-guide.md`

---

## Expected Agent / Category Mapping

| File path | Agent | Agent ID | Admin category | Generate market cases later |
|---|---|---|---|---|
| `knowledge/fx/event-playbooks/dollar-funding-stress-and-intervention-playbook.md` | FX | `fx-agent` | `event_playbooks` | No |
| `knowledge/risk-sentiment/foundations/risk-on-risk-off-transmission-guide.md` | Risk/Sentiment | `risk-sentiment-agent` | `foundations` | No |
| `knowledge/equities/foundations/earnings-quality-and-margin-pressure-interpretation-guide.md` | Equities | `equities-agent` | `foundations` | No |

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
   - select the correct category from the table above
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
- [x] real title stored: `Dollar Funding Stress and Intervention Playbook`
- [x] YAML stripped from stored markdown
- [x] `## Coverage` present
- [x] `## Triggers` present

### Risk/Sentiment

- [x] `status = completed`
- [x] `reviewStatus = approved`
- [x] real title stored: `Risk-On / Risk-Off Transmission Guide`
- [x] YAML stripped from stored markdown
- [x] `## Coverage` present
- [x] `## Triggers` present

### Equities

- [x] `status = completed`
- [x] `reviewStatus = approved`
- [x] real title stored: `Earnings Quality and Margin Pressure Interpretation Guide`
- [x] YAML stripped from stored markdown
- [x] `## Coverage` present
- [x] `## Triggers` present

---

## Naming Mismatch Risk

There are two operator-facing naming mismatches to watch:

- YAML frontmatter uses `doc_type: event-playbook`
- Admin UI category must be selected as `event_playbooks`

and:

- YAML frontmatter uses `doc_type: foundation`
- Admin UI category must be selected as `foundations`

The YAML `doc_type` is documentary only. The stored category comes from the Admin dropdown or POST form field.

For these three files, the correct upload categories are:

- `event_playbooks` for FX
- `foundations` for Risk/Sentiment
- `foundations` for Equities

Do not choose:

- `frameworks`
- `house_view_notes`

---

## What To Verify Before Moving To Validation

- [x] All three files appear in the correct agent knowledge store under the expected categories.
- [x] All three have `status = completed`.
- [x] All three have `reviewStatus = approved`.
- [x] Stored titles use the markdown heading, not the filename slug.
- [x] Stored markdown begins with the title/header block, not raw YAML.
- [x] Metadata sections (`## Coverage`, `## Triggers`) were injected during ingestion.

Wave 2 Batch 3 is ready for validation.
