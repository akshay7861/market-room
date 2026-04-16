# Wave 2 Batch 2 Knowledge Library — Ingestion Plan

**Generated:** 2026-04-10
**Status:** Ready for upload preparation
**Docs:** 3
**Agents covered:** FX, Risk/Sentiment, Equities
**Dependency:** Wave 2 Batch 1 must already be active for the same agents

---

## Per-File Ingestion Table

| Filename | Agent | Doc Type | Recommended Upload Batch | One-Line Description | Generate Market Cases Later | Suitability |
|---|---|---|---|---|---|---|
| `central-bank-divergence-playbook.md` | FX | event-playbook | 2 | Gives the FX agent the catalyst framework for widening, priced-in, and closing divergence trades across major central banks | Yes | Both |
| `volatility-regime-and-fragility-playbook.md` | Risk/Sentiment | event-playbook | 2 | Gives the Risk/Sentiment agent an operating guide for when fragility becomes active through VIX, VVIX, and term-structure shifts | Yes | Both |
| `sector-rotation-and-market-leadership-playbook.md` | Equities | event-playbook | 2 | Gives the Equities agent the leadership-quality and sector-rotation layer needed to translate regime into actual tape behavior | Yes | Both |

---

## Batch Rationale

All three docs belong in **Wave 2 Batch 2** because they are catalyst and implementation playbooks layered directly on top of the already-active Batch 1 frameworks.

- **`central-bank-divergence-playbook.md`**
  - depends on the Batch 1 FX carry framework because divergence is the catalyst and carry/rate-differential response is the transmission mechanism.

- **`volatility-regime-and-fragility-playbook.md`**
  - depends on the Batch 1 Risk/Sentiment positioning framework because vol regime breaks matter most when they activate existing crowding or fragility.

- **`sector-rotation-and-market-leadership-playbook.md`**
  - depends on the Batch 1 Equities regime framework because leadership and sector behavior are the implementation layer of the top-level regime call.

These should be uploaded only after Batch 1 is already approved and retrieval-cleared, which is now true.

---

## Generate Market Cases — Detail

All three should generate market cases later because each doc contains recurring market episode structure that can become analog entries.

| Doc | Suggested case types |
|---|---|
| `central-bank-divergence-playbook.md` | (1) Fed-led widening divergence that eventually stalls as spot stops confirming; (2) BOJ normalization episode with outsized USDJPY repricing; (3) ECB catch-up surprise that starts a convergence trade |
| `volatility-regime-and-fragility-playbook.md` | (1) VIX jumping above 25 from a sub-15 base with crowding already present; (2) VIX term-structure inversion without immediate crisis follow-through; (3) high-VIX but falling-VIX recovery phase that proves bullish only after breadth confirms |
| `sector-rotation-and-market-leadership-playbook.md` | (1) narrow leadership under a stable headline index; (2) defensive rotation under worsening credit; (3) broadening cyclical confirmation after a previously narrow tape |

---

## Which 3 Docs Are Strongest and Should Be Uploaded First?

All three are the Wave 2 Batch 2 set, but if priority within the batch matters:

**1. `central-bank-divergence-playbook.md`**
- strongest pure event-playbook in the batch
- likely highest trigger frequency because it fires on every major G10 central-bank meeting
- most likely to immediately improve FX post quality

**2. `volatility-regime-and-fragility-playbook.md`**
- strongest fragility-activation doc
- highly valuable during fast selloffs because it tells the room whether volatility has actually changed the regime

**3. `sector-rotation-and-market-leadership-playbook.md`**
- strongest implementation-layer doc for equities
- valuable, but slightly more dependent on persistence and follow-through than the other two

---

## Analog-Case Extraction Candidates

| Doc | Episode type | Candidate direction |
|---|---|---|
| `central-bank-divergence-playbook.md` | 2014-2015 Fed vs ECB widening divergence | FX analog |
| `central-bank-divergence-playbook.md` | 2024-2025 BOJ normalization and USDJPY instability | FX analog |
| `volatility-regime-and-fragility-playbook.md` | 2018 low-vol complacency break / volmageddon | Risk/Sentiment analog |
| `volatility-regime-and-fragility-playbook.md` | 2020 crisis vol regime and de-risking cascade | Risk/Sentiment analog |
| `sector-rotation-and-market-leadership-playbook.md` | 2022 defensive + energy leadership under rate pressure | Equities analog |
| `sector-rotation-and-market-leadership-playbook.md` | 2023-2024 mega-cap narrow leadership | Equities analog |

---

## Post-Upload Retrieval Checklist

After Batch 2 is uploaded and approved, verify the following before moving to Batch 3:

- [ ] FX outputs distinguish new divergence from already-priced divergence and from closing convergence trades.
- [ ] Risk/Sentiment outputs distinguish ordinary vol noise from active stress and crisis regimes.
- [ ] Equities outputs distinguish broadening leadership from narrow leadership and defensive rotation.
- [ ] Logs show the correct Batch 2 doc title being retrieved on central-bank, volatility, and sector-rotation prompts.
- [ ] Outputs cite at least one explicit threshold, regime state, or false-signal rule that comes from the new playbook.

---

## Notes

- All three docs are best suited for **both** immediate upload and later analog-case extraction.
- No vector work is needed for this batch.
- The validation bar should be the same as Batch 1: retrieval must be visible in both logs and agent reasoning quality.
