### 1. Title

BTC Dominance Alert — Auto-notify when BTC dom crosses key thresholds

### 2. Example prompt

Create a routine that runs every 5 hours and checks BTC dominance.

The routine should do the following:

1. Fetch global crypto market data from this URL:
   https://api.coingecko.com/api/v3/global

2. Extract the field: data.market_cap_percentage.btc
   That is the current BTC dominance percentage.

3. Apply this logic:
   - If BTC dominance is BELOW 60%: send me a Telegram message saying:
     "🔴 BTC Dominance Alert: BTC dom dropped to [X]% — below 60%. Altcoin season signal."
   - If BTC dominance is ABOVE 65%: send me a Telegram message saying:
     "🟡 BTC Dominance Alert: BTC dom rose to [X]% — above 65%. BTC dominance expanding."
   - If BTC dominance is between 60% and 65%: do NOT send anything. Silent run.

4. Always write the result to memory at btc-dominance/last-check.md with:
   - timestamp of the check
   - current BTC dominance value
   - whether an alert was sent or not

Do not send a message on every run — only when a threshold is crossed.
If nothing triggered, reply HEARTBEAT_OK and stop.

### 3. What the agent does

Every 5 hours the agent fetches live global market data from CoinGecko and extracts the current BTC dominance percentage. If dominance drops below 60%, it sends a Telegram alert flagging a potential altcoin season signal. If it rises above 65%, it sends a different alert noting BTC dominance expansion. If the value stays between 60–65%, the run is silent — no message sent. After each check it writes a timestamped log to memory (timestamp, value, alert status). You only hear from it when something actually matters.

<img width="472" height="58" alt="Image" src="https://github.com/user-attachments/assets/12b17f6a-051a-4f81-97fc-d43781cd0221" />

### 4. Skills & tools used

- http — fetches live data from CoinGecko Global API (https://api.coingecko.com/api/v3/global)
- routine/cron — runs the check automatically every 5 hours on a schedule
- message — sends Telegram alerts only when a threshold is crossed
- memory_write — logs each check result to btc-dominance/last-check.md for audit trail

### 5. Categories

- [x] Personal assistant
- [x] Web 3 / Crypto
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
