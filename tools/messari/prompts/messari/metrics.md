# Messari: metrics

Run the legacy metrics operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `asset_key` (optional): Optional asset key or slug (e.g. 'bitcoin', 'ethereum', 'solana'). Omit to list top assets.
- `limit` (optional): Max items to return (default 20, max 100).

The operation is selected by IronClaw as `messari.metrics`. Do not send the private `action` selector.
