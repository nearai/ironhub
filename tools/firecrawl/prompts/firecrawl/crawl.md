# Firecrawl: crawl

Run the legacy crawl operation. See the prompt and input schema for its exact contract.

Legacy tool context: Scrape, search, map, and crawl the web with Firecrawl (v2 API). 'scrape' returns clean markdown for one URL; 'search' finds pages by query; 'map' lists every URL on a site; 'crawl' + 'crawl_status' recursively scrape a whole site. Authentication uses the 'firecrawl_api_key' secret injected by the host as a Bearer token.

## Inputs

- `url` (required): Start URL (http/https) for the recursive crawl.
- `limit` (optional): Max pages to crawl (default 100).
- `max_depth` (optional): Maximum link-discovery depth from the start URL.

The operation is selected by IronClaw as `firecrawl.crawl`. Do not send the private `action` selector.
