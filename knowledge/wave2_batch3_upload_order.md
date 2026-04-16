# Wave 2 Batch 3 Knowledge Docs — Upload Order

**For:** Human operator using the admin knowledge pipeline  
**Docs:** 3 files across FX, Risk/Sentiment, and Equities  
**Rule:** Upload only after Wave 2 Batch 1 and Batch 2 are active and validated; this batch completes Wave 2

---

## Quick Reference Table

| # | File path | Agent | Doc type | Upload alone or with related files | Likely to create useful market cases | Recommended upload order within Batch 3 |
|---|---|---|---|---|---|---|
| 1 | `knowledge/fx/event-playbooks/dollar-funding-stress-and-intervention-playbook.md` | FX | event-playbook | With related files in same batch, but validate independently | No | 1 |
| 2 | `knowledge/risk-sentiment/foundations/risk-on-risk-off-transmission-guide.md` | Risk/Sentiment | foundation | With related files in same batch, but validate independently | No | 2 |
| 3 | `knowledge/equities/foundations/earnings-quality-and-margin-pressure-interpretation-guide.md` | Equities | foundation | With related files in same batch, but validate independently | No | 3 |

---

## Upload Order By Priority

### 1 · `knowledge/fx/event-playbooks/dollar-funding-stress-and-intervention-playbook.md`

| Field | Value |
|---|---|
| **Agent** | FX |
| **Doc type** | event-playbook |
| **Upload alone or with related files** | Upload in the same batch as the others, but validate on its own prompts |
| **Likely to create useful market cases** | **No** |
| **Recommended upload order within Batch 3** | **1** |

**Why first:**

- highest consequence if missing during live stress
- clearest complement to the active carry and divergence tools
- best prevention doc in the batch because it stops the wrong regime classification

### 2 · `knowledge/risk-sentiment/foundations/risk-on-risk-off-transmission-guide.md`

| Field | Value |
|---|---|
| **Agent** | Risk/Sentiment |
| **Doc type** | foundation |
| **Upload alone or with related files** | Upload in the same batch as the others, but validate on its own prompts |
| **Likely to create useful market cases** | **No** |
| **Recommended upload order within Batch 3** | **2** |

**Why second:**

- strongest synthesis layer for the active positioning and volatility docs
- makes the agent materially better at naming fractured cross-asset regimes
- useful across Market Room and Ask Market, not only on dedicated vol days

### 3 · `knowledge/equities/foundations/earnings-quality-and-margin-pressure-interpretation-guide.md`

| Field | Value |
|---|---|
| **Agent** | Equities |
| **Doc type** | foundation |
| **Upload alone or with related files** | Upload in the same batch as the others, but validate on its own prompts |
| **Likely to create useful market cases** | **No** |
| **Recommended upload order within Batch 3** | **3** |

**Why third:**

- highest value once the regime and leadership layers are already active
- strongest during earnings season and post-earnings interpretation
- complements rather than replaces the top-down regime framework

---

## Post-Upload Retrieval Checklist

Before calling Wave 2 complete, confirm:

- [ ] All three docs show as uploaded and approved in the admin knowledge pipeline.
- [ ] Stored titles use the markdown heading, not filename slugs.
- [ ] Stored summaries are topic-aware rather than generic fallback text.
- [ ] Stored markdown includes `## Coverage` and `## Triggers`.
- [ ] FX retrieval logs show `Dollar Funding Stress and Intervention Playbook` on basis / swap-line / intervention prompts.
- [ ] Risk/Sentiment retrieval logs show `Risk-On / Risk-Off Transmission Guide` on cross-asset risk-regime prompts.
- [ ] Equities retrieval logs show `Earnings Quality and Margin Pressure Interpretation Guide` on earnings-quality / margin-pressure prompts.
- [ ] Output language reflects stress thresholds, fractured-signal logic, or earnings-quality filters from the new docs rather than generic commentary.

---

## Operator Note

Upload these three in one batch, but treat them as three separate validation problems:

- FX should decide whether the dollar move is divergence, funding stress, or intervention credibility.
- Risk/Sentiment should decide whether the market is in canonical risk-off, temporary shock, or fractured transmission.
- Equities should decide whether the quarter is a real quality signal, a low-quality beat, or a margin-compression warning.
