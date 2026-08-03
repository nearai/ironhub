# Etherscan: token1155tx

Run the legacy token1155tx operation. See the prompt and input schema for its exact contract.

Legacy tool context: Allows queries to the Etherscan v2 API across 60+ EVM-compatible chains. Supports balances, transaction histories, ERC-20/721/1155 token transfers, contract ABIs/source code, and transaction statuses.

## Inputs

- `chain` (required): The EVM chain ID or name.
- `address` (optional): The EVM address. Optional if contractaddress is provided.
- `contractaddress` (optional): ERC-1155 token contract address. Optional.
- `startblock` (optional): Start block number. Optional.
- `endblock` (optional): End block number. Optional.
- `page` (optional): Page number. Optional.
- `offset` (optional): Number of records per page (default 20, max 100). Optional.
- `sort` (optional): Sort order (default 'asc'). Optional.

The operation is selected by IronClaw as `etherscan.token1155tx`. Do not send the private `action` selector.
