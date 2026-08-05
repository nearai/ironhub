# Serper: search

Run the legacy search operation. See the prompt and input schema for its exact contract.

Legacy tool context: Google Search, News, Images, Videos, Places, and Shopping API tool via Serper.dev

## Inputs

- `q` (required): The search query text, e.g. 'rust wasip2 tutorial'
- `gl` (optional): Country code (e.g. 'us', 'gb', 'jp').
- `hl` (optional): Language code (e.g. 'en', 'es').
- `location` (optional): Location to anchor search results (e.g. 'Austin, Texas, United States').
- `num` (optional): Number of results to return (1-100). Default is 10.
- `page` (optional): Page offset. Default is 1.
- `autocorrect` (optional): Spelling autocorrect toggle.

The operation is selected by IronClaw as `serper.search`. Do not send the private `action` selector.
