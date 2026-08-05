# DefiLlama: pool_history

Run the legacy pool history operation. See the prompt and input schema for its exact contract.

Tool context: DefiLlama DeFi analytics from the free open API; no API key or auth setup is needed. HOST LIMITATION: current IronClaw Reborn uses a fixed 500M WASM fuel budget and does not honor legacy WASM limit environment flags. The list_protocols, list_pools, and get_protocol capabilities may return a fuel-limit error on large live datasets until the host adds a supported configurable or per-capability fuel budget; all other capabilities run on stock limits.

## Inputs

- `pool` (required): Pool UUID from list_pools (the 'pool' field).
- `points` (optional): Max APY/TVL history points returned.

The operation is selected by IronClaw as `defillama.pool_history`. Do not send the private `action` selector.
