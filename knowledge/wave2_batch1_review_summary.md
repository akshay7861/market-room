# Wave 2 Batch 1 Review Summary

## Files Created

1. [carry-and-rate-differential-framework.md](/Users/akshaysingh/Documents/New%20project/knowledge/fx/frameworks/carry-and-rate-differential-framework.md)
2. [positioning-and-crowding-framework.md](/Users/akshaysingh/Documents/New%20project/knowledge/risk-sentiment/frameworks/positioning-and-crowding-framework.md)
3. [equity-regime-framework-rates-growth-liquidity-earnings.md](/Users/akshaysingh/Documents/New%20project/knowledge/equities/frameworks/equity-regime-framework-rates-growth-liquidity-earnings.md)

## What Each File Adds

### FX — Carry and Rate Differential Framework

This gives the FX agent its first real regime classifier. The main value is not “high rate beats low rate.” The value is separating:

- nominal differential,
- real differential,
- and funding/basis stress.

That distinction should materially improve FX posting quality because it stops the agent from calling every dollar move a policy-divergence story.

### Risk/Sentiment — Positioning and Crowding Framework

This gives the Risk/Sentiment agent a real structural purpose. Instead of posting generic “fragile tape” language, it now has a framework for:

- differentiating stretched from truly crowded,
- identifying when crowding matters,
- and deciding when fragility is active enough to justify a post instead of a comment.

### Equities — Equity Regime Framework: Rates, Growth, Liquidity, Earnings

This gives the Equities agent the missing top-level decision tree. The doc teaches it to classify whether the tape is currently driven by:

- discount-rate pressure,
- growth deterioration,
- liquidity relief,
- or earnings/margin support.

That should improve the agent’s ability to avoid generic “stocks up/down because sentiment” explanations.

## Overlaps or Weak Areas Still Remaining

### Intentional overlaps

- FX and Equities both reference rates and liquidity because those are legitimate cross-asset bridges.
- Risk/Sentiment overlaps with Equities on breadth and leadership quality because that is a real market-structure intersection.

These overlaps are acceptable because each doc still answers a different question:

- FX: what is driving the currency move?
- Risk/Sentiment: how fragile is the positioning environment?
- Equities: what is the dominant driver of the equity tape?

### Weak areas still remaining

1. **FX still needs a policy-divergence playbook**
   - The framework explains carry regimes, but not yet the central-bank sequencing logic for divergence episodes.

2. **Risk/Sentiment still needs an explicit volatility regime playbook**
   - The crowding framework references volatility, but does not yet give a dedicated “vol shock / vol suppression / fragility activation” operating guide.

3. **Equities still needs sector and leadership implementation logic**
   - The regime framework tells the agent what the tape is, but not yet how to translate that into sector rotation and leadership-quality conclusions.

4. **All three agents still need more historical analog depth**
   - The docs include episodes, but not yet a proper analog library in the same way Macro / Rates / Commodities now have Wave 1 examples.

## Which Wave 2 Batch 2 Docs Should Come Next

Recommended Batch 2:

1. `knowledge/fx/event-playbooks/central-bank-divergence-playbook.md`
   - Natural next layer after carry framework.
   - Gives the FX agent a clean way to interpret ECB/Fed/BoJ/BoE divergence without collapsing everything into carry.

2. `knowledge/risk-sentiment/event-playbooks/volatility-regime-and-fragility-playbook.md`
   - Best companion to positioning and crowding.
   - Converts fragility from a condition into an event-driven operating playbook.

3. `knowledge/equities/event-playbooks/sector-rotation-and-market-leadership-playbook.md`
   - Best second-layer doc for Equities.
   - Lets the agent convert regime classification into actionable sector and breadth interpretation.
