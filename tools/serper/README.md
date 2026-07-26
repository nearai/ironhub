---
name: serper
version: 0.1.0
description: Google Search API oracle for Ironclaw via Serper.dev. Retrieves organic results, news, images, videos, local places, and shopping listings.
use_cases:
  - Google web search for real-time web context and research
  - Google News query for trending topics and current events
  - Google Maps Places query for local business directories
  - Google Images/Videos search for media context
  - Google Shopping search for product prices and availability
value_prop: "Google Search Engine Results Page (SERP) API oracle - structured, pruned search metadata including organic listings, news, and places."
value_tags:
  - Search
  - WebSearch
  - SEO
  - SERP
---

# Serper.dev Search Tool

A sandboxed WASM tool that gives an IronClaw agent access to the [Serper.dev Google Search API](https://serper.dev/) for real-time web results, news, images, videos, maps/places, and shopping listings.

The host injects the API key at the HTTP boundary — the WASM code never sees the raw secret — and network access is restricted to `google.serper.dev` as declared in `serper-tool.capabilities.json`.

![Serper tool](screenshot.png)

## Authentication

Configure your Serper.dev API key:

```bash
ironclaw tool setup serper-tool
```

During execution, the host automatically injects the `X-API-KEY` header.

## Actions

| Action | Required | Optional | Description |
|--------|----------|----------|-------------|
| `search` | `q` | `gl`, `hl`, `location`, `num`, `page`, `autocorrect` | Get standard Google search organic results. |
| `news` | `q` | `gl`, `hl`, `location`, `num`, `page` | Get Google News results. |
| `images` | `q` | `gl`, `hl`, `location`, `num`, `page` | Get Google Image search results. |
| `videos` | `q` | `gl`, `hl`, `location`, `num`, `page` | Get YouTube/Google Video search results. |
| `places` | `q` | `gl`, `hl`, `location`, `num` | Query Google Maps local business data. |
| `shopping` | `q` | `gl`, `hl`, `location`, `num`, `page` | Search Google Shopping listings. |

## Examples

```json
// Query Google Web Search
{
  "action": "search",
  "q": "Rust WASM tool tutorial",
  "gl": "us",
  "hl": "en"
}

// Get Google News about Generative AI
{
  "action": "news",
  "q": "Generative AI",
  "num": 5
}
```
