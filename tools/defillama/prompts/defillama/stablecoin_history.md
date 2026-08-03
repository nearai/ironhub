# DefiLlama: stablecoin_history

Run the legacy stablecoin history operation. See the prompt and input schema for its exact contract.

Tool context: DefiLlama DeFi analytics from the free open API; no API key or auth setup is needed. HOST LIMITATION: current IronClaw Reborn uses a fixed 500M WASM fuel budget and does not honor legacy WASM limit environment flags. The list_protocols, list_pools, and get_protocol capabilities may return a fuel-limit error on large live datasets until the host adds a supported configurable or per-capability fuel budget; all other capabilities run on stock limits.

## Inputs

- `chain` (optional): Chain slug, e.g. 'Ethereum'. Omit for all chains combined.
- `stablecoin_id` (optional): Restrict to one stablecoin (numeric id from list_stablecoins).
- `points` (optional): Max history points returned (evenly downsampled).

The operation is selected by IronClaw as `defillama.stablecoin_history`. Do not send the private `action` selector.
