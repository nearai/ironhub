# polymarket

**Value Prop:** Real-time prediction market data feed.
**Value Tags:** Data Feed, Web3

Polymarket public market intelligence integration for IronClaw. Reads markets, events, tags, sports, orderbooks, prices, positions, leaderboards, profiles, and comments across the Polymarket prediction-market platform. No authentication required.

## Actions

### Discovery

| Action | Parameters | Purpose |
|---|---|---|
| `list_markets` | optional `slug[]`, `id[]`, `condition_ids[]`, `clob_token_ids[]`, `tag_id`, `related_tags`, `active`, `closed`, `order`, `ascending`, `limit`, `offset`, `liquidity_num_min`, `volume_num_min`, `start_date_min`, `end_date_max` | Browse markets with filters |
| `get_market_by_id` | `market_id` | Single market by Gamma id |
| `get_market_by_slug` | `slug` | Single market by URL slug |
| `get_clob_market_info` | `condition_id` | CLOB-level params (tokens, tick size, fees, rewards) |
| `list_events` | optional `slug[]`, `id[]`, `tag_id`, `related_tags`, `active`, `closed`, `order`, `ascending`, `limit`, `offset` | Browse events |
| `get_event_by_id` | `event_id` | Single event by id |
| `get_event_by_slug` | `slug` | Single event by URL slug |

### Tags and sports

| Action | Parameters | Purpose |
|---|---|---|
| `list_tags` | optional `limit`, `offset` | Tag taxonomy |
| `get_tag_by_id` / `get_tag_by_slug` | `tag_id` or `slug` | Single tag |
| `get_related_tags_by_tag_id` / `get_related_tags_by_tag_slug` | `tag_id` or `slug` | Tag relationship graph |
| `get_sports_metadata` | none | Sports leagues + metadata |
| `list_teams` | none | Sports teams catalog |

### Search

| Action | Parameters | Purpose |
|---|---|---|
| `search` | `q`, optional `limit` | Full-text search across markets, events, profiles |

### Market data

| Action | Parameters | Purpose |
|---|---|---|
| `get_orderbook` / `get_orderbooks` | `token_id` (single) or `token_ids[]` (batch) | Bids and asks |
| `get_market_price` | `token_id`, `side` (BUY or SELL) | Best bid or ask |
| `get_midpoint_price` / `get_midpoint_prices` | single or batch | Midpoint between best bid and ask |
| `get_last_trade_price` / `get_last_trade_prices` | single or batch | Most recent trade price |
| `get_spread` / `get_spreads` | single or batch | Best ask minus best bid |
| `get_tick_size` | `token_id` | Minimum price increment |
| `get_fee_rate` | `token_id` | Base fee rate for a market |
| `get_server_time` | none | Server time for client sync |

### Historical pricing

| Action | Parameters | Purpose |
|---|---|---|
| `get_prices_history` | `market`, optional `start_ts`, `end_ts`, `fidelity`, `interval` | Time-series for one market |
| `get_batch_prices_history` | `markets[]`, optional `start_ts`, `end_ts`, `fidelity`, `interval` | Time-series for multiple markets |

### Positions and activity (read of any wallet, no auth)

| Action | Parameters | Purpose |
|---|---|---|
| `get_current_positions` | `user`, optional filters (`market[]`, `event_id[]`, `size_threshold`, `redeemable`, `mergeable`, `sort_by`, `sort_direction`, `limit`, `offset`) | Open positions |
| `get_closed_positions` | `user`, optional `limit`, `offset` | Closed position history |
| `get_user_activity` | `user`, optional `limit`, `offset` | Activity feed |
| `get_trades` | optional `user`, `market`, `limit`, `offset` | Trade list |
| `get_trader_leaderboard` | optional `period`, `limit` | Top trader rankings |

### Profiles and comments

| Action | Parameters | Purpose |
|---|---|---|
| `get_public_profile` | `address` | Wallet's public profile |
| `list_comments` | optional `parent_entity_type`, `parent_entity_id`, `limit`, `offset` | Comment threads |

## Auth model

No auth. All endpoints exposed by this tool are public. The capabilities file allowlists `gamma-api.polymarket.com`, `clob.polymarket.com`, and `data-api.polymarket.com`.

## Hosts and routing

The tool routes each action to the correct Polymarket host:

| Host | Used for |
|---|---|
| `gamma-api.polymarket.com` | Discovery: markets, events, tags, sports, search, comments |
| `clob.polymarket.com` | Market data: orderbooks, prices, spreads, tick sizes, server time, prices history |
| `data-api.polymarket.com` | User-scoped reads: positions, activity, trades, leaderboard, profiles |

## Limits

Polymarket caps individual list endpoints at 500 entries per request. Order book and price endpoints accept arrays of token IDs up to 500 per call. Geographic restrictions apply at the wallet level (US users in particular have CFTC-related blocks) but reads are unaffected.

The host-level rate limit is 120 requests per minute and 3,600 per hour; the runtime enforces this regardless of Polymarket's upstream quota.

## Out of scope

Signed CLOB write operations (post and cancel orders, manage relayer, bridge, user-channel WebSocket subscriptions) live in the `polymarket-clob` trunk. WebSocket public-channel subscriptions are deferred until the IronClaw runtime exposes a WebSocket primitive to wasm tools.
