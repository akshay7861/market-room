# Wave 1 Batch 1 — Execution Checklist

**Date:** 2026-04-10
**Purpose:** Step-by-step upload and verification guide for the three Batch 1 knowledge docs
**Prerequisite:** Code changes in `agentKnowledgeService.ts` and `knowledgeSnippetService.ts` are deployed (see `wave1_pipeline_readiness.md`)

---

## Batch 1 Upload List

Three files. Upload one at a time. Complete the post-upload verification for each before uploading the next.

| # | File path (under `knowledge/`) | Agent | Admin category to select | Generate market cases |
|---|-------------------------------|-------|--------------------------|----------------------|
| 1 | `rates/event-playbooks/fed-repricing-playbook.md` | Rates | `event_playbooks` | **Yes** |
| 2 | `commodities/foundations/oil-supply-demand-and-inventory-framework.md` | Commodities | `foundations` | **No** |
| 3 | `macro/frameworks/inflation-transmission-mechanisms.md` | Macro | `frameworks` | **Yes** |

---

## Upload Instructions (Per File)

### File 1 — `fed-repricing-playbook.md`

**Full path:** `knowledge/rates/event-playbooks/fed-repricing-playbook.md`
**Agent:** Rates
**Category to select in admin UI:** `event_playbooks`

**Admin workflow:**
```
POST /api/admin/agents/{ratesAgentId}/knowledge-store
  Content-Type: multipart/form-data
  file: fed-repricing-playbook.md
  category: event_playbooks
```

**What the pipeline does on upload:**
- Strips YAML frontmatter
- Sets title to `"Fed Repricing Playbook"` (from the `# Fed Repricing Playbook` heading)
- Sets summary to `"event playbooks covering: Fed funds futures, SOFR futures, rate repricing, hawkish surprise."` (first 4 topics)
- Injects `## Coverage`, `## Triggers`, `## Use When`, `## Instruments` sections into stored content
- Sets `review_status = 'approved'` immediately (no manual step needed)

**Expected retrieval triggers:**
- Any CPI release where core MoM surprise is ≥ ±0.1%
- Any NFP release where the miss/beat is ≥ ±75k with AHE confirming
- Any FOMC meeting day (statement + presser)
- Any session where the 2-year yield moves ≥ 15 bps
- FOMC statement word-level change in forward guidance

**Market cases to generate (do this after upload is confirmed active):**
1. Hot CPI print → which bps threshold does this hit? (agent should name the specific FOMC meetings that repriced, not just "the Fed is hawkish")
2. False pivot scenario: soft data reprices cuts, subsequent data reverses it — agent should post both the initial reprice and the reversal, not silently update
3. FOMC press conference language shift with unchanged statement — agent should detect the presser divergence, not wait for the statement delta

---

### File 2 — `oil-supply-demand-and-inventory-framework.md`

**Full path:** `knowledge/commodities/foundations/oil-supply-demand-and-inventory-framework.md`
**Agent:** Commodities
**Category to select in admin UI:** `foundations`

**Admin workflow:**
```
POST /api/admin/agents/{commoditiesAgentId}/knowledge-store
  Content-Type: multipart/form-data
  file: oil-supply-demand-and-inventory-framework.md
  category: foundations
```

**What the pipeline does on upload:**
- Sets title to `"Oil Supply-Demand and Inventory Framework"`
- Sets summary from first 4 topics (crude oil inventories, WTI, EIA weekly, etc.)
- Injects metadata sections as above
- Auto-approved immediately

**Expected retrieval triggers:**
- Every Wednesday 10:30am ET (EIA weekly petroleum report) — fires 52×/year
- Crude draw or build > 2M bbl vs consensus
- Cushing stock level crosses key thresholds (< 25M bbl = tightness; > 45M bbl = glut)
- Refinery utilization changes > 2pp in a single week
- WTI–Brent spread widens beyond $5/bbl (logistical stress signal)

