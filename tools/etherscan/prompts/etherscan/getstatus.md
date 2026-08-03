# Etherscan: getstatus

Run the legacy getstatus operation. See the prompt and input schema for its exact contract.

Legacy tool context: Allows queries to the Etherscan v2 API across 60+ EVM-compatible chains. Supports balances, transaction histories, ERC-20/721/1155 token transfers, contract ABIs/source code, and transaction statuses.

## Inputs

- `txhash` (required): Transaction hash.
- `chain` (required): The EVM chain ID or name.

The operation is selected by IronClaw as `etherscan.getstatus`. Do not send the private `action` selector.
