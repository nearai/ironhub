---
name: event-tracker
version: 1.0.0
description: Monitor real-world events and breaking developments that move Polymarket prediction probabilities
activation:
  keywords:
    - "track this event"
    - "monitor market"
    - "what events affect"
    - "upcoming events"
    - "event calendar"
    - "what could move this market"
    - "catalysts"
  patterns:
    - "(?i)(track|monitor|watch).*(event|market|development|news)"
    - "(?i)(what|which).*(events|news|catalysts).*(affect|move|change).*(market|odds|price)"
    - "(?i)(upcoming|scheduled|expected).*(event|announcement|decision|vote|report)"
  tags:
    - "polymarket"
    - "events"
    - "research"
  max_context_tokens: 2000
---

# Event Tracker Skill

Identifies and monitors real-world events, announcements, and catalysts that are likely to move Polymarket prediction market probabilities.

## When to Use

- User wants to know what events could affect a market's price
- User wants to track scheduled announcements (elections, Fed decisions, court rulings)
- User wants to be alerted to developments before the market reacts
- User is holding a position and wants to know upcoming risk events

## Core Knowledge

### Key Principles

1. **Catalysts move markets** — know what events can flip a market before they happen
2. **Scheduled > unscheduled** — plan around known dates (elections, rulings, reports); unscheduled events are the risk you manage
3. **Time decay matters** — as resolution date approaches, prices converge to 0 or 100; position accordingly
4. **First mover advantage** — reacting to an event before the market prices it in = edge

### Event Categories by Market Type

**Political Markets**
- Polling releases (weekly/monthly)
- Debate performances
- Primary results
- Major policy announcements
- Scandal or legal developments

**Economic Markets**
- Fed FOMC meetings (scheduled 8x/year)
- CPI/PPI inflation reports (monthly)
- Jobs reports (first Friday of each month)
- Earnings reports (quarterly)
- GDP releases (quarterly)

**Crypto Markets**
- ETF approval/rejection dates
- Protocol upgrade dates (halving, merge, etc.)
- Regulatory announcements
- Exchange listing/delisting events
- On-chain governance votes

**Sports Markets**
- Injury reports
- Team lineup announcements
- Weather conditions (outdoor sports)
- Referee/umpire assignments

### Event Impact Assessment

For each upcoming event, assess:
- **Magnitude**: How much could this move the market? (Low/Medium/High)
- **Direction**: Does it favor YES or NO?
- **Timing**: How close to resolution date?
- **Certainty**: Is this event itself certain to happen?

### Mistakes to Avoid

- Don't hold positions through binary events without knowing the risk
- Don't assume scheduled events happen on time — delays are common
- Don't ignore time zone differences for international events

## Guidelines

- For any market the user holds, identify the next 3 key events and their dates
- Rate each event: 🔴 High impact / 🟡 Medium impact / 🟢 Low impact
- Recommend whether to hold through the event or reduce position before it
- Always provide the exact source/schedule URL for upcoming events
