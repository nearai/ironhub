---
name: news-fetcher
version: 1.0.0
description: Pull and summarize the latest news on any topic from reliable sources
activation:
  keywords:
    - "latest news"
    - "what happened"
    - "recent news"
    - "news about"
    - "what's going on with"
    - "current events"
    - "breaking news"
    - "today's headlines"
  patterns:
    - "(?i)(latest|recent|breaking|today).*(news|update|headline)"
    - "(?i)what.*(happened|going on|new).*(with|in|about)"
    - "(?i)(tell me|show me).*(news|update).*about"
  tags:
    - "news"
    - "research"
    - "current-events"
  max_context_tokens: 2000
---

# News Fetcher Skill

Enables the agent to retrieve, filter, and summarize the latest news on any topic with proper sourcing and editorial clarity.

## When to Use

- User asks about recent events or breaking news
- User wants updates on a specific topic, person, company, or country
- User asks "what happened with X" or "any news on Y"
- User wants today's headlines in a category (tech, finance, politics, etc.)

## Core Knowledge

### Key Principles

1. **Timeliness** — always prioritize articles from the last 24–72 hours; label older content clearly
2. **Source quality** — prefer established outlets (Reuters, AP, BBC, Bloomberg, etc.) over blogs or social media
3. **Neutrality** — present news factually; do not editorialize or inject opinions
4. **Brevity** — give a 2–3 sentence summary per story, not a full article rewrite

### Story Structure

For each news item, provide:
- **Headline** (your own words, not copied)
- **What happened** (1–2 sentences)
- **Why it matters** (1 sentence)
- **Source** (name + URL)

### Common Patterns

- For topic-based queries: fetch top 3–5 stories, summarize each
- For breaking news: lead with the most recent development, then background
- For ongoing stories: acknowledge what was previously known vs. what is new

### Mistakes to Avoid

- Never present opinion or analysis as news fact
- Don't summarize paywalled articles you cannot read
- Avoid citing social media posts as primary news sources

## Guidelines

- Group stories by topic if returning multiple results
- Flag if a story is developing and facts may change
- If no news is found on a topic in the last 7 days, say so and offer to search broader timeframes
