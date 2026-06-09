use crate::near::agent::host;

pub const API_URL: &str = "https://api.monday.com/v2";

pub fn require_token() -> Result<(), String> {
    if host::secret_exists("monday_api_token") {
        Ok(())
    } else {
        Err(
            "monday.com API token not configured. Store the personal API v2 token as the secret \
             `monday_api_token`."
                .to_string(),
        )
    }
}

pub fn graphql_call(
    query: &str,
    variables: serde_json::Value,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let payload = serde_json::json!({
        "query": query,
        "variables": variables,
    });
    let body = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize monday GraphQL payload: {}", e))?;
    let headers = r#"{"Content-Type": "application/json; charset=utf-8"}"#;

    host::log(
        host::LogLevel::Debug,
        &format!("monday GraphQL: {} chars", query.len()),
    );

    let response = host::http_request("POST", API_URL, headers, Some(body.as_bytes()), None)?;
    let body_text = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8 in monday response: {}", e))?;

    if response.status < 200 || response.status >= 300 {
        return Err(format!(
            "monday API returned HTTP {}: {}",
            response.status, body_text
        ));
    }
    if body_text.is_empty() {
        return Err("monday API returned an empty body".to_string());
    }

    let parsed: serde_json::Value =
        serde_json::from_str(&body_text).map_err(|e| format!("Invalid JSON from monday: {}", e))?;
    extract_graphql_result(parsed)
}

fn extract_graphql_result(value: serde_json::Value) -> Result<serde_json::Value, String> {
    if let Some(reason) = format_errors(&value) {
        return Err(format!("monday GraphQL error: {}", reason));
    }
    if let Some(data) = value.get("data") {
        return Ok(data.clone());
    }
    Err(format!(
        "monday GraphQL response had no `data` and no `errors`: {}",
        value
    ))
}

fn format_errors(value: &serde_json::Value) -> Option<String> {
    let errors = value.get("errors")?.as_array()?;
    if errors.is_empty() {
        return None;
    }
    let parts: Vec<String> = errors
        .iter()
        .map(|err| {
            let message = err
                .get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("unknown error");
            let code = err.get("extensions").and_then(|e| e.get("code"));
            match code.and_then(|c| c.as_str()) {
                Some(c) => format!("{} (code {})", message, c),
                None => message.to_string(),
            }
        })
        .collect();
    Some(parts.join("; "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_data_when_present() {
        let v = serde_json::json!({
            "data": { "me": { "id": "7", "name": "test" } }
        });
        let got = extract_graphql_result(v).unwrap();
        assert_eq!(got["me"]["id"], "7");
    }

    #[test]
    fn extract_errors_takes_precedence_over_data() {
        let v = serde_json::json!({
            "data": null,
            "errors": [
                { "message": "Item not found", "extensions": { "code": "ResourceNotFoundException" } }
            ]
        });
        let err = extract_graphql_result(v).unwrap_err();
        assert!(err.contains("Item not found"));
        assert!(err.contains("ResourceNotFoundException"));
    }

    #[test]
    fn extract_errors_without_extensions_code() {
        let v = serde_json::json!({
            "errors": [{ "message": "Parse error" }]
        });
        let err = extract_graphql_result(v).unwrap_err();
        assert!(err.contains("Parse error"));
    }

    #[test]
    fn extract_errors_multiple_joined() {
        let v = serde_json::json!({
            "errors": [
                { "message": "first" },
                { "message": "second" }
            ]
        });
        let err = extract_graphql_result(v).unwrap_err();
        assert!(err.contains("first"));
        assert!(err.contains("second"));
    }

    #[test]
    fn extract_missing_data_and_errors_fails() {
        let v = serde_json::json!({ "status": "weird" });
        assert!(extract_graphql_result(v).is_err());
    }

    #[test]
    fn empty_errors_array_does_not_short_circuit() {
        let v = serde_json::json!({
            "data": { "boards": [] },
            "errors": []
        });
        let got = extract_graphql_result(v).unwrap();
        assert!(got["boards"].is_array());
    }
}
