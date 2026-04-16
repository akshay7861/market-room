# Wave 1 Batch 2 — Upload Runbook

**Date:** 2026-04-10
**Scope:** Upload and approval confirmation for 3 files only
**Prerequisite:** All Batch 1 gate conditions passed (confirmed 2026-04-10)
**Admin API base:** `http://127.0.0.1:8787` (local dev) or your deployed Worker URL

---

## 1. Diagnosis

**Status: Ready to upload now. No blockers.**

Batch 2 is the correct next set. All three files exist with correct YAML frontmatter. The pipeline is confirmed working from Batch 1 — YAML stripping, metadata section injection, topic-aware summaries, and auto-approval all behave correctly. No code changes needed before uploading.

**Why these are the right Batch 2 docs:**

| File | Why now and not in Batch 1 |
|------|---------------------------|
| `yield-curve-mechanics-and-interpretation.md` | Rates foundation — fires on any 8 bps+ Treasury move. Deliberately after `fed-repricing-playbook.md` so the agent has the repricing ladder before learning curve regime classification. Must be uploaded before the Batch 3 term premium doc, which references curve regimes defined here. |
| `opec-and-geopolitical-shock-playbook.md` | OPEC meetings are quarterly; geopolitical events are irregular. Lower trigger frequency than the EIA weekly doc, but the highest-impact event type in Commodities. Correctly follows the EIA inventory foundation so the agent can cross-check OPEC supply claims against inventory reality. |
| `labor-market-deterioration-playbook.md` | NFP monthly + claims weekly = medium trigger frequency. Benefits from `inflation-transmission-mechanisms.md` being active first so the Macro agent can read labour data through the dual-mandate lens rather than treating NFP as a standalone signal. Pairs with Batch 1 Macro doc. |

**Category naming risk (same as Batch 1):** YAML `doc_type` values use hyphens (`foundation`, `event-playbook`). Admin UI uses underscores/plural (`foundations`, `event_playbooks`). Always select the admin UI value.

---

## 2. Batch 2 Upload List

Upload one file at a time. Complete the post-upload verification before uploading the next.

| # | File (full path from repo root) | Agent | Admin category to select | Agent ID | Market cases later |
|---|--------------------------------|-------|--------------------------|----------|--------------------|
| 1 | `knowledge/rates/foundations/yield-curve-mechanics-and-interpretation.md` | Rates | **`foundations`** | `rates-agent` | Yes |
| 2 | `knowledge/commodities/event-playbooks/opec-and-geopolitical-shock-playbook.md` | Commodities | **`event_playbooks`** | `commodities-agent` | Yes |
| 3 | `knowledge/macro/event-playbooks/labor-market-deterioration-playbook.md` | Macro | **`event_playbooks`** | `macro-agent` | Yes |

---

## 3. Category Mapping

| YAML `doc_type` | Select in admin UI |
|-----------------|-------------------|
| `foundation` | `foundations` |
| `event-playbook` | `event_playbooks` |

---

## 4. Exact Admin Upload Steps

Same 6-step workflow as Batch 1. Agent and category change per file.

---

### File 1 — `yield-curve-mechanics-and-interpretation.md` → Rates → `foundations`

**Full path:** `knowledge/rates/foundations/yield-curve-mechanics-and-interpretation.md`

**Step 1.** Open admin panel.
**Step 2.** Find the **Rates Agent** (`rates-agent`).
**Step 3.** Open its AgentKnowledgeManager panel.
**Step 4.** Select **`foundations`** in the Knowledge category dropdown.
**Step 5.** Select the file from disk.
**Step 6.** Submit. Wait for success response.

**Via curl:**
```bash
curl -s -X POST "http://127.0.0.1:8787/api/admin/agents/rates-agent/knowledge-store" \
  -F "category=foundations" \
  -F "files=@knowledge/rates/foundations/yield-curve-mechanics-and-interpretation.md;type=text/markdown"
```

**What gets stored:**
- Title: `"Yield Curve Mechanics and Interpretation"` (from `# Yield Curve Mechanics and Interpretation` heading)
- Summary: `"foundations covering: yield curve, 2s10s, 3m10y, bear steepener."`
- `## Coverage`: yield curve, 2s10s, 3m10y, bear steepener, bull steepener, bear flattener, bull flattener, curve inversion, recession signal, ACM term premium, Greenspan conundrum
- `## Triggers`: 2s10s crossing zero; 3m10y inverted >90 consecutive days; single-session 2s10s move >8 bps; ACM term premium rising >50 bps in 6 weeks; 10-year yield diverging from 2-year by >15 bps on single catalyst
- `review_status`: `approved` immediately
- `category`: `foundations`

