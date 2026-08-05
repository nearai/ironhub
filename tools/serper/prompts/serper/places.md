# Serper: places

Run the legacy places operation. See the prompt and input schema for its exact contract.

Legacy tool context: Google Search, News, Images, Videos, Places, and Shopping API tool via Serper.dev

## Inputs

- `q` (required): Google Maps query (e.g. 'pizza').
- `gl` (optional): See the JSON schema for constraints.
- `hl` (optional): See the JSON schema for constraints.
- `location` (optional): Recommended location filter (e.g. 'Chicago').
- `num` (optional): See the JSON schema for constraints.

The operation is selected by IronClaw as `serper.places`. Do not send the private `action` selector.
