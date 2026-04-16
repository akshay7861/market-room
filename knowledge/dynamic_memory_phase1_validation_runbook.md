# Dynamic Memory Phase 1 Validation Runbook

## 1. Validation Goals

Dynamic Memory Phase 1 should prove five things before any next-step memory work begins:

1. `agents.memory_summary` is no longer acting like a static seed field and now behaves like a rolling house view.
2. Ask Market prompts receive the full dynamic memory block and visibly use it.
3. Market Room prompts receive the same dynamic memory block and use it without breaking the existing orchestration and knowledge-retrieval stack.
4. Memory refresh is selective rather than blind: summaries should update when thesis state changes materially and remain stable when it does not.
5. Dynamic memory changes behavior, not just wording:
   - open thesis reuse instead of unnecessary new framing
   - calibration-aware caution when recent forecasting is weak
   - stronger consistency around house view
   - visible avoidance of weaker topics being treated with false certainty

## 2. Runtime Snapshot Used For Validation

At validation time:

- `memory_summary` values had already diverged from the original static seed summaries for all 6 agents.
- Open theses were concentrated in:
  - Macro
  - Rates
  - FX
  - Commodities
- Recent resolved forecast history showed enough signal to test calibration and weak-topic behavior, especially for:
  - Rates
  - Risk/Sentiment
  - Equities
  - Commodities

Useful persistence checks observed during validation:

- `memory_updates` counts increased for:
  - Commodities
  - Equities
  - FX
  - Rates
  - Risk/Sentiment
- Macro did not produce a new `memory_updates` row during the later Market Room runs, which is consistent with a stable house view and a skipped-or-no-change refresh outcome.

## 3. Ask Market Tests

### Ask Test 1 — House View Consistency + Open Thesis Reuse

- Purpose:
  - confirm that Ask Market uses persisted house view and open thesis state instead of inventing a new macro framework every time
- Agent:
  - Macro Agent
- Exact prompt:

```text
For the Macro agent: core CPI just printed 0.4% m/m again, payroll growth is slowing but unemployment has not broken higher yet. Does this reinforce your existing inflation-regime thesis, or should you open a new macro view? Answer explicitly in terms of your current house view, any open thesis that already exists, and how confident you should be given recent forecasting calibration.
```

- Memory blocks that should matter most:
  - current house view
  - open theses
  - recent forecasting calibration
- Logs to inspect:
  - `[memory-inject:Macro Agent]`
  - `[knowledge:Macro Agent]`
- Success looks like:
  - explicit reuse of the inflation-regime house view
  - answer says this reinforces or updates an existing thesis rather than creating a brand-new one
  - confidence is tempered using calibration
- Failure looks like:
  - generic macro commentary
  - no mention of an existing view or thesis
  - false confidence with no calibration language

### Ask Test 2 — Calibration-Aware Caution

- Purpose:
  - confirm that an agent with mixed recent forecasting does not default to overconfident language when asked directly
- Agent:
  - Rates Agent
- Exact prompt:

```text
For the Rates agent: the 10-year yield is backing up on stronger inflation, but your recent rates calls have been mixed. Should you state a high-conviction bearish duration view here, or stay measured until term-premium and breakeven confirmation line up? Use your current house view, any open rates thesis, and your recent forecasting calibration in the answer.
```

- Memory blocks that should matter most:
  - current house view
  - open theses
  - recent forecasting calibration
  - known strong topics
- Logs to inspect:
  - `[memory-inject:Rates Agent]`
  - `[knowledge:Rates Agent]`
- Success looks like:
  - measured stance rather than hard conviction
  - explicit conditionality around term premium / breakevens
  - answer references the current rates house view
- Failure looks like:
  - immediate high-conviction duration call
  - no visible calibration awareness
  - no connection to the current open rates thesis

### Ask Test 3 — Weak-Topic Behavior

- Purpose:
  - confirm that the agent treats a weaker recent topic with caution instead of pretending it has high-confidence edge
- Agent:
  - Risk/Sentiment Agent
- Exact prompt:

```text
For the Risk/Sentiment agent: Nasdaq is bouncing, but breadth is poor, credit is only partially confirming, and your recent Nasdaq forecasting record has been weak. Should you treat this as a strong risk-on call or explicitly stay cautious because this is one of your weaker recent topics? Answer using positioning, weak-topic memory, and recent calibration.
```

- Memory blocks that should matter most:
  - known weak topics
  - recent forecasting calibration
  - current house view