**Market cases to generate (after upload confirmed):**
1. Bear flattener during active hiking cycle — agent names the regime and explains what it signals for duration
2. Bull steepener from deep inversion — agent frames as recession-risk onset, not "all clear"
3. Bear steepener with flat 2-year — agent identifies as term premium story, not rate expectations

---

### File 2 — `opec-and-geopolitical-shock-playbook.md` → Commodities → `event_playbooks`

**Full path:** `knowledge/commodities/event-playbooks/opec-and-geopolitical-shock-playbook.md`

**Step 1.** Open admin panel.
**Step 2.** Find the **Commodities Agent** (`commodities-agent`).
**Step 3.** Open its AgentKnowledgeManager panel.
**Step 4.** Select **`event_playbooks`** in the Knowledge category dropdown.
**Step 5.** Select the file from disk.
**Step 6.** Submit. Wait for success response.

**Via curl:**
```bash
curl -s -X POST "http://127.0.0.1:8787/api/admin/agents/commodities-agent/knowledge-store" \
  -F "category=event_playbooks" \
  -F "files=@knowledge/commodities/event-playbooks/opec-and-geopolitical-shock-playbook.md;type=text/markdown"
```

**What gets stored:**
- Title: `"OPEC and Geopolitical Shock Playbook"`
- Summary: `"event playbooks covering: OPEC+, production quotas, compliance, Saudi Arabia swing producer."`
- `## Coverage`: OPEC+, production quotas, compliance, Saudi Arabia swing producer, geopolitical supply shock, Strait of Hormuz, Russia sanctions, Libya disruption, Iran sanctions, fiscal breakeven, non-OPEC supply response, US shale rig count
- `## Triggers`: OPEC+ ministerial meeting announcement; Saudi voluntary cut announcement (incremental vs existing quota); IEA OPEC compliance miss >500 kb/d; supply disruption >500 kb/d confirmed; US rig count rising 3+ consecutive weeks post-OPEC cut; global spare capacity below 1.5 Mb/d
- `review_status`: `approved` immediately
- `category`: `event_playbooks`

**Market cases to generate (after upload confirmed):**
1. Saudi voluntary cut — genuine incremental reduction vs existing quota; agent posts thesis
2. OPEC paper cut — announced reduction with compliance miss; agent posts with caveat
3. Geopolitical headline near oil infrastructure without confirmed production impact — agent stays silent or comments only

---

### File 3 — `labor-market-deterioration-playbook.md` → Macro → `event_playbooks`

**Full path:** `knowledge/macro/event-playbooks/labor-market-deterioration-playbook.md`

**Step 1.** Open admin panel.
**Step 2.** Find the **Macro Agent** (`macro-agent`).
**Step 3.** Open its AgentKnowledgeManager panel.
**Step 4.** Select **`event_playbooks`** in the Knowledge category dropdown.
**Step 5.** Select the file from disk.
**Step 6.** Submit. Wait for success response.

**Via curl:**
```bash
curl -s -X POST "http://127.0.0.1:8787/api/admin/agents/macro-agent/knowledge-store" \
  -F "category=event_playbooks" \
  -F "files=@knowledge/macro/event-playbooks/labor-market-deterioration-playbook.md;type=text/markdown"
```

**What gets stored:**
- Title: `"Labor Market Deterioration Playbook"`
- Summary: `"event playbooks covering: NFP, JOLTS, initial jobless claims, quits rate."`
- `## Coverage`: NFP, JOLTS, initial jobless claims, quits rate, unemployment rate, AHE (average hourly earnings), Sahm Rule, labor market leading indicators, birth-death model
- `## Triggers`: JOLTS openings more than 500k below cycle peak; quits rate below 2.0% (total private); initial claims 4-week MA above 250k and rising; NFP 3-month average below 100k; Sahm Rule triggered
- `review_status`: `approved` immediately
- `category`: `event_playbooks`

**Market cases to generate (after upload confirmed):**
1. JOLTS openings fall >500k from cycle peak + quits rate drops to 1.9% — Step 1–2 signal; agent posts before NFP confirms
2. Sahm Rule trigger — unemployment 3m avg +0.5pp above 12m low; agent posts recession thesis
3. Weak January NFP attributed to weather — agent should comment only, not post a deterioration thesis

---

## 5. Approval Confirmation Checklist

Run after each file upload, before uploading the next.

