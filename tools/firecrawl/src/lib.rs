//! Firecrawl WASM Tool for IronClaw.
//!
//! Wraps the Firecrawl v2 API (<https://docs.firecrawl.dev>) so an agent can:
//!
//! - `scrape`        — extract clean markdown/HTML from one URL.
//! - `search`        — discover pages by query (web/news/images).
//! - `map`           — list every URL on a site.
//! - `crawl`         — start a recursive crawl of a whole site (async job).
//! - `crawl_status`  — poll a crawl job for progress and scraped pages.
//!
//! # Authentication
//!
//! Store your Firecrawl API key: `ironclaw tool setup firecrawl-tool`.
//! The host injects it as a Bearer token; this tool never sees the raw value.
//! Get a key at <https://www.firecrawl.dev/app/api-keys>.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{json, Value};

const API_BASE: &str = "https://api.firecrawl.dev/v2";
const SECRET_NAME: &str = "firecrawl_api_key";
const MAX_RETRIES: u32 = 3;

const DEFAULT_SEARCH_LIMIT: u32 = 10;
const MAX_SEARCH_LIMIT: u32 = 100;
const MAX_MAP_LIMIT: u32 = 100_000;
const DEFAULT_MAP_LIMIT: u32 = 1000;
const MIN_TIMEOUT_MS: u32 = 1000;
const MAX_TIMEOUT_MS: u32 = 300_000;
const MAX_WAIT_MS: u32 = 60_000;
const MAX_URL_LEN: usize = 2048;
/// HTTP client timeout for the host call, capped at the caps `timeout_secs` (120s).
/// Must exceed any per-request wait the API itself may take (e.g. scrape `waitFor`).
const HTTP_TIMEOUT_MS: u32 = 120_000;
/// Cap on crawl pages echoed back by `crawl_status` to keep output bounded.
const MAX_CRAWL_PAGES: usize = 25;

struct FirecrawlTool;

impl exports::near::agent::tool::Guest for FirecrawlTool {
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
        "Scrape, search, map, and crawl the web with Firecrawl. Actions: 'scrape' \
         (clean markdown for one URL), 'search' (find pages by query), 'map' (list \
         all URLs on a site), 'crawl' (start a recursive site crawl), 'crawl_status' \
         (poll a crawl job). Authentication uses the 'firecrawl_api_key' secret \
         injected by the host as a Bearer token."
            .to_string()
    }
}

/// Tool actions. The model selects one via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    Scrape {
        url: String,
        #[serde(default)]
        formats: Option<Vec<String>>,
        #[serde(default)]
        only_main_content: Option<bool>,
        #[serde(default)]
        wait_for: Option<u32>,
        #[serde(default)]
        timeout: Option<u32>,
    },
    Search {
        query: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        sources: Option<Vec<String>>,
    },
    Map {
        url: String,
        #[serde(default)]
        search: Option<String>,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        include_subdomains: Option<bool>,
    },
    Crawl {
        url: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        max_depth: Option<u32>,
    },
    CrawlStatus {
        id: String,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!("Invalid parameters: {e}. Provide an 'action' field (one of: scrape, search, map, crawl, crawl_status).")
    })?;

    // Pre-flight: verify the API key is configured before any network call.
    if !near::agent::host::secret_exists(SECRET_NAME) {
        return Err(format!(
            "Firecrawl API key not found. Set it with: ironclaw tool setup firecrawl-tool. \
             Get a key at https://www.firecrawl.dev/app/api-keys"
        ));
    }

    match action {
        Action::Scrape {
            url,
            formats,
            only_main_content,
            wait_for,
            timeout,
        } => {
            let url = validate_url(&url)?;
            let body = scrape_body(url, formats, only_main_content, wait_for, timeout);
            let resp = post_json("/scrape", &body)?;
            shape_scrape(url, &resp)
        }
        Action::Search {
            query,
            limit,
            sources,
        } => {
            if query.trim().is_empty() {
                return Err("'query' must not be empty".into());
            }
            if query.len() > 500 {
                return Err("'query' exceeds maximum length of 500 characters".into());
            }
            let body = search_body(&query, limit, sources);
            let resp = post_json("/search", &body)?;
            shape_search(&query, &resp)
        }
        Action::Map {
            url,
            search,
            limit,
            include_subdomains,
        } => {
            let url = validate_url(&url)?;
            let body = map_body(url, search.as_deref(), limit, include_subdomains);
            let resp = post_json("/map", &body)?;
            shape_map(url, &resp)
        }
        Action::Crawl {
            url,
            limit,
            max_depth,
        } => {
            let url = validate_url(&url)?;
            let body = crawl_body(url, limit, max_depth);
            let resp = post_json("/crawl", &body)?;
            shape_crawl_start(url, &resp)
        }
        Action::CrawlStatus { id } => {
            let id = validate_job_id(&id)?;
            let resp = get_json(&format!("/crawl/{id}"))?;
            shape_crawl_status(id, &resp)
        }
    }
}

