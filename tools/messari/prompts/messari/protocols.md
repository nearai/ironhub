# Messari: protocols

Run the legacy protocols operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `protocol_id` (optional): Optional protocol ID (e.g. 'aave', 'uniswap', 'lido').
- `limit` (optional): Max items to return (default 20).

The operation is selected by IronClaw as `messari.protocols`. Do not send the private `action` selector.
