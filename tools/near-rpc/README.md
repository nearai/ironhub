# near-rpc

NEAR Protocol JSON-RPC integration for IronClaw. 27 actions covering account state, access keys, contract storage and code, view function calls, blocks and chunks, validators, transaction lifecycle, gas and protocol config, state changes, network status, and light-client proofs.

## Actions

### Account and state

| Action | Parameters | Purpose |
|---|---|---|
| `view_account` | `account_id`, optional `block_height`/`block_hash` | Full account state at a block |
| `view_account_balance` | `account_id` | Balance in yoctoNEAR and NEAR (final) |
| `view_access_key` | `account_id`, `public_key`, optional block ref | Single access key permissions and nonce |
| `view_access_key_list` | `account_id`, optional block ref | All access keys on an account |
| `view_state` | `account_id`, optional `prefix_base64`, optional `include_proof`, optional block ref | Contract storage by key prefix |
| `view_code` | `account_id`, optional block ref | Contract WASM as base64 |
| `view_function` | `account_id`, `method_name`, `args_base64` (default `e30=`), optional block ref | Read-only contract call with logs and block stamp |

### Blocks, chunks, transactions

| Action | Parameters | Purpose |
|---|---|---|
| `get_block` | optional `block_height` or `block_hash` | Block by height, hash, or latest |
| `get_chunk` | `chunk_id` or (`block_height`/`block_hash` + `shard_id`) | Chunk data |
| `get_recent_blocks` | `count` (default 5, max 10) | Last N block summaries |
| `get_transaction` | `tx_hash`, `sender_account_id`, optional `wait_until` | Transaction outcome (light) |
| `tx_status` | `tx_hash`, `sender_account_id`, optional `wait_until` | Full transaction status with receipts |
| `send_tx` | `signed_tx_base64`, optional `wait_until` | Modern signed-tx submission with finality control |
| `broadcast_tx_async` | `signed_tx_base64` | Submit and return immediately |
| `broadcast_tx_commit` | `signed_tx_base64` | Submit and wait for full execution |

`wait_until` accepts: `NONE`, `INCLUDED`, `EXECUTED_OPTIMISTIC`, `INCLUDED_FINAL`, `EXECUTED`, `FINAL`.

### Validators, gas, config

| Action | Parameters | Purpose |
|---|---|---|
| `validators` | optional `block_height`/`block_hash` | Current and next validator set, fishermen, proposals, kickouts, plus a `summary` block with counts |
| `gas_price` | optional `block_height`/`block_hash` | Gas price at a block (or current) |
| `protocol_config` | optional `block_height`/`block_hash` or `epoch_id` | Epoch length, max validators, gas limits |
| `genesis_config` | none | Genesis configuration |

### State changes

| Action | Parameters | Purpose |
|---|---|---|
| `changes` | `changes_type`, `account_ids`, optional `key_prefix_base64` or `public_key`, optional block ref | State changes for accounts/keys/data/code |
| `changes_in_block` | optional block ref | All state changes within a block |

`changes_type` accepts: `account_changes`, `single_access_key_changes`, `all_access_key_changes`, `data_changes`, `contract_code_changes`. `data_changes` requires `key_prefix_base64`. `single_access_key_changes` requires `public_key` (paired with each `account_ids` entry).

### Network status

| Action | Parameters | Purpose |
|---|---|---|
| `status` | none | Chain id, latest block, version, sync info |
| `health` | none | Node liveness check |
| `network_info` | none | Peer count and connection details |
| `client_config` | none | Node client configuration |

### Light client

| Action | Parameters | Purpose |
|---|---|---|
| `light_client_proof` | `proof_type` (`transaction` or `receipt`), `light_client_head`, plus type-specific fields | Cryptographic proof for SPV-style verification |
| `next_light_client_block` | `last_block_hash` | Next light-client block after a known head |

`proof_type=transaction` requires `transaction_hash` + `sender_id`. `proof_type=receipt` requires `receipt_id` + `receiver_id`.

### Common parameters

All actions accept optional `network` (default `"mainnet"`, also `"testnet"`) and `rpc_url` (overrides the network default with a custom endpoint).

Block-referenced actions accept `block_height` (preferred), `block_hash`, or neither (defaults to `finality: "final"`). When both are supplied, height wins.

## Auth model

Read actions need only an RPC endpoint URL. No credentials required.

Write actions (`send_tx`, `broadcast_tx_async`, `broadcast_tx_commit`) accept a base64-encoded borsh-serialized `SignedTransaction`. Signing happens outside this tool. Function-call keys are preferred over full-access keys for narrow-scope operations.

## Supported RPC endpoints

Mainnet: `rpc.mainnet.near.org`, `beta.rpc.mainnet.near.org`, `archival-rpc.mainnet.near.org`, `free.rpc.fastnear.com`, `near.lava.build`

Testnet: `rpc.testnet.near.org`, `beta.rpc.testnet.near.org`, `archival-rpc.testnet.near.org`, `test.rpc.fastnear.com`

Custom endpoints via the `rpc_url` parameter.

## Limits

Public RPC endpoints rate-limit aggressively. FastNEAR or a dedicated provider is recommended for production use. The tool's host-level rate limit is 120 requests per minute and 3,600 per hour; the runtime enforces this regardless of the upstream provider's quota.

`get_recent_blocks` is capped at 10 blocks per call to avoid burning the rate-limit budget on a single query.

Light-client and state-change endpoints can return large payloads on busy blocks; callers should expect multi-megabyte responses on `changes_in_block` for high-throughput windows.
