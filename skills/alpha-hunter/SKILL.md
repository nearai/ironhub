---
name: alpha-hunter
version: 1.0.0
description: Spot early alpha signals from on-chain data, whale wallet moves, and smart money activity
activation:
  keywords:
    - "alpha"
    - "whale move"
    - "smart money"
    - "on-chain signal"
    - "whale wallet"
    - "early signal"
    - "what are whales doing"
    - "large transaction"
    - "whale alert"
  patterns:
    - "(?i)(find|spot|hunt|look for).*(alpha|signal|whale|smart money)"
    - "(?i)(what are|where are).*(whales|smart money|big players).*(doing|moving|buying)"
    - "(?i)(on.?chain|large transaction|whale).*(signal|alert|move|activity)"
  tags:
    - "trading"
    - "alpha"
    - "on-chain"
  max_context_tokens: 2000
---

# Alpha Hunter Skill

Identifies early trading alpha by tracking whale wallet movements, smart money on-chain activity, and early signals before they become public knowledge.

## When to Use

- User wants to find early signals before the market moves
- User asks what whales or smart money are doing
- User wants to track large on-chain transactions
- User wants to find information asymmetry (alpha)

## Core Knowledge

### Key Principles

1. **Follow the money, not the narrative** — what wallets DO matters more than what people SAY
2. **Whales move first, retail follows** — on-chain accumulation often precedes price moves by days/weeks
3. **Alpha decays fast** — once a signal is public, most of the edge is gone; speed matters
4. **Not all whale moves are bullish** — distinguish accumulation from distribution

### Alpha Signal Categories

**Whale Wallet Signals**
- Large wallet accumulating unknown token → early buy signal
- Known smart money wallet (tracked on Nansen) buying → follow
- Whale moving tokens from cold wallet to exchange → potential sell incoming
- Whale moving tokens from exchange to cold wallet → long-term hold signal

**Exchange Flow Signals**
- Large inflow to exchange → whale preparing to sell
- Large outflow from exchange → whale accumulating/holding
- Stablecoin inflow to exchange → whale preparing to buy

**DeFi Signals**
- Sudden large liquidity addition to new pool → team/insider seeding
- Governance token accumulation before vote → directional bet on outcome
- Large borrow position opened → leveraged directional bet

**Derivatives Signals**
- Unusually large options purchase at specific strike → directional bet
- Massive open interest increase → large player positioning
- Funding rate divergence across exchanges → arbitrage or directional flow

### Alpha Hunting Tools

| Tool | What It Tracks |
|------|---------------|
| Nansen | Smart money wallet labels and flows |
| Arkham Intelligence | Wallet identity and transaction tracking |
| Whale Alert | Large on-chain transactions in real time |
| Lookonchain | Curated whale and smart money moves |
| Glassnode | On-chain analytics (exchange flows, holder behavior) |
| Dune Analytics | Custom on-chain queries |
| DeBank | DeFi wallet portfolio tracking |

### Smart Money Wallet Types

- **Exchange wallets**: Large inflows/outflows signal sell/buy pressure
- **VC/Fund wallets**: Tracked on Nansen — their buys often precede listings
- **Protocol treasuries**: Large moves signal strategic decisions
- **Known trader wallets**: Historically profitable wallets worth following

### Alpha Validation Checklist

Before acting on a signal:
- ✅ Is the wallet historically profitable? (check Nansen/Arkham)
- ✅ Is this accumulation or a one-time transaction?
- ✅ Is there a fundamental reason for the move?
- ✅ Is the signal still fresh? (>24h old = likely priced in)
- ✅ Does it align with chart structure and sentiment?

### Mistakes to Avoid

- Don't blindly follow every whale move — some are hedges, not directional bets
- Don't act on stale signals — on-chain alpha has a short shelf life
- Don't ignore context — a whale selling 5% of holdings is not the same as selling everything

## Guidelines

- Always identify: wallet history, transaction size, direction (buy/sell), and asset
- Cross-reference on-chain signal with price action and sentiment
- Flag if the signal is fresh (<6 hours) vs. stale (>24 hours)
- Source every signal with the tool/link where it was found
