use crate::near::agent::host;

pub const HOST_CONFIG_PATH: &str = "grafana/host";
pub const TOKEN_SECRET: &str = "grafana_service_account_token";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists(TOKEN_SECRET) {
        Ok(())
    } else {
        Err(format!(
            "Grafana service account token not configured. Store it as the secret `{}`.",
            TOKEN_SECRET
        ))
    }
}

pub fn base_url() -> Result<String, String> {
    let configured = host::workspace_read(HOST_CONFIG_PATH).ok_or_else(|| {
        format!(
            "Grafana host not configured. Write your Grafana hostname to the workspace file \
             `{}`, for example myorg.grafana.net for Grafana Cloud or grafana.example.com:3000 \
             for a self-hosted instance. It must match the host baked into the tool's \
             capabilities file at install.",
            HOST_CONFIG_PATH
        )
    })?;
    Ok(format!("https://{}", validate_host(&configured)?))
}

pub fn validate_host(raw: &str) -> Result<String, String> {
    let lowered = raw.trim().trim_end_matches('/').to_ascii_lowercase();
    let host = lowered.strip_prefix("https://").unwrap_or(&lowered);
    let (name, port) = match host.split_once(':') {
        Some((name, port)) => (name, Some(port)),
        None => (host, None),
    };
    if name.is_empty() {
        return Err(host_error("it is empty"));
    }
    if !name
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'.')
    {
        return Err(host_error(
            "it contains characters that are not valid in a hostname",
        ));
    }
    if name.contains("..") || name.starts_with('.') || name.ends_with('.') {
        return Err(host_error("it contains an empty label"));
    }
    if let Some(port) = port {
        validate_port(port)?;
    }
    Ok(host.to_string())
}

fn validate_port(port: &str) -> Result<(), String> {
    let parsed: u32 = port
        .parse()
        .map_err(|_| host_error("its port is not a number"))?;
    if parsed == 0 || parsed > 65535 {
        return Err(host_error("its port is outside the range 1-65535"));
    }
    Ok(())
}

fn host_error(reason: &str) -> String {
    format!(
        "Grafana host in workspace file `{}` is not usable: {}. Write a bare hostname, \
         optionally with a port, such as myorg.grafana.net or grafana.example.com:3000.",
        HOST_CONFIG_PATH, reason
    )
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
    http_call("GET", endpoint, None)
}

pub fn post(endpoint: &str, body: &serde_json::Value) -> Result<serde_json::Value, String> {
    let serialized = serde_json::to_string(body)
        .map_err(|e| format!("Failed to serialize Grafana request body: {}", e))?;
    http_call("POST", endpoint, Some(&serialized))
}

fn http_call(
    method: &str,
    endpoint: &str,
    body: Option<&str>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let url = format!("{}{}", base_url()?, endpoint);
    let headers = build_headers(body.is_some())?;
    let body_bytes = body.map(|b| b.as_bytes().to_vec());

    host::log(
        host::LogLevel::Debug,
        &format!("Grafana: {} {}", method, url),
    );

    let response = host::http_request(method, &url, &headers, body_bytes.as_deref(), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Grafana response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Grafana API returned {}: {}",
            response.status, reason
        ));
    }
    if body_text.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Grafana: {}", e))
}

fn build_headers(has_body: bool) -> Result<String, String> {
    let mut map = serde_json::Map::new();
    if has_body {
        map.insert(
            "Content-Type".into(),
            serde_json::Value::String("application/json; charset=utf-8".to_string()),
        );
    }
    serde_json::to_string(&serde_json::Value::Object(map))
        .map_err(|e| format!("Failed to serialize headers: {}", e))
}

fn extract_error(body: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(body).ok()?;
    for key in ["message", "error"] {
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
    fn validate_host_accepts_grafana_cloud_hostname() {
        assert_eq!(
            validate_host("myorg.grafana.net").unwrap(),
            "myorg.grafana.net"
        );
    }

    #[test]
    fn validate_host_normalizes_scheme_case_and_trailing_slash() {
        assert_eq!(
            validate_host(" HTTPS://MyOrg.Grafana.Net/ ").unwrap(),
            "myorg.grafana.net"
        );
    }

    #[test]
    fn validate_host_accepts_self_hosted_domain() {
        assert_eq!(
            validate_host("grafana.example.com").unwrap(),
            "grafana.example.com"
        );
    }

    #[test]
    fn validate_host_accepts_explicit_port() {
        assert_eq!(
            validate_host("grafana.example.com:3000").unwrap(),
            "grafana.example.com:3000"
        );
    }

    #[test]
    fn validate_host_rejects_invalid_port() {
        assert!(validate_host("grafana.example.com:0").is_err());
        assert!(validate_host("grafana.example.com:99999").is_err());
        assert!(validate_host("grafana.example.com:http").is_err());
    }

    #[test]
    fn validate_host_rejects_leading_or_trailing_dot() {
        assert!(validate_host(".grafana.net").is_err());
        assert!(validate_host("myorg.grafana.net.").is_err());
    }

    #[test]
    fn validate_host_rejects_embedded_path_and_credentials() {
        assert!(validate_host("myorg.grafana.net/api/datasources").is_err());
        assert!(validate_host("user@myorg.grafana.net").is_err());
    }

    #[test]
    fn validate_host_rejects_empty_label() {
        assert!(validate_host("myorg..grafana.net").is_err());
    }

    #[test]
    fn validate_host_rejects_empty_input() {
        assert!(validate_host("   ").is_err());
    }

    #[test]
    fn require_non_empty_rejects_blank() {
        assert!(require_non_empty("  ", "uid").is_err());
        assert!(require_non_empty("abc", "uid").is_ok());
    }

    #[test]
    fn url_encode_preserves_unreserved() {
        assert_eq!(url_encode("abcXYZ123-_.~"), "abcXYZ123-_.~");
    }

    #[test]
    fn url_encode_percent_escapes_reserved() {
        assert_eq!(url_encode("severity=critical/1"), "severity%3Dcritical%2F1");
    }

    #[test]
    fn append_query_first_uses_question_mark() {
        let mut url = String::from("/api/search");
        append_query(&mut url, "query", "rpc");
        assert_eq!(url, "/api/search?query=rpc");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/api/search?query=rpc");
        append_query(&mut url, "limit", "5");
        assert_eq!(url, "/api/search?query=rpc&limit=5");
    }

    #[test]
    fn build_headers_empty_when_no_body() {
        assert_eq!(build_headers(false).unwrap(), "{}");
    }

    #[test]
    fn build_headers_content_type_when_body() {
        let headers = build_headers(true).unwrap();
        assert!(headers.contains("Content-Type"));
        assert!(headers.contains("application/json"));
    }

    #[test]
    fn build_headers_never_carries_authorization() {
        assert!(!build_headers(true).unwrap().contains("Authorization"));
    }

    #[test]
    fn extract_error_reads_message_field() {
        let body = r#"{"message":"Unauthorized","traceID":"0"}"#;
        assert_eq!(extract_error(body).unwrap(), "Unauthorized");
    }

    #[test]
    fn extract_error_falls_back_to_error_field() {
        let body = r#"{"error":"data source not found"}"#;
        assert_eq!(extract_error(body).unwrap(), "data source not found");
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"results":{"A":{"frames":[]}}}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("Unauthorized").is_none());
    }
}
