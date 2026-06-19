---
name: news-trader
version: 1.0.0
description: React to market-moving news events with speed, context, and directional trade ideas
activation:
  keywords:
    - "breaking news trade"
    - "news just dropped"
    - "how does this affect the market"
    - "trade the news"
    - "market reaction"
    - "buy the news"
    - "sell the news"
    - "fed announcement"
    - "etf approved"
  patterns:
    - "(?i)(trade|react|play).*(news|announcement|event|report)"
    - "(?i)(how (does|will|did)).*(affect|impact|move).*(market|price|crypto)"
    - "(?i)(buy|sell).*(news|rumor|announcement)"
  tags:
    - "trading"
    - "news"
    - "execution"
  max_context_tokens: 2000
---

# News Trader Skill

Processes breaking market news quickly, assesses its directional impact, and translates it into actionable trade ideas with defined risk.

## When to Use

- Breaking news just dropped and user wants to know how to trade it
- User asks how a specific news event affects market price
- User wants to know if a news event is already priced in
- User wants to understand "buy the rumor, sell the news" dynamics

## Core Knowledge

### Key Principles

1. **Speed is the edge** — news trading requires fast processing; first movers capture the move
2. **Is it priced in?** — always ask if the market already expected this news before trading it
3. **Buy the rumor, sell the news** — anticipated good news often causes selling after confirmation
4. **Magnitude matters** — not all news moves markets equally; assess the surprise factor

### News Impact Assessment Framework

**Step 1: Classify the news**
- Scheduled (Fed meeting, CPI report, earnings) → market was positioned for this
- Unscheduled/surprise → higher impact, faster move, more opportunity

**Step 2: Assess the surprise factor**
- Was this expected? → Lower impact (already priced in)
- Was this a surprise? → Higher impact (not priced in = bigger move)
- Worse/better than expected by how much? → Determines direction and magnitude

**Step 3: Determine directional bias**

| News Type | Typical Market Reaction |
|-----------|------------------------|
| ETF approved (crypto) | Spike up → potential sell the news after |
| Hack/exploit | Sharp drop → potential bounce after panic |
| Regulatory crackdown | Sell-off → assess severity before buying dip |
| Fed rate cut | Risk-on rally → crypto benefits |
| Fed rate hike (surprise) | Risk-off selloff → crypto drops |
| Major partnership announced | Pump → assess if substance or hype |
| Exchange insolvency | Panic drop → major contagion risk |

**Step 4: Trade the reaction, not just the news**
- Watch the first 5–15 minutes of price reaction
- Is the market buying or selling the news?
- Trade with the reaction once direction is confirmed

### "Buy the Rumor, Sell the News" Pattern

1. News is expected/leaked in advance → price pumps on anticipation
2. News is confirmed officially → initial spike
3. Price reverses and sells off as buyers exit
4. Pattern: fade the confirmation spike with a short

### Risk Management for News Trades

- Use smaller size than normal — news creates volatile wicks
- Wider stop losses — initial moves are often exaggerated
- Set a time stop — if trade doesn't work in 30 minutes, exit
- Never hold through unscheduled high-impact news in a position

### Key News Sources for Speed

| Source | Type |
|--------|------|
| CoinDesk / The Block | Crypto news |
| Reuters / Bloomberg Terminal | Macro news |
| Twitter/X (verified accounts) | Breaking first |
| Polymarket | Crowd-based probability of news outcomes |
| Unusual Whales | Options flow before news |

### Mistakes to Avoid

- Don't trade the headline — read the full story before entering
- Don't chase a 10% move that's already happened — the edge is gone
- Don't ignore the broader trend — bad news in a strong uptrend often gets bought

## Guidelines

- When user shares news, immediately assess: Scheduled or surprise? Bullish or bearish? Priced in or not?
- Give a directional bias with a specific entry trigger (e.g., "wait for retest of $X before entering")
- Always include a stop loss level for news trades — they can reverse violently
- Flag "buy the rumor sell the news" risk whenever news was anticipated
