---
name: memecoin-scanner
version: 1.0.0
description: Spot early memecoin opportunities using volume spikes, social buzz, and on-chain signals
activation:
  keywords:
    - "memecoin"
    - "new coin"
    - "trending token"
    - "early gem"
    - "100x coin"
    - "scan memecoins"
    - "pump incoming"
    - "dexscreener"
    - "new launch"
  patterns:
    - "(?i)(find|scan|spot|look for).*(memecoin|gem|token|coin).*(early|new|trending)"
    - "(?i)(what|which).*(memecoin|coin|token).*(trending|pumping|hot)"
    - "(?i)(100x|1000x|early gem|next pump)"
  tags:
    - "memecoin"
    - "trading"
    - "research"
  max_context_tokens: 2000
---

# Memecoin Scanner Skill

Identifies early memecoin opportunities by combining on-chain volume data, social sentiment signals, and launch metrics before the crowd arrives.

## When to Use

- User wants to find new or trending memecoins early
- User asks about hot tokens on any chain
- User wants to scan for volume spikes or new launches
- User mentions DexScreener, Pump.fun, or similar launchpads

## Core Knowledge

### Key Principles

1. **Speed is everything** — memecoins move in minutes; early data is the edge
2. **Volume precedes price** — sudden volume spikes on low-cap coins are the primary signal
3. **Social velocity matters** — Twitter/X mentions, Telegram group growth, and Reddit posts are leading indicators
4. **On-chain confirms** — wallet count growth, holder distribution, and liquidity depth validate social signals

### Scanning Framework

**Step 1: Find candidates**
- Check DexScreener for new pairs with >$100k volume in last 1h
- Check Pump.fun (Solana) or similar launchpads for trending launches
- Monitor CT (Crypto Twitter) for ticker mentions spiking

**Step 2: Qualify the coin**
- Age: under 72 hours old = highest risk/reward
- Liquidity: minimum $50k locked liquidity
- Holders: growing holder count (not shrinking)
- Dev wallet: under 5% of supply

**Step 3: Social check**
- Is the narrative strong? (meme quality, cultural relevance)
- Is there organic community or is it purely bot-driven?
- Any KOL (Key Opinion Leader) mentions?

### Key Data Sources

| Source | What to check |
|--------|--------------|
| DexScreener | Volume, price change, liquidity, age |
| Pump.fun | New Solana launches, bonding curve progress |
| Birdeye | Multi-chain token analytics |
| Twitter/X | Ticker mentions, KOL posts |
| Telegram | Community size and activity |

### Mistakes to Avoid

- Never ape into a coin without checking liquidity lock status
- Don't trust volume alone — wash trading is common in memecoins
- Don't chase a coin already up 10x — the pump may be over

## Guidelines

- Always present: contract address, chain, liquidity, volume (1h/24h), holder count, age
- Flag any red flags found during scan with ⚠️
- Recommend verifying contract on the chain's block explorer before buying
- Remind user: memecoin trading is extremely high risk
