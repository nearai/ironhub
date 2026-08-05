# Messari: fundraising

Run the legacy fundraising operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `category` (optional): Optional funding category filter (e.g., 'DeFi', 'Infrastructure', 'Gaming', 'AI').
- `limit` (optional): Max funding rounds to return (default 20).

The operation is selected by IronClaw as `messari.fundraising`. Do not send the private `action` selector.
