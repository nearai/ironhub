use crate::near::agent::host;

pub const API_BASE: &str = "https://graph.facebook.com/v23.0";
pub const MESSAGING_PRODUCT: &str = "whatsapp";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists("whatsapp_access_token") {
        Ok(())
    } else {
        Err(
            "WhatsApp access token not configured. Provision a permanent System User token in \
             Meta Business Manager and store it as the secret `whatsapp_access_token`."
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
        &format!("WhatsApp API: {} {}", method, endpoint),
    );

    let response = host::http_request(method, &url, headers, body_bytes.as_deref(), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in WhatsApp response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "WhatsApp API returned {}: {}",
            response.status, reason
        ));
    }

    if body_text.is_empty() {
        return Ok((response.status, serde_json::Value::Null));
    }

    let parsed = serde_json::from_str(&body_text)
        .map_err(|e| format!("Invalid JSON from WhatsApp: {}", e))?;
    Ok((response.status, parsed))
}

fn extract_error(body: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    let err = v.get("error")?;
    let message = err.get("message").and_then(|m| m.as_str()).unwrap_or("");
    let code = err.get("code").and_then(|c| c.as_i64());
    let subcode = err.get("error_subcode").and_then(|c| c.as_i64());
    let user_title = err.get("error_user_title").and_then(|m| m.as_str());
    let user_msg = err.get("error_user_msg").and_then(|m| m.as_str());

    let mut parts: Vec<String> = Vec::new();
    if let Some(c) = code {
        parts.push(format!("code {}", c));
    }
    if let Some(sc) = subcode {
        parts.push(format!("subcode {}", sc));
    }
    if !message.is_empty() {
        parts.push(message.to_string());
    }
    if let (Some(t), Some(m)) = (user_title, user_msg) {
        parts.push(format!("{}: {}", t, m));
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
        let mut url = String::from("/v23.0/123/message_templates");
        append_query(&mut url, "limit", "25");
        assert_eq!(url, "/v23.0/123/message_templates?limit=25");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/v23.0/123/message_templates?limit=25");
        append_query(&mut url, "name", "order_confirmation");
        assert_eq!(
            url,
            "/v23.0/123/message_templates?limit=25&name=order_confirmation"
        );
    }

    #[test]
    fn extract_error_combines_code_message_and_user_fields() {
        let body = r#"{"error":{"message":"(#131030) Recipient phone number not in allowed list","code":131030,"error_subcode":2494010,"error_user_title":"Recipient not in allowed list","error_user_msg":"Add the recipient to your test number list"}}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("code 131030"));
        assert!(extracted.contains("subcode 2494010"));
        assert!(extracted.contains("Recipient phone number not in allowed list"));
        assert!(extracted.contains("Recipient not in allowed list: Add the recipient"));
    }

    #[test]
    fn extract_error_returns_none_for_non_error_payload() {
        assert!(extract_error(r#"{"messages":[{"id":"wamid.X"}]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("not json").is_none());
    }
}
