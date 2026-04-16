# Ask Market Multi-Agent Follow-Up Runbook

## Problem

Ask Market threads were pinned to the first routed agent. If the first question routed to Equities and the follow-up asked about commodities, the original Equities agent still answered.

That made the thread feel less like a real analyst room and more like a single-agent chat.

## What Changed

Follow-up replies now re-run routing on the latest user message.

Behavior:

- if the follow-up has a clear new specialist signal, the new agent enters the same thread
- if the follow-up is vague, the original assigned agent stays
- the thread's assigned agent is updated to the latest responding specialist
- prior assistant messages keep their real speaker labels in prompt history

## Safety Rule

The system does not switch agents on weak ambiguous wording.

It switches only when:

- the user explicitly names an agent or sector
- stock-idea intent strongly points to Equities
- the new specialist score is strong and clearly beats the current agent

## Logs To Inspect

Expected switch log:

```text
[routing-followup] switched Equities Agent -> Commodities Agent score=... current=... margin=... via=...
```

Expected stay log:

```text
[routing-followup] kept Equities Agent; Commodities Agent lead was not strong enough ...
```

Normal routing logs still appear:

```text
[routing] heuristic top=...
[routing]   ...
```

## Validation Flow

1. Ask:

```text
What green stocks should I watch right now? Give me names and explain what would make the basket work or fail.
```

Expected first agent:

- Equities Agent

2. In the same thread, ask:

```text
Now switch to commodities: what does WTI above $90 with Cushing inventories falling tell me about physical tightness?
```

Expected follow-up agent:

- Commodities Agent

3. In the same thread, ask:

```text
And if I want stock exposure to that oil setup, which energy equities or ETFs should I watch?
```

Expected follow-up agent:

- Equities Agent

## Success Criteria

- the same thread can contain multiple specialist assistant messages
- the latest assistant message has the correct `agentName` / `agentSector`
- the prompt history labels older assistant messages by their actual speaker
- vague follow-ups do not bounce agents unnecessarily

## Remaining Gap

The thread card still shows only the latest assigned agent, not the full participant list. A later UI improvement could show thread participants like:

```text
Equities → Commodities → Equities
```

That does not require a schema change because participants can be derived from message history.
