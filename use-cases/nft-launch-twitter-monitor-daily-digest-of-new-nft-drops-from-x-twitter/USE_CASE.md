### 1. Title

NFT Launch Twitter Monitor — Daily digest of new NFT drops from X/Twitter

### 2. Example prompt

I'll give you my Twitter API Bearer Token — store it as a secret. Every morning, use it to search Twitter for posts about new NFT launches and upcoming drops from the last 24 hours. Summarize the top projects by mention volume and send me a digest to Telegram.

### 3. What the agent does

Every morning the agent searches Twitter/X for recent posts mentioning NFT launches, upcoming drops, and mint announcements from the last 24 hours. It groups mentions by project, filters out noise and reposts, and identifies which collections are getting the most organic buzz. The digest lands in your Telegram with project names, key details (mint price, chain, date), and links to the original tweets — essentially Grok-style NFT research delivered to your chat without you opening Twitter.

### 4. Skills & tools used

- twitter-search skill — queries Twitter/X API for recent posts by keyword or hashtag. Requires a paid Twitter API v2 Bearer Token (Basic tier or above). To connect: get your Bearer Token from https://developer.x.com/en/portal/dashboard, then store it as an encrypted secret in IronClaw and pass it to the skill on install. Ref — Reference: https://developer.x.com/en/docs/twitter-api/tweets/search/introduction
- routine/cron — schedules the search to run automatically every morning
- message — sends the digest to Telegram
- memory_write — stores seen project names to avoid re-reporting the same launches on subsequent days

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
