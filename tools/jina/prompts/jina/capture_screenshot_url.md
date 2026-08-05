# Jina AI: capture_screenshot_url

Create a screenshot URL for a web page.

Tool context: Read web pages and PDFs as compact content, capture webpage screenshots, and search the web, arXiv, SSRN, or images through Jina AI. The host injects one Jina API key only for the Reader and Search API hosts.

## Inputs

- `url` (required): The complete HTTP/HTTPS URL of the webpage to capture.
- `first_screen_only` (optional): Set to true for a single screen capture (faster), false for full page capture including content below the fold.

The operation is selected by IronClaw as `jina.capture_screenshot_url`. Do not send the private `action` selector.
