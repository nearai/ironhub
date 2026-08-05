# Pikespeak: call_api

Run the legacy call api operation. See the prompt and input schema for its exact contract.

Legacy tool context: Pikespeak is the  on-chain data analytics platform and portfolio tracker designed for NEAR. Exposes detailed portfolio staking/DeFi and general hundreds of features like wallet explorer, NEAR Intents, Network stats...

## Inputs

- `path` (required): The exact Pikespeak path (e.g. '/daos/all' or '/election/total-votes').
- `query_params` (optional): Optional key-value query parameters map.

The operation is selected by IronClaw as `pikespeak.call_api`. Do not send the private `action` selector.
