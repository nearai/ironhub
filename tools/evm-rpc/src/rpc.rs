use crate::near::agent::host;
use serde::Deserialize;
use serde_json::value::RawValue;

pub fn resolve_url(chain: Option<&str>, custom: Option<&str>) -> Result<String, String> {
    if let Some(url) = custom {
        return Ok(url.to_string());
    }
    let key = chain.unwrap_or("ethereum").to_lowercase();
    match key.as_str() {
        "ethereum" | "eth" | "mainnet" => Ok("https://ethereum-rpc.publicnode.com".into()),
        "polygon" | "matic" => Ok("https://polygon-bor-rpc.publicnode.com".into()),
        "arbitrum" | "arb" | "arbitrum-one" => Ok("https://arbitrum-one-rpc.publicnode.com".into()),
        "optimism" | "op" => Ok("https://optimism-rpc.publicnode.com".into()),
        "base" => Ok("https://base-rpc.publicnode.com".into()),
        "bnb" | "bsc" | "binance" => Ok("https://bsc-rpc.publicnode.com".into()),
        "avalanche" | "avax" => Ok("https://avalanche-c-chain-rpc.publicnode.com".into()),
        other => Err(format!(
            "unknown chain '{other}' (pass rpc_url for custom networks)"
        )),
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
        &format!("EVM RPC: {} {}", method, url),
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
        return Err(format!("EVM RPC returned HTTP {}: {}", resp.status, text));
    }

    let envelope: Envelope<'_> =
        serde_json::from_str(&text).map_err(|e| format!("Invalid JSON-RPC envelope: {}", e))?;

    if let Some(error) = envelope.error {
        return Err(format!("EVM RPC error: {}", extract_error(error.get())));
    }

    let result = envelope
        .result
        .ok_or_else(|| "EVM RPC response missing result".to_string())?;
    Ok(result.get().to_string())
}

fn extract_error(error_json: &str) -> String {
    let parsed: serde_json::Value = match serde_json::from_str(error_json) {
        Ok(v) => v,
        Err(_) => return error_json.to_string(),
    };
    if let Some(message) = parsed.get("message").and_then(|m| m.as_str()) {
        if let Some(data) = parsed.get("data").and_then(|d| d.as_str()) {
            return format!("{message} ({data})");
        }
        return message.to_string();
    }
    error_json.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_url_recognizes_known_chains() {
        assert_eq!(
            resolve_url(Some("ethereum"), None).unwrap(),
            "https://ethereum-rpc.publicnode.com"
        );
        assert_eq!(
            resolve_url(Some("Polygon"), None).unwrap(),
            "https://polygon-bor-rpc.publicnode.com"
        );
        assert_eq!(
            resolve_url(Some("arb"), None).unwrap(),
            "https://arbitrum-one-rpc.publicnode.com"
        );
        assert_eq!(
            resolve_url(Some("BSC"), None).unwrap(),
            "https://bsc-rpc.publicnode.com"
        );
    }

    #[test]
    fn resolve_url_defaults_to_ethereum() {
        assert_eq!(
            resolve_url(None, None).unwrap(),
            "https://ethereum-rpc.publicnode.com"
        );
    }

    #[test]
    fn resolve_url_prefers_custom_over_chain() {
        let custom = "https://my-private-rpc.example/eth";
        assert_eq!(resolve_url(Some("ethereum"), Some(custom)).unwrap(), custom);
    }

    #[test]
    fn resolve_url_rejects_unknown_chain_without_custom() {
        let err = resolve_url(Some("not-a-chain"), None).unwrap_err();
        assert!(err.contains("unknown chain"));
    }

    #[test]
    fn resolve_url_accepts_unknown_chain_with_custom() {
        assert_eq!(
            resolve_url(Some("not-a-chain"), Some("https://x.example")).unwrap(),
            "https://x.example"
        );
    }
}
