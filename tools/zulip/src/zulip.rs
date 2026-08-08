use crate::near::agent::host;

pub const HOST_CONFIG_PATH: &str = "zulip/host";
pub const API_KEY_SECRET: &str = "zulip_api_key";
const API_PREFIX: &str = "/api/v1";

pub fn require_api_key() -> Result<(), String> {
    if host::secret_exists(API_KEY_SECRET) {
        Ok(())
    } else {
        Err(format!(
            "Zulip API key not configured. Store the bot's API key as the secret `{}`. The \
             bot email is baked into the tool's capabilities file at install and is sent as \
             the HTTP Basic username.",
            API_KEY_SECRET
        ))
    }
}

pub fn base_url() -> Result<String, String> {
    let configured = host::workspace_read(HOST_CONFIG_PATH).ok_or_else(|| {
        format!(
            "Zulip host not configured. Write your Zulip hostname to the workspace file `{}`, \
             for example myorg.zulipchat.com for Zulip Cloud or zulip.example.com for a \
             self-hosted realm. It must match the host baked into the tool's capabilities file \
             at install.",
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
        "Zulip host in workspace file `{}` is not usable: {}. Write a bare hostname, optionally \
         with a port, such as myorg.zulipchat.com or zulip.example.com:8443.",
        HOST_CONFIG_PATH, reason
    )
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
    let url = format!("{}{}{}", base_url()?, API_PREFIX, endpoint);

    host::log(host::LogLevel::Debug, &format!("Zulip: GET {}", url));

    let response = host::http_request("GET", &url, &build_headers()?, None, None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Zulip response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Zulip API returned {}: {}",
            response.status, reason
        ));
    }
    if body_text.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Zulip: {}", e))
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
    let message = value.get("msg").and_then(|entry| entry.as_str())?;
    if message.is_empty() {
        return None;
    }
    let code = value
        .get("code")
        .and_then(|entry| entry.as_str())
        .unwrap_or("");
    if code.is_empty() {
        Some(message.to_string())
    } else {
        Some(format!("{}: {}", code, message))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_host_accepts_zulip_cloud_hostname() {
        assert_eq!(
            validate_host("myorg.zulipchat.com").unwrap(),
            "myorg.zulipchat.com"
        );
    }

    #[test]
    fn validate_host_accepts_self_hosted_with_port() {
        assert_eq!(
            validate_host("zulip.example.com:8443").unwrap(),
            "zulip.example.com:8443"
        );
    }

    #[test]
    fn validate_host_normalizes_scheme_case_and_trailing_slash() {
        assert_eq!(
            validate_host(" HTTPS://MyOrg.Zulipchat.Com/ ").unwrap(),
            "myorg.zulipchat.com"
        );
    }

    #[test]
    fn validate_host_rejects_embedded_path_and_credentials() {
        assert!(validate_host("myorg.zulipchat.com/api/v1").is_err());
        assert!(validate_host("bot@myorg.zulipchat.com").is_err());
    }

    #[test]
    fn validate_host_rejects_leading_or_trailing_dot() {
        assert!(validate_host(".zulipchat.com").is_err());
        assert!(validate_host("myorg.zulipchat.com.").is_err());
    }

    #[test]
    fn validate_host_rejects_invalid_port() {
        assert!(validate_host("zulip.example.com:0").is_err());
        assert!(validate_host("zulip.example.com:https").is_err());
    }

    #[test]
    fn validate_host_rejects_empty_input() {
        assert!(validate_host("  ").is_err());
    }

    #[test]
    fn url_encode_escapes_narrow_json() {
        let encoded = url_encode(r#"[{"operator":"channel","operand":"general"}]"#);
        assert!(!encoded.contains('"'));
        assert!(!encoded.contains('{'));
        assert!(encoded.contains("%22"));
    }

    #[test]
    fn append_query_first_uses_question_mark() {
        let mut url = String::from("/messages");
        append_query(&mut url, "anchor", "newest");
        assert_eq!(url, "/messages?anchor=newest");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/messages?anchor=newest");
        append_query(&mut url, "num_before", "50");
        assert_eq!(url, "/messages?anchor=newest&num_before=50");
    }

    #[test]
    fn bool_param_wire_values() {
        assert_eq!(bool_param(true), "true");
        assert_eq!(bool_param(false), "false");
    }

    #[test]
    fn build_headers_sets_accept_and_never_carries_credentials() {
        let headers = build_headers().unwrap();
        assert!(headers.contains("application/json"));
        assert!(!headers.contains("Authorization"));
        assert!(!headers.contains("api_key"));
    }

    #[test]
    fn extract_error_combines_code_and_message() {
        let body = r#"{"result":"error","code":"BAD_REQUEST","msg":"Invalid narrow operator"}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("BAD_REQUEST"));
        assert!(extracted.contains("Invalid narrow operator"));
    }

    #[test]
    fn extract_error_falls_back_to_message_only() {
        let body = r#"{"result":"error","msg":"Not authenticated"}"#;
        assert_eq!(extract_error(body).unwrap(), "Not authenticated");
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"result":"success","messages":[]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("<html>502</html>").is_none());
    }
}
