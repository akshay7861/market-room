# Wave 2 Batch 1 Knowledge Library — Ingestion Plan

**Generated:** 2026-04-10
**Status:** Ready for upload preparation
**Docs:** 3
**Agents covered:** FX, Risk/Sentiment, Equities
**Retrieval path:** Approved local knowledge retrieval with metadata-aware scoring

---

## Per-File Ingestion Table

| Filename | Agent | Doc Type | Recommended Upload Batch | One-Line Description | Generate Market Cases Later | Suitability |
|---|---|---|---|---|---|---|
| `carry-and-rate-differential-framework.md` | FX | framework | 1 | Separates nominal differential, real differential, and funding/basis stress so the FX agent can tell clean carry from disorderly unwind | Yes | Both |
| `positioning-and-crowding-framework.md` | Risk/Sentiment | framework | 1 | Gives the Risk/Sentiment agent a fragility model that distinguishes healthy risk-on, crowded tape, and forced unwind conditions | Yes | Both |
| `equity-regime-framework-rates-growth-liquidity-earnings.md` | Equities | framework | 1 | Gives the Equities agent a top-level regime classifier for discount-rate, growth, liquidity, and earnings-driven moves | Yes | Both |

---

## Batch Rationale

All three docs belong in **Batch 1** because each agent currently needs its first high-level reasoning framework before the Wave 2 playbooks become useful.

- **`carry-and-rate-differential-framework.md`**
  - Highest-value first FX document.
  - The FX agent needs this before any divergence or funding-stress playbook because it defines the regime hierarchy: funding stability, then real differential, then nominal differential.

- **`positioning-and-crowding-framework.md`**
  - Highest-value first Risk/Sentiment document.
  - The agent needs a way to classify whether tape fragility is background, rising, or active before a volatility-specific playbook can add value.

- **`equity-regime-framework-rates-growth-liquidity-earnings.md`**
  - Highest-value first Equities document.
  - The agent needs a regime decision tree before sector-rotation or earnings-quality documents can be interpreted correctly.

These are all **framework docs**, not niche event notes. They should be active first so later event-playbooks can attach to a stable top-level classifier.

---

## Generate Market Cases — Detail

All three docs should produce market cases later because each includes repeatable regime patterns and historical triggers that can become reusable analog entries.

| Doc | Suggested case types |
|---|---|
| `carry-and-rate-differential-framework.md` | (1) Rate differential widens but spot fails because basis stress emerges; (2) Clean carry regime where front-end spreads and spot confirm; (3) USDJPY macro-correct but intervention-risk-distorted episode |
| `positioning-and-crowding-framework.md` | (1) Narrow leadership + low vol + widening credit before de-grossing; (2) Crowded bearish positioning leading to upside squeeze; (3) Fragile equilibrium where modest catalyst creates disproportionate gap response |
| `equity-regime-framework-rates-growth-liquidity-earnings.md` | (1) Rates-driven multiple compression in long-duration growth; (2) Falling yields that are bearish because growth is breaking; (3) Liquidity-relief rally that later fails without earnings confirmation |

---

## Which 3 Docs Are Strongest and Should Be Uploaded First?

These three are the full Wave 2 Batch 1 set, and all should be uploaded first. If priority inside the batch matters, use this order:

**1. `carry-and-rate-differential-framework.md`**
- Strongest pure mechanism document in the batch.
- Most likely to prevent a common agent failure: treating every dollar move as a Fed story.
- The funding-stability → real-differential → nominal-differential hierarchy is immediate live-run value.

**2. `equity-regime-framework-rates-growth-liquidity-earnings.md`**
- Strongest top-level classification document.
- Prevents the Equities agent from defaulting to broad “sentiment” language.
- Gives the room a cleaner answer to whether equities are trading discount rate, growth fear, liquidity relief, or earnings breadth.

**3. `positioning-and-crowding-framework.md`**
- Strongest market-structure document.
- Turns Risk/Sentiment from reactive commentary into fragility analysis.
- Especially valuable when the room already has Macro/Rates/Equities posts and needs the “how vulnerable is this move?” answer.

---

## Analog-Case Extraction Candidates

These historical examples are strong enough to flag for future analog extraction after upload:

| Doc | Episode type | Candidate direction |
|---|---|---|
| `carry-and-rate-differential-framework.md` | Carry-friendly rate divergence that later fails under funding stress | FX analog |
| `carry-and-rate-differential-framework.md` | Intervention-sensitive USDJPY move despite supportive rate spread | FX analog |
| `positioning-and-crowding-framework.md` | Late-stage narrow leadership before volatility reset | Risk/Sentiment analog |
| `positioning-and-crowding-framework.md` | Defensive crowding unwound by upside squeeze | Risk/Sentiment analog |
| `equity-regime-framework-rates-growth-liquidity-earnings.md` | Falling yields that fail to help equities because revisions collapse | Equities analog |
| `equity-regime-framework-rates-growth-liquidity-earnings.md` | Liquidity-relief rally that broadens only after earnings confirmation | Equities analog |

---

## Post-Upload Retrieval Checklist

After these docs are uploaded and approved, verify the following before moving to Wave 2 Batch 2:

- [ ] FX outputs distinguish policy divergence from funding stress instead of calling every USD move a carry story.
- [ ] Risk/Sentiment outputs identify a failure mode such as drift exhaustion, air pocket lower, squeeze, or forced unwind, rather than generic “fragile tape” language.
- [ ] Equities outputs classify the tape by dominant driver and do not collapse everything into “rates pressure” or “better sentiment.”
- [ ] Retrieved knowledge logs show the correct file title for FX, Risk/Sentiment, and Equities prompts when relevant catalysts are tested.
- [ ] Agent outputs cite at least one threshold, regime condition, or false-signal rule traceable to the uploaded doc.

---

## Notes

- These docs are best suited for **both** immediate upload and later analog-case extraction.
- No vector work is required for this batch.
- The main validation goal is not just retrieval firing; it is seeing regime language and trap-handling logic show up in live output.