**Market cases:** Not needed — this is a reference foundation, not an episodic trigger. The doc's value is in preventing misinterpretation of weekly prints, not in generating standalone theses.

---

### File 3 — `inflation-transmission-mechanisms.md`

**Full path:** `knowledge/macro/frameworks/inflation-transmission-mechanisms.md`
**Agent:** Macro
**Category to select in admin UI:** `frameworks`

**Admin workflow:**
```
POST /api/admin/agents/{macroAgentId}/knowledge-store
  Content-Type: multipart/form-data
  file: inflation-transmission-mechanisms.md
  category: frameworks
```

**What the pipeline does on upload:**
- Sets title to `"Inflation Transmission Mechanisms"`
- Sets summary from first 4 topics (CPI, PCE, PPI, supercore)
- Auto-approved immediately

**Expected retrieval triggers:**
- Every CPI release (core MoM surprise ≥ ±0.1%)
- Every PCE release (core MoM ≥ 0.3% or ≤ 0.1%)
- PPI > 0.4% MoM as a leading indicator of CPI pass-through
- Supercore (services ex-shelter) above 0.4% MoM — highest-conviction trigger
- Wage growth (AHE) above 4.5% YoY — triggers wage-spiral assessment

**Market cases to generate:**
1. OER-driven hot CPI headline with flat supercore — agent should classify as noise, not post a new thesis
2. Demand-pull CPI confirmed by AHE > 4.5% — agent should post with the transmission channel named
3. PPI spike without CPI pass-through (tariff analog) — agent should comment only, flag the look-through risk

---

## Post-Upload Verification

Run these checks **after each file is uploaded**, before uploading the next.

### Step 1 — Confirm the job reached `approved` status

```
GET /api/admin/agents/{agentId}/knowledge-processing/jobs
```

Look for the most recent job. Confirm:
- `status` = `"completed"`
- The item inside it has `review_status` = `"approved"`
- `distilled_markdown` is not NULL and is not just a YAML block

If `distilled_markdown` starts with `---`, the frontmatter was not stripped — the old code is still deployed. Redeploy and re-upload.

### Step 2 — Trigger a test discussion

```
POST /api/discussions/run
```

Use a mock market snapshot that matches one of the doc's trigger conditions:

| Doc just uploaded | Test headline to use |
|-------------------|---------------------|
| `fed-repricing-playbook.md` | `"Core CPI came in at +0.4% MoM vs +0.3% consensus — FOMC pricing shifted hawkish"` |
| `oil-supply-demand-and-inventory-framework.md` | `"EIA weekly: crude drew 4.8M bbl vs +0.3M consensus; Cushing fell to 24.2M bbl"` |
| `inflation-transmission-mechanisms.md` | `"Core CPI +0.4% MoM — supercore services ex-shelter rose to 0.46%, wages 4.8% YoY"` |

### Step 3 — Read the decision log

```
GET /api/admin/decision-log
```

Find the most recent entry for the relevant agent. Check:

1. `knowledge_snippets` field — should list at least one doc title matching what you uploaded
2. The excerpt included should be from the document body (not YAML, not the metadata section headers themselves)
3. `is_new_information` — should not be permanently `false` for clearly novel catalyst scenarios

### Step 4 — Read the generated post

Open the post the agent generated. It **passes** if:

| Doc | Pass signals in the post |
|-----|--------------------------|
| `fed-repricing-playbook.md` | Names specific FOMC meetings that repriced; gives bps magnitude; distinguishes statement from presser signal |
| `oil-supply-demand-and-inventory-framework.md` | Cites the crude draw against the 4M bbl threshold; references Cushing level; checks refinery utilization before calling tightness |
| `inflation-transmission-mechanisms.md` | Names the active transmission channel (demand-pull vs OER lag vs cost-push); cites supercore or AHE explicitly; does not post a thesis on an OER-driven print with flat supercore |

