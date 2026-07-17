---
name: etherscan
version: 0.1.0
description: Allows queries to the Etherscan v2 API across 60+ EVM-compatible networks. Retrieves native wallet balances, transaction histories, ERC-20/721/1155 token transfer events, contract ABIs/source codes, and execution statuses.
use_cases:
  - Retrieve native account balance in Wei and Ether across EVM chains
  - List normal or internal transaction history for an address with pruning
  - Query ERC-20, ERC-721 (NFT), or ERC-1155 token transfer histories
  - Inspect smart contract verified source code and compiler configurations
  - Verify transaction receipt status (success/failure)
value_prop: "Unified multichain EVM blockchain oracle — query 60+ networks, benefit from memory-safe pruned JSON arrays, and keep API keys secure."
value_tags:
  - Blockchain
  - EVM
  - Oracle
  - Transactions
  - ABI
---

# Etherscan Tool

A sandboxed WASM tool that integrates with the [Etherscan v2 API](https://docs.etherscan.io/v2/) to query account details, histories, and contract schemas across 60+ EVM-compatible chains.

The host injects the API key at the network boundary as the `apikey` query parameter — the WASM code never sees the raw secret — and network access is restricted to `api.etherscan.io/v2/api` as declared in `etherscan-tool.capabilities.json`.

![Etherscan tool](screenshot.png)


## Authentication

Configure your Etherscan v2 API key:

```bash
ironclaw tool setup etherscan-tool
```

During execution, the tool will automatically append the key to all HTTP requests sent to the v2 endpoint.

## Actions

| Action | Required | Optional | Description |
|--------|----------|----------|-------------|
| `balance` | `address`, `chainid` | — | Get native token balance in Wei and formatted Ether. |
| `balancemulti` | `address`, `chainid` | — | Get native balances for a comma-separated list of addresses. |
| `txlist` | `address`, `chainid` | `startblock`, `endblock`, `page`, `offset`, `sort` | List pruned normal transaction history. |
| `txlistinternal` | `chainid` | `address`, `txhash`, `startblock`, `endblock`, `page`, `offset`, `sort` | List pruned internal transactions (specify `address` or `txhash`). |
| `tokentx` | `chainid` | `address`, `contractaddress`, `startblock`, `endblock`, `page`, `offset`, `sort` | List pruned ERC-20 token transfer events (specify `address` or `contractaddress`). |
| `tokennfttx` | `chainid` | `address`, `contractaddress`, `startblock`, `endblock`, `page`, `offset`, `sort` | List pruned ERC-721 token transfer events (specify `address` or `contractaddress`). |
| `token1155tx` | `chainid` | `address`, `contractaddress`, `startblock`, `endblock`, `page`, `offset`, `sort` | List pruned ERC-1155 token transfer events (specify `address` or `contractaddress`). |
| `getabi` | `address`, `chainid` | — | Fetch verified smart contract ABI in JSON format. |
| `getsourcecode` | `address`, `chainid` | — | Fetch verified smart contract source codes and compiler settings. |
| `getstatus` | `txhash`, `chainid` | — | Check contract execution status for a transaction. |
| `gettxreceiptstatus` | `txhash`, `chainid` | — | Check transaction receipt execution status (success/failure). |

### Key Parameters

*   **`chainid`** (`integer`): Numeric EVM chain ID (e.g. `1` for Ethereum Mainnet, `8453` for Base, `137` for Polygon, `42161` for Arbitrum One).
*   **`offset`** (`integer`): Number of transactions per page. Defaults to `20`, clamped to a maximum of `100` to prevent memory exhaustion.
*   **`sort`** (`string`): Sort direction. `"asc"` (default) or `"desc"`.

## Response Compaction & Safeties

To operate safely under the **10 MB WASM linear memory ceiling** and prevent prompt token bloat:
- **Aggressive Pruning**: Transaction lists are stripped of bloated, redundant fields like `nonce`, `blockHash`, `confirmations`, `transactionIndex`, and gas computation details.
- **Size Clamping**: Returned transaction lists are capped at a maximum of **100 entries**. Any additional records returned by Etherscan are truncated.
- **Etherscan Empty-List Handling**: Etherscan API returns a `status: "0"` and messages like `"No transactions found"` for clean/empty addresses. The tool intercepts these envelope states and returns an empty JSON list `[]` to the agent instead of failing with execution errors.

## Examples

```json
// Query native balance for Vitalik's wallet on Ethereum Mainnet
{
  "action": "balance",
  "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "chainid": 1
}

// Query multi-address balance on Base L2
{
  "action": "balancemulti",
  "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045,0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",
  "chainid": 8453
}

// Get pruned ERC-20 transfers for an address on Polygon
{
  "action": "tokentx",
  "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "chainid": 137,
  "offset": 10
}

// Get contract ABI on Arbitrum
{
  "action": "getabi",
  "address": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da2",
  "chainid": 42161
}
```
