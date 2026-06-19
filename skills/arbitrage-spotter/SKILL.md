---
name: arbitrage-spotter
version: 1.0.0
description: Identify price differences across exchanges and chains to find arbitrage opportunities
activation:
  keywords:
    - "arbitrage"
    - "price difference"
    - "arb opportunity"
    - "same price on different exchange"
    - "cross exchange"
    - "spread between exchanges"
    - "price discrepancy"
  patterns:
    - "(?i)(arbitrage|arb).*(opportunity|between|across|spot)"
    - "(?i)(price difference|spread|discrepancy).*(between|across).*(exchange|chain|dex|cex)"
    - "(?i)(is.*(cheaper|more expensive) on).*(exchange|chain|dex)"
  tags:
    - "trading"
    - "arbitrage"
    - "execution"
  max_context_tokens: 2000
---

# Arbitrage Spotter Skill

Identifies price discrepancies across centralized exchanges, DEXs, and chains that can be exploited for risk-reduced profit through arbitrage.

## When to Use

- User wants to find arbitrage opportunities across exchanges
- User notices a price difference between two platforms
- User asks if a token is cheaper on one exchange vs. another
- User wants to understand cross-chain or CEX-DEX arbitrage

## Core Knowledge

### Key Principles

1. **Arb exists because of inefficiency** — price differences appear due to fragmented liquidity, slow information, and friction
2. **Speed and fees determine viability** — an arb that looks profitable may not be after fees, gas, and slippage
3. **Most arb is competed away fast** — bots dominate pure arb; human opportunities are in slower, more complex arbs
4. **Risk is never zero** — execution risk, withdrawal delays, and price moves can turn an arb into a loss

### Types of Arbitrage

**Simple Cross-Exchange Arb**
- Asset is $100 on Exchange A and $101 on Exchange B
- Buy on A, transfer, sell on B
- Profit = spread minus fees minus withdrawal time risk
- Risk: price moves during transfer window (usually 10–60 min for crypto)

**CEX-DEX Arbitrage**
- Token price differs between a CEX and a DEX
- Buy cheap side, sell expensive side
- Fast execution required — bots dominate this
- Human edge: larger spreads on smaller/newer tokens

**Triangular Arbitrage**
- Within one exchange: trade A→B→C→A and profit from pricing inefficiency
- Example: USDC→BTC→ETH→USDC and end up with more USDC than you started
- Rare on major assets; more common on small altcoin pairs

**Cross-Chain Arbitrage**
- Same token priced differently on different chains (ETH on Ethereum vs ETH on Arbitrum)
- Bridge the cheap side, sell the expensive side
- Risk: bridge time (minutes to hours), bridge fees, smart contract risk

**Funding Rate Arbitrage**
- Buy spot + short perpetual = earn funding without directional risk
- Works when funding rates are significantly positive
- Best risk-adjusted arb for retail traders

**Basis Trading**
- Buy spot + short futures at premium = capture the basis (futures premium) at expiry
- Low risk, predictable return, requires capital locking

### Viability Calculator

Before executing any arb:
```
Gross spread = Price B - Price A (as %)
Costs:
  - Exchange A trading fee: ~0.1%
  - Exchange B trading fee: ~0.1%
  - Withdrawal fee: [check current fee]
  - Gas (if DeFi involved): [check current gas]
  - Slippage on both sides: ~0.1–0.5%

Net profit = Gross spread - All costs

Only proceed if Net profit > 0.3% (to account for execution risk)
```

### Where to Find Arb Opportunities

| Tool | What It Shows |
|------|--------------|
| Coingecko / CMC | Price across exchanges for any token |
| Paraswap / 1inch | CEX vs DEX price comparison |
| DeFi Llama | Cross-chain token prices |
| Funding rate arb | Coinglass (compare rates across exchanges) |
| CryptoArbitrageScanner | Automated spread scanner |

### Best Arb Opportunities for Retail

1. **Funding rate arb** — easiest, most accessible, no speed requirement
2. **New token listings** — CEX lists token that's been on DEX; price often differs initially
3. **Regional exchange spreads** — some Asian exchanges price differently from Western ones
4. **Cross-chain new tokens** — same token on two chains before bridges equilibrate

### Mistakes to Avoid

- Don't ignore transfer/withdrawal times — price can move against you while waiting
- Don't forget to factor ALL fees (trading, withdrawal, gas, bridge)
- Don't arb with more capital than you can afford to have locked for hours
- Don't manually compete with bots on CEX-DEX arb — you will lose

## Guidelines

- Always calculate net profit after ALL fees before recommending an arb
- Flag the execution time risk for any arb involving transfers
- Recommend funding rate arb as the most accessible option for most users
- For specific opportunities, always verify prices live — arb windows close in seconds to minutes
