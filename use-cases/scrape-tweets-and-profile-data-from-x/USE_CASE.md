### 1. Title

Scrape tweets and profile data from X

### 2. Example prompt

"Scrape all tweets mentioning 'AI agents' from the past 30 days, then pull the profile info and follower count for the top accounts in the results."

### 3. What the agent does

Installs Scweet and authenticates using a dummy X account's `auth_token` cookie — no official API key required. It searches tweets by keyword, hashtag, date range, or specific user, fetches full profile timelines, pulls follower and following lists, and retrieves user bios and metadata. Results are saved as CSV or JSON for further analysis, reporting, or monitoring. For higher-volume runs, the agent can pool multiple dedicated accounts with proxies to stay within rate limits.

### 4. Skills & tools used

- Scweet (`pip install -U Scweet`) — Python library that scrapes Twitter/X via its internal GraphQL API without an API key; supports tweet search by keyword/hashtag/user/date, profile timelines, followers/following lists, and user info with CSV/JSON output (https://github.com/altimis/scweet)

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

https://github.com/altimis/scweet

### 7. Author (optional)

mr.potato
