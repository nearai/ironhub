### 1. Title

Flight Price Monitor — Alert when ticket prices drop below your target

### 2. Example prompt

You are my flight price monitor. My API token for Aviasales is stored in memory at travel/aviasales-token.md

Every day at 10:00 AM, do the following:

1. Read my watchlist from memory at travel/watchlist.md using memory_read.
If file does not exist, create it with this example:
# Flight Watchlist
- Route: TBS → HKT (Tbilisi to Phuket), alert if price drops below $400
- Route: TBS → BKK (Tbilisi to Bangkok), alert if price drops below $350

2. For each route, fetch the cheapest ticket price from Aviasales API:
https://api.travelpayouts.com/v1/prices/cheap?origin=[ORIGIN]&destination=[DESTINATION]&currency=usd&token=[YOUR_TOKEN]

Extract the minimum price available.

3. Read previous prices from memory at travel/price-history.md using memory_read.
Compare current price with yesterday's price for each route.

4. Apply this logic:
- If current price is BELOW my alert threshold: send Telegram alert immediately
- If current price dropped more than 15% vs yesterday: send Telegram alert
- Otherwise: silent run, just update price history

5. Send Telegram alert in this format when triggered:

"✈️ Flight Price Alert!

[ORIGIN] → [DESTINATION]
💰 Current price: $[X]
📉 Yesterday: $[X] ([change]%)
🎯 Your target: $[X]

👉 Book now: https://www.aviasales.com/search/[ORIGIN][DESTINATION]"

6. Write updated prices to memory at travel/price-history.md using memory_write.

If no alerts triggered: reply HEARTBEAT_OK and stop.

Create a routine that runs every day at 10:00 AM and executes this automatically.

### 3. What the agent does

The agent monitors flight prices on your chosen routes daily using the Aviasales API. You set a target price for each route once — the agent checks every morning and alerts you in Telegram only when the price drops below your threshold or falls more than 15% compared to yesterday. It keeps a price history in memory so you can track trends over time. You never need to manually check flight prices again — the agent waits for the deal and notifies you.

### 4. Skills & tools used

- http — fetches live flight prices from Aviasales Travelpayouts API at https://api.travelpayouts.com/v1/prices/cheap (free tier available, token required — register at aviasales.ru/account/developer)
- memory_read — reads flight watchlist and price history from persistent memory
- memory_write — saves updated prices to travel/price-history.md after each check
- message — sends Telegram alert when price drops below target
- routine/cron — runs the price check automatically every day at 10:00 AM

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
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
