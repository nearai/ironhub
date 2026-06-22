use crate::near::agent::host;

pub const API_HOST: &str = "https://api.xero.com";
pub const ACCOUNTING_PREFIX: &str = "/api.xro/2.0";
pub const CONNECTIONS_PATH: &str = "/connections";
const SECRET_NAME: &str = "xero_oauth_token";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists(SECRET_NAME) {
        Ok(())
    } else {
        Err(
            "Xero is not connected. Authorize Xero through the host product auth (provider \
             \"xero\") so the OAuth access token is available to the tool as the secret \
             `xero_oauth_token`."
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

pub struct RequestOptions<'a> {
    pub tenant_id: Option<&'a str>,
    pub idempotency_key: Option<&'a str>,
    pub body: Option<&'a str>,
}

impl<'a> RequestOptions<'a> {
    pub fn read(tenant_id: &'a str) -> Self {
        RequestOptions {
            tenant_id: Some(tenant_id),
            idempotency_key: None,
            body: None,
        }
    }

    pub fn write(tenant_id: &'a str, body: &'a str, idempotency_key: Option<&'a str>) -> Self {
        RequestOptions {
            tenant_id: Some(tenant_id),
            idempotency_key,
            body: Some(body),
        }
    }

    pub fn no_tenant() -> Self {
        RequestOptions {
            tenant_id: None,
            idempotency_key: None,
            body: None,
        }
    }
}

fn build_headers(opts: &RequestOptions) -> String {
    let mut headers = serde_json::Map::new();
    headers.insert(
        "Accept".to_string(),
        serde_json::Value::String("application/json".to_string()),
    );
    if opts.body.is_some() {
        headers.insert(
            "Content-Type".to_string(),
            serde_json::Value::String("application/json; charset=utf-8".to_string()),
        );
    }
    if let Some(tenant) = opts.tenant_id {
        headers.insert(
            "Xero-tenant-id".to_string(),
            serde_json::Value::String(tenant.to_string()),
        );
    }
    if let Some(key) = opts.idempotency_key {
        headers.insert(
            "Idempotency-Key".to_string(),
            serde_json::Value::String(key.to_string()),
        );
    }
    serde_json::Value::Object(headers).to_string()
}

pub fn request(
    method: &str,
    path: &str,
    opts: RequestOptions,
) -> Result<(u16, serde_json::Value), String> {
    let url = format!("{}{}", API_HOST, path);
    let headers_json = build_headers(&opts);
    let body_bytes = opts.body.map(|b| b.as_bytes().to_vec());

    host::log(
        host::LogLevel::Debug,
        &format!("Xero API: {} {}", method, path),
    );

    let response = host::http_request(method, &url, &headers_json, body_bytes.as_deref(), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Xero response: {}", e))?;

    if response.status == 429 {
        let retry = parse_retry_after(&response.headers_json);
        let detail = match retry {
            Some(secs) => format!("retry after {} seconds", secs),
            None => "retry shortly".to_string(),
        };
        return Err(format!(
            "Xero rate limit (429). Limits are per organisation: 60 calls/minute, 5000/day, \
             5 concurrent. {}.",
            detail
        ));
    }

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!("Xero API returned {}: {}", response.status, reason));
    }

    if body_text.is_empty() {
        return Ok((response.status, serde_json::Value::Null));
    }

    let parsed =
        serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Xero: {}", e))?;
    Ok((response.status, parsed))
}

/// Xero returns HTTP 200 with a populated `ValidationErrors` array (and a
/// `StatusAttributeString` of "ERROR") when a create or update fails validation
/// under summarized error handling. A naive 2xx-is-success check would treat a
/// rejected invoice or payment as written, so creates and updates run their
/// response through this guard before returning success.
pub fn ensure_no_validation_errors(value: &serde_json::Value) -> Result<(), String> {
    let mut messages: Vec<String> = Vec::new();
    let mut saw_error_status = false;
    collect_validation(value, &mut messages, &mut saw_error_status);

    if messages.is_empty() && !saw_error_status {
        return Ok(());
    }

    if messages.is_empty() {
        return Err(
            "Xero rejected the request (StatusAttributeString=ERROR) but returned no \
                    validation detail. Inspect the response and the submitted fields."
                .to_string(),
        );
    }

    Err(format!("Xero validation failed: {}", messages.join("; ")))
}

fn collect_validation(value: &serde_json::Value, messages: &mut Vec<String>, saw_error: &mut bool) {
    match value {
        serde_json::Value::Object(map) => {
            if map
                .get("StatusAttributeString")
                .and_then(|v| v.as_str())
                .map(|s| s.eq_ignore_ascii_case("ERROR"))
                .unwrap_or(false)
            {
                *saw_error = true;
            }
            if let Some(errors) = map.get("ValidationErrors").and_then(|v| v.as_array()) {
                for err in errors {
                    if let Some(message) = err.get("Message").and_then(|v| v.as_str()) {
                        messages.push(message.to_string());
                    }
                }
            }
            for child in map.values() {
                collect_validation(child, messages, saw_error);
            }
        }
        serde_json::Value::Array(items) => {
            for item in items {
                collect_validation(item, messages, saw_error);
            }
        }
        _ => {}
    }
}

