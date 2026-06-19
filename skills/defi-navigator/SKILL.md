---
name: defi-navigator
version: 1.0.0
description: Guide users through DeFi protocols, yield strategies, liquidity pools, and on-chain finance
activation:
  keywords:
    - "defi"
    - "yield farming"
    - "liquidity pool"
    - "staking"
    - "lending protocol"
    - "aave"
    - "uniswap"
    - "ref finance"
    - "APY"
    - "APR"
    - "impermanent loss"
    - "smart contract finance"
  patterns:
    - "(?i)(defi|yield|liquidity|staking|lending|borrowing).*(protocol|pool|farm|strategy)"
    - "(?i)(aave|uniswap|compound|curve|ref.?finance|burrow)"
    - "(?i)(impermanent loss|APY|APR|TVL|liquidation)"
  tags:
    - "finance"
    - "defi"
    - "crypto"
  max_context_tokens: 2000
---

# DeFi Navigator Skill

Guides users through decentralized finance protocols, yield strategies, risk management, and on-chain financial tools.

## When to Use

- User asks about DeFi protocols (Aave, Uniswap, Ref Finance, etc.)
- User wants to understand yield farming, staking, or liquidity providing
- User asks about APY, impermanent loss, or TVL
- User wants to know how to earn yield on their crypto

## Core Knowledge

### Key Principles

1. **Risk is always present** — DeFi has smart contract risk, liquidation risk, and impermanent loss; always surface relevant risks
2. **APY is not guaranteed** — yield rates fluctuate; never present APY as fixed income
3. **Protocol maturity matters** — older, audited protocols with high TVL are generally safer than new ones
4. **Gas and fees count** — always factor transaction costs into yield calculations

### DeFi Concepts Explained

**Liquidity Pool (LP)**: Provide two tokens to a pool, earn trading fees. Risk: impermanent loss if token ratio shifts.

**Yield Farming**: Stake LP tokens to earn additional token rewards on top of fees.

**Lending/Borrowing**: Deposit assets to earn interest (lending) or deposit collateral to borrow (borrowing). Risk: liquidation if collateral value drops.

**Staking**: Lock tokens to secure a network or earn protocol rewards. Usually lower risk than LP.

**Impermanent Loss**: When you provide liquidity, price divergence between your two tokens can result in less value than simply holding them.

### Key Protocols by Chain

| Chain | Protocol | Type |
|-------|----------|------|
| Ethereum | Aave, Uniswap, Compound | Lending, DEX |
| NEAR | Ref Finance, Burrow | DEX, Lending |
| Multi-chain | Curve, Convex | Stablecoin yield |

### Risk Assessment Framework

- **Low risk**: Stablecoin staking, blue-chip protocol lending
- **Medium risk**: LP in major pairs (ETH/USDC), established protocol farming
- **High risk**: New protocol farming, leveraged positions, volatile pair LPs

### Mistakes to Avoid

- Never recommend chasing the highest APY without explaining the risks
- Don't ignore smart contract audit status for new protocols
- Don't calculate yield without accounting for gas costs

## Guidelines

- Always pair any yield strategy with its associated risks
- For NEAR ecosystem: prioritize Ref Finance and Burrow knowledge
- End yield discussions with: "DeFi carries significant risks including loss of principal. Do your own research."
- If asked about a protocol you don't recognize, flag it as unverified and recommend checking DeFiLlama for TVL and audit status
