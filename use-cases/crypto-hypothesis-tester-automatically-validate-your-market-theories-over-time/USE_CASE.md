### 1. Title

Crypto Hypothesis Tester — Automatically validate your market theories over time

### 2. Example prompt

You are my crypto hypothesis tester. I want to test this hypothesis:
"When ETH price rises more than 3% in 24h, NEAR price rises within the next 48 hours"

Do the following:

1. Read memory at hypotheses/eth-near-correlation.md using memory_read.
If file does not exist, create it with:
# Hypothesis: ETH pump → NEAR follows within 48h
- Hypothesis: When ETH rises >3% in 24h, NEAR rises within 48h
- Status: TESTING
- Started: [today's date]
- Observations: []
- Confirmed: 0
- Refuted: 0

2. Fetch current prices from CoinGecko:
https://api.coingecko.com/api/v3/simple/price?ids=ethereum,near&vs_currencies=usd&include_24hr_change=true

3. Apply hypothesis logic:
- If ETH 24h change > +3%: log as TRIGGER EVENT with today's date and ETH price
- If a TRIGGER EVENT was logged 48h ago: check if NEAR price is now higher than at trigger time
  - If YES: mark as CONFIRMED, increment confirmed counter
  - If NO: mark as REFUTED, increment refuted counter

4. Write updated log back to memory at hypotheses/eth-near-correlation.md

5. Every Sunday send me a Telegram summary:
"🧪 Hypothesis Test Report

Theory: ETH pump → NEAR follows within 48h
Status: TESTING (day [X] of 30)

Results so far:
✅ Confirmed: [X] times
❌ Refuted: [X] times
📊 Hit rate: [X]%

Last trigger: [date] — ETH +[X]% → NEAR [outcome]

Verdict: [PROMISING if >60% / INCONCLUSIVE if 40-60% / REJECTED if <40%]"

Create a routine that runs every 6 hours to check prices and update the hypothesis log, and sends the weekly report every Sunday at 10:00 AM.

### 3. What the agent does

You define a market hypothesis once — for example "when ETH pumps 3%+, NEAR follows within 48 hours". The agent monitors prices every 6 hours, logs trigger events and their outcomes, and tracks confirmation rate over time. Every Sunday it sends a Telegram report with how many times the hypothesis held vs failed, the current hit rate, and a verdict. After 30 days you have statistically grounded evidence whether your theory works or not — fully automated, no manual tracking needed.

### 4. Skills & tools used

- http — fetches live prices from CoinGecko at https://api.coingecko.com/api/v3/simple/price (free, no API key required)
- memory_read — reads hypothesis log and historical trigger events
- memory_write — appends new observations and updates confirmation counters
- time — timestamps each trigger event and outcome check
- message — sends weekly Telegram report every Sunday
- routine/cron — runs price check every 6 hours and weekly report every Sunday at 10:00 AM

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
