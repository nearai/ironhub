# Firecrawl: map

Run the legacy map operation. See the prompt and input schema for its exact contract.

Legacy tool context: Scrape, search, map, and crawl the web with Firecrawl (v2 API). 'scrape' returns clean markdown for one URL; 'search' finds pages by query; 'map' lists every URL on a site; 'crawl' + 'crawl_status' recursively scrape a whole site. Authentication uses the 'firecrawl_api_key' secret injected by the host as a Bearer token.

## Inputs

- `url` (required): Target site URL (http/https) to map.
- `search` (optional): Optional query to order discovered URLs by relevance.
- `limit` (optional): Max URLs to return (default 1000).
- `include_subdomains` (optional): Include subdomains in discovered URLs (default true).

The operation is selected by IronClaw as `firecrawl.map`. Do not send the private `action` selector.