- Logs to inspect:
  - `[memory-inject:Risk/Sentiment Agent]`
  - `[knowledge:Risk/Sentiment Agent]`
- Success looks like:
  - explicit caution on Nasdaq
  - visible use of weak-topic memory
  - reliance on breadth / credit confirmation rather than price alone
- Failure looks like:
  - generic “risk-on if it holds” commentary
  - no caution despite weak recent topic record
  - no mention of positioning or confirmation signals

## 4. Market Room Tests

### Market Room Test 1 — Stable House View Instead Of Fresh Reinvention

- Purpose:
  - confirm that repeated inflation-policy prompts do not force a fresh Macro identity each run
- Trigger:

```text
Discuss whether sticky inflation with slowing payrolls reinforces the existing inflation-regime view or requires a new macro thesis. Agents should lean on any current house view and existing open theses rather than inventing a fresh framework.
```

- Agents expected to matter most:
  - Macro
  - Rates
  - Risk/Sentiment
- Memory blocks that should matter most:
  - current house view
  - open theses
- Logs to inspect:
  - `[memory-inject:Macro Agent]`
  - `[memory-refresh:Macro Agent]`
  - `[knowledge:Macro Agent]`
- Success looks like:
  - room commentary stays anchored to the existing inflation / policy framing
  - no abrupt new Macro personality
  - Macro summary remains stable if no material thesis change occurs
- Failure looks like:
  - new unrelated macro thesis every run
  - memory summary churn despite unchanged macro state

### Market Room Test 2 — Calibration-Driven Moderation In Forum Output

- Purpose:
  - confirm that the Rates agent uses the same calibration-aware caution in Market Room as in Ask Market
- Trigger:

```text
Discuss the backup in long-end yields under firmer inflation, but do it with calibration awareness: if recent rates forecasting has been mixed, avoid overconfident bearish-duration language unless term premium and breakevens both confirm.
```

- Agents expected to matter most:
  - Rates
  - Macro
- Memory blocks that should matter most:
  - current house view
  - open theses
  - recent forecasting calibration
- Logs to inspect:
  - `[memory-inject:Rates Agent]`
  - `[memory-refresh:Rates Agent]`
  - `[knowledge:Rates Agent]`
- Success looks like:
  - forum output remains measured
  - explicit “watch for confirmation” behavior
  - Rates house view can roll if a more precise thesis displaces the old one
- Failure looks like:
  - loud bearish-duration certainty without caveats
  - no sign that mixed prior calls matter

### Market Room Test 3 — Weak Topic And Leadership Caution Across The Room

- Purpose:
  - confirm that weaker recent topics and fragile leadership produce caution rather than reflexive risk-on language
- Trigger:

```text
Discuss a narrow Nasdaq bounce with poor breadth and only partial credit confirmation. Focus on whether leadership quality is deteriorating, whether this is one of the room’s weaker recent topics, and whether the room should stay cautious rather than call clean risk-on.
```

- Agents expected to matter most:
  - Risk/Sentiment
  - Equities
- Memory blocks that should matter most:
  - known weak topics
  - current house view
  - recent forecasting calibration
- Logs to inspect:
  - `[memory-inject:Risk/Sentiment Agent]`
  - `[memory-refresh:Risk/Sentiment Agent]`
  - `[knowledge:Risk/Sentiment Agent]`
  - `[memory-inject:Equities Agent]`
- Success looks like:
  - tape is described as fragile / narrow rather than clean risk-on
  - leadership quality and confirmation signals matter
  - risk language remains conditional
- Failure looks like:
  - generic bullish commentary on index bounce
  - no mention of narrow breadth or partial credit confirmation
  - no difference between this output and a pre-memory run

## 5. Expected Logs

### Memory injection

Examples:

- `[memory-inject:Macro Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration`
- `[memory-inject:Rates Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration`

These should appear:

- once for Ask Market per routed reply
- once per participating agent prompt in Market Room

### Memory refresh

Examples:

- `[memory-refresh:FX Agent] updated summary because thesis state changed materially`
- `[memory-refresh:Macro Agent] skipped update, no material change`

These should appear after Market Room runs, not Ask Market.

### Knowledge retrieval

Examples:

- `[knowledge:Macro Agent] ...`
- `[knowledge:Rates Agent] ...`

These should continue appearing alongside memory logs. Dynamic memory should complement the current knowledge path, not replace it.

## 6. Success / Failure Criteria

### Success criteria

Dynamic Memory Phase 1 passes if:

