use crate::irm::validate_host;
use crate::near::agent::host;

pub const HOST_CONFIG_PATH: &str = "grafana/oncall_host";
pub const TOKEN_SECRET: &str = "grafana_oncall_api_token";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists(TOKEN_SECRET) {
        Ok(())
    } else {
        Err(format!(
            "Grafana OnCall API token not configured. Store it as the secret `{}`. This is a \
             separate token from the Grafana service account token: create it on the OnCall \
             settings page, under API Tokens.",
            TOKEN_SECRET
        ))
    }
}

pub fn base_url() -> Result<String, String> {
    let configured = host::workspace_read(HOST_CONFIG_PATH).ok_or_else(|| {
        format!(
            "Grafana OnCall host not configured. Write the OnCall API hostname to the workspace \
             file `{}`. It is shown on the OnCall settings page and is not always the same host \
             as Grafana itself: Grafana Cloud serves OnCall from a regional hostname such as \
             oncall-prod-eu-west-0.grafana.net, while a self-hosted deployment usually serves it \
             from the Grafana host. It must match the host baked into the tool's capabilities \
             file at install.",
            HOST_CONFIG_PATH
        )
    })?;
    Ok(format!(
        "https://{}",
        validate_host(&configured, HOST_CONFIG_PATH)?
    ))
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
    require_token()?;
    let url = format!("{}{}", base_url()?, endpoint);

    host::log(
        host::LogLevel::Debug,
        &format!("Grafana OnCall: GET {}", url),
    );

    let response = host::http_request("GET", &url, &build_headers()?, None, None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Grafana OnCall response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Grafana OnCall API returned {}: {}",
            response.status, reason
        ));
    }
    if body_text.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Grafana OnCall: {}", e))
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
    for key in ["detail", "error", "message"] {
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
    fn url_encode_preserves_unreserved() {
        assert_eq!(url_encode("abcXYZ123-_.~"), "abcXYZ123-_.~");
    }

    #[test]
    fn url_encode_percent_escapes_reserved() {
        assert_eq!(url_encode("Primary On/Call"), "Primary%20On%2FCall");
    }

    #[test]
    fn append_query_first_uses_question_mark() {
        let mut url = String::from("/api/v1/schedules/");
        append_query(&mut url, "name", "Primary");
        assert_eq!(url, "/api/v1/schedules/?name=Primary");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/api/v1/schedules/?name=Primary");
        append_query(&mut url, "page", "2");
        assert_eq!(url, "/api/v1/schedules/?name=Primary&page=2");
    }

    #[test]
    fn build_headers_requests_json_and_carries_no_credential() {
        let headers = build_headers().unwrap();
        assert!(headers.contains("application/json"));
        assert!(!headers.contains("Authorization"));
        assert!(!headers.contains(TOKEN_SECRET));
    }

    #[test]
    fn extract_error_prefers_the_django_detail_field() {
        let body = r#"{"detail":"Invalid token.","error":"ignored"}"#;
        assert_eq!(extract_error(body).unwrap(), "Invalid token.");
    }

    #[test]
    fn extract_error_falls_back_to_error_and_message() {
        assert_eq!(
            extract_error(r#"{"error":"chain not found"}"#).unwrap(),
            "chain not found"
        );
        assert_eq!(
            extract_error(r#"{"message":"Forbidden"}"#).unwrap(),
            "Forbidden"
        );
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"count":0,"results":[]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("bad gateway").is_none());
    }

    #[test]
    fn host_and_secret_are_namespaced_under_grafana() {
        assert!(HOST_CONFIG_PATH.starts_with("grafana/"));
        assert_ne!(HOST_CONFIG_PATH, crate::irm::HOST_CONFIG_PATH);
        assert_ne!(TOKEN_SECRET, crate::irm::TOKEN_SECRET);
    }
}
