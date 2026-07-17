//! Pikespeak NEAR Protocol indexer and wealth portfolio tracker tool for IronClaw.
//!
//! Exposes index queries and wealth portfolio assets mapping RHEA Lend and Rhea DEX.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;

const SECRET_NAME: &str = "pikespeak_api_key";
const HTTP_TIMEOUT_MS: u32 = 30_000;
const MAX_RETRIES: u32 = 3;

struct PikespeakTool;

impl exports::near::agent::tool::Guest for PikespeakTool {
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
        SCHEMA.to_string()
    }

    fn description() -> String {
        "Pikespeak is the on-chain data analytics and portfolio tracker designed for NEAR Protocol. \
         Supports querying native and token balances, transaction history, validator rewards/APY, \
         and portfolio details across NEAR Intents, RHEA Lend (burrow), Rhea DEX (ref) and many protocols on NEAR \
         Authentication uses 'pikespeak_api_key' injected as HTTP header 'x-api-key' by host. \
         Includes generic 'call_api' action to query any valid Pikespeak endpoint."
            .to_string()
    }
}

/// Tool actions. Selected via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    Balance {
        account: String,
    },
    Balances {
        accounts: String, // comma-separated
    },
    Wealth {
        account: String,
    },
    Transactions {
        account: String,
        #[serde(default)]
        offset: Option<String>,
        #[serde(default)]
        limit: Option<String>,
    },
    NearTransfer {
        account: String,
        #[serde(default)]
        offset: Option<String>,
        #[serde(default)]
        limit: Option<String>,
        #[serde(default)]
        minamount: Option<String>,
    },
    FtTransfer {
        account: String,
        #[serde(default)]
        offset: Option<String>,
        #[serde(default)]
        limit: Option<String>,
    },
    ValidatorsCurrent,
    ValidatorApy {
        validator: String,
    },
    TxDetails {
        tx_hash: String,
    },
    TokenStats {
        contract: String,
    },
    CallApi {
        path: String,
        #[serde(default)]
        query_params: Option<HashMap<String, String>>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid parameters: {e}. Provide an 'action' field (one of: balance, balances, \
             wealth, transactions, near_transfer, ft_transfer, validators_current, \
             validator_apy, tx_details, token_stats, call_api)."
        )
    })?;

    // Pre-flight: verify API key is declared in secrets
    if !near::agent::host::secret_exists(SECRET_NAME) {
        return Err(
            "Pikespeak API key not configured in capabilities. Run setup for the tool."
                .to_string(),
        );
    }

    let resp_val = match action {
        Action::Balance { account } => {
            get_json(&format!("/account/balance/{account}"), &[])?
        }
        Action::Balances { accounts } => {
            get_json("/account/balances", &[("accounts", Some(accounts))])?
        }
        Action::Wealth { account } => {
            get_json(&format!("/account/wealth/{account}"), &[])?
        }
        Action::Transactions { account, offset, limit } => {
            get_json(
                &format!("/account/transactions/{account}"),
                &[
                    ("offset", offset),
                    ("limit", limit),
                ],
            )?
        }
        Action::NearTransfer { account, offset, limit, minamount } => {
            get_json(
                &format!("/account/near-transfer/{account}"),
                &[
                    ("offset", offset),
                    ("limit", limit),
                    ("minamount", minamount),
                ],
            )?
        }
        Action::FtTransfer { account, offset, limit } => {
            get_json(
                &format!("/account/ft-transfer/{account}"),
                &[
                    ("offset", offset),
                    ("limit", limit),
                ],
            )?
        }
        Action::ValidatorsCurrent => {
            get_json("/validators/current", &[])?
        }
        Action::ValidatorApy { validator } => {
            get_json(&format!("/validators/apy/{validator}"), &[])?
        }
        Action::TxDetails { tx_hash } => {
            get_json(&format!("/tx/hash/{tx_hash}"), &[])?
        }
        Action::TokenStats { contract } => {
            get_json(&format!("/money/token-stats/{contract}"), &[])?
        }
        Action::CallApi { path, query_params } => {
            let mut query = Vec::new();
            if let Some(params_map) = query_params {
                for (k, v) in params_map {
                    query.push((k, Some(v)));
                }
            }
            let formatted_path = if path.starts_with('/') {
                path
            } else {
                format!("/{path}")
            };
            query.sort_by(|a, b| a.0.cmp(&b.0));
            let query_slices: Vec<(&str, Option<String>)> = query
                .iter()
                .map(|(k, v)| (k.as_str(), v.clone()))
                .collect();
            get_json(&formatted_path, &query_slices)?
        }
    };

    Ok(to_yaml(&resp_val))
}