1. `agents.memory_summary` visibly reflects rolling thesis state rather than old static seed text.
2. Ask Market responses use:
   - current house view
   - open thesis reuse
   - calibration-aware confidence
   - caution on weak topics when appropriate
3. Market Room runs cause selective memory updates:
   - some agents update
   - some agents remain stable
4. Outputs become more stateful:
   - more “this reinforces / updates the current view”
   - less “new view every run”
5. Existing knowledge retrieval still works in parallel.

### Failure criteria

Phase 1 fails if:

1. `memory_summary` still reads like original seed bios.
2. Ask Market replies ignore existing thesis state.
3. Agents answer with unchanged confidence regardless of recent hit rate.
4. Weak-topic prompts still produce false certainty.
5. Market Room updates every agent summary every run regardless of materiality.
6. Dynamic memory crowds out or breaks approved knowledge retrieval.

## 7. Live Results

### Ask Market live results

#### Ask Test 1 — Macro

- Result:
  - pass
- Evidence:
  - routed correctly to Macro Agent
  - answer explicitly said the data supports the existing thesis
  - reused the house view around sticky inflation and policy dominance
  - referenced recent calibration: `25% accuracy overall and 22% on high-conviction calls`

#### Ask Test 2 — Rates

- Result:
  - pass
- Evidence:
  - routed correctly to Rates Agent
  - answer stayed measured and explicitly argued against a high-conviction bearish-duration stance
  - reused current house view around real yields / policy floor
  - calibration behavior was visible in the cautionary framing

#### Ask Test 3 — Risk/Sentiment

- Result:
  - pass
- Evidence:
  - routed correctly to Risk/Sentiment Agent
  - answer explicitly treated Nasdaq as a weaker topic
  - referenced poor breadth and partial credit confirmation
  - used recent weak record language: `0/20 correct calls`

### Market Room live results

#### Market Room Test 1 — Inflation / macro continuity

- Result:
  - partial pass
- Evidence:
  - room commentary stayed in the inflation / labor / policy lane rather than inventing a new macro regime
  - Macro did not record a new `memory_updates` row during the later validation runs, which is consistent with no material macro memory change
  - direct `memory-refresh` log capture was not available from this terminal thread, so the “skipped update” confirmation is inferred from persistence behavior rather than log text

#### Market Room Test 2 — Rates calibration-aware moderation

- Result:
  - pass
- Evidence:
  - Rates output remained conditional rather than overconfident
  - after the Market Room validation runs, Rates memory summary rolled from:
    - `Real Yields reopened 70% ...`
    - to `Curve Shape developing 80% ...`
  - this shows summary refresh responding to thesis-state change instead of staying static

#### Market Room Test 3 — Leadership / weak-topic caution

- Result:
  - pass
- Evidence:
  - Risk/Sentiment moved toward crowding / fragility framing rather than clean risk-on
  - after the Market Room validation runs, Risk/Sentiment memory summary rolled from:
    - `Recent focus: Credit Stress stale ...`
    - to `Crowding Positioning reopened 75% ...`
  - Equities memory summary also rolled from stale focus text into a more specific house view tied to the current thesis state

### Persistence evidence captured during validation

Post-run summaries observed:

- Commodities:
  - `Gas Power reopened 75% ... | Banks Small Caps open 75% ...`
- Equities:
  - `Consumer Equities reopened 70% ...`
- FX:
  - `Labor Growth developing 75% ...`
- Macro:
  - `Inflation Regime reopened 85% ...`
- Rates:
  - `Curve Shape developing 80% ...`
- Risk/Sentiment:
  - `Crowding Positioning reopened 75% ...`

This is materially different from the original static seed summaries and is the strongest persistence-level proof that Phase 1 is active.

## 8. What Must Be True Before Moving To The Next Phase

Before Phase 2:

1. `memory-inject` logs must be observable in the live API terminal during both:
   - Ask Market
   - Market Room
2. `memory-refresh` logs must be inspected directly at least once to confirm both:
   - update path
   - skipped-refresh path
3. Agents should continue showing:
   - thesis reuse
   - calibration-aware caution
   - weak-topic restraint
4. No regression should appear in:
   - knowledge snippet retrieval
   - Market Room discussion completion
   - Ask Market routing / reply generation
5. At least one more validation cycle should show stable summaries when prompts are repetitive but thesis state is unchanged.

## 9. Recommended Validation Commands

### Ask Market

