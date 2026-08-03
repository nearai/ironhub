//! Serper.dev WASM Tool for IronClaw.
//!
//! Wraps the Serper.dev API (<https://serper.dev>) so an agent can:
//! - `search`   — Query Google search organic results.
//! - `news`     — Query Google News results.
//! - `images`   — Query Google Image results.
//! - `videos`   — Query YouTube/Google Video results.
//! - `places`   — Query Google Maps local places.
//! - `shopping` — Query Google Shopping results.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::{Deserialize, Serialize};

const SECRET_NAME: &str = "serper_api_key";

struct SerperTool;

impl exports::near::agent::tool::Guest for SerperTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        match execute_inner(&req.params) {
            Ok(output) => exports::near::agent::tool::Response {
                output: Some(output),
                error: None,
            },
            Err(e) => exports::near::agent::tool::Response {
                output: None,
                error: Some(e),
            },
        }
    }

    fn schema() -> String {
        SCHEMA.to_string()
    }

    fn description() -> String {
        "Google Search and metadata oracle. Actions: 'search' (web), 'news', 'images', 'videos', 'places' (maps), and 'shopping'. Requires 'serper_api_key' injected by the host."
            .to_string()
    }
}

/// Tool actions. Selected via the `action` field.
#[derive(Debug, Deserialize, Serialize, PartialEq)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    Search {
        q: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        gl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        hl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        location: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        num: Option<u32>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        page: Option<u32>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        autocorrect: Option<bool>,
    },
    News {
        q: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        gl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        hl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        location: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        num: Option<u32>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        page: Option<u32>,
    },
    Images {
        q: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        gl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        hl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        location: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        num: Option<u32>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        page: Option<u32>,
    },
    Videos {
        q: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        gl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        hl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        location: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        num: Option<u32>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        page: Option<u32>,
    },
    Places {
        q: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        gl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        hl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        location: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        num: Option<u32>,
    },
    Shopping {
        q: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        gl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        hl: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        location: Option<String>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        num: Option<u32>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        page: Option<u32>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action =
        serde_json::from_str(params).map_err(|e| format!("Invalid parameters: {e}"))?;

    // Pre-flight check: verify credentials key is declared.
    if !near::agent::host::secret_exists(SECRET_NAME) {
        return Err(
            "Serper.dev API key not configured in capabilities. Run setup for the tool."
                .to_string(),
        );
    }

    let path = match &action {
        Action::Search { .. } => "/search",
        Action::News { .. } => "/news",
        Action::Images { .. } => "/images",
        Action::Videos { .. } => "/videos",
        Action::Places { .. } => "/places",
        Action::Shopping { .. } => "/shopping",
    };

    // Serialize payload and strip the helper "action" key since Serper API does not expect it.
    let mut payload_val =
        serde_json::to_value(&action).map_err(|e| format!("Failed to serialize payload: {e}"))?;
    if let Some(obj) = payload_val.as_object_mut() {
        obj.remove("action");
    }
    let payload = serde_json::to_string(&payload_val)
        .map_err(|e| format!("Failed to format payload: {e}"))?;

    let url = format!("https://google.serper.dev{path}");
    post_json(&url, &payload)
}

fn post_json(url: &str, payload: &str) -> Result<String, String> {
    let headers = serde_json::json!({
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "IronClaw-Serper-Tool/0.1"
    })
    .to_string();

    let resp =
        near::agent::host::http_request("POST", url, &headers, Some(payload.as_bytes()), None)
            .map_err(|e| format!("HTTP request failed: {e}"))?;

    if !(200..300).contains(&resp.status) {
        let err_msg = String::from_utf8_lossy(&resp.body);
        return Err(format!(
            "Serper.dev API error (HTTP {}): {}",
            resp.status, err_msg
        ));
    }

    String::from_utf8(resp.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))
}

// ==================== JSON Schema ====================

