# Jina AI: search_images

Search for images with Jina Search.

Tool context: Read web pages and PDFs as compact content, capture webpage screenshots, and search the web, arXiv, SSRN, or images through Jina AI. The host injects one Jina API key only for the Reader and Search API hosts.

## Inputs

- `query` (required): Search query to find images across the web.
- `num` (optional): The number of search results to return (default 30).

The operation is selected by IronClaw as `jina.search_images`. Do not send the private `action` selector.
