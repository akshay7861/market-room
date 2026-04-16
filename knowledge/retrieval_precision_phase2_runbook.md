# Retrieval Precision Phase 2 Runbook

**Date:** 2026-04-10  
**Scope:** Final small non-vector retrieval precision pass after the refreshed no-go vector audit

## 1. Files Changed

### Code

- `/Users/akshaysingh/Documents/New project/apps/api/src/lib/services/knowledgeSnippetService.ts`

### Docs

- `/Users/akshaysingh/Documents/New project/knowledge/retrieval_precision_phase2_plan.md`
- `/Users/akshaysingh/Documents/New project/knowledge/retrieval_precision_phase2_runbook.md`

## 2. Ranking Adjustments Made

### Added narrow intent-vs-doc boosts

The scorer now gives small additional boosts when the query clearly matches a doc family:

- FX funding stress
- FX carry
- FX divergence
- Equities regime
- Equities leadership

This is intentionally narrow. It is not a broad semantic system.

### Added off-topic penalty for FX funding-stress

If the query is really a carry / rate-differential question and does **not** show basis / funding / intervention stress, the funding-stress playbook is lightly penalized.

Observed win:

- the prior fragile FX payroll/Fed prompt changed from:
  - funding stress first
  - divergence second

to:

- `Central-Bank Divergence Playbook` first
- `Dollar Funding Stress and Intervention Playbook` second
- `Carry and Rate Differential Framework` close behind

### Added regime-vs-leadership tie-break

Explicit regime-heavy Equities prompts now give a small extra boost to the regime framework.

Observed win:

- the Equities regime prompt changed from an exact tie
  - `Sector Rotation and Market Leadership Playbook`
  - `Equity Regime Framework`

to:

- `Equity Regime Framework` first
- `Sector Rotation and Market Leadership Playbook` second

## 3. Excerpt-Selection Adjustments Made

### Stronger preference for mechanism prose

In `scorePassage()`:

- `Core mechanism` now gets a larger boost
- `What to watch` and `How this should affect agent behavior` keep a positive preference

### Stronger penalties for low-value operational blocks

The scorer now more aggressively penalizes:

- `Checklist`
- bullet-heavy passages
- source / operations-style bullets
- table-heavy passages

### Better section-label detection

`buildCandidatePassages()` now detects headings that share the same block as their content.

This matters because some uploaded docs store `## Heading` plus bullets in a single block; previously those were labeled only as generic `block`, so the section penalties and boosts did not apply.

## 4. Fallback Contamination Controls Added

### New weak-4th-slot gate

When:

- the first three selected snippets are already strong
- the next candidate is broad fallback context
- the score gap is meaningful

the 4th snippet is skipped rather than injected.

Observed wins:

- FX funding-stress query now injects only 3 snippets:
  - `Dollar Funding Stress and Intervention Playbook`
  - `Carry and Rate Differential Framework`
  - `Central-Bank Divergence Playbook`
- Macro inflation query now injects only 3 snippets:
  - `Inflation Transmission Mechanisms`
  - `Labor Market Deterioration Playbook`
  - `Central Bank Reaction Function Framework`

instead of appending a weak historical fallback in the 4th slot.

## 5. Logs To Inspect

`[knowledge:*]` logs now show:

- total score
- base score
- adjustments
- excerpt label
- excerpt score

Example:

```text
[knowledge:FX Agent]   score=100.0 base=97.0 cat=event_playbooks excerpt=cross-asset implications:19.5 adj=+event-query title="Central-Bank Divergence Playbook" excerpt="..."
```

New fallback-skip logs:

```text
[knowledge:Macro Agent] skipped fallback title="Macro historical starter pack — durable foundations for regime comparison" reason=weak-fourth-slot score=66.0
```

What to look for:

- top doc now beats the runner-up for the prior fragile FX prompt
- regime framework now beats leadership playbook on the regime-heavy Equities prompt
- fallback skips appear when the first three docs are already strong

## 6. How To Validate Improvement

### Prompt 1 — FX prior-fragile query

```text
NFP +178k sustains the Fed's hawkish grip and keeps long-end yields supported. For FX, does this still argue for dollar strength via carry and rate differentials, or is that the wrong frame now?
```

Expected:

- route to `FX Agent`
- top doc = `Central-Bank Divergence Playbook` or `Carry and Rate Differential Framework`
- funding-stress no longer wins by default

### Prompt 2 — FX funding-stress query

```text
For the FX desk: DXY is up 1.4% in two sessions, EUR/USD cross-currency basis just widened to -34 bps outside quarter-end, USD/JPY basis is also deteriorating, and traders are talking about Fed swap-line usage if funding stress worsens. Is this still just a hawkish-dollar move, or has the regime shifted into real dollar funding stress?
```

Expected:

- top doc = `Dollar Funding Stress and Intervention Playbook`
- first three snippets all sharp
- weak legacy 4th slot skipped

### Prompt 3 — Equities regime prompt

```text
From an equities regime standpoint: 10-year real yields rose 17 bps in a week, equal-weight is lagging the cap-weighted S&P for five sessions, HY spreads are 22 bps wider, but the index is holding up on a handful of mega-cap leaders while earnings revisions outside that group are softening. Is this still a liquidity-relief rally, or has the tape shifted into rates-driven compression or a late-cycle narrow leadership regime?
```

Expected:

- top doc = `Equity Regime Framework: Rates, Growth, Liquidity, Earnings`
- leadership playbook remains second

### Prompt 4 — Macro inflation prompt

```text
Core CPI came in at +0.4% MoM vs +0.3% consensus. Supercore — services ex-shelter — rose to 0.46% MoM. Average hourly earnings are running at 4.8% YoY. What is the active inflation transmission channel here?
```

Expected:

- top three docs remain strong
- weak historical fallback is skipped

## 7. What Still Remains Unresolved After This Phase

This phase improves precision, but it does **not** solve everything:

- some excerpts can still be merely adequate rather than ideal
- some table-heavy sections can still win when they contain the densest trigger language
- broad approved pools still exist; this code only suppresses them conditionally
- true semantic misses are still not the main issue, but this phase does not address them directly

## 8. Validation Snapshot

Observed after implementation:

- API typecheck / dry-run deploy check passed:
  - `npm run check --workspace @market-room/api`
- FX prior-fragile prompt:
  - `Central-Bank Divergence Playbook` ranked first
  - funding-stress moved below it
- Equities regime prompt:
  - `Equity Regime Framework` ranked first
  - leadership playbook ranked second
- FX funding-stress prompt:
  - funding-stress remained top-1
  - weak fallback 4th slot skipped
- Macro inflation prompt:
  - top three sharp docs injected
  - weak historical fallback skipped
