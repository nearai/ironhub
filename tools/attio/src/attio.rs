use crate::near::agent::host;

pub const API_BASE: &str = "https://api.attio.com";
pub const SECRET_NAME: &str = "attio_api_key";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists(SECRET_NAME) {
        Ok(())
    } else {
        Err(
            "Attio API key not configured. Generate a key under Workspace Settings > Developers \
             and store it as the secret `attio_api_key`."
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

pub fn request(
    method: &str,
    endpoint: &str,
    body: Option<&str>,
) -> Result<(u16, serde_json::Value), String> {
    let url = format!("{}{}", API_BASE, endpoint);
    let headers = if body.is_some() {
        r#"{"Content-Type": "application/json"}"#
    } else {
        "{}"
    };
    let body_bytes = body.map(|b| b.as_bytes().to_vec());

    host::log(
        host::LogLevel::Debug,
        &format!("Attio API: {} {}", method, endpoint),
    );

    let response = host::http_request(method, &url, headers, body_bytes.as_deref(), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Attio response: {}", e))?;

    if response.status == 429 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Attio rate limit (429). Reads are capped near 100/s and writes near 25/s; \
             retry after a short delay. Detail: {}",
            reason
        ));
    }

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Attio API returned {}: {}",
            response.status, reason
        ));
    }

    if body_text.is_empty() {
        return Ok((response.status, serde_json::Value::Null));
    }

    let parsed =
        serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Attio: {}", e))?;
    Ok((response.status, parsed))
}

fn extract_error(body: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    let status_code = v.get("status_code").and_then(|s| s.as_u64());
    let error_type = v.get("type").and_then(|t| t.as_str()).unwrap_or("");
    let code = v.get("code").and_then(|c| c.as_str()).unwrap_or("");
    let message = v.get("message").and_then(|m| m.as_str()).unwrap_or("");

    let mut parts: Vec<String> = Vec::new();
    if let Some(sc) = status_code {
        parts.push(format!("status_code {}", sc));
    }
    if !error_type.is_empty() {
        parts.push(format!("type {}", error_type));
    }
    if !code.is_empty() {
        parts.push(format!("code {}", code));
    }
    if !message.is_empty() {
        parts.push(message.to_string());
    }
    if parts.is_empty() {
        None
    } else {
        Some(parts.join(", "))
    }
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
        assert_eq!(url_encode("a b/c?d=e&f"), "a%20b%2Fc%3Fd%3De%26f");
    }

    #[test]
    fn url_encode_handles_unicode_bytes() {
        assert_eq!(url_encode("é"), "%C3%A9");
    }

    #[test]
    fn append_query_first_uses_question_mark() {
        let mut url = String::from("/v2/notes");
        append_query(&mut url, "limit", "25");
        assert_eq!(url, "/v2/notes?limit=25");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/v2/notes?limit=25");
        append_query(&mut url, "parent_object", "people");
        assert_eq!(url, "/v2/notes?limit=25&parent_object=people");
    }

    #[test]
    fn extract_error_combines_status_type_and_message() {
        let body = r#"{"status_code":404,"type":"not_found","code":"record_not_found","message":"Record does not exist"}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("status_code 404"));
        assert!(extracted.contains("type not_found"));
        assert!(extracted.contains("code record_not_found"));
        assert!(extracted.contains("Record does not exist"));
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"data":[]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("not json").is_none());
    }
}
