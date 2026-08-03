# Tavily: crawl

Run the legacy crawl operation. See the prompt and input schema for its exact contract.

Legacy tool context: Search the web, search social media platforms (Reddit, X, LinkedIn, etc.), extract clean page content, map sites, and crawl domains with Tavily. Authentication uses the 'tavily_api_key' secret injected by the IronClaw host as a Bearer token, the LLM never knows the credentials

## Inputs

- `url` (required): Root URL (http/https) to start crawling from.
- `max_depth` (optional): Maximum link depth from root URL (default 1).
- `limit` (optional): Maximum pages to crawl (1–50, default 10).
- `select_paths` (optional): Restrict crawl to these URL path prefixes (e.g. ["/docs/", "/blog/"]).
- `exclude_paths` (optional): Skip these URL path prefixes during crawl.

The operation is selected by IronClaw as `tavily.crawl`. Do not send the private `action` selector.
