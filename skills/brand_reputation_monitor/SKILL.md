---
name: brand-reputation-monitor
version: "1.0.0"
description: "Monitors brand and keyword mentions on social platforms, runs sentiment analysis, and prepares response drafts."
use_cases:
  - Track brand mentions and sentiment across major networks like X (Twitter), Reddit, TikTok, Facebook, and Threads
  - Identify viral discussions, complaints, or questions regarding a product
  - Run cross-platform queries via Tavily and use Bluesky as a fallback decentralized feed
value_prop: "Automates brand reputation monitoring across major social platforms and the wider web."
value_tags:
  - SocialListening
  - Reputation
  - Sentiment
activation:
  keywords:
    - "social listening"
    - "brand mentions"
    - "monitor keywords"
    - "sentiment analysis"
    - "reputation"
    - "social search"
  patterns:
    - "monitor mentions for .*"
    - "what is the sentiment around .*"
    - "find social posts about .*"
---

# Brand Reputation Monitor

You have access to the **`tavily`** (specifically `social_media_search`) tool to query major social platforms like X (Twitter), Reddit, TikTok, Facebook, and Threads. You also have access to **`jina`** / **`firecrawl`** for deep page scraping, and **`bluesky-analytics`** for decentralized feeds. Use this skill to help users monitor brand mentions, analyze social sentiment, track comments/replies, and draft polite responses.

> **Important**: This skill does NOT save data to external databases like Airtable. Mentions, sentiment analysis, and draft replies should be formatted directly in clean Markdown blocks.

---

## Actions at a Glance

| Tool | Action | Use When | Key Params |
|------|--------|----------|------------|
| `tavily` | `social_media_search` | Search major social media platforms (X, Reddit, TikTok, Facebook, Threads) | `query`, `platform`, `time_range` |
| `bluesky-analytics` | `search_actors` / `get_author_feed` | Fallback search on Bluesky decentralized feeds | `q` / `actor` |
| `bluesky-analytics` | `get_post_thread` | Crawl comments/replies on a specific Bluesky thread | `uri`, `depth` |
| `jina` / `firecrawl` | `read_url` / `scrape` | Read specific blog links, forum posts, or articles containing brand mentions | `url` |

---

## Decision Flowchart

```
User wants brand reputation intelligence?
    │
    ├── Check mentions on major social platforms (X, Reddit, TikTok, Facebook, Threads)?
    │     └── Search social feeds → tavily (action: social_media_search)
    │
    ├── Check decentralized social feeds (Bluesky)?
    │     ├── Find official profile? → bluesky-analytics (action: search_actors)
    │     └── Pull feed & replies? → bluesky-analytics (action: get_author_feed)
    │
    └── Read specific forum post details / articles?
          ├── Standard link? → jina (action: read_url)
          └── JS-heavy link? → firecrawl (action: scrape)
```

---

## Example Invocations

### 1. Searching for brand mentions on X (Twitter)
```json
{
  "action": "social_media_search",
  "query": "IronClaw",
  "platform": "twitter",
  "time_range": "week",
  "include_raw_content": true
}
```

### 2. Searching for brand discussions on Reddit
```json
{
  "action": "social_media_search",
  "query": "IronClaw",
  "platform": "reddit",
  "time_range": "week",
  "include_raw_content": true
}
```

---

## Brand Reputation Monitoring Workflow

1. **Collect Mentions**: Run `tavily` with `action: "social_media_search"` targeting major platforms (X, Reddit, TikTok, Facebook, Threads) to discover recent posts. Use `bluesky-analytics` to check decentralized feeds if needed.
2. **Classify Sentiment**: Group posts into `Positive`, `Neutral (Questions)`, and `Negative (Complaints)`.
3. **Trace Impact**: Check post views or engagement metrics (likes, reposts, comments) to prioritize high-influence accounts.
4. **Draft Responses**:
   - For every question or complaint, draft an appropriate, polite response.
   - Present the draft reply alongside the post link so the user can easily copy and post it in one tap.
5. **Digest Summary**: Format the output with:
   - **TL;DR**: High-level news (e.g. "Sentiment is mostly positive on X and Reddit, with 1 concern about setup").
   - **Positive Highlights**: Key quotes of community praise.
   - **Action Items & Draft Replies**: List of concerns alongside suggested replies.