// ==================== Request body builders ====================

fn scrape_body(
    url: &str,
    formats: Option<Vec<String>>,
    only_main_content: Option<bool>,
    wait_for: Option<u32>,
    timeout: Option<u32>,
) -> Value {
    let mut body = json!({
        "url": url,
        "formats": formats.unwrap_or_else(|| vec!["markdown".to_string()]),
    });
    if let Some(omc) = only_main_content {
        body["onlyMainContent"] = json!(omc);
    }
    if let Some(w) = wait_for {
        body["waitFor"] = json!(w.min(MAX_WAIT_MS));
    }
    if let Some(t) = timeout {
        body["timeout"] = json!(t.clamp(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS));
    }
    body
}

fn search_body(query: &str, limit: Option<u32>, sources: Option<Vec<String>>) -> Value {
    let mut body = json!({
        "query": query,
        "limit": limit.unwrap_or(DEFAULT_SEARCH_LIMIT).clamp(1, MAX_SEARCH_LIMIT),
    });
    if let Some(sources) = sources {
        let typed: Vec<Value> = sources.into_iter().map(|s| json!({ "type": s })).collect();
        if !typed.is_empty() {
            body["sources"] = json!(typed);
        }
    }
    body
}

fn map_body(
    url: &str,
    search: Option<&str>,
    limit: Option<u32>,
    include_subdomains: Option<bool>,
) -> Value {
    let mut body = json!({
        "url": url,
        "limit": limit.unwrap_or(DEFAULT_MAP_LIMIT).clamp(1, MAX_MAP_LIMIT),
    });
    if let Some(s) = search {
        body["search"] = json!(s);
    }
    if let Some(sub) = include_subdomains {
        body["includeSubdomains"] = json!(sub);
    }
    body
}

fn crawl_body(url: &str, limit: Option<u32>, max_depth: Option<u32>) -> Value {
    let mut body = json!({
        "url": url,
        "limit": limit.unwrap_or(100).clamp(1, 10_000),
    });
    if let Some(d) = max_depth {
        body["maxDiscoveryDepth"] = json!(d);
    }
    body
}

// ==================== Response shapers ====================

fn shape_scrape(url: &str, resp: &Value) -> Result<String, String> {
    let data = resp
        .get("data")
        .ok_or("Unexpected Firecrawl response: missing 'data'")?;
    let out = json!({
        "source_url": url,
        "markdown": data.get("markdown"),
        "html": data.get("html"),
        "links": data.get("links"),
        "metadata": data.get("metadata"),
    });
    serialize(&out)
}

fn shape_search(query: &str, resp: &Value) -> Result<String, String> {
    let data = resp
        .get("data")
        .and_then(Value::as_object)
        .ok_or("Unexpected Firecrawl search response: missing 'data'")?;

    let mut sources = serde_json::Map::new();
    let mut total = 0usize;
    for (source, results) in data {
        if let Some(arr) = results.as_array() {
            total += arr.len();
            let compact: Vec<Value> = arr.iter().map(compact_result).collect();
            sources.insert(source.clone(), Value::Array(compact));
        }
    }

    let out = json!({
        "query": query,
        "result_count": total,
        "credits_used": resp.get("creditsUsed"),
        "results": sources,
    });
    serialize(&out)
}

fn compact_result(result: &Value) -> Value {
    let mut entry = json!({
        "title": result.get("title"),
        "url": result.get("url"),
        "description": result.get("description"),
    });
    // Only present when the caller requested scrapeOptions.
    if let Some(md) = result.get("markdown") {
        entry["markdown"] = md.clone();
    }
    entry
}

fn shape_map(url: &str, resp: &Value) -> Result<String, String> {
    let links = resp.get("links").cloned().unwrap_or(Value::Array(vec![]));
    let count = links.as_array().map(|a| a.len()).unwrap_or(0);
    let out = json!({
        "source_url": url,
        "link_count": count,
        "links": links,
    });
    serialize(&out)
}

