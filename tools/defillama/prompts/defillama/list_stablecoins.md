# DefiLlama: list_stablecoins

Run the legacy list stablecoins operation. See the prompt and input schema for its exact contract.

Tool context: DefiLlama DeFi analytics from the free open API; no API key or auth setup is needed. HOST LIMITATION: current IronClaw Reborn uses a fixed 500M WASM fuel budget and does not honor legacy WASM limit environment flags. The list_protocols, list_pools, and get_protocol capabilities may return a fuel-limit error on large live datasets until the host adds a supported configurable or per-capability fuel budget; all other capabilities run on stock limits.

## Inputs

- `query` (optional): Filter on stablecoin name/symbol.
- `limit` (optional): Max results, sorted by circulating supply desc.

The operation is selected by IronClaw as `defillama.list_stablecoins`. Do not send the private `action` selector.
