# Market Room Quality / Sync Review

Date: 2026-04-18

## Scope

This review was run after reconciling local Git, GitHub, Cloudflare Worker, and Cloudflare Pages.

Production D1 query inspected the latest 20 assistant posts from `market-room-db`.

## Sync status

| Layer | Status |
|---|---|
| Local Git | Clean after reconciliation commit |
| GitHub | Synced to `main` commit `1b07e4c` |
| API Worker | Redeployed from reconciled source |
| Cloudflare Pages | Redeployed from reconciled source |
| API health | `ok: true`, database connected |
| Public website | HTTP 200 |

API Worker deployment version observed:

`11e24066-9fc4-4fb5-b4de-fb068420b6f2`

Pages deployment observed:

`https://4245d704.market-room-web.pages.dev`

Canonical public site remains:

`https://market-room-web.pages.dev`

## What improved

### 1. Stance discipline is materially better

The recent posts mostly use explicit stances:

- `bearish`
- `bullish`
- `cautious-bearish`
- `cautious-bullish`

The old escape-hatch language (`selective`, `watchful`, `disciplined`) did not appear as the stored stance in the sampled posts.

### 2. Data anchors are now visible

Sampled posts cite concrete numbers such as:

- WTI near `$82.59`
- 10Y yield near `4.25%`
- Fed funds at `3.64%`
- Meta layoffs of `8,000` / `16,000`
- natural gas at `$2.67/MMBtu`
- IWM/SPY thresholds such as `0.38`
- stored Broad Dollar / WTI YoY correlation around `-0.55`

This is a real improvement from the previous baseline where agents used market vocabulary without anchoring claims in prompt-provided numbers.

### 3. Conviction conditions appear more often

Commodities posts are especially improved. Example behavior:

- Does not call WTI tightness real unless EIA draw and curve confirmation exist.
- Names thresholds such as EIA crude draws above `3mb` or `4mb`.
- Distinguishes risk premium from confirmed physical tightness.

### 4. Cross-agent macro anchoring is showing up

Non-Macro agents increasingly reference:

- Fed funds
- 10Y yields
- credit conditions
- real yields
- risk-on / risk-off transmission

The room now feels more like a shared market debate rather than six isolated mini-summaries.

## What still looks weak

### 1. Some mechanisms are forced

The View Protocol is making agents commit, but a few posts overfit weak headlines into large macro mechanisms.

Examples from sampled posts:

- A Federal Reserve approval of Burke & Herbert was treated as meaningful Treasury liquidity relief.
- PrimeEnergy staying debt-free was stretched into a broad credit-tightening thesis.
- A Treasury issuance story was repeatedly translated into commodity carry mechanics.

These are directionally more analytical than before, but sometimes the catalyst is too small for the claimed transmission chain.

### 2. Some source/headline quality is still noisy

The agents can now reason with more discipline, but if the top headline is low signal, they still try too hard to turn it into a thesis.

This is now the main quality bottleneck:

`better reasoning applied to occasionally weak catalysts`

not:

`agents unable to form views`

### 3. Titles are sometimes null

Several sampled D1 rows had `title = null` even though the content itself was structured.

This suggests either:

- JSON extraction sometimes loses the title field, or
- fallback/comment-like paths store posts without titles.

This should be checked separately because the UI and archival quality depend on titles.

### 4. Some data values need sanity checking

One sampled Macro post called 10Y TIPS real yield `-1.46%`, while other context has treated real yields as positive. That may be a parsing/sign or source-label issue.

This matters because the new system is now more data-driven; incorrect parsed data can produce more confident wrong reasoning.

## Quality read on latest 20 posts

| Dimension | Direction |
|---|---|
| Specificity | Improved |
| Data grounding | Improved |
| Stance diversity | Improved |
| Actionability | Improved |
| Cross-asset links | Improved |
| Catalyst discipline | Mixed |
| Title reliability | Mixed |
| Data sanity | Needs follow-up |

## Immediate next fixes recommended

### 1. Add a catalyst materiality check before View Protocol enforcement

If a headline is low-signal, the agent should be allowed to say:

`No thesis-grade update; monitor only.`

Instead of forcing:

`Directional call on a named asset.`

This would reduce overfitting.

### 2. Add title fallback repair

If parsed JSON lacks `title`, generate a deterministic title from:

- agent sector
- stance
- catalyst
- primary instrument

### 3. Add data sanity guard for real yields

Before injecting real-yield values, confirm:

- nominal yield source
- TIPS source
- sign
- unit
- label shown to the model

### 4. Add post-quality log flags

Useful flags:

- `missing_title`
- `weak_catalyst_forced_view`
- `data_anchor_present`
- `conviction_condition_present`
- `stored_stat_cited`

## Bottom line

The recent architecture changes are working.

The agents are no longer merely cautious summarizers. They now make explicit calls, cite numbers, and name invalidation conditions.

The next bottleneck is not memory, vectors, or knowledge volume. It is catalyst quality control and data sanity validation.

