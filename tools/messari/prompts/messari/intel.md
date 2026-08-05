# Messari: intel

Run the legacy intel operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `asset_key` (optional): Optional asset key (e.g., 'aave', 'uniswap').
- `limit` (optional): Max governance events to return (default 20).

The operation is selected by IronClaw as `messari.intel`. Do not send the private `action` selector.
