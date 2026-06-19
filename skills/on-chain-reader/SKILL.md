---
name: on-chain-reader
version: 1.0.0
description: Interpret NEAR blockchain data including transactions, accounts, smart contracts, and on-chain events
activation:
  keywords:
    - "on-chain"
    - "blockchain data"
    - "near transaction"
    - "near account"
    - "wallet balance"
    - "smart contract call"
    - "nearblocks"
    - "read the chain"
    - "on chain activity"
    - "near rpc"
  patterns:
    - "(?i)(check|read|fetch|query).*(on.?chain|blockchain|near|wallet|account|transaction)"
    - "(?i)(transaction|tx).*(hash|id|details|status)"
    - "(?i)(near|wallet).*(balance|history|activity|account)"
  tags:
    - "finance"
    - "crypto"
    - "near"
    - "blockchain"
  max_context_tokens: 2000
---

# On-Chain Reader Skill

Reads, interprets, and explains NEAR blockchain data including accounts, transactions, smart contract state, and on-chain activity.

## When to Use

- User wants to check a NEAR wallet balance or transaction
- User shares a transaction hash and wants it explained
- User wants to understand smart contract activity on NEAR
- User asks about on-chain data, NFT ownership, or token transfers

## Core Knowledge

### Key Principles

1. **Always fetch live data** — blockchain state changes with every block; never use cached or assumed data
2. **Interpret, don't just display** — raw RPC data is unreadable; translate it into plain English
3. **Confirm the network** — NEAR Mainnet vs. Testnet data is completely separate; always confirm which one
4. **Transaction finality** — NEAR achieves finality in ~2 seconds; flag if a transaction is still pending

### NEAR RPC Methods

Use `POST https://rpc.mainnet.near.org` with JSON-RPC 2.0:

**Check account balance**:
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "query",
  "params": {
    "request_type": "view_account",
    "finality": "final",
    "account_id": "user.near"
  }
}
```

**Check transaction status**:
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tx",
  "params": ["TX_HASH", "SENDER_ACCOUNT_ID"]
}
```

**View contract state**:
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "query",
  "params": {
    "request_type": "call_function",
    "finality": "final",
    "account_id": "contract.near",
    "method_name": "get_balance",
    "args_base64": ""
  }
}
```

### Data Interpretation Guide

| Raw Data | Human Meaning |
|----------|--------------|
| `amount` in yoctoNEAR | Divide by 10^24 to get NEAR |
| `block_height` | Block number on the chain |
| `status: { SuccessValue }` | Transaction succeeded |
| `status: { Failure }` | Transaction failed — check error |

### Key Tools

- **NearBlocks**: https://nearblocks.io — block explorer for transactions, accounts, contracts
- **NEAR RPC**: https://rpc.mainnet.near.org — live chain data
- **Ref Finance**: On-chain DEX data for NEAR tokens

### Mistakes to Avoid

- Never convert yoctoNEAR amounts without dividing by 10^24
- Don't mix Mainnet and Testnet data
- Don't assume a transaction succeeded without checking the status field

## Guidelines

- Always convert yoctoNEAR to NEAR for display
- Link to NearBlocks for any transaction or account: `https://nearblocks.io/txns/TX_HASH`
- If an account is not found, verify the account ID spelling — NEAR accounts are case-sensitive
- For NFT queries, check the Paras or Mintbase indexers in addition to raw RPC
