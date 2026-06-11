### 1. Title

Bitcoin Reddit Sentiment Scanner — Daily mood check from r/cryptocurrency

### 2. Example prompt

Fetch this URL:
https://www.reddit.com/r/cryptocurrency/search.rss?q=bitcoin&sort=new&limit=25

Parse the RSS/XML response and extract the title and description of each post.

Then analyze the sentiment of each post based on its title and description:
- POSITIVE: optimistic, bullish, price going up, good news, adoption
- NEGATIVE: bearish, crash, scam, FUD, regulation crackdown, price drop
- NEUTRAL: question, discussion, neither positive nor negative

Count how many posts fall into each category.

Then send me a Telegram message in this format:
"📊 Bitcoin Reddit Sentiment (last 25 posts)
🟢 Positive: X posts
🔴 Negative: X posts
⚪️ Neutral: X posts

Sentiment: [BULLISH / BEARISH / MIXED] — based on which category dominates

Top signal: [paste the most interesting/extreme title you found]"

If positive > negative by 5+ posts: label as BULLISH
If negative > positive by 5+ posts: label as BEARISH
Otherwise: MIXED

### 3. What the agent does

The agent fetches the 25 most recent Bitcoin-related posts from r/cryptocurrency using the public RSS feed (no API key required). It parses each post's title and description, classifies sentiment as positive, negative, or neutral based on keywords and context, then counts the breakdown. If positive posts outnumber negative by 5+, it labels the mood BULLISH; if negative dominates, BEARISH; otherwise MIXED. It sends a clean Telegram summary with the counts, overall label, and the most interesting signal post it found.

<img width="630" height="435" alt="Image" src="https://github.com/user-attachments/assets/8e082aee-496a-49e7-bde2-faa7a09f4cbf" />

### 4. Skills & tools used

- http — fetches Reddit r/cryptocurrency RSS feed at https://www.reddit.com/r/cryptocurrency/search.rss (public, no API key needed — JSON API is blocked but RSS works)
- message — sends the sentiment summary to Telegram

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
