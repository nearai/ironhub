### 1. Title

Remote Job Alert — Auto-notify when new crypto, blockchain or Rust jobs appear on RemoteOK

### 2. Example prompt

Fetch this URL using the http tool:
https://remoteok.com/api

Parse the JSON response. Filter jobs where the job TITLE contains ANY of these keywords (case-insensitive):
- crypto
- blockchain
- rust
- web3
- NEAR
- DeFi
- solidity

OR where at least 2 of the first 5 tags match these keywords.

This double-check avoids false positives where unrelated companies accidentally have one crypto tag.

For each matching job extract:
- Job title
- Company
- Tags (first 5 only)
- URL (https://remoteok.com/remote-jobs/ + slug)
- Date posted

Then read memory at jobs/seen.md using memory_read.
Compare found jobs against seen list.
Only keep jobs NOT already in seen.md.

If there are new jobs:
1. Send Telegram message in this format:

"💼 New Remote Jobs Alert

1. [Job Title] — [Company]
🏷 [tags]
🔗 [URL]

2. [Job Title] — [Company]
🏷 [tags]
🔗 [URL]"

2. Append new job URLs to jobs/seen.md using memory_write.

If no new jobs: reply HEARTBEAT_OK and stop.

### 3. What the agent does

Every 6 hours the agent fetches all remote jobs from RemoteOK's public API and filters positions where the title or at least 2 tags match crypto-related keywords (crypto, blockchain, rust, web3, NEAR, DeFi, solidity). It checks against a memory file of already-seen job URLs to avoid duplicate alerts. Only genuinely new matching jobs trigger a Telegram message with title, company, tags, and a direct link. After alerting, it saves the new URLs to memory so you never get the same job twice.

<img width="508" height="195" alt="Image" src="https://github.com/user-attachments/assets/954754d7-d975-4cb8-9962-ce6e372b04d7" />

### 4. Skills & tools used

- http — fetches RemoteOK public API at https://remoteok.com/api (free, no API key required)
- memory_read — reads jobs/seen.md to check which jobs were already alerted
- memory_write — appends new job URLs to jobs/seen.md after each alert
- message — sends new job alerts to Telegram
- routine/cron — runs the check automatically every 6 hours

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
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