fn shape_crawl_start(url: &str, resp: &Value) -> Result<String, String> {
    let id = resp.get("id").and_then(Value::as_str).ok_or(
        "Firecrawl crawl did not return a job id; cannot track this crawl",
    )?;
    let out = json!({
        "source_url": url,
        "crawl_id": id,
        "status": "started",
        "note": format!(
            "Crawl started. Poll progress with {{\"action\":\"crawl_status\",\"id\":\"{id}\"}}."
        ),
    });
    serialize(&out)
}

fn shape_crawl_status(id: &str, resp: &Value) -> Result<String, String> {
    let pages = resp.get("data").and_then(Value::as_array);
    let returned: Vec<Value> = pages
        .map(|a| a.iter().take(MAX_CRAWL_PAGES).cloned().collect())
        .unwrap_or_default();
    let total_pages = pages.map(|a| a.len()).unwrap_or(0);

    let out = json!({
        "crawl_id": id,
        "status": resp.get("status"),
        "total": resp.get("total"),
        "completed": resp.get("completed"),
        "credits_used": resp.get("creditsUsed"),
        "pages_returned": returned.len(),
        "pages_truncated": total_pages > returned.len(),
        "pages": returned,
    });
    serialize(&out)
}

// ==================== HTTP helpers ====================

fn post_json(path: &str, body: &Value) -> Result<Value, String> {
    let url = format!("{API_BASE}{path}");
    let headers = json!({
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "IronClaw-Firecrawl-Tool/0.1"
    });
    let body_bytes = serde_json::to_vec(body).map_err(|e| format!("Failed to encode body: {e}"))?;
    request("POST", &url, &headers.to_string(), Some(body_bytes))
}

fn get_json(path: &str) -> Result<Value, String> {
    let url = format!("{API_BASE}{path}");
    let headers = json!({
        "Accept": "application/json",
        "User-Agent": "IronClaw-Firecrawl-Tool/0.1"
    });
    request("GET", &url, &headers.to_string(), None)
}

fn request(method: &str, url: &str, headers: &str, body: Option<Vec<u8>>) -> Result<Value, String> {
    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        // Authorization (Bearer) is injected by the host credential config.
        // Pass an explicit timeout: the host defaults to 30s, which is shorter than
        // a scrape's `waitFor`/`timeout` can legitimately run, so slow scrapes would
        // be killed mid-flight. The host caps this at the caps `timeout_secs`.
        let resp = near::agent::host::http_request(
            method,
            url,
            headers,
            body.as_deref(),
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
                    "Firecrawl {method} {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        return Err(sanitize_error(resp.status, &resp.body));
    };

    let text =
        String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Failed to parse Firecrawl response: {e}"))
}

/// Produce a stable, non-leaky error message from a failed Firecrawl response.
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
            "Firecrawl rejected the API key (HTTP {status}). Check 'firecrawl_api_key'. Detail: {detail}"
        ),
        402 => format!("Firecrawl payment required (HTTP 402): out of credits. Detail: {detail}"),
        404 => format!("Firecrawl resource not found (HTTP 404): {detail}"),
        429 => format!("Firecrawl rate limit exceeded (HTTP 429): {detail}"),
        _ => format!("Firecrawl request failed (HTTP {status}): {detail}"),
    }
}

// ==================== Validation ====================

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

/// Validate a crawl job id before interpolating it into the request path.
fn validate_job_id(id: &str) -> Result<&str, String> {
    let id = id.trim();
    if id.is_empty() {
        return Err("'id' must not be empty".into());
    }
    if id.len() > 128 {
        return Err("'id' exceeds maximum length of 128 characters".into());
    }
    if !id.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_')) {
        return Err(format!(
            "Invalid crawl 'id' '{id}': only letters, digits, '-', and '_' are allowed"
        ));
    }
    Ok(id)
}

fn serialize(value: &Value) -> Result<String, String> {
    serde_json::to_string(value).map_err(|e| format!("Failed to serialize output: {e}"))
}

