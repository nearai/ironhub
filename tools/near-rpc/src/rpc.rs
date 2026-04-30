use crate::near::agent::host;
use serde::Deserialize;
use serde_json::value::RawValue;

pub fn resolve_url(network: &str, custom: Option<&str>) -> String {
    if let Some(url) = custom {
        return url.to_string();
    }
    match network {
        "testnet" => "https://rpc.testnet.near.org".to_string(),
        _ => "https://rpc.mainnet.near.org".to_string(),
    }
}

#[derive(Deserialize)]
struct Envelope<'a> {
    #[serde(borrow, default)]
    result: Option<&'a RawValue>,
    #[serde(borrow, default)]
    error: Option<&'a RawValue>,
}

pub fn call(url: &str, method: &str, params: serde_json::Value) -> Result<String, String> {
    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": "ironclaw",
        "method": method,
        "params": params,
    });
    let body_str = serde_json::to_string(&body).map_err(|e| e.to_string())?;

    host::log(
        host::LogLevel::Debug,
        &format!("NEAR RPC: {} {}", method, url),
    );

    let resp = host::http_request(
        "POST",
        url,
        r#"{"Content-Type": "application/json"}"#,
        Some(body_str.as_bytes()),
        None,
    )?;

    let text = String::from_utf8(resp.body)
        .map_err(|e| format!("Invalid UTF-8 in RPC response: {}", e))?;

    if resp.status < 200 || resp.status >= 300 {
        return Err(format!("NEAR RPC returned HTTP {}: {}", resp.status, text));
    }

    let envelope: Envelope<'_> =
        serde_json::from_str(&text).map_err(|e| format!("Invalid JSON-RPC envelope: {}", e))?;

    if let Some(error) = envelope.error {
        return Err(format!("NEAR RPC error: {}", extract_error(error.get())));
    }

    let result = envelope
        .result
        .ok_or_else(|| "NEAR RPC response missing result".to_string())?;
    Ok(result.get().to_string())
}

fn extract_error(error_json: &str) -> String {
    let parsed: serde_json::Value = match serde_json::from_str(error_json) {
        Ok(v) => v,
        Err(_) => return error_json.to_string(),
    };
    if let Some(cause) = parsed.get("cause") {
        if let Some(info) = cause.get("info") {
            if let Some(msg) = info.get("error_message").and_then(|m| m.as_str()) {
                return msg.to_string();
            }
        }
        if let Some(name) = cause.get("name").and_then(|n| n.as_str()) {
            return name.to_string();
        }
    }
    if let Some(data) = parsed.get("data").and_then(|d| d.as_str()) {
        return data.to_string();
    }
    if let Some(msg) = parsed.get("message").and_then(|m| m.as_str()) {
        return msg.to_string();
    }
    error_json.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mainnet_default() {
        assert_eq!(resolve_url("mainnet", None), "https://rpc.mainnet.near.org");
    }

    #[test]
    fn testnet() {
        assert_eq!(resolve_url("testnet", None), "https://rpc.testnet.near.org");
    }

    #[test]
    fn custom_overrides_network() {
        assert_eq!(
            resolve_url("mainnet", Some("https://custom.rpc.example.com")),
            "https://custom.rpc.example.com"
        );
    }

    #[test]
    fn unknown_network_falls_back_to_mainnet() {
        assert_eq!(resolve_url("devnet", None), "https://rpc.mainnet.near.org");
    }

    #[test]
    fn error_with_cause_info() {
        let raw = r#"{
            "name": "HANDLER_ERROR",
            "cause": {
                "name": "UNKNOWN_ACCOUNT",
                "info": { "error_message": "account foo.near does not exist" }
            },
            "code": -32000,
            "message": "Server error"
        }"#;
        assert_eq!(extract_error(raw), "account foo.near does not exist");
    }

    #[test]
    fn error_with_cause_name_only() {
        let raw = r#"{ "cause": { "name": "UNKNOWN_BLOCK" }, "code": -32000, "message": "Server error" }"#;
        assert_eq!(extract_error(raw), "UNKNOWN_BLOCK");
    }

    #[test]
    fn error_falls_back_to_data() {
        let raw = r#"{ "code": -32000, "message": "Server error", "data": "Block not found" }"#;
        assert_eq!(extract_error(raw), "Block not found");
    }

    #[test]
    fn error_falls_back_to_message() {
        let raw = r#"{ "code": -32700, "message": "Parse error" }"#;
        assert_eq!(extract_error(raw), "Parse error");
    }

    #[test]
    fn error_unparseable_returns_raw() {
        assert_eq!(extract_error("not json"), "not json");
    }
}
