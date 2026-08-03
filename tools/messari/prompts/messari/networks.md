# Messari: networks

Run the legacy networks operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `network_id` (optional): Optional network ID (e.g. 'ethereum', 'solana', 'arbitrum').
- `limit` (optional): Max items to return (default 20).

The operation is selected by IronClaw as `messari.networks`. Do not send the private `action` selector.