const SCHEMA: &str = r#"{
  "type": "object",
  "required": ["action"],
  "oneOf": [
    {
      "properties": {
        "action": { "const": "search" },
        "q": { "type": "string", "description": "The search query text, e.g. 'rust wasip2 tutorial'" },
        "gl": { "type": "string", "description": "Country code (e.g. 'us', 'gb', 'jp')." },
        "hl": { "type": "string", "description": "Language code (e.g. 'en', 'es')." },
        "location": { "type": "string", "description": "Location to anchor search results (e.g. 'Austin, Texas, United States')." },
        "num": { "type": "integer", "description": "Number of results to return (1-100). Default is 10." },
        "page": { "type": "integer", "description": "Page offset. Default is 1." },
        "autocorrect": { "type": "boolean", "description": "Spelling autocorrect toggle." }
      },
      "required": ["action", "q"],
      "additionalProperties": false
    },
    {
      "properties": {
        "action": { "const": "news" },
        "q": { "type": "string", "description": "The Google News query." },
        "gl": { "type": "string" },
        "hl": { "type": "string" },
        "location": { "type": "string" },
        "num": { "type": "integer" },
        "page": { "type": "integer" }
      },
      "required": ["action", "q"],
      "additionalProperties": false
    },
    {
      "properties": {
        "action": { "const": "images" },
        "q": { "type": "string", "description": "The image search query." },
        "gl": { "type": "string" },
        "hl": { "type": "string" },
        "location": { "type": "string" },
        "num": { "type": "integer" },
        "page": { "type": "integer" }
      },
      "required": ["action", "q"],
      "additionalProperties": false
    },
    {
      "properties": {
        "action": { "const": "videos" },
        "q": { "type": "string", "description": "The video search query." },
        "gl": { "type": "string" },
        "hl": { "type": "string" },
        "location": { "type": "string" },
        "num": { "type": "integer" },
        "page": { "type": "integer" }
      },
      "required": ["action", "q"],
      "additionalProperties": false
    },
    {
      "properties": {
        "action": { "const": "places" },
        "q": { "type": "string", "description": "Google Maps query (e.g. 'pizza')." },
        "gl": { "type": "string" },
        "hl": { "type": "string" },
        "location": { "type": "string", "description": "Recommended location filter (e.g. 'Chicago')." },
        "num": { "type": "integer" }
      },
      "required": ["action", "q"],
      "additionalProperties": false
    },
    {
      "properties": {
        "action": { "const": "shopping" },
        "q": { "type": "string", "description": "Google Shopping query." },
        "gl": { "type": "string" },
        "hl": { "type": "string" },
        "location": { "type": "string" },
        "num": { "type": "integer" },
        "page": { "type": "integer" }
      },
      "required": ["action", "q"],
      "additionalProperties": false
    }
  ]
}"#;

export!(SerperTool);

// ==================== Unit Tests ====================

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    #[test]
    fn schema_is_valid_json() {
        let v: Value = serde_json::from_str(SCHEMA).expect("schema must be valid JSON");
        assert_eq!(v["type"], "object");
        assert_eq!(v["required"][0], "action");
        let branches = v["oneOf"].as_array().expect("oneOf must be an array");
        assert_eq!(branches.len(), 6, "must have 6 action branches");
        for b in branches {
            let req = b["required"].as_array().expect("branch needs required[]");
            assert_eq!(req[0], "action");
            assert_eq!(req[1], "q");
            assert!(b["properties"]["action"]["const"].is_string());
        }
    }

    #[test]
    fn parse_search() {
        let params = r#"{"action":"search","q":"rust test","gl":"us","hl":"en"}"#;
        let action: Action = serde_json::from_str(params).unwrap();
        assert!(matches!(action, Action::Search { .. }));
    }

    #[test]
    fn test_payload_action_removal() {
        let action = Action::Search {
            q: "rust test".to_string(),
            gl: Some("us".to_string()),
            hl: Some("en".to_string()),
            location: None,
            num: Some(10),
            page: None,
            autocorrect: None,
        };
        let mut payload_val = serde_json::to_value(&action).unwrap();
        if let Some(obj) = payload_val.as_object_mut() {
            obj.remove("action");
        }
        let payload = serde_json::to_string(&payload_val).unwrap();
        let expected: Value =
            serde_json::from_str(r#"{"q":"rust test","gl":"us","hl":"en","num":10}"#).unwrap();
        let actual: Value = serde_json::from_str(&payload).unwrap();
        assert_eq!(expected, actual);
    }
}
