use crate::near::agent::host;

pub const API_BASE: &str = "https://api.hubapi.com";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists("hubspot_private_app_token") {
        Ok(())
    } else {
        Err(
            "HubSpot Private App token not configured. Create a Private App in HubSpot with the \
             required CRM read scopes and store the access token as the secret \
             `hubspot_private_app_token`."
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
        r#"{"Content-Type": "application/json; charset=utf-8"}"#
    } else {
        "{}"
    };
    let body_bytes = body.map(|b| b.as_bytes().to_vec());

    host::log(
        host::LogLevel::Debug,
        &format!("HubSpot API: {} {}", method, endpoint),
    );

    let response = host::http_request(method, &url, headers, body_bytes.as_deref(), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in HubSpot response: {}", e))?;

    if response.status == 429 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "HubSpot rate limit (429). The Search API is approximately 5 requests per second; \
             retry shortly. Detail: {}",
            reason
        ));
    }

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "HubSpot API returned {}: {}",
            response.status, reason
        ));
    }

    if body_text.is_empty() {
        return Ok((response.status, serde_json::Value::Null));
    }

    let parsed = serde_json::from_str(&body_text)
        .map_err(|e| format!("Invalid JSON from HubSpot: {}", e))?;
    Ok((response.status, parsed))
}

fn extract_error(body: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    let status = v.get("status").and_then(|s| s.as_str()).unwrap_or("");
    let category = v.get("category").and_then(|c| c.as_str()).unwrap_or("");
    let message = v.get("message").and_then(|m| m.as_str()).unwrap_or("");
    let correlation_id = v
        .get("correlationId")
        .and_then(|c| c.as_str())
        .unwrap_or("");

    let mut parts: Vec<String> = Vec::new();
    if !status.is_empty() {
        parts.push(format!("status {}", status));
    }
    if !category.is_empty() {
        parts.push(format!("category {}", category));
    }
    if !message.is_empty() {
        parts.push(message.to_string());
    }
    if !correlation_id.is_empty() {
        parts.push(format!("correlationId {}", correlation_id));
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
        let mut url = String::from("/crm/v3/objects/contacts");
        append_query(&mut url, "limit", "25");
        assert_eq!(url, "/crm/v3/objects/contacts?limit=25");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/crm/v3/objects/contacts?limit=25");
        append_query(&mut url, "properties", "email,firstname");
        assert_eq!(
            url,
            "/crm/v3/objects/contacts?limit=25&properties=email%2Cfirstname"
        );
    }

    #[test]
    fn extract_error_combines_status_message_and_correlation() {
        let body = r#"{"status":"error","message":"Invalid input","category":"VALIDATION_ERROR","correlationId":"abc-123"}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("status error"));
        assert!(extracted.contains("category VALIDATION_ERROR"));
        assert!(extracted.contains("Invalid input"));
        assert!(extracted.contains("correlationId abc-123"));
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"results":[],"paging":{"next":{"after":"NXTQ"}}}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("not json").is_none());
    }
}
