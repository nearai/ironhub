### 1. Title

Daily positive news & insight briefer for a better-mood workday

### 2. Example prompt

Every weekday morning, send me a short briefer of 3–5 positive, constructive news and insights (mix of general web + tech/industrial parks), so I can start the day in a good headspace instead of doomscrolling.

### 3. What the agent does

Asks the user on first run which topics and industries they care about, then stores the preferences.

Every weekday morning it runs a scheduled job, fetches a curated mix of constructive news and insightful long-form pieces (general positive web + tech / industrial parks coverage), filters out doom, outrage, and clickbait, and delivers a short bullet briefer (3–5 items) with a one-line takeaway per item. Output is scannable in under 2 minutes. On first run it also prompts the user to confirm or refine topic / industry / tone preferences; on later runs it just delivers.

### 4. Skills & tools used

- web_search — fetch fresh positive / constructive articles
- routine/cron — schedule the weekday 7am local-time run
- message — deliver the briefer to the user's current channel
- Positive-news filter — score and rank articles for constructive tone, drop outrage / clickbait / doom

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [x] Research
- [x] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

Inspired by Kent's own productivity note: negative-news overload tanks mood and work output, so a positive-mood morning digest is a real personal-assistant need.

### 7. Author (optional)

kent
