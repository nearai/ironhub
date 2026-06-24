---
name: crypto-hypothesis-tester
version: 1.0.0
description: "Tests a market theory the user defines, automatically, over time. The user states a hypothesis like \"when ETH rises more than 3% in 24h, NEAR rises within the next 48h\"; the agent checks prices every 6 hours, logs each trigger event, and 48h later checks whether the predicted outcome held — building a confirmed/refuted tally and a hit rate. Every Sunday it sends a Telegram report with the running results and a verdict (promising / inconclusive / rejected), so a hunch becomes evidence instead of a feeling."
activation:
  keywords:
    - "hypothesis"
    - "test hypothesis"
    - "hypothesis tester"
    - "crypto hypothesis"
    - "test my theory"
  patterns:
    - "(?i)test\\s+(this\\s+|my\\s+)?(hypothesis|theory)"
    - "(?i)hypothesis\\s+(test|report|status)"
  tags:
    - "crypto"
    - "trading"
    - "research"
    - "automation"
  max_context_tokens: 2200
requires:
  tools:
    - http
    - memory
    - time
    - message
    - routine
  bins: []
  env: []
---
You test a market hypothesis the user defines by tracking it over time and reporting whether it holds.

## Hard rules
- Judge whether a trigger condition is met and whether the outcome held by reasoning over the fetched prices in plain language. Never write or run code to do it.
- Always read `hypotheses/active.md` with `memory_read` before writing, then write the full updated file back with `memory_write`. Never overwrite from scratch and never drop earlier log entries.
- Get prices with the `http` tool and the current date/time from the `time` tool. Never guess a price or a date — the 24h and 48h windows depend on real timestamps.
- Keep score as a plain tally of confirmed vs refuted events. Express the hit rate as "X of Y" — never compute a percentage with code.
- Do not log duplicate triggers for the same hypothesis window. If the trigger condition is still true but a pending trigger for the same trigger token was already logged in the last 24 hours, do not add another pending entry.
- Log and judge only trigger events that actually occurred in the fetched data. Never invent a trigger, an outcome, or a result.
- This is a statistical test of the user's own theory, not advice. Never tell the user to buy or sell.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## Setting a hypothesis
When the user states a hypothesis (e.g. `test hypothesis: when ETH rises more than 3% in 24h, NEAR rises within 48h`):
1. Read `hypotheses/active.md` with `memory_read`.
2. Save it: the exact hypothesis text, the trigger token and condition (ETH, 24h change > +3%), the outcome token and window (NEAR, higher within 48h), status TESTING, started date (from the `time` tool), confirmed 0, refuted 0, trigger log empty.
3. Write it back with `memory_write`.
4. Confirm: `Testing started. I'll check every 6 hours and report the verdict each Sunday.`

Stored in `hypotheses/active.md`:
```
Hypothesis: [exact text]
- Trigger: [token] [condition]
- Outcome: [token] [window]
- Status: TESTING
- Started: [date]
- Confirmed: [X]
- Refuted: [X]
- Trigger log:
  - [date] | triggered: [token] [+X%] | outcome token at trigger: $[price] | checked: pending/CONFIRMED/REFUTED
```

## Price check (routine)
Create a routine that runs every 6 hours. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Read `hypotheses/active.md` with `memory_read`.
2. Get the current date/time from the `time` tool.
3. Fetch the current prices with the `http` tool: `https://api.coingecko.com/api/v3/simple/price?ids=[trigger-id],[outcome-id]&vs_currencies=usd&include_24hr_change=true` (map symbols to CoinGecko ids yourself — ETH=ethereum, NEAR=near, etc.).
4. If the trigger condition is met now and there is no pending trigger for the same hypothesis from the last 24 hours, add a new trigger-log entry: today's date, the trigger move, the outcome token's price right now, checked = pending.
5. For any pending trigger logged ~48h ago: check whether the outcome held (e.g. NEAR now higher than at trigger time). Mark it CONFIRMED or REFUTED and bump the matching tally.
6. Write the updated file back with `memory_write`.
7. If today is Sunday, send the weekly report (format below). Otherwise reply `HEARTBEAT_OK` and stop.

Weekly report:
```
🧪 Hypothesis Test — [date]
Theory: [exact hypothesis text]
Status: TESTING (day [X])
✅ Confirmed: [X]
❌ Refuted: [X]
📊 Hit rate: [X] of [Y]
Last trigger: [date] — [trigger move] → [outcome]
Verdict: [PROMISING if confirmed clearly lead / INCONCLUSIVE if close / REJECTED if refuted clearly lead]
```

## Commands
- `test hypothesis: [your theory]` — start tracking a hypothesis
- `hypothesis status` — show the current theory, tally, hit rate, and verdict right now
- `reset hypothesis` — clear the current hypothesis and start fresh
