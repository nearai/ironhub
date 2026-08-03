# Etherscan: balance

Run the legacy balance operation. See the prompt and input schema for its exact contract.

Legacy tool context: Allows queries to the Etherscan v2 API across 60+ EVM-compatible chains. Supports balances, transaction histories, ERC-20/721/1155 token transfers, contract ABIs/source code, and transaction statuses.

## Inputs

- `address` (required): The EVM address to query.
- `chain` (required): The EVM chain ID (e.g. 1) or chain name (e.g. 'ethereum', 'base').

The operation is selected by IronClaw as `etherscan.balance`. Do not send the private `action` selector.
