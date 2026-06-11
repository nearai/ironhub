### 1. Title

Stablecoin Supply Tracker — Weekly liquidity inflow monitor with Telegram alerts

### 2. Example prompt

You are my stablecoin supply tracker. Monitor USDT market cap and alert me when significant liquidity enters the crypto market.

Create a routine that runs every day at 9:00 AM UTC:

1. Fetch USDT market cap from CoinGecko:
https://api.coingecko.com/api/v3/coins/tether

Extract: current market cap in USD

2. Read memory at stablecoin/supply.md using memory_read.
If file does not exist, create it with today's snapshot as the baseline.

3. Append today's snapshot to memory:
- Date
- USDT market cap
- Change vs 7 days ago

4. Calculate 7-day change:
- Find the entry from 7 days ago in memory
- Calculate difference in USD

5. Every Sunday at 9:00 AM send a weekly report regardless of threshold:

"💵 Stablecoin Supply — Weekly Report

USDT Market Cap: $[X]B
7-Day Change: [+/-]$[X]B
30-Day Change: [+/-]$[X]B

[📈 Liquidity INFLOW — bullish signal if +$500M+ weekly]
[📉 Liquidity OUTFLOW — bearish signal if -$500M+ weekly]
[➡️ Stable — no significant movement]"

6. On any day — if 7-day change exceeds +$1B: also send immediate alert:

"🚨 Stablecoin Supply Alert
USDT grew +$[X]B in 7 days — major liquidity inflow detected.
Historically bullish signal for crypto markets."

### 3. What the agent does

Every day the agent fetches USDT market cap from CoinGecko and logs it to persistent memory. It builds its own 30-day price history over time. Every Sunday it sends a weekly report showing 7-day and 30-day supply changes with a directional signal — inflow, outflow, or stable. If supply grows more than $1B in a week at any point, it fires an immediate alert. The longer the agent runs, the more context it builds — after a month you have a real liquidity trend dataset built automatically.

<img width="512" height="566" alt="Image" src="https://github.com/user-attachments/assets/79118ce9-13e3-4377-b300-abebff7f812c" />

### 4. Skills & tools used

- http — fetches USDT market cap from CoinGecko at https://api.coingecko.com/api/v3/coins/tether (free, no API key required)
- memory_read — reads historical snapshots from stablecoin/supply.md
- memory_write — appends daily snapshots to build 30-day history
- time — timestamps each snapshot and calculates days between entries
- message — sends weekly Sunday report and immediate alerts on threshold breach
- routine/cron — runs daily at 9:00 AM UTC, weekly report every Sunday

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
