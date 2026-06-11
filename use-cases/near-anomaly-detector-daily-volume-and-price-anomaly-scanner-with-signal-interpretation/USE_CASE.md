### 1. Title

NEAR Anomaly Detector — Daily volume and price anomaly scanner with signal interpretation

### 2. Example prompt

You are my crypto anomaly detector for NEAR. Detect when today's market behavior is abnormal compared to the last 30 days.

Create a routine that runs every day at 6:00 PM UTC:

1. Fetch 30-day history from CoinGecko:
https://api.coingecko.com/api/v3/coins/near/market_chart?vs_currency=usd&days=30

Extract daily prices and daily volumes.

2. Perform these anomaly checks:

CHECK 1 — Volume spike:
- Calculate average daily volume across the past 30 days
- ANOMALY if today's volume is more than 2.5x the 30-day average

CHECK 2 — Price move size:
- Calculate average absolute daily % move across the past 30 days
- ANOMALY if today's % move is more than 3x the typical daily move

CHECK 3 — Price vs 30-day average:
- Calculate average price across the past 30 days
- ANOMALY if current price deviates more than 20% from the 30-day average

CHECK 4 — Volume trend:
- Compare average volume of last 3 days vs 30-day average
- ANOMALY if last 3 days average is more than 2x the monthly average

3. If ANY check triggers, interpret the combination:
- Volume spike + price up = "💚 Strong buy pressure — conviction move"
- Volume spike + price down = "🔴 Strong sell pressure — watch for continuation"
- Volume spike + price flat = "👀 Accumulation/distribution — big move likely in 48h"
- Volume trend + price up = "📈 Sustained interest — not a one-day pump"
- Price deviation up + no volume anomaly = "⚠️ Weak pump — likely to retrace"
- Price deviation down + volume = "🏳️ Capitulation signal — potential local bottom"

4. Send Telegram alert:

"🔍 NEAR Anomaly Detected

[For each triggered check:]
⚡ [CHECK NAME]: [what happened]
   Today: [value] vs 30d normal: [value] ([X]x)

💰 Current price: $[X] ([24h change]%)

🧠 Signal: [interpretation from step 3]"

5. If no anomalies: reply HEARTBEAT_OK and stop.

### 3. What the agent does

Every day at 6 PM the agent fetches 30 days of NEAR price and volume data from CoinGecko. It calculates what "normal" looks like for this token — average daily volume, average daily price move, average price — and compares today against that baseline across 4 checks. If anything is abnormal it doesn't just report numbers — it interprets the combination: volume spike with rising price means conviction buying, volume spike with flat price means accumulation before a move, price deviation without volume means weak pump likely to retrace. You only get a Telegram message when something genuinely unusual happens, with a one-line signal telling you what it likely means. <img width="562" height="394" alt="Image" src="https://github.com/user-attachments/assets/08ac190f-3883-473c-a79c-e7ef42a2dd11" />

### 4. Skills & tools used

- http — fetches 30-day NEAR market data from CoinGecko at https://api.coingecko.com/api/v3/coins/near/market_chart (free, no API key required)
- message — sends Telegram alert only when anomaly is detected
- routine/cron — runs automatically every day at 6:00 PM UTC

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
