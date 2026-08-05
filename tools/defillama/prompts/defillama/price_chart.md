# DefiLlama: price_chart

Run the legacy price chart operation. See the prompt and input schema for its exact contract.

Tool context: DefiLlama DeFi analytics from the free open API; no API key or auth setup is needed. HOST LIMITATION: current IronClaw Reborn uses a fixed 500M WASM fuel budget and does not honor legacy WASM limit environment flags. The list_protocols, list_pools, and get_protocol capabilities may return a fuel-limit error on large live datasets until the host adds a supported configurable or per-capability fuel budget; all other capabilities run on stock limits.

## Inputs

- `coins` (required): Comma-separated '{chain}:{address}' or 'coingecko:{id}'.
- `start` (optional): Unix timestamp of earliest data point. Use start OR end, not both.
- `end` (optional): Unix timestamp of latest data point.
- `span` (optional): Number of data points to return (server-side), e.g. 30.
- `period` (optional): Interval between points: e.g. '1d', '4h', '1w' (default '24h').
- `search_width` (optional): Time range on either side to find price data (default 10% of period).

The operation is selected by IronClaw as `defillama.price_chart`. Do not send the private `action` selector.
