//! Jina Reader WASM Tool for IronClaw.
//!
//! Wraps the Jina Reader, Screenshot, and SVIP Search APIs (<https://jina.ai/>) so an agent can:
//!
//! - `read_url`               — extract clean markdown/HTML/text from a URL.
//! - `capture_screenshot_url` — capture screenshot of a web page.
//! - `search_web`             — perform general web search queries.
//! - `search_arxiv`           — search academic papers on arXiv.
//! - `search_ssrn`            — search academic papers on SSRN.
//! - `search_images`          — search for images across the web.
//!
//! # Authentication
//!
//! Store your Jina API key: `ironclaw tool setup jina-tool`.
//! The host injects it as a Bearer token; this tool never sees the raw value.
//! Get a key at <https://jina.ai/>.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{json, Value};

const READER_BASE: &str = "https://r.jina.ai/";
const SEARCH_BASE: &str = "https://svip.jina.ai/";
const SECRET_NAME: &str = "jina_api_key";
const MAX_RETRIES: u32 = 3;
const HTTP_TIMEOUT_MS: u32 = 60_000;
const MAX_URL_LEN: usize = 2048;

struct JinaTool;

impl exports::near::agent::tool::Guest for JinaTool {
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
        "Comprehensive Jina AI Search and Reader tool. Actions: 'read_url' (structured page markdown), 'capture_screenshot_url' (page screenshot URL), 'search_web' (web search), 'search_arxiv' (academic search on arXiv), 'search_ssrn' (academic search on SSRN), 'search_images' (image search)."
            .to_string()
    }
}

