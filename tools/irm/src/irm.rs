use crate::near::agent::host;

pub const HOST_CONFIG_PATH: &str = "grafana/host";
pub const TOKEN_SECRET: &str = "grafana_service_account_token";
const RPC_PREFIX: &str = "/api/plugins/grafana-irm-app/resources/api/v1";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists(TOKEN_SECRET) {
        Ok(())
    } else {
        Err(format!(
            "Grafana service account token not configured. Store it as the secret `{}`. \
             Grafana IRM uses the same service account token as the Grafana stack it runs on.",
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
    Ok(format!(
        "https://{}",
        validate_host(&configured, HOST_CONFIG_PATH)?
    ))
}

pub fn validate_host(raw: &str, config_path: &str) -> Result<String, String> {
    let lowered = raw.trim().trim_end_matches('/').to_ascii_lowercase();
    let host = lowered.strip_prefix("https://").unwrap_or(&lowered);
    let (name, port) = match host.split_once(':') {
        Some((name, port)) => (name, Some(port)),
        None => (host, None),
    };
    if name.is_empty() {
        return Err(host_error("it is empty", config_path));
    }
    if !name
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'.')
    {
        return Err(host_error(
            "it contains characters that are not valid in a hostname",
            config_path,
        ));
    }
    if name.contains("..") || name.starts_with('.') || name.ends_with('.') {
        return Err(host_error("it contains an empty label", config_path));
    }
    if let Some(port) = port {
        validate_port(port, config_path)?;
    }
    Ok(host.to_string())
}

fn validate_port(port: &str, config_path: &str) -> Result<(), String> {
    let parsed: u32 = port
        .parse()
        .map_err(|_| host_error("its port is not a number", config_path))?;
    if parsed == 0 || parsed > 65535 {
        return Err(host_error(
            "its port is outside the range 1-65535",
            config_path,
        ));
    }
    Ok(())
}

fn host_error(reason: &str, config_path: &str) -> String {
    format!(
        "Host in workspace file `{}` is not usable: {}. Write a bare hostname, optionally with \
         a port, such as myorg.grafana.net or grafana.example.com:3000.",
        config_path, reason
    )
}

pub fn require_non_empty(value: &str, field: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        return Err(format!("`{}` must not be empty", field));
    }
    Ok(())
}

pub fn rpc(method: &str, body: &serde_json::Value) -> Result<serde_json::Value, String> {
    require_token()?;
    let url = format!("{}{}/{}", base_url()?, RPC_PREFIX, method);
    let serialized = serde_json::to_string(body)
        .map_err(|e| format!("Failed to serialize Grafana IRM request body: {}", e))?;

    host::log(host::LogLevel::Debug, &format!("Grafana IRM: POST {}", url));

    let response = host::http_request(
        "POST",
        &url,
        &build_headers()?,
        Some(serialized.as_bytes()),
        None,
    )?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Grafana IRM response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Grafana IRM API returned {}: {}",
            response.status, reason
        ));
    }
    if body_text.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Grafana IRM: {}", e))
}

fn build_headers() -> Result<String, String> {
    let mut map = serde_json::Map::new();
    map.insert(
        "Content-Type".into(),
        serde_json::Value::String("application/json; charset=utf-8".to_string()),
    );
    serde_json::to_string(&serde_json::Value::Object(map))
        .map_err(|e| format!("Failed to serialize headers: {}", e))
}

fn extract_error(body: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(body).ok()?;
    for key in ["error", "message"] {
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

    fn check(raw: &str) -> Result<String, String> {
        validate_host(raw, HOST_CONFIG_PATH)
    }

    #[test]
    fn validate_host_accepts_grafana_cloud_hostname() {
        assert_eq!(check("myorg.grafana.net").unwrap(), "myorg.grafana.net");
    }

    #[test]
    fn validate_host_normalizes_scheme_case_and_trailing_slash() {
        assert_eq!(
            check(" HTTPS://MyOrg.Grafana.Net/ ").unwrap(),
            "myorg.grafana.net"
        );
    }

    #[test]
    fn validate_host_accepts_self_hosted_domain() {
        assert_eq!(check("grafana.example.com").unwrap(), "grafana.example.com");
    }

    #[test]
    fn validate_host_accepts_explicit_port() {
        assert_eq!(
            check("grafana.example.com:3000").unwrap(),
            "grafana.example.com:3000"
        );
    }

    #[test]
    fn validate_host_rejects_invalid_port() {
        assert!(check("grafana.example.com:0").is_err());
        assert!(check("grafana.example.com:http").is_err());
    }

    #[test]
    fn validate_host_rejects_leading_or_trailing_dot() {
        assert!(check(".grafana.net").is_err());
        assert!(check("myorg.grafana.net.").is_err());
    }

    #[test]
    fn validate_host_rejects_embedded_path_and_credentials() {
        assert!(check("myorg.grafana.net/api").is_err());
        assert!(check("user@myorg.grafana.net").is_err());
    }

    #[test]
    fn validate_host_rejects_empty_input() {
        assert!(check("  ").is_err());
    }

    #[test]
    fn host_error_names_the_workspace_file_it_read() {
        let message = validate_host("bad host", "grafana/oncall_host").unwrap_err();
        assert!(message.contains("grafana/oncall_host"), "{}", message);
    }

    #[test]
    fn require_non_empty_rejects_blank() {
        assert!(require_non_empty(" ", "incident_id").is_err());
        assert!(require_non_empty("inc-1", "incident_id").is_ok());
    }

    #[test]
    fn build_headers_sets_json_content_type_only() {
        let headers = build_headers().unwrap();
        assert!(headers.contains("application/json"));
        assert!(!headers.contains("Authorization"));
    }

    #[test]
    fn extract_error_reads_error_field() {
        assert_eq!(
            extract_error(r#"{"error":"incident not found"}"#).unwrap(),
            "incident not found"
        );
    }

    #[test]
    fn extract_error_falls_back_to_message_field() {
        assert_eq!(
            extract_error(r#"{"message":"Unauthorized"}"#).unwrap(),
            "Unauthorized"
        );
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"incidents":[]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("gateway timeout").is_none());
    }
}
