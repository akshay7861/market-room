# Wave 3 Batch 1 Validation Runbook

**Status:** Validation passed after one tiny Ask Market fix  
**Validated:** 2026-04-15  
**Scope:** Six Wave 3 Batch 1 coverage-universe maps  
**Vector work:** none

---

## Short Diagnosis

All six Wave 3 Batch 1 docs are uploaded, approved, retrieved, and influencing Ask Market output.

The first validation pass surfaced two small Ask Market issues:

1. Macro prompts containing negated equity language such as "not stocks, not sectors, not equities" still counted those words as positive Equities routing signals.
2. Equities stock/watchlist questions retrieved the right doc, but if the LLM path returned empty, the fallback answer became generic market-snapshot prose instead of a useful stock basket.

Both were fixed with minimal, backward-compatible changes in `marketQuestionsService.ts`.

---

## Validation Prompts

### 1. Equities — Equity universe and stock-name coverage

```text
Equities Agent only: which clean energy stocks and ETFs should I watch today? Give named tickers, split them into direct solar, grid/electrification, battery/lithium, and ETF baskets. Use live quote context if available, and include the main false signal that would make the basket fail.
```

**Expected retrieval trigger:** stocks, ETFs, tickers, solar, grid/electrification, battery/lithium, clean energy.

**Expected doc:** `Equity Universe and Sector Coverage Map`

**Live result:** pass.

Evidence:

- Routed to `Equities Agent`.
- Retrieved `Equity Universe and Sector Coverage Map` as top doc.
- Output gave named baskets: `FSLR`, `ENPH`, `SEDG`, `RUN`, `NEE`, `BEP`, `ETN`, `PWR`, `ALB`, `SQM`, `TAN`, `ICLN`, `QCLN`.
- Output included false signal: higher oil does not automatically make green stocks outperform; real yields and financing conditions matter more.

---

### 2. Commodities — Broad commodity universe, not WTI-only

```text
From a commodities standpoint: do not answer only with WTI. Henry Hub gas storage surprised by -18 bcf versus consensus, European LNG prices are rising, copper is rallying while gold is flat, and Brent backwardation widened. Which commodity markets actually own this signal and which should be handed to Macro or Risk?
```

**Expected retrieval trigger:** Henry Hub, gas storage, LNG, copper, gold, Brent backwardation, handoff.

**Expected doc:** `Commodities Instrument Universe and Driver Map`

**Live result:** pass.

Evidence:

- Routed to `Commodities Agent`.
- Retrieved `Commodities Instrument Universe and Driver Map` as top doc.
- Output separated natural gas/LNG, copper, gold, and Brent/oil curve signals.
- Output did not collapse the answer into WTI-only framing.

---

### 3. Risk/Sentiment — Indicator universe and systemic fragility

```text
From a risk and sentiment standpoint: VIX moved from 14 to 26, VIX9D is above VIX and VIX3M, HY spreads widened 55 bps, equal-weight is breaking below cap-weight, and CFTC positioning was crowded long before the move. Is this isolated volatility or systemic fragility?
```

**Expected retrieval trigger:** VIX, VIX9D, VIX3M, HY spreads, equal-weight, positioning, systemic fragility.

**Expected doc:** `Risk/Sentiment Indicator Universe and Signal Map`

**Live result:** pass.

Evidence:

- Routed to `Risk/Sentiment Agent`.
- Retrieved `Risk/Sentiment Indicator Universe and Signal Map` as top doc.
- Output used volatility term structure, credit confirmation, breadth deterioration, and crowded positioning together.
- Output classified the move as systemic fragility rather than isolated volatility.

---

### 4. FX — Pair universe and driver ownership

```text
From an FX pair standpoint: USD/JPY dropped 1.8 percent while US 2-year yields also fell, AUD/JPY rolled over, DXY is bid, and officials in Japan warned about disorderly FX moves. Which leg and driver own this move: rate differential, safe haven, carry unwind, dollar funding, or intervention risk?
```

**Expected retrieval trigger:** USD/JPY, AUD/JPY, DXY, 2-year yields, carry unwind, intervention risk.

**Expected doc:** `FX Pair Universe and Driver Map`

**Live result:** pass.

Evidence:

- Routed to `FX Agent`.
- Retrieved `FX Pair Universe and Driver Map` as top doc.
- Output identified rate differential unwind, carry/risk sensitivity through AUD/JPY, DXY divergence across crosses, and intervention risk.
- Output treated the move as pair-specific rather than generic dollar commentary.