// NOTE: This schema uses the top-level `required` + `oneOf` (per-action branch)
// shape, matching the github tool. The host forwards only the fields named in the
// matching branch's `required` set; a flat schema with `required: ["action"]` alone
// causes every other argument (url, query, id, ...) to be stripped before the tool
// sees it. Each branch therefore re-lists `action` plus that action's mandatory
// fields. Do NOT add a top-level `additionalProperties: false`: with per-branch
// properties it would reject every real argument.
const SCHEMA: &str = r#"{
    "type": "object",
    "required": ["action"],
    "oneOf": [
        {
            "properties": {
                "action": { "const": "scrape" },
                "url": { "type": "string", "description": "Target URL (http/https) to scrape." },
                "formats": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Output formats, e.g. [\"markdown\"], [\"markdown\",\"html\"]. Default [\"markdown\"]."
                },
                "only_main_content": { "type": "boolean", "description": "Strip nav/header/footer boilerplate (default true)." },
                "wait_for": { "type": "integer", "minimum": 0, "maximum": 60000, "description": "Milliseconds to wait for JS before extracting (max 60000)." },
                "timeout": { "type": "integer", "minimum": 1000, "maximum": 300000, "description": "Request timeout in milliseconds (1000-300000)." }
            },
            "required": ["action", "url"]
        },
        {
            "properties": {
                "action": { "const": "search" },
                "query": { "type": "string", "description": "Search query (max 500 chars)." },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "description": "Max results (1-100, default 10)." },
                "sources": {
                    "type": "array",
                    "items": { "type": "string", "enum": ["web", "news", "images"] },
                    "description": "Which result types to return (default [\"web\"])."
                }
            },
            "required": ["action", "query"]
        },
        {
            "properties": {
                "action": { "const": "map" },
                "url": { "type": "string", "description": "Target site URL (http/https) to map." },
                "search": { "type": "string", "description": "Optional query to order discovered URLs by relevance." },
                "limit": { "type": "integer", "minimum": 1, "description": "Max URLs to return (default 1000)." },
                "include_subdomains": { "type": "boolean", "description": "Include subdomains in discovered URLs (default true)." }
            },
            "required": ["action", "url"]
        },
        {
            "properties": {
                "action": { "const": "crawl" },
                "url": { "type": "string", "description": "Start URL (http/https) for the recursive crawl." },
                "limit": { "type": "integer", "minimum": 1, "description": "Max pages to crawl (default 100)." },
                "max_depth": { "type": "integer", "minimum": 1, "description": "Maximum link-discovery depth from the start URL." }
            },
            "required": ["action", "url"]
        },
        {
            "properties": {
                "action": { "const": "crawl_status" },
                "id": { "type": "string", "description": "The crawl_id returned by a 'crawl' call." }
            },
            "required": ["action", "id"]
        }
    ]
}"#;

