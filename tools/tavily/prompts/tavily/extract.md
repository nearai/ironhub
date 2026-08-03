# Tavily: extract

Run the legacy extract operation. See the prompt and input schema for its exact contract.

Legacy tool context: Search the web, search social media platforms (Reddit, X, LinkedIn, etc.), extract clean page content, map sites, and crawl domains with Tavily. Authentication uses the 'tavily_api_key' secret injected by the IronClaw host as a Bearer token, the LLM never knows the credentials

## Inputs

- `urls` (required): URLs to extract content from (max 10).
- `query` (optional): Optional query to filter and rerank relevant chunks per source.
- `chunks_per_source` (optional): Number of content chunks (≤500 chars each) per source when query is given (default 3).
- `extract_depth` (optional): Extraction depth: 'basic' (default) or 'advanced' for JS-heavy pages.
- `include_images` (optional): Include images in extraction results. Default false.

The operation is selected by IronClaw as `tavily.extract`. Do not send the private `action` selector.
