---
name: self-critique
version: 1.0.0
description: Evaluate the quality of every major trade recommendation before and after execution to build self-awareness and reduce errors
activation:
  keywords:
    - "was that right"
    - "critique this trade"
    - "review my analysis"
    - "how good was that call"
    - "second opinion"
    - "check my reasoning"
    - "devil's advocate"
    - "what could go wrong"
  patterns:
    - "(?i)(critique|review|evaluate|check|second.?opinion).*(trade|analysis|reasoning|call|decision)"
    - "(?i)(what could|what might).*(go wrong|fail|invalidate|miss)"
    - "(?i)(was (that|this)|is this).*(right|correct|good|valid|accurate)"
  tags:
    - "reasoning"
    - "learning"
    - "quality-control"
  max_context_tokens: 2000
requires:
  tools: []
  credentials: []
  permissions: read-only
---

# Self-Critique Skill

Evaluates the quality of the agent's own trade recommendations and reasoning before finalizing them — catching weak signals, overconfidence, and missing context before they become bad trades.

## Hard rules

- This skill is **planning-only** — it never places, submits, or executes orders of any kind
- All output is a plan or analysis for the user to review and act on manually
- Never request, store, or reference wallet private keys or API credentials
- Always require explicit user confirmation before any financial action is taken
- Position sizes and risk calculations are suggestions only — not instructions to trade
- Never connect to or call any exchange, wallet, or trading API
- Dry-run behavior by default — no side effects of any kind
- Always include: "This is not financial advice. Verify with a licensed advisor."
- If asked to execute a trade or place an order, refuse and present the plan only


## When to Use

- Before finalizing any trade recommendation — run a self-critique pass
- When user asks "is this right?" or "devil's advocate this"
- After a losing trade — critique what went wrong
- When multiple skills conflict and a decision still needs to be made
- Any time confidence is HIGH — high confidence warrants extra scrutiny

## Core Knowledge

### Key Principles

1. **Steel-man the opposite side** — before recommending a trade, argue the strongest case AGAINST it
2. **Confidence calibration** — HIGH confidence should only be assigned when 3+ independent signals agree
3. **Identify what you're missing** — what information would change this recommendation?
4. **Separate analysis from conviction** — a good-looking chart does not mean a good trade

### Pre-Trade Critique Checklist

Run this BEFORE every recommendation:

**Signal Quality**
- [ ] How many independent signals support this trade? (1 = weak, 2 = moderate, 3+ = strong)
- [ ] Are the signals truly independent or derived from the same data?
- [ ] Is there any signal directly contradicting the thesis?
- [ ] What timeframe are the signals from? Do higher timeframes agree?

**Risk Assessment**
- [ ] Is the stop loss placement logical (not arbitrary)?
- [ ] Is the risk/reward ratio at least 1:2?
- [ ] What is the maximum realistic loss if wrong?
- [ ] Is position size within risk management rules?

**Context Check**
- [ ] What is the broader market doing? (BTC trend, overall sentiment)
- [ ] Are there any upcoming events that could invalidate this? (Fed, earnings, expiry)
- [ ] Is this trade against the higher timeframe trend?
- [ ] Is the asset overleveraged? (check funding rates)

**Bias Check**
- [ ] Am I recommending this because the signals are strong, or because I want it to work?
- [ ] Have I looked at this chart fresh, or am I anchored to a previous view?
- [ ] Is this FOMO (reacting to a move already made)?

### Confidence Rating System

Assign confidence AFTER running the checklist:

**🟢 HIGH Confidence**
- 3+ independent signals aligned
- Higher timeframe agrees
- No contradicting signals
- R:R ≥ 1:3
- No major events upcoming
- → Proceed with standard position size

**🟡 MEDIUM Confidence**
- 2 signals aligned, 1 conflicting OR
- Only 2 signals total with no contradictions
- R:R between 1:2 and 1:3
- → Proceed with 50% of standard position size

**🔴 LOW Confidence**
- Single signal only OR
- Conflicting signals with no clear winner OR
- Against higher timeframe trend
- R:R < 1:2
- → Do not trade. Wait for a better setup.

### Post-Trade Critique (After Close)

After every trade closes, answer these:

**If it was a WIN:**
- Was the win due to the thesis playing out, or luck?
- Did I exit at the right time or leave significant profit behind?
- Was my confidence rating correct?
- What would I do differently?

**If it was a LOSS:**
- Which signal failed and why?
- Was the stop loss in the right place?
- Were there warning signs I ignored?
- Was the loss within the expected risk parameters?
- Was this a good trade that just didn't work, or a bad trade I shouldn't have taken?

### The Devil's Advocate Pass

For every HIGH confidence recommendation, run this before finalizing:

```
"The opposite trade (SHORT instead of LONG) would make sense if:
  1. [Strongest bearish argument]
  2. [What the bears are seeing that I'm not]
  3. [What recent price action supports the bearish case]

My response to these bear arguments:
  1. [Why bulls still have the edge]
  2. [What would make me switch to bearish]

Final verdict: [PROCEED / REDUCE SIZE / WAIT]"
```

### Critique Output Format

Always produce critique in this format:

```
SELF-CRITIQUE: [Asset] [Direction]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Signals found:      [list]
Signals missing:    [list]
Contradictions:     [list or "none"]
Higher TF agrees:   YES / NO / MIXED
Upcoming risk:      [events or "none"]
Bias detected:      [describe or "none"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Confidence:         🟢 HIGH / 🟡 MEDIUM / 🔴 LOW
Recommended size:   FULL / 50% / DO NOT TRADE
One thing that could make this wrong: [single biggest risk]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Common Biases to Watch For

| Bias | What It Looks Like | Fix |
|------|--------------------|-----|
| Confirmation bias | Only looking for signals that agree | Actively search for contradicting signals |
| Recency bias | Weighting last 2 candles too heavily | Check at least 3 timeframes |
| Anchoring | Still bullish despite structure break | Re-draw chart from scratch |
| FOMO | Entering after 20% move already made | Check if thesis is still valid at new price |
| Loss aversion | Holding a loser hoping to break even | Apply the trade-memory stop rules |
| Overconfidence | HIGH confidence on <3 signals | Recount signals strictly |

### Mistakes to Avoid

- Never skip the pre-trade checklist for HIGH confidence trades — those are the most dangerous
- Don't let a compelling narrative override weak technicals
- Don't assign HIGH confidence just because the user seems convinced
- Don't critique only losing trades — winning trades also need critique to ensure it wasn't luck

## Guidelines

- Run the pre-trade checklist silently before EVERY recommendation — don't wait to be asked
- Always output the Critique Format block when confidence is HIGH or when user explicitly asks
- If LOW confidence, do not recommend the trade — suggest waiting for a better setup instead
- Log critique results to trade-memory skill alongside the trade entry
- If a trade was right for the wrong reasons, flag it — lucky trades build bad habits
