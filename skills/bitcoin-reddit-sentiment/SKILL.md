---
name: bitcoin-reddit-sentiment
version: 1.0.0
description: "Reads the 25 most recent Bitcoin posts from r/cryptocurrency via the public RSS feed (no API key — Reddit's JSON API is blocked but RSS works), classifies each post's sentiment as positive, negative, or neutral from its title and description, and returns a Telegram summary with the counts and an overall mood label: BULLISH if positives lead by 5+, BEARISH if negatives lead by 5+, otherwise MIXED, plus the most striking post it found."
activation:
  keywords:
    - "bitcoin sentiment"
    - "reddit sentiment"
    - "crypto sentiment"
    - "market mood"
  patterns:
    - "(?i)(bitcoin|btc|crypto)\\s+sentiment"
    - "(?i)reddit\\s+(sentiment|mood)"
  tags:
    - "crypto"
    - "bitcoin"
    - "sentiment"
    - "automation"
  max_context_tokens: 2000
requires:
  tools:
    - http
    - message
    - routine
  bins: []
  env: []
---
You read recent Bitcoin posts from Reddit and give the user a quick read on the crowd's mood.

## Hard rules
- Classify each post's sentiment by reading its title and description in plain language. Never write or run code to score it.
- Use the labels exactly: BULLISH if positives outnumber negatives by 5 or more; BEARISH if negatives outnumber positives by 5 or more; otherwise MIXED. Do not invent your own cutoff.
- Read only the posts actually returned by the feed. Never invent a post, a count, or a headline. If the feed returns nothing, say so plainly instead of guessing a mood.
- This is a sentiment snapshot, not a trade signal — never tell the user to buy or sell based on it.
- Installing this skill does not create any routine by itself. If the user asks for a scheduled check, you must explicitly call the routine/mission creation tool yourself and confirm it was created before telling the user it's running.

## Sentiment check
When the user asks for the Bitcoin sentiment (or the routine runs):
1. Fetch the feed with the `http` tool: `https://www.reddit.com/r/cryptocurrency/search.rss?q=bitcoin&sort=new&limit=25`.
2. Read the title and description of each post.
3. Classify each as:
   - POSITIVE — optimistic, bullish, price up, good news, adoption
   - NEGATIVE — bearish, crash, scam, FUD, regulation crackdown, price drop
   - NEUTRAL — question, discussion, neither clearly positive nor negative
4. Count each category and apply the label rule above.
5. Send the summary (format below).

Summary format:
```
📊 Bitcoin Reddit Sentiment (last 25 posts)
🟢 Positive: [X]
🔴 Negative: [X]
⚪️ Neutral: [X]
Mood: [BULLISH / BEARISH / MIXED]
Top signal: [the most interesting or extreme title found]
```

## Optional routine
This skill works on demand. If the user wants it scheduled (e.g. a daily mood check), create a routine with the full steps above as a self-contained goal.

## Commands
- `bitcoin sentiment` — read the latest 25 Bitcoin posts and show the mood now
