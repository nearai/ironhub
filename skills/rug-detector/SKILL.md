---
name: rug-detector
version: 1.0.0
description: Identify rug pull red flags including honeypots, unlocked liquidity, and suspicious dev wallets
activation:
  keywords:
    - "is this a rug"
    - "rug pull"
    - "honeypot"
    - "is this safe"
    - "check contract"
    - "is this legit"
    - "dev wallet"
    - "liquidity locked"
    - "audit"
  patterns:
    - "(?i)(is this|check).*(rug|safe|legit|honeypot|scam)"
    - "(?i)(liquidity|liq).*(locked|unlocked|burned)"
    - "(?i)(dev|team).*(wallet|holding|dumping)"
  tags:
    - "memecoin"
    - "safety"
    - "trading"
  max_context_tokens: 2000
---

# Rug Detector Skill

Analyzes memecoin contracts and on-chain data to identify rug pull risks, honeypots, and malicious developer behavior before the user invests.

## When to Use

- User shares a contract address and wants a safety check
- User asks "is this a rug?" or "is this safe?"
- User wants to verify liquidity lock status
- User is about to ape into a new token

## Core Knowledge

### Key Principles

1. **Verify before you buy** — always check the contract before putting money in
2. **Liquidity is the lifeline** — unlocked liquidity can be pulled at any time
3. **Dev concentration is risk** — if one wallet holds >10% of supply, they can dump on you
4. **Code doesn't lie** — contract functions reveal if the dev can mint, pause, or blacklist

### Red Flag Checklist

**🔴 Critical (walk away)**
- Honeypot: buy works, sell fails — test on honeypot.is
- Mint function enabled: dev can print unlimited tokens
- Blacklist function: dev can block your wallet from selling
- Liquidity not locked or burned
- Dev wallet holds >20% of supply
- Contract not verified on block explorer

**🟡 Warning (proceed with caution)**
- Liquidity locked for <30 days
- Top 10 wallets hold >50% of supply
- No audit from a known firm
- Anonymous team with no track record
- Very new contract (<24 hours)

**🟢 Safer signals**
- Liquidity burned (sent to dead address)
- Contract renounced (dev can't modify it)
- Verified contract on explorer
- Holder distribution is wide (1000+ holders)
- Audit from Certik, Hacken, or similar

### Tools to Use

| Tool | Purpose |
|------|---------|
| honeypot.is | Test if token is a honeypot |
| tokensniffer.com | Automated contract risk score |
| etherscan / solscan | Verify contract, check holders |
| team.finance / unicrypt | Check liquidity lock status |
| rugcheck.xyz | Solana-specific rug check |

### Mistakes to Avoid

- Don't assume locked liquidity = safe — check the lock duration
- Don't trust audit logos on websites — verify the audit report directly
- Don't ignore wallet concentration even if liquidity is locked

## Guidelines

- Always run at minimum: honeypot check + liquidity lock check + top holder check
- Output a risk score: 🔴 High Risk / 🟡 Medium Risk / 🟢 Lower Risk
- List every red flag found with a one-line explanation
- End with: "This is not financial advice. Always do your own research."
