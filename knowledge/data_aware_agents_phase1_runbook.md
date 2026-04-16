# Data-Aware Agents Phase 1 Runbook

Date: 2026-04-16

## Trigger thread

Original Ask Market thread:

- Thread title: `Commodities: WTI prices today what is your view`
- Thread id: `ff261983-0859-4578-936a-11d1833938fb`

The thread exposed a real product gap: the agent could reason fluently, but it did not stay grounded in the actual data available to the platform.

## What failed

1. The thread started correctly with the Commodities Agent for WTI.
2. A follow-up about “stocks in commodity market” correctly moved to Equities.
3. Later WTI-specific follow-ups stayed stuck with Equities instead of returning to Commodities.
4. The agent gave approximate correlation numbers for WTI, inflation, and M1 without verifying whether M1 existed in the data lake.
5. The agent claimed another agent was working “behind the scenes,” which is not how the Ask Market thread actually works.

## Root causes

### Routing

The follow-up router did not strongly recognize:

- `commodity agent`
- singular `commodity`
- `WTI prices`
- `historical patterns in WTI`
- `Middle East wars`
- `Gulf War`

So once the thread moved to Equities, later commodity-specific follow-ups did not reliably switch back.

### Data awareness

The agent had access to stored WTI and CPI data through the repo data lake, but no M1/money-supply series was loaded.

The correct behavior should be:

- Use WTI and CPI where available.
- State clearly that M1 is not currently available.
- Do not invent exact M1 correlations.
- Offer the closest available stored-data calculation.

### Agent honesty

Ask Market selects one answering agent per turn. It does not currently run a hidden multi-agent subconversation inside one reply.

So the agent should not say:

- “The commodity agent is working behind the scenes.”
- “I am coordinating with the commodity agent.”

It should either answer as the selected agent or let routing switch to the correct specialist on the next turn.

## Files changed

- `apps/api/src/lib/services/marketQuestionsService.ts`
- `apps/api/src/lib/services/historicalDataContextService.ts`

## Routing changes

Added stronger Commodities routing for:

- singular and plural sector aliases: `commodity`, `commodities`
- explicit `commodity agent` / `commodities agent`
- `WTI prices`
- `WTI price`
- `oil prices`
- `historical patterns in WTI`
- `Middle East wars`
- `Gulf War`

Follow-up routing now treats `commodity-agent-request` as an explicit pivot signal.

## Data-awareness changes

Added `historicalDataContextService.ts`.

It imports current stored data-lake series:

- `knowledge/data-lake/normalized/eia_wti_monthly.json`
- `knowledge/data-lake/normalized/fred_cpi_headline.json`

For oil/inflation/correlation prompts, the service injects a compact prompt block that tells the agent:

- which historical series are available
- coverage period
- observation count
- what is missing
- whether exact numbers can be used

If the user asks about M1 or money supply, the prompt now explicitly says:

`Not currently loaded: M1 / money supply time series. If the user asks for M1 correlation or charts, say that M1 is not available in the current data lake and avoid giving exact M1 correlation numbers.`

For WTI + inflation correlation questions, it computes a stored-data check using WTI monthly and headline CPI.

For crisis-style prompts, it uses a 2007-2009 window.

## Prompt honesty changes

The Ask Market prompt now includes:

- Do not claim another agent is working behind the scenes.
- Do not invent exact correlations, charts, or backtest numbers.
- Use only supplied historical-data context for exact statistics.
- Say when a requested series is not currently available.

## Live validation

Validation thread created after the fix:

- Thread id: `60c93644-8969-45f7-8c33-a88caf40b619`

Test sequence:

1. `WTI prices today what is your view`
2. `what if i see stocks in commodity market`
3. `SOME HISTORICAL PATTERNS IN WTI DURING MIDDLE EAST WARS`
4. `CAN YOU FIND ANY SIMILARITY IN THE PRICES OR ANY CORRELATION BASED ON YOUR LEARNING BETWEEN WTI PRICES, INFLATION, MONEY SUPPLY M1 ?`
5. `Please bring the commodity agent here`

Observed behavior:

- Step 1 answered by Commodities Agent.
- Step 2 pivoted to Equities Agent.
- Step 3 pivoted back to Commodities Agent.
- Step 4 answered by Commodities Agent and stated M1 is not directly available in the current system.
- Step 5 answered by Commodities Agent and did not pretend another agent was hidden behind the scenes.

## What this improves

This is the first step toward agents becoming smarter based on the data available to them.

The key shift is from:

`LLM memory says correlations are roughly X`

to:

`The platform has WTI and CPI, but not M1; here is what can and cannot be verified.`

That is a much better product behavior.

## What remains weak

This is not yet a full data-analysis engine.

Missing pieces:

- M1 / money supply data is not loaded.
- The UI cannot yet render generated charts in Ask Market.
- Correlation windows are deterministic but limited.
- Historical event libraries are still mostly markdown reasoning docs, not structured event datasets.
- There is no generic data-query planner yet.

## Recommended next phase

Phase 2 should add a small “agent data tools” layer:

1. Add M1 and M2 time series to the data lake.
2. Add a deterministic correlation tool for selected series and date windows.
3. Add chart-ready JSON output for Ask Market.
4. Add a UI chart component for generated analysis.
5. Add source/citation labels to any computed number.

Do not jump to vectors for this. This problem is not semantic retrieval. It is deterministic data access, calculation, and honest prompt grounding.

