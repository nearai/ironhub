# Polymarket

Read public market intelligence from the Polymarket prediction-market platform: markets, events, tags, sports, orderbooks, prices, position holdings, user activity, leaderboards, profiles, and comments.

## How to call

Pass a single `action` field naming the operation, plus that action's fields, in `params`. The input schema is a tagged union keyed on `action`.

```json
{ "action": "search", "q": "election", "limit": 10 }
```

```json
{ "action": "get_market_by_slug", "slug": "will-it-rain-tomorrow" }
```

## Actions

Markets and events:
- `list_markets`
- `get_market_by_id`
- `get_market_by_slug`
- `get_clob_market_info`
- `list_events`
- `get_event_by_id`
- `get_event_by_slug`

Tags, sports, and search:
- `list_tags`
- `get_tag_by_id`
- `get_tag_by_slug`
- `get_related_tags_by_tag_id`
- `get_related_tags_by_tag_slug`
- `get_sports_metadata`
- `list_teams`
- `search`

Orderbooks and prices:
- `get_orderbook`
- `get_orderbooks`
- `get_market_price`
- `get_midpoint_price`
- `get_midpoint_prices`
- `get_last_trade_price`
- `get_last_trade_prices`
- `get_spread`
- `get_spreads`
- `get_tick_size`
- `get_fee_rate`
- `get_server_time`
- `get_prices_history`
- `get_batch_prices_history`

Positions, activity, and profiles:
- `get_current_positions`
- `get_closed_positions`
- `get_user_activity`
- `get_trades`
- `get_trader_leaderboard`
- `get_public_profile`
- `list_comments`

## Auth

No authentication required. This tool reads public Polymarket data only. For signed trading and order placement, use the polymarket-clob tool.
