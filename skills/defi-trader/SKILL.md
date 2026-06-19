---
name: defi-trader
version: 1.0.0
description: Execute token swaps on DEXs like Ref Finance and Uniswap with optimal routing, slippage, and gas settings
activation:
  keywords:
    - "swap tokens"
    - "defi swap"
    - "uniswap"
    - "ref finance"
    - "best swap route"
    - "slippage"
    - "swap on chain"
    - "dex trade"
    - "buy on uniswap"
  patterns:
    - "(?i)(swap|trade|buy|sell).*(on|via|using).*(uniswap|ref finance|dex|curve|1inch)"
    - "(?i)(best|cheapest|optimal).*(swap|route|price).*(for|on).*(token|dex)"
    - "(?i)(slippage|gas|price impact).*(swap|trade|dex)"
  tags:
    - "defi"
    - "trading"
    - "execution"
  max_context_tokens: 2000
---

# DeFi Trader Skill

Guides users through executing on-chain token swaps with optimal routing, safe slippage settings, and gas optimization across major DEXs.

## When to Use

- User wants to swap tokens on a DEX
- User asks about the best route or platform for a swap
- User wants to know correct slippage settings
- User is confused about gas fees or price impact

## Core Knowledge

### Key Principles

1. **Price impact kills large swaps** — always check price impact before confirming; >1% is significant
2. **Slippage tolerance must be set correctly** — too low = failed transaction; too high = sandwich attack vulnerability
3. **Use aggregators for best price** — 1inch, Paraswap find better rates than going direct to one DEX
4. **Gas timing matters on Ethereum** — swap during low-traffic hours to save on gas

### DEX Reference Guide

**Ethereum / EVM**
| DEX | Best For |
|-----|---------|
| Uniswap V3 | Major pairs, concentrated liquidity |
| Curve | Stablecoin swaps (lowest slippage) |
| 1inch | Aggregator — always check here first |
| Paraswap | Alternative aggregator |
| Balancer | Multi-token pools |

**NEAR Protocol**
| DEX | Best For |
|-----|---------|
| Ref Finance | Main NEAR DEX, most liquidity |
| Jumbo Exchange | Alternative NEAR DEX |
| 1inch (Aurora) | Aurora EVM chain on NEAR |

**Solana**
| DEX | Best For |
|-----|---------|
| Jupiter | Best aggregator on Solana |
| Raydium | Major pairs |
| Orca | User-friendly, concentrated liquidity |

### Slippage Settings Guide

| Situation | Recommended Slippage |
|-----------|---------------------|
| Major pairs (BTC, ETH, USDC) | 0.1–0.5% |
| Mid-cap tokens | 0.5–1% |
| Small-cap/new tokens | 1–3% |
| Memecoins / low liquidity | 3–5% (use with caution) |
| Stablecoin swaps | 0.01–0.1% |

⚠️ Setting slippage >5% makes you vulnerable to sandwich bots on Ethereum

### Swap Execution Checklist

Before confirming any swap:
- ✅ Check price impact (should be <1% ideally)
- ✅ Set appropriate slippage tolerance
- ✅ Verify you're on the correct network (ETH vs BSC vs Polygon)
- ✅ Confirm the token contract address (avoid fake tokens)
- ✅ Check gas estimate is reasonable
- ✅ Compare price to CEX (are you getting ripped off?)

### Price Impact vs. Slippage

**Price Impact**: How much your trade moves the pool price. Large trades in small pools = high price impact. Check this before swapping.

**Slippage Tolerance**: How much price movement you'll accept between submitting and executing. This protects against price changes while your tx is pending.

### Gas Optimization (Ethereum)

- Check gas prices at: ethgasstation.info or gas.eth.samczsun.com
- Best times to swap: weekends, early morning UTC (2–8am UTC)
- Use L2s (Arbitrum, Optimism, Base) for much cheaper swaps on same assets

### Sandwich Attack Protection

On Ethereum, MEV bots front-run large swaps. Protect yourself:
- Keep slippage as low as possible while still getting filled
- Use MEV protection: Flashbots Protect RPC or 1inch Fusion mode
- For large swaps: split into multiple smaller transactions

### Mistakes to Avoid

- Never swap with >5% slippage unless you accept the risk
- Don't swap a token without verifying the contract address on the block explorer
- Don't swap without checking price impact — pools with low liquidity will eat you alive

## Guidelines

- Always recommend checking 1inch or Jupiter first for best route
- Always state: recommended slippage, expected price impact, and estimated gas
- For NEAR swaps: guide to Ref Finance as the primary DEX
- Warn about sandwich attacks for any Ethereum swap with >1% slippage setting
