use crate::near::agent::host;

pub const API_KEY_SECRET: &str = "request_finance_api_key";
const API_BASE: &str = "https://api.request.finance";

pub fn require_api_key() -> Result<(), String> {
    if host::secret_exists(API_KEY_SECRET) {
        Ok(())
    } else {
        Err(format!(
            "Request Finance API key not configured. Store it as the secret `{}`.",
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

pub fn bool_param(value: bool) -> &'static str {
    if value {
        "true"
    } else {
        "false"
    }
}

pub fn get(endpoint: &str) -> Result<serde_json::Value, String> {
    require_api_key()?;
    let url = format!("{}{}", API_BASE, endpoint);

    host::log(
        host::LogLevel::Debug,
        &format!("Request Finance: GET {}", url),
    );

    let response = host::http_request("GET", &url, &build_headers()?, None, None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Request Finance response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Request Finance API returned {}: {}",
            response.status, reason
        ));
    }
    if body_text.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&body_text)
        .map_err(|e| format!("Invalid JSON from Request Finance: {}", e))
}

fn build_headers() -> Result<String, String> {
    let mut map = serde_json::Map::new();
    map.insert(
        "Accept".into(),
        serde_json::Value::String("application/json".to_string()),
    );
    map.insert(
        "Content-Type".into(),
        serde_json::Value::String("application/json".to_string()),
    );
    serde_json::to_string(&serde_json::Value::Object(map))
        .map_err(|e| format!("Failed to serialize headers: {}", e))
}

fn extract_error(body: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(body).ok()?;
    if let Some(text) = value.get("message").and_then(message_text) {
        return Some(text);
    }
    let text = value.get("error").and_then(|entry| entry.as_str())?;
    if text.is_empty() {
        None
    } else {
        Some(text.to_string())
    }
}

fn message_text(entry: &serde_json::Value) -> Option<String> {
    if let Some(text) = entry.as_str() {
        return if text.is_empty() {
            None
        } else {
            Some(text.to_string())
        };
    }
    let parts: Vec<String> = entry
        .as_array()?
        .iter()
        .filter_map(|item| item.as_str())
        .map(|item| item.to_string())
        .collect();
    if parts.is_empty() {
        None
    } else {
        Some(parts.join("; "))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn require_non_empty_rejects_blank() {
        assert!(require_non_empty("  ", "id").is_err());
        assert!(require_non_empty("inv-1", "id").is_ok());
    }

    #[test]
    fn url_encode_preserves_unreserved() {
        assert_eq!(url_encode("abcXYZ123-_.~"), "abcXYZ123-_.~");
    }

    #[test]
    fn url_encode_percent_escapes_reserved() {
        assert_eq!(url_encode("acme corp/1"), "acme%20corp%2F1");
    }

    #[test]
    fn append_query_first_uses_question_mark() {
        let mut url = String::from("/invoices");
        append_query(&mut url, "take", "25");
        assert_eq!(url, "/invoices?take=25");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/invoices?take=25");
        append_query(&mut url, "skip", "50");
        assert_eq!(url, "/invoices?take=25&skip=50");
    }

    #[test]
    fn bool_param_wire_values() {
        assert_eq!(bool_param(true), "true");
        assert_eq!(bool_param(false), "false");
    }

    #[test]
    fn build_headers_sets_json_accept_and_content_type() {
        let headers = build_headers().unwrap();
        assert!(headers.contains("Accept"));
        assert!(headers.contains("Content-Type"));
        assert!(headers.contains("application/json"));
    }

    #[test]
    fn build_headers_never_carries_authorization() {
        assert!(!build_headers().unwrap().contains("Authorization"));
    }

    #[test]
    fn extract_error_reads_string_message() {
        let body = r#"{"statusCode":401,"message":"Unauthorized"}"#;
        assert_eq!(extract_error(body).unwrap(), "Unauthorized");
    }

    #[test]
    fn extract_error_joins_message_array() {
        let body = r#"{"statusCode":400,"message":["take must not be greater than 100","skip must be an integer"]}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("take must not be greater than 100"));
        assert!(extracted.contains("skip must be an integer"));
    }

    #[test]
    fn extract_error_falls_back_to_error_field() {
        assert_eq!(
            extract_error(r#"{"error":"Not Found"}"#).unwrap(),
            "Not Found"
        );
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"invoices":[]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("<html>502</html>").is_none());
    }
}
