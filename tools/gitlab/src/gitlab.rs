use crate::near::agent::host;

pub const API_BASE: &str = "https://gitlab.com/api/v4";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists("gitlab_oauth_token") {
        Ok(())
    } else {
        Err(
            "GitLab OAuth token not configured. Run `ironclaw tool auth gitlab` after \
             exporting GITLAB_OAUTH_CLIENT_ID and GITLAB_OAUTH_CLIENT_SECRET."
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

pub fn project_path(project: &str) -> String {
    if project.chars().all(|c| c.is_ascii_digit()) {
        project.to_string()
    } else {
        url_encode(project)
    }
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
        &format!("GitLab API: {} {}", method, endpoint),
    );

    let response = host::http_request(method, &url, headers, body_bytes.as_deref(), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in GitLab response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "GitLab API returned {}: {}",
            response.status, reason
        ));
    }

    if body_text.is_empty() {
        return Ok((response.status, serde_json::Value::Null));
    }

    let parsed =
        serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from GitLab: {}", e))?;
    Ok((response.status, parsed))
}

pub fn request_raw(method: &str, endpoint: &str) -> Result<(u16, Vec<u8>), String> {
    let url = format!("{}{}", API_BASE, endpoint);
    host::log(
        host::LogLevel::Debug,
        &format!("GitLab API raw: {} {}", method, endpoint),
    );
    let response = host::http_request(method, &url, "{}", None, None)?;
    if response.status < 200 || response.status >= 300 {
        let reason = String::from_utf8_lossy(&response.body).to_string();
        return Err(format!(
            "GitLab API returned {}: {}",
            response.status, reason
        ));
    }
    Ok((response.status, response.body))
}

fn extract_error(body: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    if let Some(s) = v.get("message").and_then(|m| m.as_str()) {
        return Some(s.to_string());
    }
    if let Some(s) = v.get("error").and_then(|m| m.as_str()) {
        return Some(s.to_string());
    }
    if let Some(s) = v.get("error_description").and_then(|m| m.as_str()) {
        return Some(s.to_string());
    }
    None
}
