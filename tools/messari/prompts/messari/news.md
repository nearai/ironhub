# Messari: news

Run the legacy news operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `query` (optional): Optional keyword search filter (e.g., 'regulation', 'sec', 'ethereum').
- `limit` (optional): Max news items to return (default 20).

The operation is selected by IronClaw as `messari.news`. Do not send the private `action` selector.