---

### 5. Rates — Rates instrument ownership and decomposition

```text
From a rates instrument standpoint: the 2-year Treasury rose 13 bps, 10-year rose 6 bps, 5y5y breakevens were flat, SOFR futures repriced the next two FOMC meetings, and TIPS real yields rose. Which rates instrument owns the signal and is this policy path, real yield, breakeven, or term premium?
```

**Expected retrieval trigger:** 2-year Treasury, 10-year, 5y5y breakevens, SOFR futures, TIPS real yields, policy path.

**Expected doc:** `Rates Instrument Universe and Signal Map`

**Live result:** pass.

Evidence:

- Routed to `Rates Agent`.
- Retrieved `Rates Instrument Universe and Signal Map` as top doc.
- Output identified front-end policy-path repricing, confirmed by SOFR futures.
- Output rejected breakeven/inflation compensation as the driver because 5y5y was flat.
- Output described the real-yield channel and did not mislabel the move as term premium.

---

### 6. Macro — Release ownership and handoff

```text
Macro Agent only. This is an economic release question, not stocks, not sectors, not equities. Core CPI beat by 0.1 percentage point, payrolls missed by 90k, JOLTS openings fell 520k over three months, and GDP tracking is unchanged. Which releases are leading versus lagging, what does Macro own, and what should be handed to Rates?
```

**Expected retrieval trigger:** Macro Agent, economic release, CPI, payrolls, JOLTS, GDP, leading versus lagging, Rates handoff.

**Expected doc:** `Macro Indicator Universe and Release Map`

**Live result:** pass after routing negation fix.

Evidence:

- Routed to `Macro Agent`.
- Retrieved `Macro Indicator Universe and Release Map` as top doc.
- Output classified JOLTS as leading, payrolls as lagging/confirmation, CPI as near-term inflation read, and GDP tracking as broader aggregate context.
- Output explicitly separated Macro ownership from Rates front-end repricing.

---

## Logs To Inspect

Use the API terminal or:

```bash
wrangler tail --format pretty | grep -E "\\[routing\\]|\\[knowledge:|\\[memory-inject:"
```

Successful logs look like:

```text
[routing] heuristic top=Equities Agent ...
[knowledge:Equities Agent]   score=158.5 ... cat=instrument_guides title="Equity Universe and Sector Coverage Map"
[knowledge:Equities Agent] injecting 4 snippet(s): "Equity Universe and Sector Coverage Map", ...
[memory-inject:Equities Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration
```

Equivalent top-doc retrieval was observed for all six Batch 1 docs.

---

## Tiny Fix Made During Validation

File changed:

- `apps/api/src/lib/services/marketQuestionsService.ts`

Changes:

- Negated sector frames now suppress explicit-sector and explicit-agent boosts for that sector.
- Equities negation aliases now include `stocks`, `stock`, `sectors`, and `sector`.
- `hasStockIdeaIntent()` returns false when the prompt explicitly negates Equities.
- Equities stock/watchlist fallback now returns a useful thematic basket instead of generic market-snapshot prose.

Why this was necessary:

- The Macro validation prompt intentionally said "not stocks, not sectors, not equities," but routing still gave Equities positive scores for those words.
- The Equities validation retrieved the right doc but fallback output was too generic for a stock-name question.

---

## Success Criteria

Wave 3 Batch 1 is considered validated if:

- all six prompts route to the intended agent,
- each intended Wave 3 Batch 1 doc ranks first,
- output uses the coverage-map logic,
- output includes ownership or handoff behavior,
- no answer collapses into generic market commentary,
- no vector retrieval is involved.

All criteria passed.

---

## Before Moving To Wave 3 Batch 2

The API fix should be deployed before hosted validation.

Then Batch 2 can start:

1. `knowledge/macro/regime-checklists/macro-regime-classification-checklist.md`
2. `knowledge/rates/event-playbooks/treasury-auction-and-supply-playbook.md`
3. `knowledge/commodities/frameworks/natural-gas-and-lng-framework.md`
4. `knowledge/fx/event-playbooks/g10-fx-central-bank-and-real-yield-playbook.md`
5. `knowledge/risk-sentiment/event-playbooks/credit-spread-and-liquidity-stress-playbook.md`
6. `knowledge/equities/event-playbooks/single-stock-movement-interpretation-playbook.md`

---

## Gate Decision

Wave 3 Batch 1 gate is cleared.
