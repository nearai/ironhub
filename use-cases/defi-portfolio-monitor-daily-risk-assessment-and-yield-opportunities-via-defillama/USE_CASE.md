### 1. Title

DeFi Portfolio Monitor — Daily risk assessment and yield opportunities via DefiLlama

### 2. Example prompt

You are my DeFi portfolio monitor.

First, read my portfolio from memory at defi/portfolio.md using memory_read.
If the file does not exist, create it with this example portfolio and confirm:

# My DeFi Portfolio
- Lido: 2 ETH staked
- Aave: $500 USDC supplied
- Uniswap: $300 ETH/USDC LP

Then do the following:

1. For each protocol in my portfolio, fetch its current data from DefiLlama:
https://api.llama.fi/protocol/[protocol-slug]
(slugs: lido, aave, uniswap-v3 — map protocol names to slugs yourself)

Extract for each:
- Current TVL
- TVL change 24h (%)
- TVL change 7d (%)

2. Fetch the top 5 stablecoin yields from:
https://yields.llama.fi/pools

Filter only pools where:
- stablecoin = true
- apy > 5%
- tvlUsd > 1000000

3. Based on the data, evaluate risk for each of my positions:
- TVL dropped >20% in 7d = HIGH RISK
- TVL dropped 10-20% in 7d = MEDIUM RISK
- TVL stable or growing = LOW RISK

4. Send me a Telegram message in this format:

"📊 DeFi Portfolio Report

[Protocol] — [my position]
💰 TVL: $[X]B | 24h: [X]% | 7d: [X]%
⚠️ Risk: [LOW/MEDIUM/HIGH]
💡 [one line recommendation]

---
🌾 Best yield opportunities right now:
1. [Pool] — [APY]% APY | TVL: $[X]M
2. [Pool] — [APY]% APY | TVL: $[X]M
3. [Pool] — [APY]% APY | TVL: $[X]M

Overall portfolio health: [GOOD/WATCH/DANGER]"

Create a routine that runs every day at 9:00 AM and executes this entire portfolio check automatically.

### 3. What the agent does

The agent stores your DeFi positions in persistent memory. Every morning at 9 AM it fetches live TVL data for each protocol from DefiLlama and evaluates risk based on TVL changes over 24h and 7 days. It also scans DefiLlama's yield database for the best stablecoin opportunities above 5% APY. The full report lands in Telegram with risk labels for each position, one-line recommendations, and top yield opportunities available right now.

<img width="642" height="647" alt="Image" src="https://github.com/user-attachments/assets/f19e422f-8d06-47dc-abb3-656596b0ca2c" />

### 4. Skills & tools used

- http — fetches protocol data from DefiLlama API at https://api.llama.fi/protocol/ and yield data from https://yields.llama.fi/pools (free, no API key required)
- memory_read — reads portfolio positions from defi/portfolio.md
- memory_write — creates portfolio file on first run
- message — sends daily report to Telegram
- routine/cron — runs the full check automatically every day at 9:00 AM

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
