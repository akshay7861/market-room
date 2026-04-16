# Wave 2 Batch 2 Review Summary

## Files Created

1. [central-bank-divergence-playbook.md](/Users/akshaysingh/Documents/New%20project/knowledge/fx/event-playbooks/central-bank-divergence-playbook.md)
2. [volatility-regime-and-fragility-playbook.md](/Users/akshaysingh/Documents/New%20project/knowledge/risk-sentiment/event-playbooks/volatility-regime-and-fragility-playbook.md)
3. [sector-rotation-and-market-leadership-playbook.md](/Users/akshaysingh/Documents/New%20project/knowledge/equities/event-playbooks/sector-rotation-and-market-leadership-playbook.md)

## What Each File Adds

### FX — Central-Bank Divergence Playbook

This gives the FX agent the catalyst layer that sits on top of the Batch 1 carry framework. The key addition is not “central banks matter.” It is the distinction between:

- widening divergence,
- priced-in divergence,
- and convergence / closing trades.

That should materially improve FX output by stopping the agent from treating every hawkish/dovish policy difference as a fresh trade.

### Risk/Sentiment — Volatility Regime and Fragility Playbook

This gives the Risk/Sentiment agent an activation layer on top of the Batch 1 positioning framework. Batch 1 identified fragility conditions; this doc identifies when fragility becomes live through:

- VIX regime shifts,
- term-structure inversion,
- VVIX confirmation,
- and post-spike recovery behavior.

That should improve the agent’s ability to distinguish routine noise from a genuine volatility regime break.

### Equities — Sector Rotation and Market Leadership Playbook

This gives the Equities agent the implementation layer on top of the Batch 1 regime framework. Batch 1 classified the tape; this doc explains how to read:

- broadening versus narrow leadership,
- cyclical versus defensive rotation,
- and rates-driven style moves versus true cycle rotation.

That should make equity outputs feel much more like market interpretation and much less like index-level summary.

## Overlaps or Weak Areas Still Remaining

### Intentional overlaps

- FX overlap with Batch 1 carry framework is intentional because divergence is the catalyst layer for the carry/rate-differential response.
- Risk/Sentiment overlap with the crowding framework is intentional because volatility only becomes high-value when connected to positioning and fragility state.
- Equities overlap with the regime framework is intentional because sector rotation is the implementation layer of the top-level regime call.

### Weak areas still remaining

1. **FX still needs a funding-stress / intervention playbook**
   - Divergence is now covered, but the episodic dollar-scarcity and intervention mechanics still need their own dedicated operating guide.

2. **Risk/Sentiment still needs a risk-on / risk-off transmission guide**
   - Vol and positioning are now covered, but the agent still lacks a clean map for how stress transmits across equities, credit, rates, FX, and crypto.

3. **Equities still needs an earnings-quality / margin-pressure guide**
   - The agent can now classify the regime and leadership, but still needs a dedicated doc for distinguishing real earnings quality from non-GAAP or margin-masking noise.

4. **Historical analog depth is still lighter than Wave 1**
   - These docs include episodes, but the analog extraction layer still needs to be built out more explicitly in the next pass.

## What Batch 3 Will Need To Complete

Wave 2 Batch 3 should complete the three-agent library with:

1. `knowledge/fx/event-playbooks/dollar-funding-stress-and-intervention-playbook.md`
   - completes the FX agent by adding the episodic stress and intervention layer that sits beside carry and divergence.

2. `knowledge/risk-sentiment/foundations/risk-on-risk-off-transmission-guide.md`
   - completes the Risk/Sentiment agent by giving it a proper cross-asset transmission map beneath positioning and vol.

3. `knowledge/equities/foundations/earnings-quality-and-margin-pressure-interpretation-guide.md`
   - completes the Equities agent by giving it a bottom-up earnings-quality filter that can sit underneath regime and leadership analysis.
