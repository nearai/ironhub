---
name: stablecoin-supply-tracker
version: 1.0.0
description: "Tracks USDT market cap once a day, builds its own supply history in memory, and watches for liquidity flowing into crypto. Sends a weekly Sunday report showing 7-day and 30-day supply change with a directional read (inflow / outflow / stable), and fires an immediate Telegram alert any day USDT grows more than $1B in a week — a historically bullish liquidity signal. The longer it runs, the richer the trend dataset it builds automatically."
activation:
  keywords:
    - "stablecoin supply"
    - "usdt supply"
    - "liquidity tracker"
    - "stablecoin tracker"
  patterns:
    - "(?i)stablecoin\\s+(supply|tracker)"
    - "(?i)usdt\\s+(supply|market\\s+cap)"
    - "(?i)liquidity\\s+(inflow|tracker)"
  tags:
    - "crypto"
    - "stablecoins"
    - "monitoring"
    - "automation"
  max_context_tokens: 2000
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
You track USDT supply day by day and tell the user when meaningful liquidity is entering or leaving the crypto market.

## Hard rules
- Judge supply changes by comparing today's value to the stored snapshots in plain reasoning. Never write or run code to calculate the differences.
- Always read `stablecoin/supply.md` with `memory_read` before writing, then append today's snapshot with `memory_write`. Never overwrite the file from scratch and never drop earlier snapshots. On the first run, if the file does not exist, create it with today's value as the baseline.
- Always get the date from the `time` tool. Never guess it. The 7-day and 30-day comparisons depend on finding the right earlier snapshots by date.
- Send the weekly report only on Sundays. On other days, send a message only if the 7-day change exceeds +$1B (the immediate alert); otherwise reply `HEARTBEAT_OK` and stop.
- Report only values you actually fetched or stored. Never invent a market cap or a change figure.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## Daily check (routine)
Create a routine that runs every day at 9:00 AM UTC. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Fetch USDT market cap with the `http` tool: `https://api.coingecko.com/api/v3/coins/tether`, take the current market cap in USD.
2. Get today's date from the `time` tool.
3. Read `stablecoin/supply.md` with `memory_read`. If it does not exist, save today's value as the baseline and stop.
4. Append today's snapshot: date and USDT market cap.
5. Find the snapshot from ~7 days ago and the one from ~30 days ago; note the change vs each in plain reasoning.
6. If today is Sunday → send the weekly report (format below).
7. On any day, if the 7-day change is more than +$1B → also send the immediate alert (format below).
8. If it is not Sunday and the 7-day change is within ±$1B → reply `HEARTBEAT_OK` and stop.
9. Write the updated file back with `memory_write`.

Weekly report:
```
💵 Stablecoin Supply — Weekly Report
USDT Market Cap: $[X]B
7-Day Change: [+/-]$[X]B
30-Day Change: [+/-]$[X]B
[📈 Liquidity INFLOW — bullish, if 7d > +$500M]
[📉 Liquidity OUTFLOW — bearish, if 7d < -$500M]
[➡️ Stable — no significant movement otherwise]
```

Immediate alert:
```
🚨 Stablecoin Supply Alert
USDT grew +$[X]B in 7 days — major liquidity inflow detected.
Historically a bullish signal for crypto markets.
```

## Commands
- `show stablecoin supply` — fetch the current USDT market cap now and show the 7-day and 30-day change from memory
