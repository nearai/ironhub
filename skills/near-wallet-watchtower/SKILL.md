name: wallet-checker
description: "name: near-wallet-watchtower"
---

name: near-wallet-watchtower
description: Monitor a NEAR account across runs. First run baseline snapshot; later runs diff against previous state. Tracks balance, FT/NFT tokens, recent transactions, staking. Surfaces meaningful changes and risk signals. Uses NearBlocks + NEAR RPC + FastNEAR APIs.
metadata:
  version: "1.0.0"
  requires: []
  triggers:
    - NEAR wallet
    - NEAR account monitoring
    - wallet watchtower
    - watch NEAR account
    - monitor NEAR
---

# NEAR Wallet Watchtower

You are an autonomous NEAR wallet monitor. Your goal is to inspect a NEAR account, compare it against a prior snapshot, and report what changed.

## When to Use

- User asks to "watch" or "monitor" a NEAR account
- User asks for a wallet health check or activity report
- User requests a NEAR wallet diff since the last check
- Triggered by a cron routine that passes an account ID

## Input

Accept a NEAR account ID (e.g. `root.near`, `danseyka.near`). If none is provided, ask for one.

## Data Sources (in priority order)

1. **NearBlocks API** — primary source for account state and recent transactions
   - Account: `GET https://api.nearblocks.io/v1/account/{account_id}`
   - Transactions: `GET https://api.nearblocks.io/v1/account/{account_id}/txns?page=1&per_page=10&order=desc`
   - Token balances: `GET https://api.nearblocks.io/v1/account/{account_id}/ft-export` (if available)

2. **NEAR RPC** — authoritative for raw balance and staking
   - `POST https://rpc.mainnet.near.org` with `method: query`, `request_type: view_account`, `finality: final`, `account_id`

3. **FastNEAR API** — best source for FT/NFT token inventories
   - FT tokens: `GET https://api.fastnear.com/v1/account/{account_id}/ft`
   - NFTs: `GET https://api.fastnear.com/v1/account/{account_id}/nft`
   - Full: `GET https://api.fastnear.com/v1/account/{account_id}/full`

All APIs are public and require no authentication.

## Execution Flow

### Step 1: Fetch Live Data

Fetch from all three sources in parallel using `curl` via the shell tool. Extract:

From **NearBlocks account** or **RPC**:
- `amount` (raw yoctoNEAR balance)
- `locked` (staked/locked yoctoNEAR — 0 means no staking)
- `storage_usage`
- `block_height`

From **NearBlocks txns**:
- Last 10 transactions: `transaction_hash`, `block_timestamp`, `actions` (type, method, deposit), `predecessor_account_id`, `receiver_account_id`, `outcomes.status`

From **FastNEAR FT**:
- List of `{contract_id, balance}` for all fungible tokens with non-zero balances

**Normalize NEAR amounts:** divide yoctoNEAR by 10^24. Example: `2860165513528539267824438625` yNEAR → `2860165.51` NEAR.

### Step 2: Load Previous Snapshot

Search persistent memory for a snapshot at:
`projects/near-wallet-watchtower/snapshots/{account_id}.json`

If found, parse it as the baseline. If not found, this is the first run.

### Step 3: Compare (if baseline exists)

Compare current vs previous on these dimensions:

| Dimension | What to compare |
|-----------|----------------|
| NEAR balance | Raw amount difference, % change |
| Staked NEAR | Locked amount change |
| FT tokens | New tokens, vanished tokens, balance changes > 10% |
| Transaction count | New txns since last block_height |
| Recent activity | New txns with type, counterparty, amount |

### Step 4: Classify Changes

Flag as **Risk Signals** when:
- NEAR balance dropped >20% without obvious txns
- Transfers to unknown/unverified contracts
- New token approvals or contract interactions with unrecognized contracts
- Multiple failed transactions
- Sudden large outbound transfers

Only flag what the data supports. Never fabricate.

### Step 5: Save New Snapshot

After successful inspection, save the new state as JSON to persistent memory:
`projects/near-wallet-watchtower/snapshots/{account_id}.json`

Use `ironclaw.memory.write` with `append: false` and `target` set to the snapshot path.

Snapshot JSON schema:
```json
{
  "account_id": "root.near",
  "captured_at": "ISO 8601 timestamp",
  "block_height": 212615358,
  "near_balance_yocto": "2860165513528539267824438625",
  "near_balance_formatted": "2860165.513528539267824438625",
  "locked_yocto": "0",
  "storage_usage": 22789,
  "ft_tokens_count": 42,
  "ft_tokens_sample": ["contract_id: balance", "..."],
  "recent_txn_hashes": ["Gm6fxa...", "FjpWjT..."],
  "last_txn_block_height": 211425469,
  "data_sources": ["nearblocks.io", "rpc.mainnet.near.org", "fastnear.com"]
}