fn parse_retry_after(headers_json: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(headers_json).ok()?;
    let map = value.as_object()?;
    for (name, val) in map {
        if name.eq_ignore_ascii_case("retry-after") {
            if let Some(s) = val.as_str() {
                return Some(s.to_string());
            }
            if let Some(n) = val.as_u64() {
                return Some(n.to_string());
            }
        }
    }
    None
}

fn extract_error(body: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    let mut parts: Vec<String> = Vec::new();

    for field in ["Message", "Detail", "Title", "error_description", "error"] {
        if let Some(text) = v.get(field).and_then(|x| x.as_str()) {
            if !text.is_empty() {
                parts.push(text.to_string());
            }
        }
    }

    let mut validation: Vec<String> = Vec::new();
    let mut saw_error = false;
    collect_validation(&v, &mut validation, &mut saw_error);
    parts.extend(validation);

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
    fn append_query_first_uses_question_mark() {
        let mut url = String::from("/api.xro/2.0/Invoices");
        append_query(&mut url, "page", "2");
        assert_eq!(url, "/api.xro/2.0/Invoices?page=2");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/api.xro/2.0/Invoices?page=2");
        append_query(&mut url, "where", "Status==\"AUTHORISED\"");
        assert_eq!(
            url,
            "/api.xro/2.0/Invoices?page=2&where=Status%3D%3D%22AUTHORISED%22"
        );
    }

    #[test]
    fn build_headers_sets_tenant_and_idempotency() {
        let opts = RequestOptions::write("tenant-1", "{}", Some("key-1"));
        let headers = build_headers(&opts);
        let parsed: serde_json::Value = serde_json::from_str(&headers).unwrap();
        assert_eq!(
            parsed.get("Xero-tenant-id").and_then(|v| v.as_str()),
            Some("tenant-1")
        );
        assert_eq!(
            parsed.get("Idempotency-Key").and_then(|v| v.as_str()),
            Some("key-1")
        );
        assert_eq!(
            parsed.get("Content-Type").and_then(|v| v.as_str()),
            Some("application/json; charset=utf-8")
        );
    }

    #[test]
    fn build_headers_read_has_no_tenant_when_absent() {
        let opts = RequestOptions::no_tenant();
        let headers = build_headers(&opts);
        let parsed: serde_json::Value = serde_json::from_str(&headers).unwrap();
        assert!(parsed.get("Xero-tenant-id").is_none());
        assert!(parsed.get("Content-Type").is_none());
        assert_eq!(
            parsed.get("Accept").and_then(|v| v.as_str()),
            Some("application/json")
        );
    }

    #[test]
    fn ensure_no_validation_errors_passes_clean_response() {
        let body = serde_json::json!({
            "Invoices": [{"InvoiceID": "abc", "StatusAttributeString": "OK", "ValidationErrors": []}]
        });
        assert!(ensure_no_validation_errors(&body).is_ok());
    }

    #[test]
    fn ensure_no_validation_errors_catches_nested_errors() {
        let body = serde_json::json!({
            "Invoices": [{
                "StatusAttributeString": "ERROR",
                "ValidationErrors": [{"Message": "Contact is required"}]
            }]
        });
        let err = ensure_no_validation_errors(&body).unwrap_err();
        assert!(err.contains("Contact is required"));
    }

    #[test]
    fn ensure_no_validation_errors_flags_error_status_without_message() {
        let body = serde_json::json!({ "Invoices": [{"StatusAttributeString": "ERROR"}] });
        assert!(ensure_no_validation_errors(&body).is_err());
    }

    #[test]
    fn parse_retry_after_reads_string_value() {
        let headers = r#"{"Retry-After":"30","X-MinLimit-Remaining":"0"}"#;
        assert_eq!(parse_retry_after(headers), Some("30".to_string()));
    }

    #[test]
    fn parse_retry_after_is_case_insensitive_and_handles_number() {
        let headers = r#"{"retry-after":45}"#;
        assert_eq!(parse_retry_after(headers), Some("45".to_string()));
    }

    #[test]
    fn extract_error_reads_message_and_validation() {
        let body = r#"{"Message":"A validation exception occurred","Elements":[{"ValidationErrors":[{"Message":"Email address must be valid"}]}]}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("A validation exception occurred"));
        assert!(extracted.contains("Email address must be valid"));
    }

    #[test]
    fn extract_error_reads_oauth_error_description() {
        let body = r#"{"error":"invalid_grant","error_description":"token expired"}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("token expired"));
    }
}
