# Wave 2 Batch 2 Knowledge Docs — Upload Order

**For:** Human operator using the admin knowledge pipeline
**Docs:** 3 files across FX, Risk/Sentiment, and Equities
**Rule:** Upload all three after Wave 2 Batch 1 is active and validated; verify retrieval before starting Batch 3

---

## Quick Reference Table

| # | File path | Agent | Doc Type | Upload alone or with related files | Likely to create useful market cases | Recommended upload order within Batch 2 |
|---|---|---|---|---|---|---|
| 1 | `knowledge/fx/event-playbooks/central-bank-divergence-playbook.md` | FX | event-playbook | With related files in same batch, but validate independently | Yes | 1 |
| 2 | `knowledge/risk-sentiment/event-playbooks/volatility-regime-and-fragility-playbook.md` | Risk/Sentiment | event-playbook | With related files in same batch, but validate independently | Yes | 2 |
| 3 | `knowledge/equities/event-playbooks/sector-rotation-and-market-leadership-playbook.md` | Equities | event-playbook | With related files in same batch, but validate independently | Yes | 3 |

---

## Upload Order By Priority

### 1 · `knowledge/fx/event-playbooks/central-bank-divergence-playbook.md`

| Field | Value |
|---|---|
| **Agent** | FX |
| **Doc type** | event-playbook |
| **Upload alone or with related files** | Upload in the same batch as the others, but validate on its own prompts |
| **Likely to create useful market cases** | **Yes** |
| **Recommended upload order within Batch 2** | **1** |

**Why first:**
- highest trigger frequency in the batch
- strongest immediate live-use improvement for FX
- cleanest dependency chain from Batch 1 carry framework

---

### 2 · `knowledge/risk-sentiment/event-playbooks/volatility-regime-and-fragility-playbook.md`

| Field | Value |
|---|---|
| **Agent** | Risk/Sentiment |
| **Doc type** | event-playbook |
| **Upload alone or with related files** | Upload in the same batch as the others, but validate on its own prompts |
| **Likely to create useful market cases** | **Yes** |
| **Recommended upload order within Batch 2** | **2** |

**Why second:**
- strongest event-layer companion to the Batch 1 positioning doc
- high value during stress or fast repricing sessions
- slightly more state-dependent than the FX divergence doc

---

### 3 · `knowledge/equities/event-playbooks/sector-rotation-and-market-leadership-playbook.md`

| Field | Value |
|---|---|
| **Agent** | Equities |
| **Doc type** | event-playbook |
| **Upload alone or with related files** | Upload in the same batch as the others, but validate on its own prompts |
| **Likely to create useful market cases** | **Yes** |
| **Recommended upload order within Batch 2** | **3** |

**Why third:**
- strong value, but leadership signals usually need persistence
- best used after the Batch 1 Equities regime framework is already active
- cleanly complements, rather than replaces, the top-level regime classifier

---

## Post-Upload Retrieval Checklist

Before starting Wave 2 Batch 3, confirm:

- [ ] All three docs show as uploaded and approved in the admin knowledge pipeline.
- [ ] Stored titles use the markdown heading, not filename slugs.
- [ ] Stored summaries are topic-aware, not generic fallback text.
- [ ] Stored markdown includes `## Coverage` and `## Triggers`.
- [ ] FX retrieval logs show `Central-Bank Divergence Playbook` on FOMC / ECB / BOJ divergence prompts.
- [ ] Risk/Sentiment retrieval logs show `Volatility Regime and Fragility Playbook` on VIX / VVIX / term-structure prompts.
- [ ] Equities retrieval logs show `Sector Rotation and Market Leadership Playbook` on breadth / sector leadership / defensive-rotation prompts.
- [ ] Output language reflects thresholds and trap logic from the new docs, not generic summary commentary.

---

## Operator Note

Upload these three in one batch, but evaluate them as three separate retrieval problems:

- FX should explain whether divergence is widening, priced-in, or closing.
- Risk/Sentiment should explain whether volatility has actually changed the regime.
- Equities should explain whether leadership is broadening, narrowing, or rotating defensively beneath the index.
