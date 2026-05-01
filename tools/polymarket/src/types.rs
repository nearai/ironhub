use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum PolymarketAction {
    ListMarkets {
        #[serde(default)]
        slug: Option<Vec<String>>,
        #[serde(default)]
        id: Option<Vec<u64>>,
        #[serde(default)]
        condition_ids: Option<Vec<String>>,
        #[serde(default)]
        clob_token_ids: Option<Vec<String>>,
        #[serde(default)]
        tag_id: Option<u64>,
        #[serde(default)]
        related_tags: Option<bool>,
        #[serde(default)]
        active: Option<bool>,
        #[serde(default)]
        closed: Option<bool>,
        #[serde(default)]
        order: Option<String>,
        #[serde(default)]
        ascending: Option<bool>,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
        #[serde(default)]
        liquidity_num_min: Option<f64>,
        #[serde(default)]
        volume_num_min: Option<f64>,
        #[serde(default)]
        start_date_min: Option<String>,
        #[serde(default)]
        end_date_max: Option<String>,
    },
    GetMarketById {
        market_id: String,
    },
    GetMarketBySlug {
        slug: String,
    },
    GetClobMarketInfo {
        condition_id: String,
    },

    ListEvents {
        #[serde(default)]
        slug: Option<Vec<String>>,
        #[serde(default)]
        id: Option<Vec<u64>>,
        #[serde(default)]
        tag_id: Option<u64>,
        #[serde(default)]
        related_tags: Option<bool>,
        #[serde(default)]
        active: Option<bool>,
        #[serde(default)]
        closed: Option<bool>,
        #[serde(default)]
        order: Option<String>,
        #[serde(default)]
        ascending: Option<bool>,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
    },
    GetEventById {
        event_id: u64,
    },
    GetEventBySlug {
        slug: String,
    },

    ListTags {
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
    },
    GetTagById {
        tag_id: u64,
    },
    GetTagBySlug {
        slug: String,
    },
    GetRelatedTagsByTagId {
        tag_id: u64,
    },
    GetRelatedTagsByTagSlug {
        slug: String,
    },

    GetSportsMetadata,
    ListTeams,

    Search {
        q: String,
        #[serde(default)]
        limit: Option<u32>,
    },

    GetOrderbook {
        token_id: String,
    },
    GetOrderbooks {
        token_ids: Vec<String>,
    },
    GetMarketPrice {
        token_id: String,
        side: String,
    },
    GetMidpointPrice {
        token_id: String,
    },
    GetMidpointPrices {
        token_ids: Vec<String>,
    },
    GetLastTradePrice {
        token_id: String,
    },
    GetLastTradePrices {
        token_ids: Vec<String>,
    },
    GetSpread {
        token_id: String,
    },
    GetSpreads {
        token_ids: Vec<String>,
    },
    GetTickSize {
        token_id: String,
    },
    GetFeeRate {
        token_id: String,
    },
    GetServerTime,

    GetPricesHistory {
        market: String,
        #[serde(default)]
        start_ts: Option<u64>,
        #[serde(default)]
        end_ts: Option<u64>,
        #[serde(default)]
        fidelity: Option<u32>,
        #[serde(default)]
        interval: Option<String>,
    },
    GetBatchPricesHistory {
        markets: Vec<String>,
        #[serde(default)]
        start_ts: Option<u64>,
        #[serde(default)]
        end_ts: Option<u64>,
        #[serde(default)]
        fidelity: Option<u32>,
        #[serde(default)]
        interval: Option<String>,
    },

    GetCurrentPositions {
        user: String,
        #[serde(default)]
        market: Option<Vec<String>>,
        #[serde(default)]
        event_id: Option<Vec<u64>>,
        #[serde(default)]
        size_threshold: Option<f64>,
        #[serde(default)]
        redeemable: Option<bool>,
        #[serde(default)]
        mergeable: Option<bool>,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
        #[serde(default)]
        sort_by: Option<String>,
        #[serde(default)]
        sort_direction: Option<String>,
    },
    GetClosedPositions {
        user: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
    },
    GetUserActivity {
        user: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
    },
    GetTrades {
        #[serde(default)]
        user: Option<String>,
        #[serde(default)]
        market: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
    },
    GetTraderLeaderboard {
        #[serde(default)]
        period: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },

    GetPublicProfile {
        address: String,
    },

    ListComments {
        #[serde(default)]
        parent_entity_type: Option<String>,
        #[serde(default)]
        parent_entity_id: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
    },
}
