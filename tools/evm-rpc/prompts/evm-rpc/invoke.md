# evm-rpc.invoke

Execute a single read-only EVM JSON-RPC action. Pass an `action` field naming
the action plus that action's fields in `params`. The input schema is a tagged
union keyed on `action`.

This tool is read-only: it does not sign or broadcast transactions.

## Actions

- `eth_block_number` — latest block number for the chain.
- `eth_chain_id` — chain id reported by the endpoint.
- `eth_gas_price` — current gas price.
- `eth_get_balance` — native balance of an address.
- `eth_get_transaction_count` — nonce / sent transaction count of an address.
- `eth_get_code` — deployed bytecode at an address.
- `eth_get_storage_at` — raw storage slot value at an address.
- `eth_call` — call a view function (provide `to` and `data`).
- `eth_estimate_gas` — estimate gas for a call.
- `eth_get_block_by_number` — block by number or tag.
- `eth_get_block_by_hash` — block by hash.
- `eth_get_transaction_by_hash` — transaction by hash.
- `eth_get_transaction_receipt` — transaction receipt by hash.
- `eth_get_logs` — event logs filtered by block range, address, and topics.

## Chain selection

Use `chain` for built-in shortcuts: `ethereum`, `polygon`, `arbitrum`,
`optimism`, `base`, `bnb`, `avalanche`. For any other network, pass `rpc_url`
with a full EVM-compatible JSON-RPC endpoint instead.

## Value formats

All hex strings use the `0x` prefix. Block numbers are hex (for example
`0x112a880`) or a tag: `latest`, `earliest`, `pending`, `safe`, `finalized`.
Addresses are 40 hex chars after `0x`. Transaction and block hashes are 64 hex
chars after `0x`. In `eth_get_logs`, `topics` is an array of strings or nulls;
use null to wildcard a topic slot.

## Auth

No credentials required. This tool reaches public EVM RPC endpoints and does not
use host-injected secrets.
