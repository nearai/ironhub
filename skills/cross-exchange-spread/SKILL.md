---
name: cross-exchange-spread-monitor
version: 1.0.0
description: "Watches NEAR's price across Binance, Bybit, and Coinbase and alerts the user on Telegram when the prices drift apart by ~1.5% or more — an early sign of an arbitrage gap or of trouble (paused withdrawals, broken liquidity) on one exchange. Runs every 2 hours, logs each snapshot to build a spread history, and stays silent while the exchanges agree."
activation:
  keywords:
    - "spread monitor"
    - "cross-exchange"
    - "exchange spread"
    - "arbitrage"
    - "price spread"
  patterns:
    - "(?i)(cross[- ]exchange|exchange)\\s+spread"
    - "(?i)spread\\s+(monitor|alert|watch)"
    - "(?i)arbitrage\\s+(monitor|alert|watch)"
  tags:
    - "crypto"
    - "trading"
    - "monitoring"
    - "near"
    - "automation"
  max_context_tokens: 2000
requires:
  tools:
    - http
    - memory
    - time
    - routine
    - message
  bins: []
  env: []
---
You watch NEAR's price across three exchanges and warn the user when they drift apart — an early signal of arbitrage or trouble on one exchange.

## Hard rules
- Judge price gaps by reasoning over the fetched numbers in plain language. Never write or run code to work them out.
- Always read `spreads/history.md` with `memory_read` before writing, then append the new snapshot with `memory_write`. Never overwrite the file from scratch and never drop earlier snapshots. On the first run, if the file does not exist, create it with the current snapshot as the baseline and stop — no alert.
- Always get the timestamp from the `time` tool. Never guess it.
- In the routine, send an alert only if at least one pair of exchanges is about 1.5% or more apart. If all three prices are within ~1.5% of each other, reply `HEARTBEAT_OK` and stop — send no message.
- Don't repeat the same alert every run. If the previous snapshot already flagged the same pair at a similar gap, stay silent unless the gap has clearly widened.
- Report only the prices you actually fetched. If an exchange's request fails, note it as unavailable and compare the ones you have — never invent a price or a gap.

## Spread check (routine)
Create a routine that runs every 2 hours. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Fetch the NEAR price from three exchanges with the `http` tool:
   - Binance: `https://api.binance.com/api/v3/ticker/price?symbol=NEARUSDT`
   - Bybit: `https://api.bybit.com/v5/market/tickers?category=spot&symbol=NEARUSDT`
   - Coinbase: `https://api.coinbase.com/v2/prices/NEAR-USD/spot`
2. Get the timestamp from the `time` tool.
3. Look at the three prices. For each pair, judge how far apart they are — roughly as a share of the lower price (e.g. $5.00 vs $5.08 is about 1.5%). Note the widest gap and which two exchanges it is between.
4. Read `spreads/history.md` with `memory_read`, then append this snapshot: timestamp, the three prices, the widest gap and its pair.
5. If at least one pair is about 1.5% or more apart, send the alert (format below) — unless the previous snapshot already flagged the same pair at a similar gap.
6. If everything is within ~1.5%, reply `HEARTBEAT_OK` and stop.

Alert format:
```
⚡ NEAR Cross-Exchange Spread
Widest gap: ~[X]% between [exchange A] and [exchange B]
- Binance: $[price]
- Bybit: $[price]
- Coinbase: $[price]
💡 A gap this wide usually means one of two things: a real arbitrage window, or paused withdrawals / broken liquidity on one venue. A gap that can't be arbitraged away persists — check that exchange's status before trading.
Normal spread for NEAR is under ~0.5%.
🕐 [timestamp]
```

## Commands
- `show spread` — fetch the three prices right now and show the current gaps
- `show spread history` — list the recent snapshots from memory with their widest gaps
