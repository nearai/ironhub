### 1. Title

Hacker News AI Agents Digest — Weekly top discussions delivered to Telegram

### 2. Example prompt

Fetch this URL using the http tool:
https://hn.algolia.com/api/v1/search?query=AI+agents&tags=story&hitsPerPage=10&numericFilters=points>50

Parse the JSON response. For each story extract:
- Title
- Points
- Date
- URL

Sort by points (highest first). Take top 5.

Then send me a Telegram message in this format:

"🗞 Hacker News — AI Agents Digest

1. [Title]
⬆️ [Points] points · [Date]
🔗 [URL]

2. [Title]
⬆️ [Points] points · [Date]
🔗 [URL]

(repeat for all 5 stories)

💬 Most discussed: [title of #1 post]"

If you want this automatically every week, create a routine that runs every Monday at 9:00 AM with this exact task.

### 3. What the agent does

The agent fetches the top AI agents discussions from Hacker News via the public Algolia API — no API key required. It filters only stories with more than 50 points to cut out noise, sorts by engagement, and picks the top 5. It then sends a clean Telegram digest with titles, point counts, dates, and direct links. Can be set up as a weekly routine so the digest arrives every Monday morning automatically.

<img width="631" height="402" alt="Image" src="https://github.com/user-attachments/assets/6567f459-9249-4aa0-abec-00bba5e3a150" />

### 4. Skills & tools used

- http — fetches Hacker News Algolia API at https://hn.algolia.com/api/v1/search (public, no API key needed, returns fresh 2026 data)
- message — sends the digest to Telegram
- routine/cron — optional weekly schedule (every Monday at 9:00 AM)

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
