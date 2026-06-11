### 1. Title

Trading Plan Enforcer — Your past self reminds you to execute when price hits your levels

### 2. Example prompt

You are my trading plan enforcer. Your job is to hold me accountable to my own trading plan when emotions kick in.

When I say "plan for [TOKEN]: [rules]" — for example:
"plan for NEAR: sell 50% at $3.50, stop loss at $1.60, no buying above $2.50"

1. Read memory at trading/plans.md using memory_read
2. Save the plan with: token, each rule as a separate trigger level, date created, status ACTIVE
3. Write back to memory and confirm: "Plan saved. I'll watch NEAR and remind you of YOUR OWN rules when price gets there."

Create a routine that runs every 4 hours:

1. Read all active plans from trading/plans.md
2. For each token in plans, fetch current price from CoinGecko:
https://api.coingecko.com/api/v3/simple/price?ids=[token-ids]&vs_currencies=usd

3. Check each trigger level:
- If price is within 2% of a trigger level OR has crossed it: TRIGGER
- If trigger already fired before (marked in memory): skip, don't spam

4. When a trigger fires, send Telegram message in this format:

"⚖️ TRADING PLAN REMINDER

On [date you created the plan] you wrote:
'[exact rule from your plan]'

[TOKEN] is now $[current price].

This is not advice. This is YOUR plan, written when you were thinking clearly.

Execute or consciously revise it — but don't ignore it.

Reply 'done [token]' if executed, 'revise [token]' to update the plan."

5. Mark the trigger as FIRED in memory so it doesn't repeat.

When I say "done [TOKEN]": mark that trigger as EXECUTED in memory.
When I say "revise [TOKEN]: [new rules]": update the plan, reset triggers.
When I say "show plans": display all active plans with current prices and distance to each trigger.

If no triggers fired during routine run: reply HEARTBEAT_OK and stop.

### 3. What the agent does

You write your trading plan once, with a clear head — exit targets, stop losses, no-buy zones. The agent stores it in memory and checks prices every 4 hours. When price reaches one of your levels, it sends you your own words back: the exact rule you wrote, the date you wrote it, and the current price. No advice, no signals — just your own plan delivered at the exact moment you're most likely to abandon it. Each trigger fires only once, no spam. You can mark rules as executed, revise plans, or check distance to your levels anytime. It solves the oldest problem in trading: the plan is written by your rational self, but executed by your emotional self.

### 4. Skills & tools used

- http — fetches current prices from CoinGecko at https://api.coingecko.com/api/v3/simple/price (free, no API key required)
- memory_read — reads active trading plans and trigger states from trading/plans.md
- memory_write — saves plans, marks triggers as fired/executed, handles plan revisions
- time — timestamps plan creation so reminders reference the original date
- message — sends Telegram reminder with your own rule quoted back at trigger moment
- routine/cron — checks prices against all plan levels every 4 hours

### 5. Categories

- [x] Personal assistant
- [x] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [x] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

_No response_

### 7. Author (optional)

Evgeny
