# Jina AI: read_url

Read a URL and convert its content to compact Markdown.

Tool context: Read web pages and PDFs as compact content, capture webpage screenshots, and search the web, arXiv, SSRN, or images through Jina AI. The host injects one Jina API key only for the Reader and Search API hosts.

## Inputs

- `url` (required): The complete HTTP/HTTPS URL of the webpage or PDF file to read and convert.
- `with_all_links` (optional): Extract and return all hyperlinks found on the page as structured data.
- `with_all_images` (optional): Extract and return all images found on the page as structured data.

The operation is selected by IronClaw as `jina.read_url`. Do not send the private `action` selector.