// ==================== HTTP & Utility Helpers ====================

fn get_json(path: &str, query_params: &[(&str, Option<String>)]) -> Result<Value, String> {
    let base = "https://api.pikespeak.ai";

    let mut query_parts = Vec::new();
    for (k, v) in query_params {
        if let Some(val) = v {
            query_parts.push(format!("{}={}", k, url_encode(&val)));
        }
    }

    let url = if query_parts.is_empty() {
        format!("{base}{path}")
    } else {
        format!("{base}{path}?{}", query_parts.join("&"))
    };

    let headers = json!({
        "Accept": "application/json",
        "User-Agent": "IronClaw-Pikespeak-Tool/0.1"
    });

    request("GET", &url, &headers.to_string(), None)
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
                    "Pikespeak {method} {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        return Err(format!(
            "Pikespeak API returned HTTP error status {}. Response body: {}",
            resp.status,
            String::from_utf8_lossy(&resp.body)
        ));
    };

    let text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 response: {e}"))?;
    serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse Pikespeak response JSON: {e}"))
}

fn url_encode(s: &str) -> String {
    let mut encoded = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(b as char);
            }
            b' ' => {
                encoded.push('+');
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", b));
            }
        }
    }
    encoded
}

// ==================== YAML Formatter & Pruner ====================

