# Firecrawl: crawl_status

Get the status and results of a crawl job.

Legacy tool context: Scrape, search, map, and crawl the web with Firecrawl (v2 API). 'scrape' returns clean markdown for one URL; 'search' finds pages by query; 'map' lists every URL on a site; 'crawl' + 'crawl_status' recursively scrape a whole site. Authentication uses the 'firecrawl_api_key' secret injected by the host as a Bearer token.

## Inputs

- `id` (required): The crawl_id returned by a 'crawl' call.

The operation is selected by IronClaw as `firecrawl.crawl_status`. Do not send the private `action` selector.
