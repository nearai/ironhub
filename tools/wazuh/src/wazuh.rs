use crate::near::agent::host;

pub const INDEXER_BASE: &str = "https://wazuh-indexer.local:9200";
pub const SERVER_BASE: &str = "https://wazuh-api.local:55000";

pub fn require_indexer_password() -> Result<(), String> {
    if host::secret_exists("wazuh_indexer_password") {
        Ok(())
    } else {
        Err(
            "Wazuh indexer password not configured. Store it as the secret \
             `wazuh_indexer_password`."
                .to_string(),
        )
    }
}

pub fn require_api_password() -> Result<(), String> {
    if host::secret_exists("wazuh_api_password") {
        Ok(())
    } else {
        Err(
            "Wazuh server API password not configured. Store it as the secret \
             `wazuh_api_password`."
                .to_string(),
        )
    }
}

pub fn url_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char);
            }
            _ => {
                out.push('%');
                out.push(char::from(b"0123456789ABCDEF"[(b >> 4) as usize]));
                out.push(char::from(b"0123456789ABCDEF"[(b & 0xf) as usize]));
            }
        }
    }
    out
}

pub fn append_query(url: &mut String, name: &str, value: &str) {
    let separator = if url.contains('?') { '&' } else { '?' };
    url.push(separator);
    url.push_str(&url_encode(name));
    url.push('=');
    url.push_str(&url_encode(value));
}

pub fn http_call(
    method: &str,
    base: &str,
    endpoint: &str,
    body: Option<&str>,
    bearer: Option<&str>,
) -> Result<(u16, serde_json::Value), String> {
    let url = format!("{}{}", base, endpoint);
    let headers = build_headers(body.is_some(), bearer)?;
    let body_bytes = body.map(|b| b.as_bytes().to_vec());

    host::log(host::LogLevel::Debug, &format!("Wazuh: {} {}", method, url));

    let response = host::http_request(method, &url, &headers, body_bytes.as_deref(), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Wazuh response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Wazuh API returned {}: {}",
            response.status, reason
        ));
    }
    if body_text.is_empty() {
        return Ok((response.status, serde_json::Value::Null));
    }
    let parsed =
        serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Wazuh: {}", e))?;
    Ok((response.status, parsed))
}

pub fn authenticate_server_api() -> Result<String, String> {
    require_api_password()?;
    let (_, body) = http_call(
        "POST",
        SERVER_BASE,
        "/security/user/authenticate",
        None,
        None,
    )?;
    extract_jwt(&body)
}

pub fn extract_jwt(body: &serde_json::Value) -> Result<String, String> {
    body.get("data")
        .and_then(|d| d.get("token"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| {
            format!(
                "Wazuh server API authenticate response did not contain data.token: {}",
                body
            )
        })
}

fn build_headers(has_body: bool, bearer: Option<&str>) -> Result<String, String> {
    let mut map = serde_json::Map::new();
    if has_body {
        map.insert(
            "Content-Type".into(),
            serde_json::Value::String("application/json; charset=utf-8".to_string()),
        );
    }
    if let Some(token) = bearer {
        map.insert(
            "Authorization".into(),
            serde_json::Value::String(format!("Bearer {}", token)),
        );
    }
    serde_json::to_string(&serde_json::Value::Object(map))
        .map_err(|e| format!("Failed to serialize headers: {}", e))
}

fn extract_error(body: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    if let Some(s) = extract_opensearch_error(&v) {
        return Some(s);
    }
    extract_server_api_error(&v)
}

fn extract_opensearch_error(v: &serde_json::Value) -> Option<String> {
    let err = v.get("error")?;
    let reason = err.get("reason").and_then(|r| r.as_str())?;
    let typ = err.get("type").and_then(|t| t.as_str()).unwrap_or("");
    if typ.is_empty() {
        Some(reason.to_string())
    } else {
        Some(format!("{}: {}", typ, reason))
    }
}

fn extract_server_api_error(v: &serde_json::Value) -> Option<String> {
    let title = v.get("title").and_then(|t| t.as_str()).unwrap_or("");
    let detail = v.get("detail").and_then(|d| d.as_str()).unwrap_or("");
    if title.is_empty() && detail.is_empty() {
        return None;
    }
    let mut parts: Vec<&str> = Vec::new();
    if !title.is_empty() {
        parts.push(title);
    }
    if !detail.is_empty() {
        parts.push(detail);
    }
    Some(parts.join(": "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn url_encode_preserves_unreserved() {
        assert_eq!(url_encode("abcXYZ123-_.~"), "abcXYZ123-_.~");
    }

    #[test]
    fn url_encode_percent_escapes_reserved() {
        assert_eq!(url_encode("host name/01"), "host%20name%2F01");
    }

    #[test]
    fn append_query_first_uses_question_mark() {
        let mut url = String::from("/agents");
        append_query(&mut url, "status", "active");
        assert_eq!(url, "/agents?status=active");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/agents?status=active");
        append_query(&mut url, "limit", "100");
        assert_eq!(url, "/agents?status=active&limit=100");
    }

    #[test]
    fn build_headers_empty_when_no_body_and_no_bearer() {
        let h = build_headers(false, None).unwrap();
        assert_eq!(h, "{}");
    }

    #[test]
    fn build_headers_content_type_when_body() {
        let h = build_headers(true, None).unwrap();
        assert!(h.contains("Content-Type"));
        assert!(h.contains("application/json"));
        assert!(!h.contains("Authorization"));
    }

    #[test]
    fn build_headers_bearer_when_token() {
        let h = build_headers(false, Some("ey.J.W.T")).unwrap();
        assert!(h.contains("Authorization"));
        assert!(h.contains("Bearer ey.J.W.T"));
        assert!(!h.contains("Content-Type"));
    }

    #[test]
    fn build_headers_both_when_body_and_bearer() {
        let h = build_headers(true, Some("ey.J.W.T")).unwrap();
        assert!(h.contains("Content-Type"));
        assert!(h.contains("Bearer ey.J.W.T"));
    }

    #[test]
    fn extract_jwt_pulls_data_token() {
        let body = serde_json::json!({
            "data": { "token": "ey.X.Y.Z" },
            "message": "OK",
            "error": 0
        });
        assert_eq!(extract_jwt(&body).unwrap(), "ey.X.Y.Z");
    }

    #[test]
    fn extract_jwt_errors_when_missing() {
        let body = serde_json::json!({"message": "OK", "error": 0});
        assert!(extract_jwt(&body).is_err());
    }

    #[test]
    fn extract_error_indexer_shape() {
        let body = r#"{"error":{"type":"index_not_found_exception","reason":"no such index [wazuh-alerts-4.x-*]"},"status":404}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("index_not_found_exception"));
        assert!(extracted.contains("no such index"));
    }

    #[test]
    fn extract_error_server_api_shape() {
        let body = r#"{"title":"Permission denied","detail":"User does not have permission to read agents","code":4000}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("Permission denied"));
        assert!(extracted.contains("User does not have permission"));
    }

    #[test]
    fn extract_error_returns_none_for_success() {
        assert!(extract_error(r#"{"hits":{"total":{"value":0}}}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("not json").is_none());
    }
}
