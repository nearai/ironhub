# Tavily: map

Run the legacy map operation. See the prompt and input schema for its exact contract.

Legacy tool context: Search the web, search social media platforms (Reddit, X, LinkedIn, etc.), extract clean page content, map sites, and crawl domains with Tavily. Authentication uses the 'tavily_api_key' secret injected by the IronClaw host as a Bearer token, the LLM never knows the credentials

## Inputs

- `url` (required): Root URL (http/https) to start mapping from.
- `max_depth` (optional): Maximum link depth to traverse (1–5, default 1).
- `instructions` (optional): Natural language instructions to guide the mapper's focus. Note: doubles credit cost per 10 pages.
- `max_breadth` (optional): Maximum concurrent paths explored.

The operation is selected by IronClaw as `tavily.map`. Do not send the private `action` selector.
