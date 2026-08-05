# Tavily: social_media_search

Run the legacy social media search operation. See the prompt and input schema for its exact contract.

Legacy tool context: Search the web, search social media platforms (Reddit, X, LinkedIn, etc.), extract clean page content, map sites, and crawl domains with Tavily. Authentication uses the 'tavily_api_key' secret injected by the IronClaw host as a Bearer token, the LLM never knows the credentials

## Inputs

- `query` (required): The search query (max 500 chars).
- `platform` (optional): Social media platform to search. Default is 'combined'.
- `max_results` (optional): Max results to return (1–20, default 5).
- `include_answer` (optional): Include AI-synthesized answer summary. Default false.
- `include_raw_content` (optional): Include full cleaned page content per result by executing advanced extraction. Default false.
- `include_images` (optional): Include images related to search results. Default false.
- `time_range` (optional): Filter results by time range (day, week, month, or year). Default is no filter.

The operation is selected by IronClaw as `tavily.social_media_search`. Do not send the private `action` selector.
