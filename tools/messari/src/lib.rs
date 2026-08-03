//! Messari WASM Tool for Ironclaw.
//!
//! Accesses the Messari Crypto API (<https://api.messari.io>) to provide
//! comprehensive crypto market data, token unlocks, fundraising, news, research,
//! protocol metrics, and Messari AI query synthesis.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{json, Value};

const BASE_URL: &str = "https://api.messari.io";
const HTTP_TIMEOUT_MS: u32 = 30_000;
const MAX_RETRIES: u32 = 2;

struct MessariTool;

impl exports::near::agent::tool::Guest for MessariTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        #[cfg(feature = "reborn")]
        let result = execute_reborn(&req.params, req.context.as_deref());
        #[cfg(not(feature = "reborn"))]
        let result = execute_inner(&req.params);

        match result.and_then(encode_guest_output) {
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
        SCHEMA.to_string()
    }

    fn description() -> String {
        "Messari crypto intelligence tool providing access to market data, prices, news, \
         token unlocks, VC fundraising, DeFi TVL, network activity, analyst research, \
         and Messari AI query synthesis. \
         Rate limit: 150 requests/minute. \
         Note: The 'ask_ai' action is limited to 10 requests/day for standard/free Messari API key tiers; \
         prefer specific structured actions ('metrics', 'news', 'token_unlocks', 'fundraising') when applicable."
            .to_string()
    }
}

#[cfg(feature = "reborn")]
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ToolContext {
    capability_id: String,
}

#[cfg(feature = "reborn")]
fn execute_reborn(params: &str, context: Option<&str>) -> Result<String, String> {
    let context = context.ok_or_else(|| "missing_invocation_context".to_string())?;
    let context: ToolContext =
        serde_json::from_str(context).map_err(|_| "invalid_invocation_context".to_string())?;
    let operation = match context.capability_id.as_str() {
        "messari.ask_ai" => "ask_ai",
        "messari.metrics" => "metrics",
        "messari.signal" => "signal",
        "messari.news" => "news",
        "messari.research" => "research",
        "messari.stablecoins" => "stablecoins",
        "messari.exchanges" => "exchanges",
        "messari.networks" => "networks",
        "messari.protocols" => "protocols",
        "messari.token_unlocks" => "token_unlocks",
        "messari.fundraising" => "fundraising",
        "messari.intel" => "intel",
        "messari.topics" => "topics",
        "messari.x_users" => "x_users",
        _ => return Err("unsupported_capability".to_string()),
    };
    let mut params: serde_json::Value =
        serde_json::from_str(params).map_err(|_| "invalid_parameters".to_string())?;
    let object = params
        .as_object_mut()
        .ok_or_else(|| "invalid_parameters".to_string())?;
    if object.contains_key("action") {
        return Err("public_selector_is_not_allowed".to_string());
    }
    object.insert(
        "action".to_string(),
        serde_json::Value::String(operation.to_string()),
    );
    execute_inner(&params.to_string())
}

export!(MessariTool);

fn encode_guest_output(output: String) -> Result<String, String> {
    serde_json::to_string(&output).map_err(|_| "tool_output_encode_failed".to_string())
}

