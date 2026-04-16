# Wave 3 Batch 3 Ingestion Plan

## Batch 3 ingestion table

| filename | agent | doc_type | recommended upload batch | one-line description | generate market cases later | suited for |
|---|---|---|---|---|---|---|
| `knowledge/macro/frameworks/fiscal-policy-and-liquidity-transmission-framework.md` | Macro | framework | Wave 3 Batch 3 | Fiscal/TGA/QT/RRP framework for liquidity impulse and fiscal-monetary conflict. | Yes | both |
| `knowledge/rates/instrument-guides/sofr-fed-funds-ois-market-guide.md` | Rates | instrument-guide | Wave 3 Batch 3 | SOFR/fed funds/OIS guide separating policy repricing from money-market plumbing stress. | Yes | both |
| `knowledge/commodities/event-playbooks/metals-growth-and-energy-transition-playbook.md` | Commodities | event-playbook | Wave 3 Batch 3 | Metals playbook separating growth, monetary, transition, and inventory-squeeze signals. | Yes | both |
| `knowledge/fx/frameworks/em-fx-risk-and-dollar-liquidity-framework.md` | FX | framework | Wave 3 Batch 3 | EM FX framework for carry, reserves, current account, dollar liquidity, and intervention risk. | Yes | both |
| `knowledge/risk-sentiment/frameworks/flows-positioning-and-degrossing-framework.md` | Risk/Sentiment | framework | Wave 3 Batch 3 | Forced-flow framework for crowding, CTA breaks, dealer constraints, and degrossing. | Yes | both |
| `knowledge/equities/frameworks/valuation-growth-quality-factor-framework.md` | Equities | framework | Wave 3 Batch 3 | Equity factor framework for valuation, growth, quality, profitability, leverage, and momentum. | Yes | both |

## Recommended upload sequence

1. Equities factor framework first because stock and factor attribution is the most user-facing gap.
2. Risk/Sentiment flows framework second because it helps explain factor/risk moves without duplicating Equities.
3. Rates SOFR/OIS guide third because it adds front-end precision but is less frequent than auction/CPI/NFP prompts.
4. Macro fiscal/liquidity framework fourth because it builds on Rates and Risk liquidity context.
5. FX EM/dollar-liquidity framework fifth because it is important but episodic.
6. Commodities metals playbook sixth because it completes non-oil coverage but needs careful validation against Equities/miners prompts.

## Market case candidates

| Doc | Case types to generate later |
|---|---|
| Fiscal/liquidity | TGA rebuild risk selloff; RRP drain cushioning QT; coupon-heavy refunding tightening financial conditions |
| SOFR/OIS | Repo spike; SOFR/fed funds dislocation; futures path repricing versus plumbing stress |
| Metals | Copper rally with inventories falling; gold rising against higher real yields; lithium policy rally without supply confirmation |
| EM FX | High carry fails during dollar squeeze; reserve defense; commodity FX diverges from terms of trade |
| Flows/degrossing | Volmageddon-style short-vol unwind; crowded momentum reversal; forced selling despite weak catalyst |
| Equity factors | Revenue beat sold on margin compression; real-yield-driven multiple compression; quality leadership during slowdown |

## Upload guardrails

- Use direct markdown upload only.
- Do not use vector upload.
- Admin category must use backend category values, not YAML `doc_type` strings.
- `framework` maps to `frameworks`.
- `instrument-guide` maps to `instrument_guides`.
- `event-playbook` maps to `event_playbooks`.
- Validate one doc per agent after upload before moving beyond Wave 3.

