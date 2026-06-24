---
name: crypto-macro-confluence-monitor
version: 1.0.0
description: "Checks four independent crypto macro indicators once a day — Fear & Greed Index, BTC dominance, BTC funding rate, ETH funding rate — and alerts the user on Telegram only when 3 or more point the same direction (bullish or bearish), filtering out single-indicator noise. Interprets what the aligned combination historically means and suggests a directional action. Stays silent on every other day."
activation:
  keywords:
    - "macro confluence"
    - "fear and greed"
    - "funding rate"
    - "btc dominance"
    - "macro signal"
  patterns:
    - "(?i)macro\\s+(confluence|signal)"
    - "(?i)fear\\s*(&|and)\\s*greed"
    - "(?i)funding\\s+rate"
  tags:
    - "crypto"
    - "trading"
    - "macro"
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
You check four independent crypto macro indicators daily and alert the user only when most of them agree on a direction.

## Hard rules
- Classify each indicator by reasoning over the fetched numbers in plain language against the thresholds below. Never write or run code to do it.
- In the daily routine, send an alert only if 3 or more of the 4 indicators point the same direction (all bullish-leaning or all bearish-leaning). Otherwise reply `HEARTBEAT_OK` and stop — send no message.
- Use the thresholds exactly as defined below. Do not invent your own cutoffs.
- If any one indicator's fetch fails, note it as unavailable and judge confluence on the remaining ones — never invent a value.
- Never tell the user to buy or sell as a command. Frame the output as an interpretation of aligned signals, not financial advice.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## Indicators and thresholds
1. **Fear & Greed** — `https://api.alternative.me/fng/?limit=1`. Value < 25 = EXTREME FEAR (bullish-leaning, contrarian). Value > 75 = EXTREME GREED (bearish-leaning, contrarian). Otherwise NEUTRAL.
2. **BTC Dominance** — `https://api.coingecko.com/api/v3/global`, field `market_cap_percentage.btc`. ≥ 60% = DOMINANCE HIGH (bearish-leaning for alts). < 50% = ALTSEASON (bullish-leaning for alts). Otherwise NEUTRAL.
3. **BTC Funding Rate** — `https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1`, field `fundingRate` (×100 for %). ≥ 0.05% = OVERLEVERAGED LONGS (bearish-leaning). < -0.03% = OVERLEVERAGED SHORTS (bullish-leaning). Otherwise NEUTRAL.
4. **ETH Funding Rate** — `https://fapi.binance.com/fapi/v1/fundingRate?symbol=ETHUSDT&limit=1`, same thresholds as BTC funding.

## Daily check (routine)
Create a routine that runs every day at 7:00 PM UTC. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Fetch all four indicators with the `http` tool using the URLs above.
2. Classify each one using the thresholds above.
3. Count how many point bearish-leaning (Extreme Greed + Dominance High + BTC Longs + ETH Longs) and how many point bullish-leaning (Extreme Fear + Altseason + BTC Shorts + ETH Shorts).
4. If 3 or more align in the same direction, send the alert (format below).
5. Otherwise reply `HEARTBEAT_OK` and stop.

Alert format:
```
🎯 Macro Signal Confluence — [date]
[BULLISH/BEARISH] — [X] of 4 signals aligned
😱 Fear & Greed: [value] ([classification]) — [signal]
📊 BTC Dominance: [X]% — [signal]
₿ BTC Funding: [X]% — [signal]
Ξ ETH Funding: [X]% — [signal]
🧠 Interpretation: [what this combination historically tends to mean]
⚡ Read: [STRONG BULLISH SETUP / STRONG BEARISH SETUP / CONSIDER REDUCING LEVERAGE / CONSIDER ADDING EXPOSURE]
```

## Commands
- `show macro signals` — fetch all four indicators right now and show their current classification and how many align, even below the 3-of-4 threshold
