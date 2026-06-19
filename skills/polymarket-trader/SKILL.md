---
name: polymarket-trader
version: 1.0.0
description: Scan Polymarket for mispriced prediction markets and automatically place orders when edge is found
activation:
  keywords:
    - "scan polymarket"
    - "polymarket trade"
    - "find mispriced markets"
    - "auto trade polymarket"
    - "polymarket bot"
    - "polymarket edge"
    - "place polymarket order"
  patterns:
    - "(?i)(scan|search|find).*(polymarket|prediction market).*(mispric|edge|opportunity)"
    - "(?i)(auto|automatically).*(trade|bet|place).*(polymarket|prediction)"
    - "(?i)(polymarket).*(bot|scanner|trader|order)"
  tags:
    - "polymarket"
    - "trading"
    - "automation"
  max_context_tokens: 2000
tools:
  - name: polymarket_trader
    path: ./polymarket_trader.py
    description: Scans Polymarket markets and places orders via CLOB API
    auth:
      env:
        - POLYMARKET_PRIVATE_KEY
        - POLYMARKET_FUNDER
---

# Polymarket Auto-Trader Skill

Scans Polymarket prediction markets for mispriced opportunities and automatically places orders when edge exceeds the configured threshold using the official Polymarket CLOB API.

## When to Use

- User wants to automatically find and trade mispriced Polymarket markets
- User asks to scan for prediction market opportunities
- User wants to run a Polymarket trading bot
- User asks to place a specific Polymarket order

## Core Knowledge

### Key Principles

1. **Edge first, always** — only trade when calculated edge exceeds MIN_EDGE (default 8%); never trade for the sake of trading
2. **Dry run before live** — always verify the scanner is finding real opportunities in DRY_RUN mode before switching to live
3. **Kelly sizing** — bet size scales with edge strength; never risk more than MAX_BET_SIZE per market
4. **FOK orders only** — use Fill-or-Kill order type to avoid leaving resting orders that could fill at bad prices

### How It Works

**Step 1 — Market Discovery**
Fetches active markets from Polymarket Gamma API, sorted by 24h volume, filtering for markets with sufficient liquidity.

**Step 2 — Mispricing Detection**
For each market, analyzes:
- YES + NO price sum (should equal ~1.00; deviation = arb opportunity)
- Anchoring bias (50/50 markets with low volume)
- Thin market extremes (very high/low prices in illiquid markets)

**Step 3 — Order Placement**
When edge ≥ MIN_EDGE, calculates bet size via simplified Kelly Criterion and places a market order via the Polymarket CLOB API.

### Setup Instructions

**1. Install dependencies**
```bash
pip install py-clob-client requests python-dotenv
```

**2. Create .env file**
```
POLYMARKET_PRIVATE_KEY=your_polygon_wallet_private_key
POLYMARKET_FUNDER=your_funder_wallet_address
MIN_EDGE=0.08
MAX_BET_SIZE=25
MIN_LIQUIDITY=500
DRY_RUN=true
```

**3. Run in dry run mode first**
```bash
python polymarket_trader.py
```

**4. Review opportunities, then set DRY_RUN=false for live trading**

### Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| MIN_EDGE | 0.08 (8%) | Minimum edge to trigger a trade |
| MAX_BET_SIZE | $25 USDC | Maximum bet per market |
| MIN_LIQUIDITY | $500 USDC | Minimum market liquidity |
| DRY_RUN | true | Simulate trades without real orders |

### Wallet Setup

You need a Polygon wallet with USDC.e:
1. Create a wallet on Polymarket (or connect MetaMask)
2. Fund with USDC on Polygon network
3. Export private key (keep it secret — never share it)
4. Set token allowances (run the allowance script from py-clob-client docs)

### Risk Management Rules

- Never set MAX_BET_SIZE above 5% of your total bankroll
- Always start with DRY_RUN=true for at least 48 hours
- Monitor the bot — prediction markets can move fast
- Set MIN_EDGE higher (0.12+) for more conservative trading
- The bot uses FOK orders — if liquidity is insufficient, orders simply don't fill

### Mistakes to Avoid

- Never use your main wallet private key — use a dedicated trading wallet
- Don't set MIN_EDGE below 0.05 — fees and slippage will eat your edge
- Don't run without MIN_LIQUIDITY filter — thin markets give false signals
- Don't skip dry run testing before going live

## Guidelines

- When user asks to run the scanner: execute `polymarket_trader.py` with DRY_RUN=true first
- When user asks to place a specific order: ask for market slug, direction (YES/NO), and amount
- Always confirm wallet setup and allowances before attempting live trading
- Report scan results in this format: Market / Direction / Edge % / Bet Size / Status
- Remind user: prediction markets carry real financial risk — only trade with money you can afford to lose
