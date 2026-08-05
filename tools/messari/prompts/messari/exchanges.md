# Messari: exchanges

Run the legacy exchanges operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `exchange_id` (optional): Optional exchange ID (e.g. 'binance', 'coinbase'). Omit to list top exchanges.
- `limit` (optional): Max items to return (default 20).

The operation is selected by IronClaw as `messari.exchanges`. Do not send the private `action` selector.
