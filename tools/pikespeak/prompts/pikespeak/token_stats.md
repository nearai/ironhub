# Pikespeak: token_stats

Run the legacy token stats operation. See the prompt and input schema for its exact contract.

Legacy tool context: Pikespeak is the  on-chain data analytics platform and portfolio tracker designed for NEAR. Exposes detailed portfolio staking/DeFi and general hundreds of features like wallet explorer, NEAR Intents, Network stats...

## Inputs

- `contract` (required): The token contract ID (e.g. 'wrap.near').

The operation is selected by IronClaw as `pikespeak.token_stats`. Do not send the private `action` selector.
