# Firecrawl: scrape

Scrape and extract content from one URL.

Legacy tool context: Scrape, search, map, and crawl the web with Firecrawl (v2 API). 'scrape' returns clean markdown for one URL; 'search' finds pages by query; 'map' lists every URL on a site; 'crawl' + 'crawl_status' recursively scrape a whole site. Authentication uses the 'firecrawl_api_key' secret injected by the host as a Bearer token.

## Inputs

- `url` (required): Target URL (http/https) to scrape.
- `formats` (optional): Output formats, e.g. ["markdown"], ["markdown","html"]. Default ["markdown"].
- `only_main_content` (optional): Strip nav/header/footer boilerplate (default true).
- `wait_for` (optional): Milliseconds to wait for JS before extracting (max 60000).
- `timeout` (optional): Request timeout in milliseconds (1000-300000).

The operation is selected by IronClaw as `firecrawl.scrape`. Do not send the private `action` selector.
