---
name: web-search
version: 1.0.0
description: Search the web and return summarized, sourced answers to user queries
activation:
  keywords:
    - "search for"
    - "look up"
    - "find information about"
    - "what is the latest on"
    - "google"
    - "search the web"
    - "find online"
  patterns:
    - "(?i)(search|look up|find|google).*online"
    - "(?i)what.*latest.*on"
    - "(?i)current(ly)?.*information.*about"
  tags:
    - "research"
    - "web"
    - "data"
  max_context_tokens: 2000
---

# Web Search Skill

Enables the agent to search the web and return accurate, summarized, well-sourced answers to user queries in real time.

## When to Use

- User asks for current or recent information
- User explicitly says "search", "look up", "google", or "find online"
- The topic requires up-to-date data (news, prices, events, people)
- Internal knowledge may be outdated or insufficient

## Core Knowledge

### Key Principles

1. **Recency first** — always prefer the most recent, authoritative sources; flag if results are older than 6 months
2. **Summarize, don't dump** — extract the key insight from results; do not paste raw search output
3. **Cite your sources** — always include the source name and URL for every major claim
4. **Acknowledge uncertainty** — if results are conflicting or sparse, say so explicitly

### Search Strategy

- Break complex queries into 2–3 focused sub-queries
- Prefer official sites, reputable news outlets, and peer-reviewed sources
- Cross-reference at least 2 sources before presenting a fact as confirmed
- For ambiguous queries, clarify intent before searching

### Mistakes to Avoid

- Never fabricate URLs or source names — only cite real results
- Don't present a single source as consensus
- Avoid summarizing opinion pieces as facts

## Guidelines

- Always end with: "Sources: [name](url)" for each reference used
- If search returns no useful results, tell the user clearly and suggest alternative queries
- Keep summaries under 200 words unless the user asks for detail