/// Tool actions. The model selects one via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    ReadUrl {
        url: String,
        #[serde(default)]
        with_all_links: Option<bool>,
        #[serde(default)]
        with_all_images: Option<bool>,
    },
    CaptureScreenshotUrl {
        url: String,
        #[serde(default)]
        first_screen_only: Option<bool>,
    },
    SearchWeb {
        query: String,
        #[serde(default)]
        num: Option<u32>,
    },
    SearchArxiv {
        query: String,
        #[serde(default)]
        num: Option<u32>,
    },
    SearchSsrn {
        query: String,
        #[serde(default)]
        num: Option<u32>,
    },
    SearchImages {
        query: String,
        #[serde(default)]
        num: Option<u32>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!("Invalid parameters: {e}. Provide an 'action' field.")
    })?;

    // Pre-flight: verify the API key is configured before any network call.
    if !near::agent::host::secret_exists(SECRET_NAME) {
        return Err(format!(
            "Jina AI API key not found. Set it with: ironclaw tool setup jina-tool. \
             Get a key at https://jina.ai/"
        ));
    }

    match action {
        Action::ReadUrl {
            url,
            with_all_links,
            with_all_images,
        } => {
            let validated = validate_url(&url)?;
            let body = json!({ "url": validated });
            
            let mut headers = json!({
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "IronClaw-Jina-Tool/0.1",
                "X-Md-Link-Style": "discarded"
            });
            let headers_obj = headers.as_object_mut().ok_or("Failed to build headers map")?;
            if let Some(true) = with_all_links {
                headers_obj.insert("X-With-Links-Summary".to_string(), json!("all"));
            }
            if let Some(true) = with_all_images {
                headers_obj.insert("X-With-Images-Summary".to_string(), json!("true"));
            } else {
                headers_obj.insert("X-Retain-Images".to_string(), json!("none"));
            }

            let resp = make_request("POST", READER_BASE, &body, headers)?;
            
            let data = resp.get("data").ok_or("Invalid response: missing 'data'")?;
            let title = data.get("title").and_then(Value::as_str).unwrap_or("");
            let url_str = data.get("url").and_then(Value::as_str).unwrap_or(validated);
            let content = data.get("content").and_then(Value::as_str).unwrap_or("");
            
            let links_vec = if let Some(true) = with_all_links {
                data.get("links").and_then(Value::as_array).map(|links| {
                    links.iter().map(|item| {
                        if let Some(arr) = item.as_array() {
                            json!({
                                "anchorText": arr.get(0).and_then(Value::as_str).unwrap_or(""),
                                "url": arr.get(1).and_then(Value::as_str).unwrap_or("")
                            })
                        } else {
                            item.clone()
                        }
                    }).collect::<Vec<Value>>()
                })
            } else {
                None
            };

            let images_val = if let Some(true) = with_all_images {
                data.get("images").cloned()
            } else {
                None
            };

            Ok(format_read_result(url_str, title, content, links_vec.as_ref(), images_val.as_ref()))
        }
        Action::CaptureScreenshotUrl {
            url,
            first_screen_only,
        } => {
            let validated = validate_url(&url)?;
            let body = json!({ "url": validated });
            
            let return_format = if first_screen_only.unwrap_or(false) { "screenshot" } else { "pageshot" };
            let headers = json!({
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "IronClaw-Jina-Tool/0.1",
                "X-Return-Format": return_format
            });

            let resp = make_request("POST", READER_BASE, &body, headers)?;
            let data = resp.get("data").ok_or("Invalid response: missing 'data'")?;
            
            let screenshot_url = data.get("screenshotUrl")
                .or_else(|| data.get("pageshotUrl"))
                .and_then(Value::as_str)
                .ok_or("No screenshot URL received from Jina Reader API")?;

            Ok(format!("screenshot_url: {}\n", escape_yaml_string(screenshot_url)))
        }
        Action::SearchWeb { query, num } => {
            let body = json!({
                "q": query,
                "num": num.unwrap_or(30)
            });
            let headers = json!({
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "IronClaw-Jina-Tool/0.1"
            });
            let resp = make_request("POST", SEARCH_BASE, &body, headers)?;
            let results = resp.get("results").and_then(Value::as_array).ok_or("Invalid response: missing 'results' array")?;
            Ok(format_search_results(&query, results))
        }
        Action::SearchArxiv { query, num } => {
            let body = json!({
                "q": query,
                "domain": "arxiv",
                "num": num.unwrap_or(30)
            });
            let headers = json!({
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "IronClaw-Jina-Tool/0.1"
            });
            let resp = make_request("POST", SEARCH_BASE, &body, headers)?;
            let results = resp.get("results").and_then(Value::as_array).ok_or("Invalid response: missing 'results' array")?;
            Ok(format_search_results(&query, results))
        }
        Action::SearchSsrn { query, num } => {
            let body = json!({
                "q": query,
                "domain": "ssrn",
                "num": num.unwrap_or(30)
            });
            let headers = json!({
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "IronClaw-Jina-Tool/0.1"
            });
            let resp = make_request("POST", SEARCH_BASE, &body, headers)?;
            let results = resp.get("results").and_then(Value::as_array).ok_or("Invalid response: missing 'results' array")?;
            Ok(format_search_results(&query, results))
        }
        Action::SearchImages { query, num } => {
            let body = json!({
                "q": query,
                "type": "images",
                "num": num.unwrap_or(30)
            });
            let headers = json!({
                "Accept": "application/json",
                "Content-Type": "application/json",
                "User-Agent": "IronClaw-Jina-Tool/0.1"
            });
            let resp = make_request("POST", SEARCH_BASE, &body, headers)?;
            let results = resp.get("results").and_then(Value::as_array).ok_or("Invalid response: missing 'results' array")?;
            Ok(format_search_results(&query, results))
        }
    }
}