**Fails if:**
- Post says "yields rose" without naming the regime
- Post says "CPI was hot" without classifying the channel
- Post treats every EIA draw as a bullish thesis without checking Cushing + utilization
- `knowledge_snippets` field is empty or contains only old generic starter pack docs

---

## Retrieval Logging

`findRelevantKnowledgeSnippets()` now emits structured console logs on every call. In Cloudflare Workers, these appear in `wrangler tail` output or the Dashboard → Workers → Logs view.

**What you will see for a successful retrieval:**

```
[knowledge:Rates Agent] query="core cpi surprise fomc repricing hawkish 2-year yield" pool=1 matched=1
[knowledge:Rates Agent]   score=14.0 cat=event_playbooks title="Fed Repricing Playbook"
[knowledge:Rates Agent] injecting 1 snippet(s): "Fed Repricing Playbook"
```

**What a retrieval miss looks like:**

```
[knowledge:Rates Agent] query="core cpi surprise fomc repricing hawkish 2-year yield" pool=1 matched=0
[knowledge:Rates Agent] no snippets passed score threshold — nothing injected into prompt
```

**What zero approved docs looks like:**

```
[knowledge:Rates Agent] 0 approved docs — retrieval skipped
```

**Reading the score:** Each query token that matches the `## Coverage` or `## Triggers` section scores 3. Each token matching only the title/summary/excerpt scores 2. Category bonus: `event_playbooks` +2, `frameworks` +1.5. A score of 14 from one doc means roughly 4 high-weight metadata token hits — strong retrieval signal.

**To watch live during a test run:**

```bash
wrangler tail --format pretty
```

Filter for `[knowledge:` to isolate retrieval events from other log noise.

---

## What Success Looks Like End-to-End

After all 3 Batch 1 docs are active and a relevant catalyst fires:

**Console log:**
```
[knowledge:Rates Agent] query="cpi inflation surprise fomc dot plot 2-year yield" pool=3 matched=1
[knowledge:Rates Agent]   score=17.0 cat=event_playbooks title="Fed Repricing Playbook"
[knowledge:Rates Agent] injecting 1 snippet(s): "Fed Repricing Playbook"

[knowledge:Macro Agent] query="cpi inflation surprise fomc dot plot 2-year yield" pool=3 matched=2
[knowledge:Macro Agent]   score=15.5 cat=frameworks title="Inflation Transmission Mechanisms"
[knowledge:Macro Agent]   score=9.5 cat=foundations title="..."
[knowledge:Macro Agent] injecting 2 snippet(s): "Inflation Transmission Mechanisms", "..."
```

**Decision log entry:**
```json
{
  "agentName": "Rates Agent",
  "knowledge_snippets": [
    { "title": "Fed Repricing Playbook", "category": "event_playbooks", "excerpt": "..." }
  ],
  "is_new_information": true
}
```

**Agent post contains:**
- "The CPI beat of +0.1% MoM over consensus crosses the repricing threshold. The June meeting shifted from 52% cut probability to 28% — that is a 24 bps implied rate move in a single session."
- "This is demand-pull, not OER lag — supercore at 0.46% MoM with wages at 4.8% confirms the channel. The Macro framing holds."

Not just:
- "CPI came in hot, markets sold off."
- "Yields moved higher on the inflation print."

---

## Before Moving to Batch 2

All three of the following must be true before uploading Batch 2 (docs 4–6):

- [ ] All 3 Batch 1 docs appear in `knowledge-processing/jobs` with `review_status = 'approved'`
- [ ] At least one test discussion has triggered retrieval for each doc (confirmed via console log or decision log)
- [ ] At least one agent post has cited a mechanism-level signal from each doc (not just the headline number)
- [ ] `is_new_information` is `true` for at least one relevant catalyst scenario per agent
- [ ] No agent post contains "yields rose" or "CPI was hot" as the sole thesis
