# Serper: news

Run the legacy news operation. See the prompt and input schema for its exact contract.

Legacy tool context: Google Search, News, Images, Videos, Places, and Shopping API tool via Serper.dev

## Inputs

- `q` (required): The Google News query.
- `gl` (optional): See the JSON schema for constraints.
- `hl` (optional): See the JSON schema for constraints.
- `location` (optional): See the JSON schema for constraints.
- `num` (optional): See the JSON schema for constraints.
- `page` (optional): See the JSON schema for constraints.

The operation is selected by IronClaw as `serper.news`. Do not send the private `action` selector.
