# Tavily: search

Run the legacy search operation. See the prompt and input schema for its exact contract.

Legacy tool context: Search the web, search social media platforms (Reddit, X, LinkedIn, etc.), extract clean page content, map sites, and crawl domains with Tavily. Authentication uses the 'tavily_api_key' secret injected by the IronClaw host as a Bearer token, the LLM never knows the credentials

## Inputs

- `query` (required): The search query (max 500 chars).
- `search_depth` (optional): Search depth: 'basic' (fast, 1 credit) or 'advanced' (thorough, 2 credits). Default 'advanced'.
- `max_results` (optional): Max results to return (1–20, default 5).
- `include_answer` (optional): Include AI-synthesized answer summary. Default false.
- `include_raw_content` (optional): Include full cleaned page content per result. Default false.
- `include_images` (optional): Include images related to query. Default false.
- `topic` (optional): Search category: 'general' (default), 'news', or 'finance'.
- `auto_parameters` (optional): Let Tavily auto-configure search parameters based on query intent. Default false.

The operation is selected by IronClaw as `tavily.search`. Do not send the private `action` selector.
