---
name: btc-dominance-alert
version: 1.0.0
description: "Watches Bitcoin dominance (BTC's share of total crypto market cap) and alerts the user on Telegram only when it crosses a key threshold: below 60% reads as a possible altcoin-season signal, above 65% as BTC dominance expanding. Between 60% and 65% it stays silent. Each check is logged to memory as an audit trail, and it only alerts on an actual threshold crossing, never on every run."
activation:
  keywords:
    - "btc dominance"
    - "bitcoin dominance"
    - "dominance alert"
    - "altseason"
  patterns:
    - "(?i)(btc|bitcoin)\\s+dominance"
    - "(?i)dominance\\s+(alert|monitor|watch)"
    - "(?i)alt(coin)?\\s*season"
  tags:
    - "crypto"
    - "bitcoin"
    - "monitoring"
    - "automation"
  max_context_tokens: 1800
requires:
  tools:
    - http
    - memory
    - message
    - routine
  bins: []
  env: []
---
You watch Bitcoin dominance and alert the user only when it crosses a key threshold.

## Hard rules
- Judge the threshold crossing by reading the fetched dominance value against the cutoffs in plain language. Never write or run code to do it.
- Use the thresholds exactly: below 60% = altcoin-season signal; above 65% = BTC dominance expanding; between 60% and 65% = silent. Do not invent your own cutoffs.
- Always read `btc-dominance/last-check.md` with `memory_read` before writing, then write the full updated file back with `memory_write`. Never overwrite from scratch. Log every check (timestamp, value, whether an alert was sent) regardless of outcome.
- Don't repeat the same alert every run. Only alert when the value has actually crossed a threshold since the last check — if it was already below 60% last run and still is, stay silent.
- In the routine, if the value is in the 60–65% corridor or no new crossing happened, reply `HEARTBEAT_OK` and stop — send no message.
- Report only the value you actually fetched. Never invent a dominance figure.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## Dominance check (routine)
Create a routine that runs every 5 hours. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Fetch global market data with the `http` tool: `https://api.coingecko.com/api/v3/global`. Take `data.market_cap_percentage.btc` — that's the current BTC dominance %.
2. Read `btc-dominance/last-check.md` with `memory_read` to see the previous value and whether it was already past a threshold.
3. Compare the current value to the thresholds:
   - below 60% → altcoin-season signal
   - above 65% → BTC dominance expanding
   - 60–65% → no alert
4. Send an alert (format below) only if the value has crossed a threshold that it wasn't already past last run.
5. Append this check to memory: timestamp, current value, alert sent yes/no.
6. If no new crossing, reply `HEARTBEAT_OK` and stop.

Alert format:
```
[if below 60%:]
🔴 BTC Dominance Alert
BTC dominance dropped to [X]% — below 60%. Possible altcoin-season signal.
[if above 65%:]
🟡 BTC Dominance Alert
BTC dominance rose to [X]% — above 65%. BTC dominance expanding.
🕐 [timestamp]
```

## Commands
- `show btc dominance` — fetch the current dominance now and show it with the last logged value
