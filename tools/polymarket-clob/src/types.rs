use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum PolymarketClobAction {
    DeriveApiKey {
        #[serde(default)]
        nonce: Option<u64>,
    },
    GetUserOrders {
        #[serde(default)]
        market: Option<String>,
        #[serde(default)]
        asset_id: Option<String>,
        #[serde(default)]
        next_cursor: Option<String>,
    },
    GetOrderById {
        order_id: String,
    },
    GetOrderScoringStatus {
        order_id: String,
    },
    CancelOrder {
        order_id: String,
    },
    CancelMultipleOrders {
        order_ids: Vec<String>,
    },
    CancelOrdersForMarket {
        market: String,
        asset_id: String,
    },
    CancelAllOrders,
    GetUserTrades {
        #[serde(default)]
        market: Option<String>,
        #[serde(default)]
        next_cursor: Option<String>,
    },
    SendHeartbeat,
}
