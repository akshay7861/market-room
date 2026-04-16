# Wave 2 Batch 1 Source Manifest

## Confirmed Folder Structure

The existing folders are already in place for all three Wave 2 Batch 1 agents:

- `knowledge/fx/`
  - `foundations/`
  - `frameworks/`
  - `event-playbooks/`
  - `house-view-notes/`
- `knowledge/risk-sentiment/`
  - `foundations/`
  - `frameworks/`
  - `event-playbooks/`
  - `house-view-notes/`
- `knowledge/equities/`
  - `foundations/`
  - `frameworks/`
  - `event-playbooks/`
  - `house-view-notes/`

## Source Manifest

| agent | doc_title | doc_type | objective | approved source URLs | why these sources were chosen | suggested folder path | suggested filename | priority | status |
|---|---|---|---|---|---|---|---|---|---|
| FX | carry-and-rate-differential-framework | framework | Teach the FX agent how to separate clean carry/rate-differential trades from fragile versions that break under funding stress, volatility shocks, or fast policy repricing. | [BIS Triennial FX Survey](https://www.bis.org/statistics/rpfx25.htm)<br>[Federal Reserve H.10](https://www.federalreserve.gov/releases/h10/current/)<br>[BIS Working Paper 773](https://www.bis.org/publ/work773.pdf)<br>[New York Fed Staff Report 963](https://www.newyorkfed.org/research/staff_reports/sr963.html) | BIS gives market structure and carry/funding context; H.10 gives official FX/rate reference series; BIS WP 773 gives crash-risk and dollar-funding mechanics; NY Fed SR963 adds covered-interest-parity and basis stress logic. | `knowledge/fx/frameworks/` | `carry-and-rate-differential-framework.md` | P1 | todo |
| Risk/Sentiment | positioning-and-crowding-framework | framework | Give the Risk/Sentiment agent a structured way to judge whether positioning is supportive, stretched, crowded, or fragile, and when that should produce a post, update, comment, or silence. | [CFTC Commitments of Traders](https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm)<br>[Federal Reserve Financial Stability Report](https://www.federalreserve.gov/publications/financial-stability-report.htm)<br>[New York Fed - The Low Volatility Puzzle: Are Investors Complacent?](https://libertystreeteconomics.newyorkfed.org/2017/11/the-low-volatility-puzzle-are-investors-complacent.html)<br>[IMF Global Financial Stability Report](https://www.imf.org/en/Publications/GFSR) | CFTC is the core positioning source; the Fed FSR gives the official vulnerability framework; NY Fed adds volatility/complacency logic; IMF GFSR adds crowding and fragility transmission across asset classes. | `knowledge/risk-sentiment/frameworks/` | `positioning-and-crowding-framework.md` | P1 | todo |
| Equities | equity-regime-framework-rates-growth-liquidity-earnings | framework | Teach the Equities agent how to classify the tape by dominant driver so it can distinguish rates-driven compression, growth slowdown, liquidity relief, and earnings-led regimes. | [Federal Reserve Financial Stability Report](https://www.federalreserve.gov/publications/financial-stability-report.htm)<br>[New York Fed Staff Report 714](https://www.newyorkfed.org/research/staff_reports/sr714.html)<br>[BEA Corporate Profits](https://www.bea.gov/data/income-saving/corporate-profits)<br>[BLS Productivity and Costs](https://www.bls.gov/productivity/) | The Fed FSR frames valuation and financial-conditions risk; NY Fed SR714 gives the equity-risk-premium lens; BEA corporate profits gives the margin/profit cycle anchor; BLS productivity and labor-cost data gives the margin-pressure mechanism. | `knowledge/equities/frameworks/` | `equity-regime-framework-rates-growth-liquidity-earnings.md` | P1 | todo |

## Recommended Writing Order

1. `carry-and-rate-differential-framework`
2. `positioning-and-crowding-framework`
3. `equity-regime-framework-rates-growth-liquidity-earnings`

Reason:
- FX should get its core transmission model first.
- Risk/Sentiment should then get its fragility/crowding lens.
- Equities should come third because it benefits from already-defined rates/liquidity/fragility framing.

## Biggest Concept Risk Per Doc

- `carry-and-rate-differential-framework`
  - Biggest risk: collapsing nominal rate differentials, real rate differentials, carry, and dollar funding stress into one story instead of separating them.

- `positioning-and-crowding-framework`
  - Biggest risk: treating crowded positioning as an automatic contrarian trade rather than a fragility condition that still needs a trigger.

- `equity-regime-framework-rates-growth-liquidity-earnings`
  - Biggest risk: turning the framework into a broad essay instead of a decision tree with dominant-driver tests, invalidation signals, and posting thresholds.
