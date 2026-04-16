# Wave 2 Batch 3 Ingestion Plan

| filename | agent | doc_type | recommended upload batch | one-line description | generate market cases later | better suited for |
|---|---|---|---|---|---|---|
| `dollar-funding-stress-and-intervention-playbook.md` | FX | event-playbook | Batch 3 | Distinguishes divergence-driven USD moves from true dollar scarcity and judges intervention credibility. | No | immediate knowledge upload |
| `risk-on-risk-off-transmission-guide.md` | Risk/Sentiment | foundation | Batch 3 | Encodes the cross-asset map for identifying standard versus fractured risk-on / risk-off regimes. | No | both |
| `earnings-quality-and-margin-pressure-interpretation-guide.md` | Equities | foundation | Batch 3 | Gives the Equities agent a bottom-up filter for separating clean earnings from low-quality beats and margin decay. | No | both |

## Notes

### FX — `dollar-funding-stress-and-intervention-playbook.md`

- Best used immediately because it prevents a costly classification error during episodic stress.
- Not the best market-case generator right now because the main value is live diagnosis and intervention credibility, not frequent analog retrieval.

### Risk/Sentiment — `risk-on-risk-off-transmission-guide.md`

- Strong immediate utility because it improves broad cross-asset reading.
- Also a good analog extraction candidate later because the fractured-regime examples can become reusable stress templates.

### Equities — `earnings-quality-and-margin-pressure-interpretation-guide.md`

- Strong immediate utility for Ask Market and earnings-season prompts.
- Also a strong later analog candidate because low-quality-beat and margin-compression episodes recur by sector and regime.
