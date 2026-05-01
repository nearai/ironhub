mod api;
mod http;
mod types;

use types::PolymarketAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct PolymarketTool;

impl exports::near::agent::tool::Guest for PolymarketTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        match execute_inner(&req.params) {
            Ok(output) => exports::near::agent::tool::Response {
                output: Some(output),
                error: None,
            },
            Err(e) => exports::near::agent::tool::Response {
                output: None,
                error: Some(e),
            },
        }
    }

    fn schema() -> String {
        let schema = schemars::schema_for!(PolymarketAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Polymarket public market intelligence. Read prediction markets, \
         events, tags, sports, orderbooks, prices, position holdings, \
         user activity, leaderboards, profiles, and comments across the \
         Polymarket platform. No authentication required. For signed \
         trading and order placement, use the polymarket-clob trunk."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: PolymarketAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("polymarket parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters: {}. Expected: {{\"action\": \"<name>\", ...}}. Actions: {}.",
            e,
            ALL_ACTIONS.join(", ")
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("polymarket: {}", action_name(&action)),
    );

    dispatch(action)
}

const ALL_ACTIONS: &[&str] = &[
    "list_markets",
    "get_market_by_id",
    "get_market_by_slug",
    "get_clob_market_info",
    "list_events",
    "get_event_by_id",
    "get_event_by_slug",
    "list_tags",
    "get_tag_by_id",
    "get_tag_by_slug",
    "get_related_tags_by_tag_id",
    "get_related_tags_by_tag_slug",
    "get_sports_metadata",
    "list_teams",
    "search",
    "get_orderbook",
    "get_orderbooks",
    "get_market_price",
    "get_midpoint_price",
    "get_midpoint_prices",
    "get_last_trade_price",
    "get_last_trade_prices",
    "get_spread",
    "get_spreads",
    "get_tick_size",
    "get_fee_rate",
    "get_server_time",
    "get_prices_history",
    "get_batch_prices_history",
    "get_current_positions",
    "get_closed_positions",
    "get_user_activity",
    "get_trades",
    "get_trader_leaderboard",
    "get_public_profile",
    "list_comments",
];

fn dispatch(action: PolymarketAction) -> Result<String, String> {
    match action {
        PolymarketAction::ListMarkets {
            slug,
            id,
            condition_ids,
            clob_token_ids,
            tag_id,
            related_tags,
            active,
            closed,
            order,
            ascending,
            limit,
            offset,
            liquidity_num_min,
            volume_num_min,
            start_date_min,
            end_date_max,
        } => api::list_markets(api::MarketsQuery {
            slug: slug.as_deref(),
            id: id.as_deref(),
            condition_ids: condition_ids.as_deref(),
            clob_token_ids: clob_token_ids.as_deref(),
            tag_id,
            related_tags,
            active,
            closed,
            order: order.as_deref(),
            ascending,
            limit,
            offset,
            liquidity_num_min,
            volume_num_min,
            start_date_min: start_date_min.as_deref(),
            end_date_max: end_date_max.as_deref(),
        }),
        PolymarketAction::GetMarketById { market_id } => api::get_market_by_id(&market_id),
        PolymarketAction::GetMarketBySlug { slug } => api::get_market_by_slug(&slug),
        PolymarketAction::GetClobMarketInfo { condition_id } => {
            api::get_clob_market_info(&condition_id)
        }
        PolymarketAction::ListEvents {
            slug,
            id,
            tag_id,
            related_tags,
            active,
            closed,
            order,
            ascending,
            limit,
            offset,
        } => api::list_events(api::EventsQuery {
            slug: slug.as_deref(),
            id: id.as_deref(),
            tag_id,
            related_tags,
            active,
            closed,
            order: order.as_deref(),
            ascending,
            limit,
            offset,
        }),
        PolymarketAction::GetEventById { event_id } => api::get_event_by_id(event_id),
        PolymarketAction::GetEventBySlug { slug } => api::get_event_by_slug(&slug),
        PolymarketAction::ListTags { limit, offset } => api::list_tags(limit, offset),
        PolymarketAction::GetTagById { tag_id } => api::get_tag_by_id(tag_id),
        PolymarketAction::GetTagBySlug { slug } => api::get_tag_by_slug(&slug),
        PolymarketAction::GetRelatedTagsByTagId { tag_id } => {
            api::get_related_tags_by_tag_id(tag_id)
        }
        PolymarketAction::GetRelatedTagsByTagSlug { slug } => {
            api::get_related_tags_by_tag_slug(&slug)
        }
        PolymarketAction::GetSportsMetadata => api::get_sports_metadata(),
        PolymarketAction::ListTeams => api::list_teams(),
        PolymarketAction::Search { q, limit } => api::search(&q, limit),
        PolymarketAction::GetOrderbook { token_id } => api::get_orderbook(&token_id),
        PolymarketAction::GetOrderbooks { token_ids } => api::get_orderbooks(&token_ids),
        PolymarketAction::GetMarketPrice { token_id, side } => {
            api::get_market_price(&token_id, &side)
        }
        PolymarketAction::GetMidpointPrice { token_id } => api::get_midpoint_price(&token_id),
        PolymarketAction::GetMidpointPrices { token_ids } => api::get_midpoint_prices(&token_ids),
        PolymarketAction::GetLastTradePrice { token_id } => api::get_last_trade_price(&token_id),
        PolymarketAction::GetLastTradePrices { token_ids } => {
            api::get_last_trade_prices(&token_ids)
        }
        PolymarketAction::GetSpread { token_id } => api::get_spread(&token_id),
        PolymarketAction::GetSpreads { token_ids } => api::get_spreads(&token_ids),
        PolymarketAction::GetTickSize { token_id } => api::get_tick_size(&token_id),
        PolymarketAction::GetFeeRate { token_id } => api::get_fee_rate(&token_id),
        PolymarketAction::GetServerTime => api::get_server_time(),
        PolymarketAction::GetPricesHistory {
            market,
            start_ts,
            end_ts,
            fidelity,
            interval,
        } => api::get_prices_history(&market, start_ts, end_ts, fidelity, interval.as_deref()),
        PolymarketAction::GetBatchPricesHistory {
            markets,
            start_ts,
            end_ts,
            fidelity,
            interval,
        } => {
            api::get_batch_prices_history(&markets, start_ts, end_ts, fidelity, interval.as_deref())
        }
        PolymarketAction::GetCurrentPositions {
            user,
            market,
            event_id,
            size_threshold,
            redeemable,
            mergeable,
            limit,
            offset,
            sort_by,
            sort_direction,
        } => api::get_current_positions(api::PositionsQuery {
            user: &user,
            market: market.as_deref(),
            event_id: event_id.as_deref(),
            size_threshold,
            redeemable,
            mergeable,
            limit,
            offset,
            sort_by: sort_by.as_deref(),
            sort_direction: sort_direction.as_deref(),
        }),
        PolymarketAction::GetClosedPositions {
            user,
            limit,
            offset,
        } => api::get_closed_positions(&user, limit, offset),
        PolymarketAction::GetUserActivity {
            user,
            limit,
            offset,
        } => api::get_user_activity(&user, limit, offset),
        PolymarketAction::GetTrades {
            user,
            market,
            limit,
            offset,
        } => api::get_trades(user.as_deref(), market.as_deref(), limit, offset),
        PolymarketAction::GetTraderLeaderboard { period, limit } => {
            api::get_trader_leaderboard(period.as_deref(), limit)
        }
        PolymarketAction::GetPublicProfile { address } => api::get_public_profile(&address),
        PolymarketAction::ListComments {
            parent_entity_type,
            parent_entity_id,
            limit,
            offset,
        } => api::list_comments(
            parent_entity_type.as_deref(),
            parent_entity_id.as_deref(),
            limit,
            offset,
        ),
    }
}

fn action_name(action: &PolymarketAction) -> &'static str {
    match action {
        PolymarketAction::ListMarkets { .. } => "list_markets",
        PolymarketAction::GetMarketById { .. } => "get_market_by_id",
        PolymarketAction::GetMarketBySlug { .. } => "get_market_by_slug",
        PolymarketAction::GetClobMarketInfo { .. } => "get_clob_market_info",
        PolymarketAction::ListEvents { .. } => "list_events",
        PolymarketAction::GetEventById { .. } => "get_event_by_id",
        PolymarketAction::GetEventBySlug { .. } => "get_event_by_slug",
        PolymarketAction::ListTags { .. } => "list_tags",
        PolymarketAction::GetTagById { .. } => "get_tag_by_id",
        PolymarketAction::GetTagBySlug { .. } => "get_tag_by_slug",
        PolymarketAction::GetRelatedTagsByTagId { .. } => "get_related_tags_by_tag_id",
        PolymarketAction::GetRelatedTagsByTagSlug { .. } => "get_related_tags_by_tag_slug",
        PolymarketAction::GetSportsMetadata => "get_sports_metadata",
        PolymarketAction::ListTeams => "list_teams",
        PolymarketAction::Search { .. } => "search",
        PolymarketAction::GetOrderbook { .. } => "get_orderbook",
        PolymarketAction::GetOrderbooks { .. } => "get_orderbooks",
        PolymarketAction::GetMarketPrice { .. } => "get_market_price",
        PolymarketAction::GetMidpointPrice { .. } => "get_midpoint_price",
        PolymarketAction::GetMidpointPrices { .. } => "get_midpoint_prices",
        PolymarketAction::GetLastTradePrice { .. } => "get_last_trade_price",
        PolymarketAction::GetLastTradePrices { .. } => "get_last_trade_prices",
        PolymarketAction::GetSpread { .. } => "get_spread",
        PolymarketAction::GetSpreads { .. } => "get_spreads",
        PolymarketAction::GetTickSize { .. } => "get_tick_size",
        PolymarketAction::GetFeeRate { .. } => "get_fee_rate",
        PolymarketAction::GetServerTime => "get_server_time",
        PolymarketAction::GetPricesHistory { .. } => "get_prices_history",
        PolymarketAction::GetBatchPricesHistory { .. } => "get_batch_prices_history",
        PolymarketAction::GetCurrentPositions { .. } => "get_current_positions",
        PolymarketAction::GetClosedPositions { .. } => "get_closed_positions",
        PolymarketAction::GetUserActivity { .. } => "get_user_activity",
        PolymarketAction::GetTrades { .. } => "get_trades",
        PolymarketAction::GetTraderLeaderboard { .. } => "get_trader_leaderboard",
        PolymarketAction::GetPublicProfile { .. } => "get_public_profile",
        PolymarketAction::ListComments { .. } => "list_comments",
    }
}

export!(PolymarketTool);
