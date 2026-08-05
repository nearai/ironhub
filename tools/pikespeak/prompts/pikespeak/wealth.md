# Pikespeak: wealth

Run the legacy wealth operation. See the prompt and input schema for its exact contract.

Legacy tool context: Pikespeak is the  on-chain data analytics platform and portfolio tracker designed for NEAR. Exposes detailed portfolio staking/DeFi and general hundreds of features like wallet explorer, NEAR Intents, Network stats...

## Inputs

- `account` (required): The NEAR account ID (e.g. 'root.near'). Fetches aggregated DeFi portfolio assets on RHEA Lend (burrow), Rhea DEX (ref), NEAR Intents (intentsBalances), and Rhea DEX locked liquidity (lockedRheaData).

The operation is selected by IronClaw as `pikespeak.wealth`. Do not send the private `action` selector.
