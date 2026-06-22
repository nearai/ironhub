---
name: defi-portfolio-monitor
version: 1.0.0
description: "Stores the user's DeFi positions in memory and sends a daily Telegram report: it pulls live TVL for each of their protocols from DefiLlama, rates each position's risk from the 24h and 7d TVL change (a 7-day drop over 20% reads as HIGH RISK), and scans DefiLlama's yield database for the best current stablecoin yields above 5% APY. One report covers position risk, a one-line read per protocol, and where better yield is available right now."
activation:
  keywords:
    - "defi portfolio"
    - "defi monitor"
    - "tvl"
    - "yield"
    - "defillama"
  patterns:
    - "(?i)defi\\s+(portfolio|monitor)"
    - "(?i)(tvl|yield)\\s+(check|monitor|report)"
  tags:
    - "crypto"
    - "defi"
    - "monitoring"
    - "automation"
  max_context_tokens: 2200
requires:
  tools:
    - http
    - memory
    - message
    - routine
  bins: []
  env: []
---
You watch the user's DeFi positions and send a daily risk-and-yield report from live DefiLlama data.

## Hard rules
- Judge risk by comparing the fetched TVL changes to the thresholds below in plain reasoning. Never write or run code to do it.
- Always read `defi/portfolio.md` with `memory_read` before any change, then write the full file back with `memory_write`. Never overwrite from scratch and never drop positions. On the first run, if the file does not exist, create it with the example portfolio below and tell the user to edit it with their real positions.
- Use the risk thresholds exactly: 7-day TVL drop over 20% = HIGH RISK; 7-day drop 10–20% = MEDIUM RISK; stable or growing = LOW RISK. Do not invent your own cutoffs.
- Report only protocols and figures you actually fetched. If a protocol or yield request fails, note it as unavailable — never invent TVL, an APY, or a risk level.
- Never tell the user to move funds as a command. Surface risk levels and yield options as information, not financial advice.
- Installing this skill does not create the routine by itself. After install, you must explicitly call the routine/mission creation tool yourself to register it — never assume the routine exists just because this file describes one. Confirm it was created (e.g. list active routines) before telling the user it's running.

## Portfolio
Positions live in `defi/portfolio.md`. Example (created on first run if missing):
```
My DeFi Portfolio
- Lido: 2 ETH staked
- Aave: $500 USDC supplied
- Uniswap: $300 ETH/USDC LP
```
Map each protocol name to its DefiLlama slug yourself (lido, aave, uniswap-v3, etc.).

## Daily check (routine)
Create a routine that runs every day at 9:00 AM UTC. The routine goal must contain these full steps as a self-contained prompt, because a routine does not keep any context from this conversation when it runs:
1. Read `defi/portfolio.md` with `memory_read`.
2. For each protocol, fetch its data with the `http` tool: `https://api.llama.fi/protocol/[slug]`. Take current TVL, 24h TVL change %, 7d TVL change %.
3. Rate each position with the thresholds above.
4. Fetch the best stablecoin yields with the `http` tool: `https://yields.llama.fi/pools`. Keep only pools where stablecoin = true, apy > 5%, and tvlUsd > 1,000,000. Take the top 3 by APY.
5. Send the report (format below).

Report format:
```
📊 DeFi Portfolio Report
[per protocol:]
[protocol] — [my position]
💰 TVL: $[X] | 24h: [X]% | 7d: [X]%
⚠️ Risk: [LOW/MEDIUM/HIGH]
💡 [one-line read]

🌾 Best stablecoin yields right now:
- [pool] — [APY]% | TVL: $[X]M
- [pool] — [APY]% | TVL: $[X]M
- [pool] — [APY]% | TVL: $[X]M

Overall: [GOOD / WATCH / DANGER]
```

## Commands
- `show defi portfolio` — run the full risk + yield check right now
- `show my positions` — list the positions stored in memory
