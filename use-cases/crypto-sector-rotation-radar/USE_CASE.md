### 1. Title

Crypto Sector Rotation Radar

### 2. Example prompt

Fetch CoinGecko coin categories with their 24h market cap change. Rank the top 5 and bottom 5 sectors and tell me where capital is rotating in and out of right now.

### 3. What the agent does

<img width="732" height="671" alt="Image" src="https://github.com/user-attachments/assets/8956ed37-2c91-4b67-b652-6c9a2aeb2433" />

Fetches live sector-level data from CoinGecko's categories endpoint, which aggregates all tokens within each theme (Gaming, NFT, Privacy Coins, DeFi, Infrastructure, etc.) into a single market cap and 24h change figure. The agent ranks the top 5 gaining and bottom 5 losing sectors, computes volume-to-market-cap turnover for each to distinguish real buying activity from thin low-conviction moves, and delivers a plain-English rotation summary identifying which crypto narratives are currently attracting capital and which are losing it.

### 4. Skills & tools used

- CoinGecko Categories API (native http tool) — https://docs.coingecko.com/reference/coins-categories

### 5. Categories

- [x] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
