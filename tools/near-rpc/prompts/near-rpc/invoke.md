Use this capability to call the NEAR Protocol JSON-RPC API. Pass an `action` field naming the operation, plus that action's fields, in `params`. The input schema is a tagged union keyed on `action`; consult it for the exact fields each action takes.

Supported actions:
- Accounts: `view_account`, `view_account_balance`, `view_access_key`, `view_access_key_list`
- Contract state: `view_state`, `view_code`, `view_function`
- Blocks and chunks: `get_block`, `get_chunk`, `get_recent_blocks`
- Transactions: `get_transaction`, `tx_status`, `send_tx`, `broadcast_tx_async`, `broadcast_tx_commit`
- Node and network: `status`, `health`, `network_info`, `client_config`, `validators`
- Chain config: `gas_price`, `protocol_config`, `genesis_config`
- State changes: `changes`, `changes_in_block`
- Light client: `light_client_proof`, `next_light_client_block`

Parameter notes:
- `network` selects the endpoint: `mainnet` (default), `testnet`, or pass `rpc_url` for a custom or archival endpoint.
- `account_id` is lowercase, ending in `.near` (mainnet) or `.testnet`; implicit accounts are 64-char hex.
- `args_base64` for `view_function` is the function arguments JSON encoded as standard base64; never pass raw JSON.
- `block_height` (number) or `block_hash` (base58) select a block; omit for latest.

This tool is credential-free; it does not require any auth token or host-injected secret. It returns the raw NEAR JSON-RPC response for the action.
