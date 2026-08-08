use crate::near::agent::host;

pub const API_KEY_SECRET: &str = "juro_api_key";
const API_BASE: &str = "https://api.juro.com";

pub fn require_api_key() -> Result<(), String> {
    if host::secret_exists(API_KEY_SECRET) {
        Ok(())
    } else {
        Err(format!(
            "Juro API key not configured. Store it as the secret `{}`.",
            API_KEY_SECRET
        ))
    }
}

pub fn require_non_empty(value: &str, field: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("`{}` must not be empty", field));
    }
    Ok(())
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

pub fn get(endpoint: &str) -> Result<serde_json::Value, String> {
    require_api_key()?;
    let url = format!("{}{}", API_BASE, endpoint);

    host::log(host::LogLevel::Debug, &format!("Juro: GET {}", url));

    let response = host::http_request("GET", &url, &build_headers()?, None, None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Juro response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!("Juro API returned {}: {}", response.status, reason));
    }
    if body_text.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Juro: {}", e))
}

fn build_headers() -> Result<String, String> {
    let mut map = serde_json::Map::new();
    map.insert(
        "Accept".into(),
        serde_json::Value::String("application/json".to_string()),
    );
    serde_json::to_string(&serde_json::Value::Object(map))
        .map_err(|e| format!("Failed to serialize headers: {}", e))
}

fn extract_error(body: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(body).ok()?;
    for key in ["message", "error", "detail"] {
        let text = value
            .get(key)
            .and_then(|entry| entry.as_str())
            .unwrap_or("");
        if !text.is_empty() {
            return Some(text.to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn require_non_empty_rejects_blank() {
        assert!(require_non_empty("  ", "contract_id").is_err());
        assert!(require_non_empty("c-1", "contract_id").is_ok());
    }

    #[test]
    fn url_encode_preserves_unreserved() {
        assert_eq!(url_encode("abcXYZ123-_.~"), "abcXYZ123-_.~");
    }

    #[test]
    fn url_encode_percent_escapes_reserved() {
        assert_eq!(
            url_encode("2026-08-01T00:00:00Z"),
            "2026-08-01T00%3A00%3A00Z"
        );
    }

    #[test]
    fn append_query_first_uses_question_mark() {
        let mut url = String::from("/v3/contracts");
        append_query(&mut url, "limit", "50");
        assert_eq!(url, "/v3/contracts?limit=50");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/v3/contracts?limit=50");
        append_query(&mut url, "skip", "10");
        assert_eq!(url, "/v3/contracts?limit=50&skip=10");
    }

    #[test]
    fn build_headers_sets_accept_only() {
        let headers = build_headers().unwrap();
        assert!(headers.contains("Accept"));
        assert!(!headers.contains("x-api-key"));
        assert!(!headers.contains("Authorization"));
    }

    #[test]
    fn extract_error_reads_message_field() {
        assert_eq!(
            extract_error(r#"{"message":"Invalid API key"}"#).unwrap(),
            "Invalid API key"
        );
    }

    #[test]
    fn extract_error_falls_back_to_detail() {
        assert_eq!(
            extract_error(r#"{"detail":"Contract not found"}"#).unwrap(),
            "Contract not found"
        );
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"contracts":[]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("gateway error").is_none());
    }
}
