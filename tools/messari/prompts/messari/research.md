# Messari: research

Run the legacy research operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `query` (optional): Optional report topic or keyword search (e.g., 'DePIN', 'L2', 'restaking').
- `limit` (optional): Max reports to return (default 20).

The operation is selected by IronClaw as `messari.research`. Do not send the private `action` selector.
