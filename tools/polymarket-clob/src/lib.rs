mod http;
mod types;

use serde_json::json;
use types::PolymarketClobAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct PolymarketClobTool;

impl exports::near::agent::tool::Guest for PolymarketClobTool {
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
        let schema = schemars::schema_for!(PolymarketClobAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Polymarket signed trading: derive API keys, list and cancel CLOB orders, fetch user trades. Two-tier auth (L1 EIP-712 ClobAuth for setup, L2 HMAC for trade requests) is handled host-side; this tool only sees endpoint paths and parameters.".to_string()
    }
}

fn execute_inner(params_json: &str) -> Result<String, String> {
    let action: PolymarketClobAction = serde_json::from_str(params_json)
        .map_err(|e| format!("invalid params: {e}"))?;

    let (method, path, body): (&str, String, Option<Vec<u8>>) = match action {
        PolymarketClobAction::DeriveApiKey { nonce } => {
            let body = json!({ "nonce": nonce.unwrap_or(0) });
            (
                "POST",
                "/auth/api-key".to_string(),
                Some(serde_json::to_vec(&body).map_err(|e| e.to_string())?),
            )
        }
        PolymarketClobAction::GetUserOrders {
            market,
            asset_id,
            next_cursor,
        } => {
            let q = http::build_query(&[
                ("market", market.as_deref()),
                ("id", asset_id.as_deref()),
                ("next_cursor", next_cursor.as_deref()),
            ]);
            let path = if q.is_empty() {
                "/data/orders".to_string()
            } else {
                format!("/data/orders?{q}")
            };
            ("GET", path, None)
        }
        PolymarketClobAction::GetOrderById { order_id } => (
            "GET",
            format!("/data/order/{}", url_encode_segment(&order_id)),
            None,
        ),
        PolymarketClobAction::GetOrderScoringStatus { order_id } => {
            let q = http::build_query(&[("order_id", Some(order_id.as_str()))]);
            ("GET", format!("/order-scoring?{q}"), None)
        }
        PolymarketClobAction::CancelOrder { order_id } => {
            let body = json!({ "orderID": order_id });
            (
                "DELETE",
                "/order".to_string(),
                Some(serde_json::to_vec(&body).map_err(|e| e.to_string())?),
            )
        }
        PolymarketClobAction::CancelMultipleOrders { order_ids } => (
            "DELETE",
            "/orders".to_string(),
            Some(serde_json::to_vec(&order_ids).map_err(|e| e.to_string())?),
        ),
        PolymarketClobAction::CancelOrdersForMarket { market, asset_id } => {
            let body = json!({ "market": market, "asset_id": asset_id });
            (
                "DELETE",
                "/cancel-market-orders".to_string(),
                Some(serde_json::to_vec(&body).map_err(|e| e.to_string())?),
            )
        }
        PolymarketClobAction::CancelAllOrders => (
            "DELETE",
            "/cancel-all".to_string(),
            None,
        ),
        PolymarketClobAction::GetUserTrades {
            market,
            next_cursor,
        } => {
            let q = http::build_query(&[
                ("market", market.as_deref()),
                ("next_cursor", next_cursor.as_deref()),
            ]);
            let path = if q.is_empty() {
                "/data/trades".to_string()
            } else {
                format!("/data/trades?{q}")
            };
            ("GET", path, None)
        }
        PolymarketClobAction::SendHeartbeat => (
            "POST",
            "/heartbeat".to_string(),
            None,
        ),
    };

    let url = format!("https://{}{}", http::CLOB_HOST, path);
    http::request(method, &url, body.as_deref())
}

fn url_encode_segment(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            _ => {
                let _ = std::fmt::Write::write_fmt(&mut out, format_args!("%{:02X}", byte));
            }
        }
    }
    out
}

export!(PolymarketClobTool);

#[cfg(test)]
mod tests {
    use super::*;
    use crate::exports::near::agent::tool::Guest as _;

    #[test]
    fn schema_round_trips_through_action_enum() {
        let schema_str = PolymarketClobTool::schema();
        let parsed: serde_json::Value = serde_json::from_str(&schema_str).unwrap();
        assert!(parsed.is_object(), "schema must be a JSON object");
    }

    #[test]
    fn cancel_order_dispatches_to_delete_with_body() {
        let params = serde_json::json!({
            "action": "cancel_order",
            "order_id": "0xdead"
        });
        let action: PolymarketClobAction = serde_json::from_value(params).unwrap();
        let body_json = match action {
            PolymarketClobAction::CancelOrder { order_id } => {
                serde_json::json!({ "orderID": order_id })
            }
            _ => panic!("expected CancelOrder"),
        };
        assert_eq!(body_json["orderID"], "0xdead");
    }

    #[test]
    fn get_user_orders_omits_empty_query_params() {
        let action: PolymarketClobAction = serde_json::from_str(r#"{"action":"get_user_orders"}"#).unwrap();
        match action {
            PolymarketClobAction::GetUserOrders {
                market,
                asset_id,
                next_cursor,
            } => {
                assert!(market.is_none());
                assert!(asset_id.is_none());
                assert!(next_cursor.is_none());
                let q = http::build_query(&[
                    ("market", market.as_deref()),
                    ("id", asset_id.as_deref()),
                    ("next_cursor", next_cursor.as_deref()),
                ]);
                assert!(q.is_empty());
            }
            _ => panic!("expected GetUserOrders"),
        }
    }

    #[test]
    fn url_encode_segment_escapes_path_special_chars() {
        assert_eq!(url_encode_segment("0x1a/b"), "0x1a%2Fb");
        assert_eq!(url_encode_segment("hello world"), "hello%20world");
    }
}
