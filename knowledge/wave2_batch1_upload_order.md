# Wave 2 Batch 1 Knowledge Docs — Upload Order

**For:** Human operator using the admin knowledge pipeline
**Docs:** 3 files across FX, Risk/Sentiment, and Equities
**Rule:** Upload all three, verify retrieval is firing cleanly, then move to Wave 2 Batch 2

---

## Quick Reference Table

| # | File path | Agent | Doc Type | Upload alone or with related files | Likely to create useful market cases | Recommended first upload batch |
|---|---|---|---|---|---|---|
| 1 | `knowledge/fx/frameworks/carry-and-rate-differential-framework.md` | FX | framework | Alone | Yes | 1 |
| 2 | `knowledge/equities/frameworks/equity-regime-framework-rates-growth-liquidity-earnings.md` | Equities | framework | Alone | Yes | 1 |
| 3 | `knowledge/risk-sentiment/frameworks/positioning-and-crowding-framework.md` | Risk/Sentiment | framework | Alone | Yes | 1 |

---

## Upload Order By Priority

### 1 · `knowledge/fx/frameworks/carry-and-rate-differential-framework.md`

| Field | Value |
|---|---|
| **Agent** | FX |
| **Doc type** | framework |
| **Upload alone or with related files** | Alone |
| **Likely to create useful market cases** | **Yes** |
| **Recommended first upload batch** | **1** |

**Why first:**
- This is the highest-value FX framework in Wave 2 Batch 1.
- It prevents the most common FX interpretation error: calling every USD move a simple rate-differential story.
- It should be active before the FX central-bank divergence playbook is uploaded later.

---

### 2 · `knowledge/equities/frameworks/equity-regime-framework-rates-growth-liquidity-earnings.md`

| Field | Value |
|---|---|
| **Agent** | Equities |
| **Doc type** | framework |
| **Upload alone or with related files** | Alone |
| **Likely to create useful market cases** | **Yes** |
| **Recommended first upload batch** | **1** |

**Why second:**
- This is the Equities agent’s top-level classifier.
- It gives the agent a clean regime answer before Wave 2 adds sector rotation or earnings-quality playbooks.
- It is broad enough to fire frequently during CPI, payroll, Fed, and earnings weeks.

---

### 3 · `knowledge/risk-sentiment/frameworks/positioning-and-crowding-framework.md`

| Field | Value |
|---|---|
| **Agent** | Risk/Sentiment |
| **Doc type** | framework |
| **Upload alone or with related files** | Alone |
| **Likely to create useful market cases** | **Yes** |
| **Recommended first upload batch** | **1** |

**Why third:**
- This gives Risk/Sentiment its first real mechanism framework.
- It is strongest once Macro, Rates, FX, and Equities are already making better claims, because it answers whether those moves are stable or fragile.
- It should still be uploaded in the same batch because it has no hard dependency on another Wave 2 doc.

---

## Which 3 Docs Are Strongest and Should Be Uploaded First?

All three. This file is the Wave 2 Batch 1 upload set.

If a strict internal order is needed:
1. `carry-and-rate-differential-framework.md`
2. `equity-regime-framework-rates-growth-liquidity-earnings.md`
3. `positioning-and-crowding-framework.md`

That order maximizes immediate reasoning lift across FX first, then Equities, then market-structure overlay.

---

## Post-Upload Retrieval Checklist

Complete these checks before starting Wave 2 Batch 2:

- [ ] All three docs show as uploaded and approved in the admin knowledge pipeline.
- [ ] Stored titles are clean document titles, not filename slugs.
- [ ] Stored summaries include topic language, not fallback generic text.
- [ ] Stored markdown includes `## Coverage` and `## Triggers` sections after ingestion.
- [ ] FX retrieval logs show `carry-and-rate-differential-framework.md` on rate-differential, DXY, or funding-stress prompts.
- [ ] Equities retrieval logs show `equity-regime-framework-rates-growth-liquidity-earnings.md` on sharp-yield, earnings, or breadth-divergence prompts.
- [ ] Risk/Sentiment retrieval logs show `positioning-and-crowding-framework.md` on narrow leadership, VIX jump, or credit-divergence prompts.
- [ ] Output language reflects regime classification, thresholds, or trap handling from the uploaded doc, not just generic market commentary.

---

## Operator Note

Upload these three in the same first batch, but validate each one independently afterward. The goal is not only that retrieval fires, but that:

- FX distinguishes carry from funding stress,
- Equities identifies the dominant regime driver,
- Risk/Sentiment names a fragility state or unwind path.
