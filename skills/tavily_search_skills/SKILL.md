---
name: tavily-search
version: "1.0.0"
description: "Guides the agent to use the tavily-tool for real-time web search, URL extraction, site crawling, and site mapping. Activates when the user wants current web information, to read a URL, research a topic, or understand a site's structure."
use_cases:
  - Search the web for current events, news, or recent information
  - Extract clean readable content from a URL or a list of URLs
  - Crawl a documentation site or blog to ingest its full content
  - Map a website's URL structure before targeted extraction
  - Research a topic with AI-synthesized answer and ranked sources
value_prop: "LLM-optimized web search with relevance scores, AI answers, and clean markdown — not raw HTML."
value_tags:
  - Search
  - WebScraping
  - Research
  - RAG
activation:
  keywords:
    - "search"
    - "look up"
    - "find"
    - "research"
    - "web"
    - "internet"
    - "news"
    - "current"
    - "latest"
    - "read"
    - "extract"
    - "scrape"
    - "crawl"
    - "url"
    - "website"
    - "page"
    - "site"
    - "map"
    - "links"
    - "documentation"
  tags:
    - "search"
    - "web"
    - "research"
    - "scraping"
  patterns:
    - "what is .*(today|now|currently|recent|latest)"
    - "find (me |information )?(about|on|regarding)"
    - "(search|look up|research) .*online"
    - "read (the |this )?(article|page|url|link|site)"
    - "(crawl|index|ingest) .*(docs|documentation|site|website)"
  max_context_tokens: 1600
---

# Tavily Web Search & Extraction

You have access to the **`tavily-tool`** — an LLM-optimized search and content extraction tool backed by the Tavily API. Use it whenever the user needs **current web information**, wants to **read a URL**, **research a topic**, or **understand a website's structure**.

> **Important**: Even without this skill, the tool's schema descriptions contain everything needed to call it correctly. This skill adds *when-to-use* and *workflow* guidance on top.

---

## Actions at a Glance

| Action | Use When | Key Params |
|--------|----------|------------|
| `search` | Need current facts, news, or topic overview | `query`, `include_answer`, `topic`, `max_results` |
| `social_media_search` | Need public opinion, trends, or community reactions | `query`, `platform`, `time_range`, `include_raw_content` |
| `extract` | Have specific URLs and need clean content | `urls`, `query` (for chunking) |
| `crawl` | Need full content from many pages of a site | `url`, `limit`, `select_paths` |
| `map` | Need to discover URLs before crawling/extracting | `url`, `max_depth` |

---

## Decision Flowchart

```
User needs web info?
    │
    ├── Has specific URLs already? → extract
    │
    ├── Needs full site content? → crawl
    │     (then optionally extract key pages)
    │
    ├── Needs site URL list? → map
    │     (then crawl or extract those URLs)
    │
    ├── Needs social media / trends / reviews? → social_media_search
    │     ├── Platform (reddit, x, linkedin, tiktok, etc.)? → set platform
    │     ├── Restrict to recent posts? → set time_range (day/week/month/year)
    │     └── Needs deep post text? → set include_raw_content: true
    │
    └── Needs to find sources by topic? → search
          ├── Topic is news/finance? → set topic accordingly
          ├── Needs AI summary? → set include_answer: true
          └── Needs full page bodies? → set include_raw_content: true
```

---

## Search: Choosing `search_depth` and `topic`

- **`search_depth: "basic"`** — fast, 1 credit. Good for simple factual lookups.
- **`search_depth: "advanced"`** — thorough, 2 credits. Use for research-heavy queries. *(Default)*
- **`topic: "news"`** — current events, breaking news.
- **`topic: "finance"`** — stock prices, earnings, financial data.
- **`topic: "general"`** — everything else. *(Default)*

**When to include AI answer:**
Add `"include_answer": true` when the user wants a direct response, not just links. The answer field synthesizes the top results into a paragraph.

---

## Social Media Search: Monitoring Trends & Sentiment

Use `social_media_search` to query platforms like **Reddit, Twitter/X, LinkedIn, TikTok, Instagram, and Facebook**.

- **`platform`** — Target specific platforms: `"reddit"`, `"x"`, `"linkedin"`, `"tiktok"`, `"instagram"`, `"facebook"`, or `"combined"` *(searches all, default)*.
- **`time_range`** — Restrict posts to `"day"`, `"week"`, `"month"`, or `"year"` to ensure fresh context.
- **`include_raw_content: true`** — Fetches full post text using Tavily's advanced extraction backend. Recommended when you need granular quotes/comments.

```jsonc
// Search Reddit for user sentiment on a new library
{
  "action": "social_media_search",
  "query": "axum v0.8 feedback",
  "platform": "reddit",
  "time_range": "month",
  "include_raw_content": true
}
```

---

## Extract: Single URL vs. Multiple URLs

```jsonc
// Read one URL — clean markdown
{ "action": "extract", "urls": ["https://example.com/article"] }

// Read multiple URLs at once — up to 10
{ "action": "extract", "urls": ["https://a.com", "https://b.com"] }

// Focus extraction on a topic — returns relevant chunks (≤500 chars each)
{ "action": "extract", "urls": ["https://docs.example.com/auth"], "query": "OAuth token refresh flow", "chunks_per_source": 5 }
```

Use `extract_depth: "advanced"` for JavaScript-heavy pages that don't render content in basic mode.

---

## Crawl: Efficient Site Ingestion

For docs sites or large content areas, use `select_paths` to target only relevant sections:

```jsonc
// Crawl only the /docs/ section, max 20 pages, 2 levels deep
{
  "action": "crawl",
  "url": "https://docs.example.com",
  "max_depth": 2,
  "limit": 20,
  "select_paths": ["/docs/", "/guides/"]
}
```

**Limits**: `limit` is clamped to 50 pages maximum. Default is 10 pages.

---

## Map → Extract Workflow

When you don't know which URLs exist on a site:
1. `map` to discover links
2. Filter the URL list by relevance
3. `extract` the relevant ones

```jsonc
// Step 1: discover URLs
{ "action": "map", "url": "https://docs.example.com", "max_depth": 2 }

// Step 2: extract the relevant subset
{ "action": "extract", "urls": ["https://docs.example.com/api", "https://docs.example.com/auth"] }
```

---

## Response Shape

**search** returns: `query`, `answer` (if requested), `result_count`, `results[]` with `title/url/content/score`.

**extract** returns: `result_count`, `results[]` with `url/raw_content`; `failed_results[]` for failed URLs.

**crawl** returns: `base_url`, `page_count`, `results[]` with `url/raw_content`.

**map** returns: `base_url`, `url_count`, `urls[]`.

All `raw_content` fields are truncated at 40,000 characters to protect the context window.

---

## Authentication Error

If you see *"Tavily API key not found"*, the user must run:
```bash
ironclaw tool setup tavily-tool
```
