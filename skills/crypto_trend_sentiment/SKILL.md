---
name: crypto-trend-sentiment
version: "1.0.0"
description: "Cross-references CoinGecko trending crypto assets with discussions and hype on major social platforms (X, Reddit, TikTok, Threads) to gauge market sentiment."
use_cases:
  - Identify trending cryptocurrencies and NFTs in the last 24 hours
  - Search major social platforms (X, Reddit, TikTok, Threads) for community discussions regarding trending assets
  - Calculate post engagement and sentiment metrics (like, repost, reply rates)
value_prop: "Correlates on-chain market trends with off-chain social sentiment indicators for active crypto traders."
value_tags:
  - Sentiment
  - SocialMedia
  - Crypto
  - Analytics
activation:
  keywords:
    - "trending"
    - "sentiment"
    - "hype"
    - "social"
    - "fomo"
    - "coingecko"
    - "twitter"
    - "reddit"
    - "threads"
  patterns:
    - "what crypto is trending .*"
    - "social sentiment for .*"
    - "is there hype around .*"
---

# Crypto Trend & Sentiment Analyzer

You have access to the **`coingecko`**, **`tavily`** (specifically `social_media_search`), and **`bluesky-analytics`** tools. Use this skill to monitor trending crypto coins, trace their mentions across major social platforms (like X, Reddit, TikTok, Threads) and decentralized networks, and evaluate market sentiment.

> **Important**: This skill does NOT save data to external databases like Airtable. All results should be output directly as analytical markdown reports.

---

## Actions at a Glance

| Tool | Action | Use When | Key Params |
|------|--------|----------|------------|
| `coingecko` | `trending_coins` | Fetch trending coins, NFTs, and categories in the last 24h | None |
| `tavily` | `social_media_search` | Search major social media platforms (X, Reddit, TikTok, Threads) for mentions | `query`, `platform`, `time_range` |
| `bluesky-analytics` | `search_actors` / `get_author_feed` | Fallback search on Bluesky decentralized feeds for project discussion | `q` / `actor`, `limit` |

---

## Decision Flowchart

```
User wants to analyze trending assets & hype?
    │
    ├── Fetch on-chain trending assets? → coingecko (action: trending_coins)
    │
    ├── Query major social mentions & sentiment (X, Reddit, TikTok, Threads)? → tavily (action: social_media_search)
    │
    └── Check decentralized social (Bluesky)?
          ├── Find official handle? → bluesky-analytics (action: search_actors)
          └── Pull feed/engagement? → bluesky-analytics (action: get_author_feed)
```

---

## Example Invocations

### 1. Fetching trending coins on CoinGecko
```json
{
  "action": "trending_coins"
}
```

### 2. Searching social posts on X (Twitter) for sentiment analysis
```json
{
  "action": "social_media_search",
  "query": "Solana ETF approval",
  "platform": "twitter",
  "time_range": "week",
  "include_raw_content": true
}
```

---

## Output Guidelines

When delivering a Trend & Sentiment report:
1. **On-chain Trend**: List trending assets from CoinGecko showing: `Rank`, `Name`, `Symbol`, `Market Cap Rank`.
2. **Social Mention Summary**: Summarize social posts collected into:
   - **Bullish Signals**: Hype, positive product feedback, partnership announcements.
   - **Bearish Signals**: Technical glitches, delays, negative community feedback.
3. **Engagement Matrix**: Present post engagement stats (likes, reposts, comments) from social feeds in a table.
4. **Sentiment Score**: Conclude with a final verdict (e.g. Bullish, Bearish, Neutral) and a confidence percentage based on the social volume.