**Via curl (fastest):**
```bash
# File 1
curl -s "http://127.0.0.1:8787/api/admin/agents/rates-agent/knowledge-processing/jobs" | \
  python3 -c "
import json,sys
data=json.load(sys.stdin)
for job in data.get('jobs',[]):
    for item in job.get('items',[]):
        if 'yield-curve' in item.get('sourceFilename',''):
            print('filename:', item['sourceFilename'])
            print('status:', item['status'])
            print('reviewStatus:', item['reviewStatus'])
            print('title:', item['title'])
            print('summary:', item['summary'])
            md = item.get('distilledMarkdown','') or ''
            print('starts with title:', md.startswith('# Yield'))
            print('has ## Coverage:', '## Coverage' in md)
            print('has ## Triggers:', '## Triggers' in md)
            print('starts with YAML:', md.startswith('---'))
"

# File 2
curl -s "http://127.0.0.1:8787/api/admin/agents/commodities-agent/knowledge-processing/jobs" | \
  python3 -c "
import json,sys
data=json.load(sys.stdin)
for job in data.get('jobs',[]):
    for item in job.get('items',[]):
        if 'opec' in item.get('sourceFilename',''):
            print('filename:', item['sourceFilename'])
            print('status:', item['status'])
            print('reviewStatus:', item['reviewStatus'])
            print('title:', item['title'])
            print('summary:', item['summary'])
            md = item.get('distilledMarkdown','') or ''
            print('starts with title:', md.startswith('# OPEC'))
            print('has ## Coverage:', '## Coverage' in md)
            print('has ## Triggers:', '## Triggers' in md)
            print('starts with YAML:', md.startswith('---'))
"

# File 3
curl -s "http://127.0.0.1:8787/api/admin/agents/macro-agent/knowledge-processing/jobs" | \
  python3 -c "
import json,sys
data=json.load(sys.stdin)
for job in data.get('jobs',[]):
    for item in job.get('items',[]):
        if 'labor-market' in item.get('sourceFilename',''):
            print('filename:', item['sourceFilename'])
            print('status:', item['status'])
            print('reviewStatus:', item['reviewStatus'])
            print('title:', item['title'])
            print('summary:', item['summary'])
            md = item.get('distilledMarkdown','') or ''
            print('starts with title:', md.startswith('# Labor'))
            print('has ## Coverage:', '## Coverage' in md)
            print('has ## Triggers:', '## Triggers' in md)
            print('starts with YAML:', md.startswith('---'))
"
```

**For each file, confirm all five:**

- [ ] `status` = `"completed"`
- [ ] `reviewStatus` = `"approved"`
- [ ] Title is the real document title (not a filename slug)
- [ ] Summary contains real topic keywords (not the generic fallback string)
- [ ] `distilledMarkdown` begins with `# [Title]` — not `---`
- [ ] `## Coverage` present in stored content
- [ ] `## Triggers` present in stored content

---

## 6. Storage Confirmation Checklist (After All Three Uploaded)

- [ ] Rates agent now has 2 approved Wave 1 docs: `Fed Repricing Playbook` + `Yield Curve Mechanics and Interpretation`
- [ ] Commodities agent now has 2 approved Wave 1 docs: `Oil Supply-Demand and Inventory Framework` + `OPEC and Geopolitical Shock Playbook`
- [ ] Macro agent now has 2 approved Wave 1 docs: `Inflation Transmission Mechanisms` + `Labor Market Deterioration Playbook`
- [ ] No file starts with `---` in `distilledMarkdown`
- [ ] No title is a raw filename stem (e.g., `"yield-curve-mechanics-and-interpretation"`)

---

## 7. Field Mapping and Naming Risks

| Risk | Detail | Fix |
|------|--------|-----|
| Wrong category for yield curve doc | YAML says `doc_type: foundation` — admin UI needs `foundations` | Select `foundations` (plural) |
| OPEC doc category confusion | YAML says `doc_type: event-playbook` — admin UI needs `event_playbooks` | Select `event_playbooks` (underscore) |
| Labour doc category confusion | YAML says `doc_type: event-playbook` — admin UI needs `event_playbooks` | Select `event_playbooks` |
| OPEC or labour doc uploaded to wrong agent | Both Commodities and Macro are event-playbook docs — easy to confuse agent | OPEC → commodities-agent, Labour → macro-agent |
| Yield curve doc uploaded to wrong agent | It is a Rates doc only | Confirm agent = Rates before submitting |
| Using "Process and distill" upload mode | These are `.md` files — do not use the processing queue | Use direct knowledge file upload mode only |

---

## 8. Before Moving to Validation Testing

- [ ] All 3 files show `reviewStatus: approved` in their respective agents' jobs endpoints
- [ ] All 3 `distilledMarkdown` values begin with `# [Title]` (not `---`)
- [ ] All 3 summaries contain real topic keywords
- [ ] Rates agent has exactly 2 Wave 1 docs approved; Commodities has 2; Macro has 2

When all four pass: proceed to `wave1_batch2_validation_runbook.md`.