fn prune_value(v: &mut Value) {
    match v {
        Value::Object(map) => {
            // Strip excessively verbose arrays to save tokens
            map.remove("num_expected_endorsements_per_shard");
            map.remove("num_produced_endorsements_per_shard");
            map.remove("num_expected_chunks_per_shard");
            map.remove("num_produced_chunks_per_shard");
            map.remove("shards_endorsed");
            map.remove("shards");

            for value in map.values_mut() {
                prune_value(value);
            }
        }
        Value::Array(arr) => {
            for value in arr {
                prune_value(value);
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

// ==================== JSON Schema ====================

const SCHEMA: &str = r#"{
  "type": "object",
  "required": ["action"],
  "oneOf": [
    {
      "properties": {
        "action": { "const": "balance" },
        "account": { "type": "string", "description": "The NEAR account ID (e.g. 'root.near')." }
      },
      "required": ["action", "account"]
    },
    {
      "properties": {
        "action": { "const": "balances" },
        "accounts": { "type": "string", "description": "Comma-separated list of NEAR account IDs (e.g. 'root.near')." }
      },
      "required": ["action", "accounts"]
    },
    {
      "properties": {
        "action": { "const": "wealth" },
        "account": { 
          "type": "string", 
          "description": "The NEAR account ID (e.g. 'root.near'). Fetches aggregated DeFi portfolio assets on RHEA Lend (burrow), Rhea DEX (ref), NEAR Intents (intentsBalances), and Rhea DEX locked liquidity (lockedRheaData)." 
        }
      },
      "required": ["action", "account"]
    },
    {
      "properties": {
        "action": { "const": "transactions" },
        "account": { "type": "string", "description": "The NEAR account ID." },
        "offset": { "type": "string", "description": "Query offset (default 0). Optional." },
        "limit": { "type": "string", "description": "Query limit (default 20). Optional." }
      },
      "required": ["action", "account"]
    },
    {
      "properties": {
        "action": { "const": "near_transfer" },
        "account": { "type": "string", "description": "The NEAR account ID." },
        "offset": { "type": "string", "description": "Query offset (default 0). Optional." },
        "limit": { "type": "string", "description": "Query limit (default 20). Optional." },
        "minamount": { "type": "string", "description": "Minimum transfer amount filters in yoctoNEAR. Optional." }
      },
      "required": ["action", "account"]
    },
    {
      "properties": {
        "action": { "const": "ft_transfer" },
        "account": { "type": "string", "description": "The NEAR account ID." },
        "offset": { "type": "string", "description": "Query offset (default 0). Optional." },
        "limit": { "type": "string", "description": "Query limit (default 20). Optional." }
      },
      "required": ["action", "account"]
    },
    {
      "properties": {
        "action": { "const": "validators_current" }
      },
      "required": ["action"]
    },
    {
      "properties": {
        "action": { "const": "validator_apy" },
        "validator": { "type": "string", "description": "The validator pool account ID (e.g. 'monterrey.pool.near')." }
      },
      "required": ["action", "validator"]
    },
    {
      "properties": {
        "action": { "const": "tx_details" },
        "tx_hash": { "type": "string", "description": "The transaction hash (e.g. '8p2s...')." }
      },
      "required": ["action", "tx_hash"]
    },
    {
      "properties": {
        "action": { "const": "token_stats" },
        "contract": { "type": "string", "description": "The token contract ID (e.g. 'wrap.near')." }
      },
      "required": ["action", "contract"]
    },
    {
      "properties": {
        "action": { "const": "call_api" },
        "path": { "type": "string", "description": "The exact Pikespeak path (e.g. '/daos/all' or '/election/total-votes')." },
        "query_params": {
          "type": "object",
          "description": "Optional key-value query parameters map.",
          "additionalProperties": { "type": "string" }
        }
      },
      "required": ["action", "path"]
    }
  ]
}"#;

export!(PikespeakTool);

// ==================== Unit Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_valid() -> Result<(), String> {
        let val: Value = serde_json::from_str(SCHEMA)
            .map_err(|e| format!("Schema must be valid JSON: {e}"))?;
        
        let type_val = val.get("type").ok_or("type missing")?;
        if type_val != "object" {
            return Err("Schema type must be object".to_string());
        }
        
        let one_of = val.get("oneOf").ok_or("oneOf missing")?.as_array().ok_or("oneOf not array")?;
        if one_of.len() != 11 {
            return Err(format!("Expected 11 actions, got {}", one_of.len()));
        }

        for (i, branch) in one_of.iter().enumerate() {
            let req = branch.get("required").ok_or(format!("branch {i} required missing"))?.as_array().ok_or("required not array")?;
            if req[0] != "action" {
                return Err(format!("branch {i} action must be first required"));
            }
        }
        Ok(())
    }

    #[test]
    fn test_url_encode() -> Result<(), String> {
        if url_encode("hello world") != "hello+world" {
            return Err("Space encoding failed".to_string());
        }
        if url_encode("root.near") != "root.near" {
            return Err("Standard domain should not change".to_string());
        }
        if url_encode("foo/bar") != "foo%2Fbar" {
            return Err("Slash encoding failed".to_string());
        }
        Ok(())
    }

    #[test]
    fn test_to_yaml_pruning() -> Result<(), String> {
        let test_json = json!({
            "account_id": "buildnear.poolv1.near",
            "shards_endorsed": [1, 2],
            "num_expected_endorsements_per_shard": [300],
            "stake": "9800",
            "nested": {
                "num_produced_endorsements_per_shard": [100],
                "fees": {
                    "numerator": 7
                }
            }
        });

        let yaml = to_yaml(&test_json);
        
        if yaml.contains("shards_endorsed") {
            return Err("Failed to prune shards_endorsed".to_string());
        }
        if yaml.contains("num_expected_endorsements_per_shard") {
            return Err("Failed to prune num_expected_endorsements_per_shard".to_string());
        }
        if yaml.contains("num_produced_endorsements_per_shard") {
            return Err("Failed to prune nested num_produced_endorsements_per_shard".to_string());
        }
        if !yaml.contains("account_id: buildnear.poolv1.near") {
            return Err("Lost account_id during yaml format".to_string());
        }
        if !yaml.contains("numerator: 7") {
            return Err("Lost nested numerator during yaml format".to_string());
        }

        Ok(())
    }
}
