### 1. Title

Twitter Sentiment Trend Tracker — Daily NEAR mood score with streak detection

### 2. Example prompt

You are my Twitter sentiment trend tracker for NEAR Protocol.

My Twitter API Bearer Token is stored in memory at twitter/bearer-token.md

Create a routine that runs every day at 8:00 PM UTC:

1. Read Bearer Token from memory at twitter/bearer-token.md

2. Search recent tweets about NEAR:
GET https://api.twitter.com/2/tweets/search/recent?query=NEAR+Protocol+crypto&max_results=50&tweet.fields=text,created_at
Header: Authorization: Bearer [YOUR_TOKEN]

3. Analyze sentiment of each tweet:
- BULLISH: moon, pump, buy, accumulate, bullish, up, gains, ATH, breakout, launch, partnership
- BEARISH: dump, sell, crash, rug, scam, dead, bearish, down, rekt, exit
- NEUTRAL: everything else

Count totals. Calculate bullish % = bullish / (bullish + bearish) * 100

4. Read sentiment history from memory at twitter/sentiment-history.md using memory_read.
If file does not exist, create it with today's entry as baseline.

Append today's entry:
- Date
- Bullish count
- Bearish count
- Bullish %
- Label: BULLISH if >60%, BEARISH if <40%, MIXED otherwise

5. Analyze trends from history:
- Count how many days in a row sentiment has been BEARISH
- Count how many days in a row sentiment has been BULLISH
- Calculate 7-day average bullish %
- Compare today vs 7-day average

6. Send Telegram message every day:

"🐦 NEAR Twitter Sentiment — [Date]

Today: [X] bullish / [X] bearish / [X] neutral
Mood: [BULLISH/BEARISH/MIXED] ([X]%)

📊 Trend:
7-day avg: [X]%
Streak: [X] days [BULLISH/BEARISH] in a row

[If bearish streak >= 4 days:]
⚠️ Bearish streak [X] days — historically this pattern precedes local bottoms

[If bullish streak >= 4 days:]
📈 Bullish streak [X] days — sustained positive momentum

[If today bullish % dropped >15% vs 7d avg:]
🔴 Sentiment deteriorating fast — watch for price reaction

[If today bullish % rose >15% vs 7d avg:]
💚 Sentiment improving fast — potential reversal signal"

7. Write updated history back to memory at twitter/sentiment-history.md

### 3. What the agent does

Every evening the agent searches the last 50 tweets about NEAR Protocol using the Twitter API, classifies each as bullish, bearish, or neutral based on keywords, and logs the daily score to persistent memory. Over time it builds a sentiment history and detects streaks — if bearish sentiment runs 4+ days in a row it flags it as a historically significant pattern. It also catches fast sentiment shifts: if today's mood dropped 15%+ vs the 7-day average, that's an early warning before price reacts. One day of sentiment is noise; a week of trend is signal.

### 4. Skills & tools used

- http — queries Twitter API v2 recent search at https://api.twitter.com/2/tweets/search/recent (paid Twitter API Basic tier required — get Bearer Token at developer.x.com/en/portal/dashboard)
- memory_read — reads sentiment history from twitter/sentiment-history.md
- memory_write — appends daily sentiment score to build trend history
- message — sends daily Telegram report with streak analysis
- routine/cron — runs automatically every day at 8:00 PM UTC

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
