### 1. Title

Crypto Macro Confluence Monitor — Alert when Fear & Greed, BTC dominance and funding rates align

### 2. Example prompt

You are my crypto macro signal monitor. Check 4 independent indicators and alert me only when multiple signals align.

Create a routine that runs every day at 7:00 PM UTC:

1. Fetch Fear & Greed Index:
https://api.alternative.me/fng/?limit=1
Extract: value (0-100) and value_classification

2. Fetch BTC Dominance:
https://api.coingecko.com/api/v3/global
Extract: market_cap_percentage.btc

3. Fetch BTC Funding Rate:
https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1
Extract: fundingRate (multiply by 100 for %)

4. Fetch ETH Funding Rate:
https://fapi.binance.com/fapi/v1/fundingRate?symbol=ETHUSDT&limit=1
Extract: fundingRate (multiply by 100 for %)

5. Apply signal logic:

Fear & Greed:
- Value < 25 = EXTREME FEAR (bullish contrarian signal)
- Value > 75 = EXTREME GREED (bearish contrarian signal)
- Otherwise = NEUTRAL

BTC Dominance:
- > 60% = BTC DOMINANCE HIGH (alts under pressure, bearish for alts)
- < 50% = ALTSEASON (capital rotating to alts, bullish)
- Otherwise = NEUTRAL

BTC Funding Rate:
- > 0.05% = OVERLEVERAGED LONGS (bearish, long squeeze risk)
- < -0.03% = OVERLEVERAGED SHORTS (bullish, short squeeze likely)
- Otherwise = NEUTRAL

ETH Funding Rate:
- > 0.05% = OVERLEVERAGED LONGS (bearish)
- < -0.03% = OVERLEVERAGED SHORTS (bullish)
- Otherwise = NEUTRAL

6. Count how many signals point in the same direction:

BEARISH confluence:
- Extreme Greed + BTC Dominance High + BTC Overleveraged Longs + ETH Overleveraged Longs

BULLISH confluence:
- Extreme Fear + Altseason + BTC Overleveraged Shorts + ETH Overleveraged Shorts

7. Send Telegram ONLY if 3 or more signals align:

"🎯 Macro Signal Confluence — [Date]

[BULLISH/BEARISH] — [X] of 4 signals aligned

😱 Fear & Greed: [value] ([classification]) — [signal]
📊 BTC Dominance: [X]% — [signal]
₿ BTC Funding: [X]% — [signal]
Ξ ETH Funding: [X]% — [signal]

🧠 Interpretation: [what this combination historically means]

⚡ Signal: [STRONG BUY / STRONG SELL / REDUCE LEVERAGE / ADD EXPOSURE]"

8. If fewer than 3 signals align: reply HEARTBEAT_OK and stop.

### 3. What the agent does

Every day at 7 PM the agent fetches 4 independent macro indicators from 3 different sources: Fear & Greed Index, BTC dominance, BTC funding rate, and ETH funding rate. Each indicator is classified as bullish, bearish, or neutral based on defined thresholds. The agent only sends a Telegram alert when 3 or more signals point in the same direction — filtering out noise from single-indicator moves. When confluence is detected it interprets what the combination historically means and suggests a directional action. Most days it stays silent.

<img width="488" height="675" alt="Image" src="https://github.com/user-attachments/assets/3ea2e319-7ce3-414a-94f0-edac0667cc3a" />

### 4. Skills & tools used

- http — fetches Fear & Greed from https://api.alternative.me/fng/, BTC dominance from https://api.coingecko.com/api/v3/global, BTC and ETH funding rates from https://fapi.binance.com/fapi/v1/fundingRate (all free, no API key required)
- message — sends Telegram alert only when 3+ signals align
- routine/cron — runs automatically every day at 7:00 PM UTC

### 5. Categories

- [ ] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
