# Wave 3 Batch 3 Review Summary

## Files created

| Agent | File | What it adds |
|---|---|---|
| Macro | `knowledge/macro/frameworks/fiscal-policy-and-liquidity-transmission-framework.md` | Adds fiscal impulse, Treasury cash, TGA, RRP, QT, and liquidity-drain logic so Macro can explain fiscal/liquidity catalysts without duplicating Rates auction mechanics. |
| Rates | `knowledge/rates/instrument-guides/sofr-fed-funds-ois-market-guide.md` | Adds front-end plumbing literacy: SOFR, fed funds, OIS, SOFR futures, repo stress, RRP, and policy-path versus funding-stress separation. |
| Commodities | `knowledge/commodities/event-playbooks/metals-growth-and-energy-transition-playbook.md` | Adds non-energy commodity reasoning across copper, gold, silver, aluminum, lithium, inventories, dollar, real yields, and energy-transition demand. |
| FX | `knowledge/fx/frameworks/em-fx-risk-and-dollar-liquidity-framework.md` | Adds EM FX logic beyond carry: reserves, current account, dollar liquidity, terms of trade, intervention, and external funding vulnerability. |
| Risk/Sentiment | `knowledge/risk-sentiment/frameworks/flows-positioning-and-degrossing-framework.md` | Adds forced-flow logic: crowded positioning, CTA trend breaks, dealer constraints, foreign flows, short-covering, and degrossing. |
| Equities | `knowledge/equities/frameworks/valuation-growth-quality-factor-framework.md` | Adds factor attribution across valuation, growth, quality, profitability, leverage, momentum, and equity risk premium. |

## What Batch 3 adds

Batch 1 taught each agent what it covers. Batch 2 taught high-frequency event interpretation. Batch 3 adds the edge cases that make the agents feel institutional rather than headline-driven:

- Macro can now explain liquidity and fiscal transmission without mislabeling every Treasury headline as macro.
- Rates can separate Fed-path repricing from money-market plumbing stress.
- Commodities can answer metals questions without collapsing back to WTI/oil logic.
- FX can handle EM FX and dollar-liquidity stress instead of treating every currency as G10 carry.
- Risk/Sentiment can identify forced flow and degrossing regimes, not just generic risk-off.
- Equities can attribute stock/sector moves to factor, valuation, quality, or earnings mechanics.

## Overlaps and weak areas

| Area | Intentional overlap | Remaining weakness |
|---|---|---|
| Macro fiscal/liquidity vs Rates auction/SOFR | Macro owns regime and liquidity impulse; Rates owns instrument mechanics. | Needs validation prompts that force the handoff boundary. |
| Rates SOFR/OIS vs FX real-yield/carry | Rates owns front-end market structure; FX owns currency transmission. | FX prompts with `2-year spread` can still be close routing calls. |
| Commodities metals vs Equities miners/transition stocks | Commodities owns spot/futures/inventory; Equities owns company exposure and margin impact. | No dedicated mining-equities doc yet. |
| Risk flows vs Equities factor framework | Risk owns forced selling; Equities owns factor attribution. | Crowded growth selloffs may retrieve both and require clean output behavior. |
| EM FX vs Risk/Sentiment | FX owns currency and external balance; Risk owns systemic stress confirmation. | EM credit/sovereign spread coverage is still lightweight. |

## Tightening pass

The docs were written directly in agent-operator voice:

- Mechanism first, not educational background.
- Trigger tables include post/comment/silence behavior.
- False-positive sections are explicit and non-generic.
- Cross-agent handoffs are named to reduce duplicate posts.
- Each doc has concrete historical episodes but does not become an analog essay.

## What must be true for Wave 3 to be complete

Wave 3 can be considered complete only after Batch 3 is:

- uploaded through the Admin direct markdown workflow,
- approved automatically,
- stored with YAML stripped,
- enriched with `## Coverage` and `## Triggers`,
- retrieved top-1 or top-2 in targeted validation prompts,
- visibly influencing Ask Market output,
- not causing routing regressions or broad-doc contamination.

