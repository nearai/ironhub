use crate::near::agent::host;

pub const API_BASE: &str = "https://api.clickup.com/api/v2";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists("clickup_oauth_token") {
        Ok(())
    } else {
        Err(
            "ClickUp OAuth token not configured. Run `ironclaw tool auth clickup` after \
             exporting CLICKUP_OAUTH_CLIENT_ID and CLICKUP_OAUTH_CLIENT_SECRET."
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

pub fn append_query_bool(url: &mut String, name: &str, value: bool) {
    append_query(url, name, if value { "true" } else { "false" });
}

pub fn append_query_repeated(url: &mut String, name: &str, values: &[String]) {
    for v in values {
        append_query(url, name, v);
    }
}

pub fn append_query_repeated_u64(url: &mut String, name: &str, values: &[u64]) {
    for v in values {
        append_query(url, name, &v.to_string());
    }
}

pub fn append_query_csv_u64(url: &mut String, name: &str, values: &[u64]) {
    if values.is_empty() {
        return;
    }
    let joined = values
        .iter()
        .map(|v| v.to_string())
        .collect::<Vec<_>>()
        .join(",");
    append_query(url, name, &joined);
}

pub fn append_custom_task_ids(url: &mut String, custom_task_ids: bool, workspace_id: Option<&str>) {
    if custom_task_ids {
        append_query_bool(url, "custom_task_ids", true);
        if let Some(team) = workspace_id {
            append_query(url, "team_id", team);
        }
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
        &format!("ClickUp API: {} {}", method, endpoint),
    );

    let response = host::http_request(method, &url, headers, body_bytes.as_deref(), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in ClickUp response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "ClickUp API returned {}: {}",
            response.status, reason
        ));
    }

    if body_text.is_empty() {
        return Ok((response.status, serde_json::Value::Null));
    }

    let parsed = serde_json::from_str(&body_text)
        .map_err(|e| format!("Invalid JSON from ClickUp: {}", e))?;
    Ok((response.status, parsed))
}

fn extract_error(body: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    if let Some(s) = v.get("err").and_then(|m| m.as_str()) {
        return Some(s.to_string());
    }
    if let Some(s) = v.get("error").and_then(|m| m.as_str()) {
        return Some(s.to_string());
    }
    if let Some(s) = v.get("message").and_then(|m| m.as_str()) {
        return Some(s.to_string());
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
        assert_eq!(url_encode("a b/c?d=e&f"), "a%20b%2Fc%3Fd%3De%26f");
    }

    #[test]
    fn url_encode_handles_unicode_bytes() {
        assert_eq!(url_encode("é"), "%C3%A9");
    }

    #[test]
    fn append_query_first_param_uses_question_mark() {
        let mut url = String::from("/space/abc/folder");
        append_query(&mut url, "archived", "false");
        assert_eq!(url, "/space/abc/folder?archived=false");
    }

    #[test]
    fn append_query_subsequent_uses_ampersand() {
        let mut url = String::from("/list/abc/task?archived=false");
        append_query(&mut url, "page", "0");
        assert_eq!(url, "/list/abc/task?archived=false&page=0");
    }

    #[test]
    fn append_query_url_encodes_value() {
        let mut url = String::from("/search");
        append_query(&mut url, "q", "to do");
        assert_eq!(url, "/search?q=to%20do");
    }

    #[test]
    fn append_query_repeated_emits_one_per_value() {
        let mut url = String::from("/team/x/task");
        append_query_repeated(
            &mut url,
            "statuses[]",
            &["to do".to_string(), "in progress".to_string()],
        );
        assert_eq!(
            url,
            "/team/x/task?statuses%5B%5D=to%20do&statuses%5B%5D=in%20progress"
        );
    }

    #[test]
    fn append_query_csv_u64_joins_with_commas() {
        let mut url = String::from("/team/x/time_entries");
        append_query_csv_u64(&mut url, "assignee", &[1234, 5678]);
        assert_eq!(url, "/team/x/time_entries?assignee=1234%2C5678");
    }

    #[test]
    fn append_query_csv_u64_skips_empty_input() {
        let mut url = String::from("/team/x/time_entries");
        append_query_csv_u64(&mut url, "assignee", &[]);
        assert_eq!(url, "/team/x/time_entries");
    }

    #[test]
    fn append_custom_task_ids_no_op_when_disabled() {
        let mut url = String::from("/task/abc");
        append_custom_task_ids(&mut url, false, Some("t1"));
        assert_eq!(url, "/task/abc");
    }

    #[test]
    fn append_custom_task_ids_emits_team_id_when_enabled() {
        let mut url = String::from("/task/CU-42");
        append_custom_task_ids(&mut url, true, Some("t1"));
        assert_eq!(url, "/task/CU-42?custom_task_ids=true&team_id=t1");
    }

    #[test]
    fn append_custom_task_ids_omits_team_id_if_missing() {
        let mut url = String::from("/task/CU-42");
        append_custom_task_ids(&mut url, true, None);
        assert_eq!(url, "/task/CU-42?custom_task_ids=true");
    }

    #[test]
    fn extract_error_returns_err_field() {
        let body = r#"{"err":"Authorization header required","ECODE":"OAUTH_017"}"#;
        assert_eq!(
            extract_error(body),
            Some("Authorization header required".to_string())
        );
    }

    #[test]
    fn extract_error_returns_error_field_when_no_err() {
        let body = r#"{"error":"Bad request"}"#;
        assert_eq!(extract_error(body), Some("Bad request".to_string()));
    }

    #[test]
    fn extract_error_returns_message_field_when_no_err_or_error() {
        let body = r#"{"message":"Not found"}"#;
        assert_eq!(extract_error(body), Some("Not found".to_string()));
    }

    #[test]
    fn extract_error_returns_none_for_non_error_payload() {
        assert!(extract_error(r#"{"teams":[]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("not json").is_none());
    }
}
