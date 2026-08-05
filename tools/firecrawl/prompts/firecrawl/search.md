# Firecrawl: search

Run the legacy search operation. See the prompt and input schema for its exact contract.

Legacy tool context: Scrape, search, map, and crawl the web with Firecrawl (v2 API). 'scrape' returns clean markdown for one URL; 'search' finds pages by query; 'map' lists every URL on a site; 'crawl' + 'crawl_status' recursively scrape a whole site. Authentication uses the 'firecrawl_api_key' secret injected by the host as a Bearer token.

## Inputs

- `query` (required): Search query (max 500 chars).
- `limit` (optional): Max results (1-100, default 10).
- `sources` (optional): Which result types to return (default ["web"]).

The operation is selected by IronClaw as `firecrawl.search`. Do not send the private `action` selector.
