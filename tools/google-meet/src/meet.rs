use crate::near::agent::host;

pub const OAUTH_TOKEN_SECRET: &str = "google_meet_oauth_token";
const API_BASE: &str = "https://meet.googleapis.com/v2";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists(OAUTH_TOKEN_SECRET) {
        Ok(())
    } else {
        Err(format!(
            "Google Meet OAuth token not configured. Store it as the secret `{}` and run \
             `ironclaw tool auth google-meet` to complete the consent flow.",
            OAUTH_TOKEN_SECRET
        ))
    }
}

fn validate_id(id: &str, field: &str) -> Result<(), String> {
    if id.is_empty() {
        return Err(format!("`{}` must not be empty", field));
    }
    if !id
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return Err(format!(
            "`{}` contains characters that are not valid in a Google Meet resource id",
            field
        ));
    }
    Ok(())
}

pub fn conference_record_name(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim().trim_matches('/');
    let id = trimmed
        .strip_prefix("conferenceRecords/")
        .unwrap_or(trimmed);
    validate_id(id, "conference_record")?;
    Ok(format!("conferenceRecords/{}", id))
}

pub fn transcript_name(raw: &str) -> Result<String, String> {
    child_name(raw, "transcripts", "transcript")
}

pub fn recording_name(raw: &str) -> Result<String, String> {
    child_name(raw, "recordings", "recording")
}

fn child_name(raw: &str, collection: &str, field: &str) -> Result<String, String> {
    let trimmed = raw.trim().trim_matches('/');
    let parts: Vec<&str> = trimmed.split('/').collect();
    if parts.len() != 4 || parts[0] != "conferenceRecords" || parts[2] != collection {
        return Err(format!(
            "`{}` must be a full resource name of the form conferenceRecords/{{id}}/{}/{{id}}, \
             exactly as returned by the API",
            field, collection
        ));
    }
    validate_id(parts[1], "conference_record")?;
    validate_id(parts[3], field)?;
    Ok(format!(
        "conferenceRecords/{}/{}/{}",
        parts[1], collection, parts[3]
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

pub fn append_paging(url: &mut String, page_size: u32, page_token: Option<&str>) {
    append_query(url, "pageSize", &page_size.to_string());
    if let Some(token) = page_token {
        append_query(url, "pageToken", token);
    }
}

pub fn get(endpoint: &str) -> Result<serde_json::Value, String> {
    require_token()?;
    let url = format!("{}{}", API_BASE, endpoint);

    host::log(host::LogLevel::Debug, &format!("Google Meet: GET {}", url));

    let response = host::http_request("GET", &url, &build_headers()?, None, None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in Google Meet response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        let reason = extract_error(&body_text).unwrap_or_else(|| body_text.clone());
        return Err(format!(
            "Google Meet API returned {}: {}",
            response.status, reason
        ));
    }
    if body_text.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from Google Meet: {}", e))
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
    let error = value.get("error")?;
    let message = error.get("message").and_then(|entry| entry.as_str())?;
    if message.is_empty() {
        return None;
    }
    let status = error
        .get("status")
        .and_then(|entry| entry.as_str())
        .unwrap_or("");
    if status.is_empty() {
        Some(message.to_string())
    } else {
        Some(format!("{}: {}", status, message))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conference_record_name_accepts_bare_id() {
        assert_eq!(
            conference_record_name("abc123").unwrap(),
            "conferenceRecords/abc123"
        );
    }

    #[test]
    fn conference_record_name_accepts_full_resource_name() {
        assert_eq!(
            conference_record_name("conferenceRecords/abc123").unwrap(),
            "conferenceRecords/abc123"
        );
    }

    #[test]
    fn conference_record_name_rejects_traversal_and_injection() {
        assert!(conference_record_name("../spaces/x").is_err());
        assert!(conference_record_name("abc/../../etc").is_err());
        assert!(conference_record_name("abc?alt=media").is_err());
        assert!(conference_record_name("").is_err());
    }

    #[test]
    fn transcript_name_accepts_full_resource_name() {
        assert_eq!(
            transcript_name("conferenceRecords/abc/transcripts/xyz").unwrap(),
            "conferenceRecords/abc/transcripts/xyz"
        );
    }

    #[test]
    fn transcript_name_rejects_bare_id_and_wrong_collection() {
        assert!(transcript_name("xyz").is_err());
        assert!(transcript_name("conferenceRecords/abc/recordings/xyz").is_err());
        assert!(transcript_name("conferenceRecords/abc/transcripts").is_err());
    }

    #[test]
    fn recording_name_accepts_full_resource_name() {
        assert_eq!(
            recording_name("conferenceRecords/abc/recordings/r1").unwrap(),
            "conferenceRecords/abc/recordings/r1"
        );
    }

    #[test]
    fn recording_name_rejects_wrong_collection() {
        assert!(recording_name("conferenceRecords/abc/transcripts/r1").is_err());
    }

    #[test]
    fn url_encode_escapes_filter_syntax() {
        let encoded = url_encode(r#"start_time>="2026-08-01T00:00:00.000Z""#);
        assert!(!encoded.contains('"'));
        assert!(!encoded.contains('>'));
        assert!(encoded.contains("%22"));
    }

    #[test]
    fn append_paging_sets_page_size_and_token() {
        let mut url = String::from("/conferenceRecords");
        append_paging(&mut url, 25, Some("tok"));
        assert_eq!(url, "/conferenceRecords?pageSize=25&pageToken=tok");
    }

    #[test]
    fn append_paging_omits_absent_token() {
        let mut url = String::from("/conferenceRecords");
        append_paging(&mut url, 10, None);
        assert_eq!(url, "/conferenceRecords?pageSize=10");
    }

    #[test]
    fn build_headers_never_carries_authorization() {
        let headers = build_headers().unwrap();
        assert!(headers.contains("Accept"));
        assert!(!headers.contains("Authorization"));
    }

    #[test]
    fn extract_error_combines_status_and_message() {
        let body = r#"{"error":{"code":403,"message":"Request had insufficient authentication scopes.","status":"PERMISSION_DENIED"}}"#;
        let extracted = extract_error(body).unwrap();
        assert!(extracted.contains("PERMISSION_DENIED"));
        assert!(extracted.contains("insufficient authentication scopes"));
    }

    #[test]
    fn extract_error_returns_none_for_success_payload() {
        assert!(extract_error(r#"{"conferenceRecords":[]}"#).is_none());
    }

    #[test]
    fn extract_error_returns_none_for_invalid_json() {
        assert!(extract_error("<html>502</html>").is_none());
    }
}
