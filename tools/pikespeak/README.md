---
name: pikespeak
version: 0.1.0
description: Pikespeak NEAR Protocol indexer and wealth portfolio tracker. Consumes live/historical NEAR protocol data, native/token balances, transactions, transfers, validator APY, and DeFi positions (RHEA Lend, Rhea DEX, NEAR Intents). Requires an API key from pikespeak.ai.
use_cases:
  - Inspect aggregated portfolio wealth, spot tokens, and DeFi positions
  - Query native and token balances for single or multiple accounts
  - List transactions, NEAR transfers, and fungible token transfers
  - Fetch validator APY and current validator lists
  - Run generic GET queries against any of the 100+ Pikespeak API endpoints
value_prop: "Real-time indexer and wealth analytics for the NEAR Protocol, highlighting spots, intents, and DeFi positions."
value_tags:
  - NEAR Protocol
  - DeFi
  - Portfolio Tracking
  - Blockchain Indexer
---

# Pikespeak Tool

Pikespeak is an on-chain data & analytics solution built on the NEAR Protocol. The solution provides:
- Dashboards and visualisations of the most fundamental Web3 use cases;
- An API with 50+ endpoints to consume live, historical data, and insights in a programmatic way.

This sandboxed WASM tool wraps the Pikespeak API to let an IronClaw agent consume live NEAR data, retrieve portfolio assets, analyze transfers, inspect validators, or run arbitrary GET requests against any API endpoint.

![Pikespeak tool](screenshot.png)

## Authentication & Setup

The tool requires an API key from Pikespeak. You can obtain one by signing up at [pikespeak.ai](https://pikespeak.ai).

1. **Option A (Interactive setup):**
   ```bash
   ironclaw tool setup pikespeak
   ```
   Paste your Pikespeak API key when prompted.

2. **Option B (Environment-based):**
   ```bash
   export PIKESPEAK_API_KEY="your-api-key"
   ironclaw tool auth pikespeak
   ```

At runtime, the host will intercept all requests to `api.pikespeak.ai` and `pikespeak.ai` and inject your API key into the `x-api-key` header. The API key is securely encrypted on disk and never exposed inside the WASM sandbox.

## Actions

The tool supports a hybrid layout of dedicated wrapper actions and a universal GET dispatcher `call_api`.

| Action | Parameters | Description |
|---|---|---|
| `balance` | `account` (string, required) | Query native NEAR and token balance for a single account. |
| `balances` | `accounts` (string, required) | Comma-separated list of NEAR account IDs to query. |
| `wealth` | `account` (string, required) | Fetch portfolio wealth details across RHEA Lend (burrow), Rhea DEX (ref), NEAR Intents (intentsBalances), and Rhea DEX locked liquidity. |
| `transactions` | `account` (required), `offset` (opt), `limit` (opt) | Query recent transactions. |
| `near_transfer` | `account` (required), `offset` (opt), `limit` (opt), `minamount` (opt) | NEAR transfer history. |
| `ft_transfer` | `account` (required), `offset` (opt), `limit` (opt) | Fungible token transfer history. |
| `validators_current` | None | List current active validators. |
| `validator_apy` | `validator` (string, required) | APY of a validator pool. |
| `tx_details` | `tx_hash` (string, required) | Query transaction details by hash. |
| `token_stats` | `contract` (string, required) | Fungible token statistics. |
| `call_api` | `path` (string, required), `query_params` (object, opt) | Universal GET dispatcher to call any valid path with optional query parameters. |

## Build & Install

```bash
# Compile wasm
./scripts/build-tool.sh pikespeak

# Install in IronClaw registry
ironclaw tool install dist/pikespeak/pikespeak-tool.wasm \
  --capabilities dist/pikespeak/pikespeak-tool.capabilities.json \
  --name pikespeak --force
```