#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    AskAi {
        prompt: String,
    },
    Metrics {
        #[serde(default)]
        asset_key: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    Signal {
        #[serde(default)]
        asset_key: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    News {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    Research {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    Stablecoins {
        #[serde(default)]
        limit: Option<u32>,
    },
    Exchanges {
        #[serde(default)]
        exchange_id: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    Networks {
        #[serde(default)]
        network_id: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    Protocols {
        #[serde(default)]
        protocol_id: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    TokenUnlocks {
        #[serde(default)]
        asset_key: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    Fundraising {
        #[serde(default)]
        category: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    Intel {
        #[serde(default)]
        asset_key: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
    Topics {
        #[serde(default)]
        limit: Option<u32>,
    },
    XUsers {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
    },
}

fn execute_inner(params_json: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params_json)
        .map_err(|e| format!("Failed to parse request parameters: {e}"))?;

    let resp_val = match action {
        Action::AskAi { prompt } => {
            let body = json!({
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            });
            post_request("/ai/v2/chat/completions", &body)?
        }
        Action::Metrics { asset_key, limit } => {
            let path = match asset_key {
                Some(key) => format!("/metrics/v1/assets/{}", key.trim()),
                None => format!("/metrics/v1/assets?limit={}", limit.unwrap_or(20)),
            };
            get_request(&path)?
        }
        Action::Signal { asset_key, limit } => {
            let path = match asset_key {
                Some(key) => format!("/signal/v1/assets/{}", key.trim()),
                None => format!("/signal/v1/assets?limit={}", limit.unwrap_or(20)),
            };
            get_request(&path)?
        }
        Action::News { query, limit } => {
            let limit_val = limit.unwrap_or(20);
            let path = match query {
                Some(q) => format!("/news/v1/news/feed?query={}&limit={}", q.trim(), limit_val),
                None => format!("/news/v1/news/feed?limit={}", limit_val),
            };
            get_request(&path)?
        }
        Action::Research { query, limit } => {
            let limit_val = limit.unwrap_or(20);
            let path = match query {
                Some(q) => format!(
                    "/research/v1/reports?query={}&limit={}",
                    q.trim(),
                    limit_val
                ),
                None => format!("/research/v1/reports?limit={}", limit_val),
            };
            get_request(&path)?
        }
        Action::Stablecoins { limit } => {
            let path = format!("/stablecoins/v1/assets?limit={}", limit.unwrap_or(20));
            get_request(&path)?
        }
        Action::Exchanges { exchange_id, limit } => {
            let path = match exchange_id {
                Some(id) => format!("/exchanges/v1/exchanges/{}", id.trim()),
                None => format!("/exchanges/v1/exchanges?limit={}", limit.unwrap_or(20)),
            };
            get_request(&path)?
        }
        Action::Networks { network_id, limit } => {
            let path = match network_id {
                Some(id) => format!("/networks/v1/networks/{}", id.trim()),
                None => format!("/networks/v1/networks?limit={}", limit.unwrap_or(20)),
            };
            get_request(&path)?
        }
        Action::Protocols { protocol_id, limit } => {
            let path = match protocol_id {
                Some(id) => format!("/protocols/v1/protocols/{}", id.trim()),
                None => format!("/protocols/v1/protocols?limit={}", limit.unwrap_or(20)),
            };
            get_request(&path)?
        }
        Action::TokenUnlocks { asset_key, limit } => {
            let limit_val = limit.unwrap_or(20);
            let path = match asset_key {
                Some(key) => format!("/token-unlocks/v1/assets/{}", key.trim()),
                None => format!("/token-unlocks/v1/assets?limit={}", limit_val),
            };
            get_request(&path)?
        }
        Action::Fundraising { category, limit } => {
            let limit_val = limit.unwrap_or(20);
            let path = match category {
                Some(cat) => format!(
                    "/funding/v1/rounds?category={}&limit={}",
                    cat.trim(),
                    limit_val
                ),
                None => format!("/funding/v1/rounds?limit={}", limit_val),
            };
            get_request(&path)?
        }
        Action::Intel { asset_key, limit } => {
            let limit_val = limit.unwrap_or(20);
            let path = match asset_key {
                Some(key) => format!("/intel/v1/events?asset={}&limit={}", key.trim(), limit_val),
                None => format!("/intel/v1/events?limit={}", limit_val),
            };
            get_request(&path)?
        }
        Action::Topics { limit } => {
            let path = format!("/topics/v1/topics?limit={}", limit.unwrap_or(20));
            get_request(&path)?
        }
        Action::XUsers { query, limit } => {
            let limit_val = limit.unwrap_or(20);
            let path = match query {
                Some(q) => format!("/x-users/v1/users?query={}&limit={}", q.trim(), limit_val),
                None => format!("/x-users/v1/users?limit={}", limit_val),
            };
            get_request(&path)?
        }
    };

    Ok(to_yaml(&resp_val))
}

fn get_request(path: &str) -> Result<Value, String> {
    let url = format!("{BASE_URL}{path}");
    let headers = json!({
        "Accept": "application/json",
        "User-Agent": "Ironclaw-Messari-Tool/0.1"
    });
    request("GET", &url, &headers.to_string(), None)
}

fn post_request(path: &str, body: &Value) -> Result<Value, String> {
    let url = format!("{BASE_URL}{path}");
    let headers = json!({
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Ironclaw-Messari-Tool/0.1"
    });
    let body_bytes =
        serde_json::to_vec(body).map_err(|e| format!("Failed to serialize request body: {e}"))?;
    request("POST", &url, &headers.to_string(), Some(body_bytes))
}

fn request(method: &str, url: &str, headers: &str, body: Option<Vec<u8>>) -> Result<Value, String> {
    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        let resp = near::agent::host::http_request(
            method,
            url,
            headers,
            body.as_deref(),
            Some(HTTP_TIMEOUT_MS),
        )
        .map_err(|e| format!("HTTP request failed: {e}"))?;

        if (200..300).contains(&resp.status) {
            break resp;
        }

        if attempt < MAX_RETRIES && (resp.status == 429 || resp.status >= 500) {
            near::agent::host::log(
                near::agent::host::LogLevel::Warn,
                &format!(
                    "Messari {method} {url} returned status {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        return Err(sanitize_error(resp.status, &resp.body));
    };

    let text =
        String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Failed to parse JSON response: {e}"))
}

fn sanitize_error(status: u16, body: &[u8]) -> String {
    let detail = serde_json::from_slice::<Value>(body)
        .ok()
        .and_then(|v| {
            v.get("error")
                .or_else(|| v.get("message"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| String::from_utf8_lossy(body).chars().take(200).collect());

    format!("Messari API error (HTTP {status}): {detail}")
}

fn prune_value(val: &mut Value) {
    match val {
        Value::Object(map) => {
            map.retain(|_, v| !v.is_null());
            for v in map.values_mut() {
                prune_value(v);
            }
        }
        Value::Array(arr) => {
            for v in arr.iter_mut() {
                prune_value(v);
            }
        }
        _ => {}
    }
}

fn json_to_yaml(value: &Value, indent_level: usize) -> String {
    let indent = "  ".repeat(indent_level);
    match value {
        Value::Null => "null\n".to_string(),
        Value::Bool(b) => format!("{b}\n"),
        Value::Number(n) => format!("{n}\n"),
        Value::String(s) => {
            if s.contains('\n') {
                let mut out = "|\n".to_string();
                for line in s.lines() {
                    out.push_str(&format!("{}  {}\n", indent, line));
                }
                out
            } else if s.is_empty() {
                "\"\"\n".to_string()
            } else if s.contains(':')
                || s.contains('{')
                || s.contains('}')
                || s.contains('[')
                || s.contains(']')
                || s.starts_with('-')
                || s.starts_with('#')
                || s.starts_with('*')
                || s.contains('"')
                || s.contains('\'')
            {
                format!("\"{}\"\n", s.replace('\\', "\\\\").replace('"', "\\\""))
            } else {
                format!("{s}\n")
            }
        }
        Value::Array(arr) => {
            if arr.is_empty() {
                "[]\n".to_string()
            } else {
                let mut out = "\n".to_string();
                for item in arr {
                    out.push_str(&format!("{}- ", indent));
                    let val_str = json_to_yaml(item, indent_level + 1);
                    if val_str.starts_with('\n') {
                        out.push_str(&val_str[1..]);
                    } else {
                        out.push_str(&val_str);
                    }
                }
                out
            }
        }
        Value::Object(map) => {
            if map.is_empty() {
                "{}\n".to_string()
            } else {
                let mut out = "\n".to_string();
                for (k, v) in map {
                    out.push_str(&format!("{}{}: ", indent, k));
                    let val_str = json_to_yaml(v, indent_level + 1);
                    if val_str.starts_with('\n') {
                        out.push_str(&val_str[1..]);
                    } else {
                        out.push_str(&val_str);
                    }
                }
                out
            }
        }
    }
}

fn to_yaml(value: &Value) -> String {
    let mut cloned = value.clone();
    prune_value(&mut cloned);
    let yaml_str = json_to_yaml(&cloned, 0);
    if yaml_str.starts_with('\n') {
        yaml_str[1..].to_string()
    } else {
        yaml_str
    }
}

const SCHEMA: &str = r#"{
  "type": "object",
  "required": ["action"],
  "oneOf": [
    {
      "description": "Send open-ended query to Messari AI assistant (/ai/v2/chat/completions). Use for synthesis across crypto data. Note: Standard API keys have a 10 requests/day quota limit.",
      "properties": {
        "action": { "const": "ask_ai" },
        "prompt": {
          "type": "string",
          "description": "Natural language crypto research query or question for Messari AI synthesis."
        }
      },
      "required": ["action", "prompt"]
    },
    {
      "description": "Fetch asset price, volume, market cap, ROI, ATH, and market metrics (/metrics/v1/assets). Use when asked 'what is the price/market cap of X'.",
      "properties": {
        "action": { "const": "metrics" },
        "asset_key": {
          "type": "string",
          "description": "Optional asset key or slug (e.g. 'bitcoin', 'ethereum', 'solana'). Omit to list top assets."
        },
        "limit": {
          "type": "integer",
          "description": "Max items to return (default 20, max 100)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch sentiment, token mindshare, social volume, and trending social buzz (/signal/v1/assets).",
      "properties": {
        "action": { "const": "signal" },
        "asset_key": {
          "type": "string",
          "description": "Optional asset key (e.g., 'solana'). Omit for top trending tokens."
        },
        "limit": {
          "type": "integer",
          "description": "Max items to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch breaking crypto news feed, headlines, regulatory news, and events (/news/v1/news/feed).",
      "properties": {
        "action": { "const": "news" },
        "query": {
          "type": "string",
          "description": "Optional keyword search filter (e.g., 'regulation', 'sec', 'ethereum')."
        },
        "limit": {
          "type": "integer",
          "description": "Max news items to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch Messari analyst research reports, sector overviews, and deep dives (/research/v1/reports).",
      "properties": {
        "action": { "const": "research" },
        "query": {
          "type": "string",
          "description": "Optional report topic or keyword search (e.g., 'DePIN', 'L2', 'restaking')."
        },
        "limit": {
          "type": "integer",
          "description": "Max reports to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch stablecoin supply breakdown, peg stability, and multi-chain flows (/stablecoins/v1/assets).",
      "properties": {
        "action": { "const": "stablecoins" },
        "limit": {
          "type": "integer",
          "description": "Max stablecoin assets to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch exchange volumes, orderbook trading pairs, and exchange comparisons (/exchanges/v1/exchanges).",
      "properties": {
        "action": { "const": "exchanges" },
        "exchange_id": {
          "type": "string",
          "description": "Optional exchange ID (e.g. 'binance', 'coinbase'). Omit to list top exchanges."
        },
        "limit": {
          "type": "integer",
          "description": "Max items to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch L1/L2 network metrics, transaction count, active addresses, and fee stats (/networks/v1/networks).",
      "properties": {
        "action": { "const": "networks" },
        "network_id": {
          "type": "string",
          "description": "Optional network ID (e.g. 'ethereum', 'solana', 'arbitrum')."
        },
        "limit": {
          "type": "integer",
          "description": "Max items to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch DeFi protocol stats, Total Value Locked (TVL), lending volume, and DEX share (/protocols/v1/protocols).",
      "properties": {
        "action": { "const": "protocols" },
        "protocol_id": {
          "type": "string",
          "description": "Optional protocol ID (e.g. 'aave', 'uniswap', 'lido')."
        },
        "limit": {
          "type": "integer",
          "description": "Max items to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch upcoming token unlocks, vesting schedules, cliff dates, and allocations (/token-unlocks/v1/assets).",
      "properties": {
        "action": { "const": "token_unlocks" },
        "asset_key": {
          "type": "string",
          "description": "Optional asset key (e.g. 'arbitrum', 'aptos', 'sui'). Omit to list upcoming unlocks."
        },
        "limit": {
          "type": "integer",
          "description": "Max unlock schedules to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch crypto fundraising rounds, lead investors, VC activity, and deal terms (/funding/v1/rounds).",
      "properties": {
        "action": { "const": "fundraising" },
        "category": {
          "type": "string",
          "description": "Optional funding category filter (e.g., 'DeFi', 'Infrastructure', 'Gaming', 'AI')."
        },
        "limit": {
          "type": "integer",
          "description": "Max funding rounds to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch protocol governance events, upgrade trackers, and vote proposals (/intel/v1/events).",
      "properties": {
        "action": { "const": "intel" },
        "asset_key": {
          "type": "string",
          "description": "Optional asset key (e.g., 'aave', 'uniswap')."
        },
        "limit": {
          "type": "integer",
          "description": "Max governance events to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch crypto topic momentum, trending sector narratives, and ecosystem themes (/topics/v1/topics).",
      "properties": {
        "action": { "const": "topics" },
        "limit": {
          "type": "integer",
          "description": "Max topics to return (default 20)."
        }
      },
      "required": ["action"]
    },
    {
      "description": "Fetch metrics and profiles for crypto influencers and X/Twitter accounts (/x-users/v1/users).",
      "properties": {
        "action": { "const": "x_users" },
        "query": {
          "type": "string",
          "description": "Optional query or handle filter."
        },
        "limit": {
          "type": "integer",
          "description": "Max user items to return (default 20)."
        }
      },
      "required": ["action"]
    }
  ]
}"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_valid_json() -> Result<(), String> {
        let v: Value =
            serde_json::from_str(SCHEMA).map_err(|e| format!("Schema is not valid JSON: {e}"))?;

        let required = v.get("required").and_then(Value::as_array);
        if required.is_none() {
            return Err("Schema missing required field".to_string());
        }
        Ok(())
    }

    #[test]
    fn test_action_deserialization() -> Result<(), String> {
        let raw = r#"{"action": "ask_ai", "prompt": "What is Messari?"}"#;
        let act: Action =
            serde_json::from_str(raw).map_err(|e| format!("Action deserialization failed: {e}"))?;
        match act {
            Action::AskAi { prompt } => {
                if prompt != "What is Messari?" {
                    return Err("Prompt mismatch".to_string());
                }
            }
            _ => return Err("Expected AskAi action".to_string()),
        }
        Ok(())
    }

    #[test]
    fn test_to_yaml_conversion() -> Result<(), String> {
        let json_data = json!({
            "status": "success",
            "data": {
                "id": "bitcoin",
                "symbol": "BTC",
                "price_usd": 65000.50,
                "null_field": null
            }
        });
        let yaml_str = to_yaml(&json_data);
        if yaml_str.contains("null_field") {
            return Err("Pruning failed, null field found in YAML".to_string());
        }
        if !yaml_str.contains("symbol: BTC") {
            return Err("YAML output missing symbol".to_string());
        }
        Ok(())
    }
}