export!(FirecrawlTool);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_is_valid_json() {
        let v: Value = serde_json::from_str(SCHEMA).expect("schema must be valid JSON");
        assert_eq!(v["type"], "object");
        assert_eq!(v["required"][0], "action");
        // Per-action `oneOf` branches each re-list their mandatory fields so the host
        // forwards them (a flat `required: ["action"]` strips every other argument).
        let branches = v["oneOf"].as_array().expect("oneOf must be an array");
        assert_eq!(branches.len(), 5);
        for b in branches {
            let req = b["required"].as_array().expect("branch needs required[]");
            assert_eq!(req[0], "action");
            // action is pinned to a const matching one tool action.
            assert!(b["properties"]["action"]["const"].is_string());
        }
    }

    #[test]
    fn action_deserializes_each_variant() {
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"scrape","url":"https://x.com"}"#),
            Ok(Action::Scrape { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"search","query":"rust"}"#),
            Ok(Action::Search { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"map","url":"https://x.com"}"#),
            Ok(Action::Map { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"crawl","url":"https://x.com"}"#),
            Ok(Action::Crawl { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"crawl_status","id":"abc-123"}"#),
            Ok(Action::CrawlStatus { .. })
        ));
    }

    #[test]
    fn scrape_and_others_require_their_fields() {
        assert!(serde_json::from_str::<Action>(r#"{"action":"scrape"}"#).is_err());
        assert!(serde_json::from_str::<Action>(r#"{"action":"search"}"#).is_err());
        assert!(serde_json::from_str::<Action>(r#"{"action":"crawl_status"}"#).is_err());
    }

    #[test]
    fn validate_url_accepts_http_and_https() {
        assert_eq!(validate_url("https://example.com"), Ok("https://example.com"));
        assert_eq!(validate_url("  http://x.io/p  "), Ok("http://x.io/p"));
    }

    #[test]
    fn validate_url_rejects_bad() {
        assert!(validate_url("").is_err());
        assert!(validate_url("ftp://x.com").is_err());
        assert!(validate_url("example.com").is_err());
        assert!(validate_url(&format!("https://x.com/{}", "a".repeat(3000))).is_err());
    }

    #[test]
    fn validate_job_id_rules() {
        assert_eq!(validate_job_id("abc-123_DEF"), Ok("abc-123_DEF"));
        assert!(validate_job_id("").is_err());
        assert!(validate_job_id("../escape").is_err());
        assert!(validate_job_id("has space").is_err());
        assert!(validate_job_id("a/b").is_err());
    }

    #[test]
    fn scrape_body_defaults_and_clamps() {
        let b = scrape_body("https://x.com", None, None, None, None);
        assert_eq!(b["url"], "https://x.com");
        assert_eq!(b["formats"][0], "markdown");
        assert!(b.get("timeout").is_none());

        let b = scrape_body(
            "https://x.com",
            Some(vec!["markdown".into(), "html".into()]),
            Some(false),
            Some(999_999),
            Some(10),
        );
        assert_eq!(b["formats"][1], "html");
        assert_eq!(b["onlyMainContent"], false);
        assert_eq!(b["waitFor"], MAX_WAIT_MS); // clamped
        assert_eq!(b["timeout"], MIN_TIMEOUT_MS); // clamped up to minimum
    }

    #[test]
    fn search_body_limit_clamped_and_sources_typed() {
        let b = search_body("q", Some(9999), Some(vec!["web".into(), "news".into()]));
        assert_eq!(b["query"], "q");
        assert_eq!(b["limit"], MAX_SEARCH_LIMIT);
        assert_eq!(b["sources"][0]["type"], "web");
        assert_eq!(b["sources"][1]["type"], "news");

        let b = search_body("q", None, None);
        assert_eq!(b["limit"], DEFAULT_SEARCH_LIMIT);
        assert!(b.get("sources").is_none());
    }

    #[test]
    fn map_body_builds_options() {
        let b = map_body("https://x.com", Some("blog"), Some(50), Some(false));
        assert_eq!(b["url"], "https://x.com");
        assert_eq!(b["search"], "blog");
        assert_eq!(b["limit"], 50);
        assert_eq!(b["includeSubdomains"], false);
    }

    #[test]
    fn crawl_body_builds_options() {
        let b = crawl_body("https://x.com", Some(50), Some(3));
        assert_eq!(b["limit"], 50);
        assert_eq!(b["maxDiscoveryDepth"], 3);
    }

    #[test]
    fn shape_scrape_extracts_data() {
        let resp = json!({
            "success": true,
            "data": {
                "markdown": "# Hello",
                "metadata": { "title": "T", "statusCode": 200 },
                "links": ["https://x.com/a"]
            }
        });
        let out: Value = serde_json::from_str(&shape_scrape("https://x.com", &resp).unwrap()).unwrap();
        assert_eq!(out["markdown"], "# Hello");
        assert_eq!(out["metadata"]["title"], "T");
        assert_eq!(out["source_url"], "https://x.com");
    }

    #[test]
    fn shape_search_counts_and_compacts() {
        let resp = json!({
            "success": true,
            "creditsUsed": 2,
            "data": {
                "web": [
                    { "title": "A", "url": "https://a.com", "description": "d", "extra": "drop?" }
                ],
                "news": [
                    { "title": "B", "url": "https://b.com", "description": "n" }
                ]
            }
        });
        let out: Value = serde_json::from_str(&shape_search("q", &resp).unwrap()).unwrap();
        assert_eq!(out["result_count"], 2);
        assert_eq!(out["credits_used"], 2);
        assert_eq!(out["results"]["web"][0]["title"], "A");
        // compact_result keeps only known keys
        assert!(out["results"]["web"][0].get("extra").is_none());
    }

    #[test]
    fn shape_crawl_start_requires_id() {
        let ok = json!({ "success": true, "id": "job-1" });
        let out: Value = serde_json::from_str(&shape_crawl_start("https://x.com", &ok).unwrap()).unwrap();
        assert_eq!(out["crawl_id"], "job-1");
        assert_eq!(out["status"], "started");

        let missing = json!({ "success": true });
        assert!(shape_crawl_start("https://x.com", &missing).is_err());
    }

    #[test]
    fn shape_crawl_status_truncates_pages() {
        let pages: Vec<Value> = (0..40).map(|i| json!({ "markdown": format!("p{i}") })).collect();
        let resp = json!({
            "status": "scraping",
            "total": 40,
            "completed": 40,
            "data": pages
        });
        let out: Value = serde_json::from_str(&shape_crawl_status("job-1", &resp).unwrap()).unwrap();
        assert_eq!(out["pages_returned"], MAX_CRAWL_PAGES);
        assert_eq!(out["pages_truncated"], true);
        assert_eq!(out["status"], "scraping");
    }
}
