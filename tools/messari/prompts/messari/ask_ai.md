# Messari: ask_ai

Run the legacy ask ai operation. See the prompt and input schema for its exact contract.

Legacy tool context: Messari crypto research and market data tool for Ironclaw. Access prices, market metrics, news, token unlocks, fundraising rounds, DeFi protocols, network stats, and Messari AI synthesis.

## Inputs

- `prompt` (required): Natural language crypto research query or question for Messari AI synthesis.

The operation is selected by IronClaw as `messari.ask_ai`. Do not send the private `action` selector.
