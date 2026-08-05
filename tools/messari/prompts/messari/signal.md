# Messari: signal

Run the legacy signal operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `asset_key` (optional): Optional asset key (e.g., 'solana'). Omit for top trending tokens.
- `limit` (optional): Max items to return (default 20).

The operation is selected by IronClaw as `messari.signal`. Do not send the private `action` selector.