fn make_request(
    method: &str,
    url: &str,
    body: &Value,
    headers: Value,
) -> Result<Value, String> {
    let body_bytes = serde_json::to_vec(body).map_err(|e| format!("Failed to encode body: {e}"))?;

    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        let resp = near::agent::host::http_request(
            method,
            url,
            &headers.to_string(),
            Some(&body_bytes),
            Some(HTTP_TIMEOUT_MS),
        )
        .map_err(|e| format!("HTTP request failed: {e}"))?;

        if (200..300).contains(&resp.status) {
            break resp;
        }

        if attempt < MAX_RETRIES && (resp.status == 429 || resp.status >= 500) {
            near::agent::host::log(
                near::agent::host::LogLevel::Warn,
                &format!(
                    "Jina AI {method} {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        return Err(sanitize_error(resp.status, &resp.body));
    };

    let text =
        String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Failed to parse Jina AI response: {e}"))
}

/// Produce a stable, non-leaky error message from a failed Jina AI response.
fn sanitize_error(status: u16, body: &[u8]) -> String {
    let detail = serde_json::from_slice::<Value>(body)
        .ok()
        .and_then(|v| {
            v.get("error")
                .or_else(|| v.get("message"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| String::from_utf8_lossy(body).chars().take(300).collect());

    match status {
        401 | 403 => format!(
            "Jina AI rejected the API key (HTTP {status}). Check 'jina_api_key'. Detail: {detail}"
        ),
        429 => format!("Jina AI rate limit exceeded (HTTP 429): {detail}"),
        _ => format!("Jina AI request failed (HTTP {status}): {detail}"),
    }
}

/// Validate a user-supplied URL: must be a bounded http(s) URL.
fn validate_url(url: &str) -> Result<&str, String> {
    let url = url.trim();
    if url.is_empty() {
        return Err("'url' must not be empty".into());
    }
    if url.len() > MAX_URL_LEN {
        return Err(format!("'url' exceeds maximum length of {MAX_URL_LEN} characters"));
    }
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(format!(
            "Invalid 'url': must start with http:// or https://, got '{url}'"
        ));
    }
    Ok(url)
}

fn escape_yaml_string(s: &str) -> String {
    if s.contains(':')
        || s.contains('{')
        || s.contains('}')
        || s.contains('[')
        || s.contains(']')
        || s.starts_with('-')
        || s.starts_with('#')
        || s.contains('"')
        || s.contains('\'')
    {
        format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\""))
    } else {
        s.to_string()
    }
}

fn format_read_result(
    url: &str,
    title: &str,
    content: &str,
    links: Option<&Vec<Value>>,
    images: Option<&Value>,
) -> String {
    let mut yaml = String::new();
    yaml.push_str(&format!("url: {}\n", escape_yaml_string(url)));
    yaml.push_str(&format!("title: {}\n", escape_yaml_string(title)));

    if let Some(links_val) = links {
        yaml.push_str("links:\n");
        for link in links_val {
            if let (Some(anchor), Some(link_url)) = (
                link.get("anchorText").and_then(Value::as_str),
                link.get("url").and_then(Value::as_str),
            ) {
                yaml.push_str(&format!("  - anchorText: {}\n", escape_yaml_string(anchor)));
                yaml.push_str(&format!("    url: {}\n", escape_yaml_string(link_url)));
            }
        }
    }

    if let Some(images_val) = images {
        if let Some(images_obj) = images_val.as_object() {
            yaml.push_str("images:\n");
            for (img_url, alt) in images_obj {
                let alt_str = alt.as_str().unwrap_or("");
                yaml.push_str(&format!(
                    "  {}: {}\n",
                    escape_yaml_string(img_url),
                    escape_yaml_string(alt_str)
                ));
            }
        }
    }

    yaml.push_str("content: |\n");
    for line in content.lines() {
        yaml.push_str(&format!("  {}\n", line));
    }
    yaml
}

fn format_search_results(query: &str, results: &[Value]) -> String {
    let mut yaml = String::new();
    yaml.push_str(&format!("query: {}\n", escape_yaml_string(query)));
    yaml.push_str("results:\n");
    for res in results {
        if let Some(obj) = res.as_object() {
            let mut is_first = true;
            for (k, v) in obj {
                let prefix = if is_first {
                    is_first = false;
                    "  - "
                } else {
                    "    "
                };
                if let Some(s) = v.as_str() {
                    if s.contains('\n') {
                        yaml.push_str(&format!("{}{}: |\n", prefix, k));
                        for line in s.lines() {
                            yaml.push_str(&format!("      {}\n", line));
                        }
                    } else {
                        yaml.push_str(&format!("{}{}: {}\n", prefix, k, escape_yaml_string(s)));
                    }
                } else if let Some(n) = v.as_number() {
                    yaml.push_str(&format!("{}{}: {}\n", prefix, k, n));
                } else if let Some(b) = v.as_bool() {
                    yaml.push_str(&format!("{}{}: {}\n", prefix, k, b));
                }
            }
        }
    }
    yaml
}

const SCHEMA: &str = r#"{
    "type": "object",
    "required": ["action"],
    "oneOf": [
        {
            "properties": {
                "action": { "const": "read_url" },
                "url": { "type": "string", "description": "The complete HTTP/HTTPS URL of the webpage or PDF file to read and convert." },
                "with_all_links": { "type": "boolean", "description": "Extract and return all hyperlinks found on the page as structured data." },
                "with_all_images": { "type": "boolean", "description": "Extract and return all images found on the page as structured data." }
            },
            "required": ["action", "url"]
        },
        {
            "properties": {
                "action": { "const": "capture_screenshot_url" },
                "url": { "type": "string", "description": "The complete HTTP/HTTPS URL of the webpage to capture." },
                "first_screen_only": { "type": "boolean", "description": "Set to true for a single screen capture (faster), false for full page capture including content below the fold." }
            },
            "required": ["action", "url"]
        },
        {
            "properties": {
                "action": { "const": "search_web" },
                "query": { "type": "string", "description": "The search query to run." },
                "num": { "type": "integer", "description": "The number of search results to return (default 30)." }
            },
            "required": ["action", "query"]
        },
        {
            "properties": {
                "action": { "const": "search_arxiv" },
                "query": { "type": "string", "description": "Search query for academic papers and preprints on arXiv." },
                "num": { "type": "integer", "description": "The number of search results to return (default 30)." }
            },
            "required": ["action", "query"]
        },
        {
            "properties": {
                "action": { "const": "search_ssrn" },
                "query": { "type": "string", "description": "Search query for academic papers on SSRN (Social Science Research Network)." },
                "num": { "type": "integer", "description": "The number of search results to return (default 30)." }
            },
            "required": ["action", "query"]
        },
        {
            "properties": {
                "action": { "const": "search_images" },
                "query": { "type": "string", "description": "Search query to find images across the web." },
                "num": { "type": "integer", "description": "The number of search results to return (default 30)." }
            },
            "required": ["action", "query"]
        }
    ]
}"#;

export!(JinaTool);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_is_valid_json() -> Result<(), String> {
        let v: Value = serde_json::from_str(SCHEMA).map_err(|e| e.to_string())?;
        if v["type"] != "object" {
            return Err("type must be object".into());
        }
        if v["required"][0] != "action" {
            return Err("required[0] must be action".into());
        }
        let branches = v["oneOf"].as_array().ok_or("oneOf must be array")?;
        if branches.len() != 6 {
            return Err("oneOf must have 6 branches".into());
        }
        for b in branches {
            let req = b["required"].as_array().ok_or("branch needs required[]")?;
            if req[0] != "action" {
                return Err("branch required[0] must be action".into());
            }
            if !b["properties"]["action"]["const"].is_string() {
                return Err("properties.action.const must be string".into());
            }
        }
        Ok(())
    }

    #[test]
    fn action_deserializes_each_variant() -> Result<(), String> {
        match serde_json::from_str::<Action>(r#"{"action":"read_url","url":"https://x.com"}"#) {
            Ok(Action::ReadUrl { .. }) => {}
            _ => return Err("Failed to deserialize ReadUrl".into()),
        }
        match serde_json::from_str::<Action>(r#"{"action":"capture_screenshot_url","url":"https://x.com"}"#) {
            Ok(Action::CaptureScreenshotUrl { .. }) => {}
            _ => return Err("Failed to deserialize CaptureScreenshotUrl".into()),
        }
        match serde_json::from_str::<Action>(r#"{"action":"search_web","query":"rust"}"#) {
            Ok(Action::SearchWeb { .. }) => {}
            _ => return Err("Failed to deserialize SearchWeb".into()),
        }
        match serde_json::from_str::<Action>(r#"{"action":"search_arxiv","query":"rust"}"#) {
            Ok(Action::SearchArxiv { .. }) => {}
            _ => return Err("Failed to deserialize SearchArxiv".into()),
        }
        match serde_json::from_str::<Action>(r#"{"action":"search_ssrn","query":"rust"}"#) {
            Ok(Action::SearchSsrn { .. }) => {}
            _ => return Err("Failed to deserialize SearchSsrn".into()),
        }
        match serde_json::from_str::<Action>(r#"{"action":"search_images","query":"rust"}"#) {
            Ok(Action::SearchImages { .. }) => {}
            _ => return Err("Failed to deserialize SearchImages".into()),
        }
        Ok(())
    }

    #[test]
    fn validate_url_accepts_http_and_https() -> Result<(), String> {
        if validate_url("https://example.com")? != "https://example.com" {
            return Err("Failed https URL".into());
        }
        if validate_url("  http://x.io/p  ")? != "http://x.io/p" {
            return Err("Failed http URL".into());
        }
        Ok(())
    }

    #[test]
    fn validate_url_rejects_bad() -> Result<(), String> {
        if validate_url("").is_ok() {
            return Err("Empty URL accepted".into());
        }
        if validate_url("ftp://x.com").is_ok() {
            return Err("ftp URL accepted".into());
        }
        if validate_url("example.com").is_ok() {
            return Err("relative URL accepted".into());
        }
        Ok(())
    }
}
