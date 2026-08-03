# Messari: token_unlocks

Run the legacy token unlocks operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `asset_key` (optional): Optional asset key (e.g. 'arbitrum', 'aptos', 'sui'). Omit to list upcoming unlocks.
- `limit` (optional): Max unlock schedules to return (default 20).

The operation is selected by IronClaw as `messari.token_unlocks`. Do not send the private `action` selector.
