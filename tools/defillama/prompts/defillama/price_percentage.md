# DefiLlama: price_percentage

Run the legacy price percentage operation. See the prompt and input schema for its exact contract.

Tool context: DefiLlama DeFi analytics from the free open API; no API key or auth setup is needed. HOST LIMITATION: current IronClaw Reborn uses a fixed 500M WASM fuel budget and does not honor legacy WASM limit environment flags. The list_protocols, list_pools, and get_protocol capabilities may return a fuel-limit error on large live datasets until the host adds a supported configurable or per-capability fuel budget; all other capabilities run on stock limits.

## Inputs

- `coins` (required): Comma-separated '{chain}:{address}' or 'coingecko:{id}'.
- `timestamp` (optional): Unix timestamp to compute change from (default: now).
- `look_forward` (optional): true = change over the period AFTER the timestamp (default false = before).
- `period` (optional): Change window, e.g. '24h', '7d' (default '24h').

The operation is selected by IronClaw as `defillama.price_percentage`. Do not send the private `action` selector.
