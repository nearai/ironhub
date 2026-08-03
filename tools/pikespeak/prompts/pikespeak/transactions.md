# Pikespeak: transactions

Run the legacy transactions operation. See the prompt and input schema for its exact contract.

Legacy tool context: Pikespeak is the  on-chain data analytics platform and portfolio tracker designed for NEAR. Exposes detailed portfolio staking/DeFi and general hundreds of features like wallet explorer, NEAR Intents, Network stats...

## Inputs

- `account` (required): The NEAR account ID.
- `offset` (optional): Query offset (default 0). Optional.
- `limit` (optional): Query limit (default 20). Optional.

The operation is selected by IronClaw as `pikespeak.transactions`. Do not send the private `action` selector.