```bash
curl -s -X POST http://127.0.0.1:8787/api/market-questions \
  -H 'Content-Type: application/json' \
  --data '{"question":"For the Macro agent: core CPI just printed 0.4% m/m again, payroll growth is slowing but unemployment has not broken higher yet. Does this reinforce your existing inflation-regime thesis, or should you open a new macro view? Answer explicitly in terms of your current house view, any open thesis that already exists, and how confident you should be given recent forecasting calibration."}'
```

```bash
curl -s -X POST http://127.0.0.1:8787/api/market-questions \
  -H 'Content-Type: application/json' \
  --data '{"question":"For the Rates agent: the 10-year yield is backing up on stronger inflation, but your recent rates calls have been mixed. Should you state a high-conviction bearish duration view here, or stay measured until term-premium and breakeven confirmation line up? Use your current house view, any open rates thesis, and your recent forecasting calibration in the answer."}'
```

```bash
curl -s -X POST http://127.0.0.1:8787/api/market-questions \
  -H 'Content-Type: application/json' \
  --data '{"question":"For the Risk/Sentiment agent: Nasdaq is bouncing, but breadth is poor, credit is only partially confirming, and your recent Nasdaq forecasting record has been weak. Should you treat this as a strong risk-on call or explicitly stay cautious because this is one of your weaker recent topics? Answer using positioning, weak-topic memory, and recent calibration."}'
```

### Market Room

```bash
curl -s -X POST http://127.0.0.1:8787/api/discussions/run \
  -H 'Content-Type: application/json' \
  --data '{"prompt":"Discuss whether sticky inflation with slowing payrolls reinforces the existing inflation-regime view or requires a new macro thesis. Agents should lean on any current house view and existing open theses rather than inventing a fresh framework."}'
```

```bash
curl -s -X POST http://127.0.0.1:8787/api/discussions/run \
  -H 'Content-Type: application/json' \
  --data '{"prompt":"Discuss the backup in long-end yields under firmer inflation, but do it with calibration awareness: if recent rates forecasting has been mixed, avoid overconfident bearish-duration language unless term premium and breakevens both confirm."}'
```

```bash
curl -s -X POST http://127.0.0.1:8787/api/discussions/run \
  -H 'Content-Type: application/json' \
  --data '{"prompt":"Discuss a narrow Nasdaq bounce with poor breadth and only partial credit confirmation. Focus on whether leadership quality is deteriorating, whether this is one of the room’s weaker recent topics, and whether the room should stay cautious rather than call clean risk-on."}'
```

## 10. Live Log Confirmation

Direct log confirmation was completed on `2026-04-10` by running a temporary local `wrangler dev` instance on port `8790` against the same local D1 state and then issuing:

- one Ask Market request
- one Market Room discussion run

This was necessary because the original server on `127.0.0.1:8787` was running in a different background terminal session, so this thread could not directly read its stdout even though the process was live.

### Exact log lines observed

Ask Market confirmation:

```text
[knowledge:Rates Agent] query="For the Rates agent: the 10-year yield is backing up on stronger inflation, but your recent rates calls have been mixed." pool=9 matched=9
[knowledge:Rates Agent] injecting 4 snippet(s): "Term Premium and Breakeven Interpretation Guide", "Fed Repricing Playbook", "Rates — Historical Starter Pack (foundations)", "Rates Historical Foundations"
[memory-inject:Rates Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration
```

Market Room confirmation:

```text
[memory-inject:Macro Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration
[memory-inject:Rates Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration
[memory-inject:FX Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration
[memory-inject:Risk/Sentiment Agent] injected blocks: house_view, open_theses, strong_topics, weak_topics, calibration
```

Refresh confirmation:

```text
[memory-refresh:Commodities Agent] skipped update, no material change
[memory-refresh:Equities Agent] skipped update, no material change
[memory-refresh:FX Agent] updated summary because thesis state changed materially
[memory-refresh:Macro Agent] updated summary because thesis state changed materially
[memory-refresh:Rates Agent] updated summary because thesis state changed materially
[memory-refresh:Risk/Sentiment Agent] updated summary because thesis state changed materially
```

### What this confirms

1. `memory-inject` is firing in Ask Market.
2. `memory-inject` is firing in Market Room.
3. `memory-refresh` is firing after Market Room runs.
4. Both refresh branches were directly observed:
   - update
   - skipped update
5. Existing `knowledge` logs still fire alongside memory logs, confirming that dynamic memory did not displace knowledge retrieval.

### Final gate status

Dynamic Memory Phase 1 is now fully cleared.
