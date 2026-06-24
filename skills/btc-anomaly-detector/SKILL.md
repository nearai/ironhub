---
name: btc-anomaly-detector
version: 1.0.0
description: "Compares today's BTC volume and price action against its 30-day baseline once a day, runs 4 anomaly checks (volume spike, oversized price move, price deviation from average, sustained volume trend), and when something is abnormal, interprets the combination in plain language — e.g. a volume spike with rising price reads as conviction buying, a volume spike with a flat price reads as accumulation before a move. Alerts on Telegram only when at least one check triggers."
activation:
  keywords:
    - "btc anomaly"
    - "bitcoin anomaly"
    - "anomaly detector"
    - "volume spike"
    - "price anomaly"
  patterns:
    - "(?i)(btc|bitcoin)\\s+anomaly"
    - "(?i)volume\\s+spike"
  tags:
    - "crypto"
    - "bitcoin"
    - "monitoring"
    - "automation"
  max_context_tokens: 2200
requires:
  tools:
    - http
    - message
    - routine
  bins: []
  env: []
---
You compare today's BTC market behavior against its own 30-day normal and alert the user when something is genuinely abnormal — with an interpretation, not just numbers.

## Hard rules
- Judge all four checks by reasoning over the fetched data in plain language. Never write or run code to calculate averages or deviations.
- In the daily routine, send an alert only if at least one of the four checks triggers. If none trigger, reply `HEARTBEAT_OK` and stop — send no message.
- Use the thresholds exactly as defined below. Do not invent your own cutoffs.
- Only interpret combinations from the table given. Never claim a signal the data doesn't support, and never tell the user to buy or sell — frame it as an observation, not advice.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## The four checks
Fetch 30 days of BTC data with the `http` tool: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30`. Extract daily prices and daily volumes.

1. **Volume spike** — today's volume is more than 2.5x the 30-day average daily volume.
2. **Price move size** — today's % price move is more than 3x the typical (average absolute) daily move over 30 days.
3. **Price vs 30-day average** — the current price deviates more than 20% from the 30-day average price.
4. **Volume trend** — the average volume of the last 3 days is more than 2x the 30-day average.

## Interpreting a trigger
When any check triggers, read the combination:
- Volume spike + price up → "💚 Strong buy pressure — conviction move"
- Volume spike + price down → "🔴 Strong sell pressure — watch for continuation"
- Volume spike + price flat → "👀 Accumulation/distribution — a bigger move is often not far behind"
- Volume trend (check 4) + price up → "📈 Sustained interest — not a one-day pump"
- Price deviation up (check 3) with no volume anomaly → "⚠️ Weak pump — often retraces"
- Price deviation down (check 3) with a volume anomaly → "🏳️ Capitulation signal — potential local bottom"
If none of these combinations fit cleanly, describe what triggered in plain terms instead of forcing a label.

## Daily check (routine)
Create a routine that runs every day at 6:00 PM UTC. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Fetch 30-day BTC price and volume history with the `http` tool.
2. Run the four checks above against today's values.
3. If any check triggers, interpret the combination and send the alert (format below).
4. If nothing triggers, reply `HEARTBEAT_OK` and stop.

Alert format:
```
🔍 BTC Anomaly Detected
[for each triggered check:]
⚡ [check name]: today's [X] vs 30-day normal [X] (~[X]x)
💰 Current price: $[X] ([24h change]%)
🧠 Read: [interpretation]
```

## Commands
- `show btc anomaly check` — run all four checks right now and show the result even if nothing triggered
