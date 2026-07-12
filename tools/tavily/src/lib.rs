//! Tavily WASM Tool for IronClaw.
//!
//! Wraps the Tavily API (<https://docs.tavily.com>) so an agent can:
//!
//! - `search`   — real-time web search returning ranked results + optional AI answer.
//! - `extract`  — extract clean markdown content from specific URLs.
//! - `crawl`    — recursively ingest content across a site from a root URL.
//! - `map`      — discover and list URLs across a site's link structure.
//!
//! # Authentication
//!
//! Store your Tavily API key: `ironclaw tool setup tavily-tool`.
//! The host injects it as a Bearer token; this tool never sees the raw value.
//! Get a key at <https://tavily.com/>.
//!
//! # Schema Design
//!
//! Uses `oneOf` branches per action so the Ironclaw host forwards the full
//! parameter set for the chosen action. A flat schema with only `required:
//! ["action"]` would strip every other argument before `execute` runs.
//!
//! # Response Compaction
//!
//! Responses are projected to agent-friendly JSON: only the fields an LLM
//! needs (title, url, content/raw_content, score, answer). Large page bodies
//! are truncated at MAX_CONTENT_CHARS to prevent context-window overflow.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{json, Value};

const API_BASE: &str = "https://api.tavily.com";
const SECRET_NAME: &str = "tavily_api_key";
const MAX_RETRIES: u32 = 3;
const HTTP_TIMEOUT_MS: u32 = 120_000;

// Search defaults / limits
const DEFAULT_SEARCH_RESULTS: u32 = 5;
const MAX_SEARCH_RESULTS: u32 = 20;

// Extract limits
const MAX_EXTRACT_URLS: usize = 10;

// Crawl limits
const DEFAULT_CRAWL_LIMIT: u32 = 10;
const MAX_CRAWL_LIMIT: u32 = 50;
const DEFAULT_CRAWL_DEPTH: u32 = 1;

// Map limits
const DEFAULT_MAP_DEPTH: u32 = 1;
const MAX_MAP_DEPTH: u32 = 5;

// Response content truncation threshold (chars) to avoid context-window overflow
const MAX_CONTENT_CHARS: usize = 40_000;

// URL validation
const MAX_URL_LEN: usize = 2048;

struct TavilyTool;

impl exports::near::agent::tool::Guest for TavilyTool {
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
        "Search the web, search social media (X, Reddit, LinkedIn, etc.), extract clean page content, \
         crawl domains, and map site structure with Tavily — an LLM-optimized search API. \
         Actions: 'search' (real-time web search with relevance scores and optional AI answer), \
         'social_media_search' (search target social media platforms with optional advanced post text extraction), \
         'extract' (clean markdown from specific URLs, with optional query-focused chunking), \
         'crawl' (recursively ingest content from a site), 'map' (discover URLs across a site). \
         search_depth 'basic'=fast/cheap, 'advanced'=thorough. \
         topic options: 'general' (default), 'news', 'finance'. \
         Authentication uses 'tavily_api_key' injected by the host as a Bearer token."
            .to_string()
    }
}

/// Tool actions. The model selects one via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    /// Search social media platforms.
    SocialMediaSearch {
        /// The search query string (required).
        query: String,
        /// Social media platform to search: "tiktok", "facebook", "instagram", "reddit", "linkedin", "x", "combined". Default "combined".
        #[serde(default)]
        platform: Option<String>,
        /// Max results to return (1–20, default 5).
        #[serde(default)]
        max_results: Option<u32>,
        /// Include AI-synthesized answer summary in results. Default false.
        #[serde(default)]
        include_answer: Option<bool>,
        /// Include full cleaned page content per result. Default false.
        #[serde(default)]
        include_raw_content: Option<bool>,
        /// Include images related to query. Default false.
        #[serde(default)]
        include_images: Option<bool>,
        /// Filter search results by time: "day", "week", "month", "year". Default none.
        #[serde(default)]
        time_range: Option<String>,
    },
    /// Real-time web search returning ranked results.
    Search {
        /// The search query string (required).
        query: String,
        /// Search depth: "basic" (fast, 1 credit) or "advanced" (thorough, 2 credits). Default "advanced".
        #[serde(default)]
        search_depth: Option<String>,
        /// Max results to return (1–20, default 5).
        #[serde(default)]
        max_results: Option<u32>,
        /// Include AI-synthesized answer summary in results. Default false.
        #[serde(default)]
        include_answer: Option<bool>,
        /// Include full cleaned page content per result. Default false.
        #[serde(default)]
        include_raw_content: Option<bool>,
        /// Include images related to query. Default false.
        #[serde(default)]
        include_images: Option<bool>,
        /// Search category: "general" (default), "news", "finance".
        #[serde(default)]
        topic: Option<String>,
        /// Let Tavily auto-configure parameters based on query intent. Default false.
        #[serde(default)]
        auto_parameters: Option<bool>,
    },
    /// Extract clean markdown content from specific URLs.
    Extract {
        /// URLs to extract content from (max 10).
        urls: Vec<String>,
        /// Optional query to filter and rerank relevant chunks per source.
        #[serde(default)]
        query: Option<String>,
        /// Number of content chunks (≤500 chars each) per source when query is provided (default 3).
        #[serde(default)]
        chunks_per_source: Option<u32>,
        /// Extraction depth: "basic" (default) or "advanced" (for JS-heavy pages).
        #[serde(default)]
        extract_depth: Option<String>,
        /// Include images in extraction results. Default false.
        #[serde(default)]
        include_images: Option<bool>,
    },
    /// Recursively ingest content from a site starting at a root URL.
    Crawl {
        /// Root URL to start crawling from.
        url: String,
        /// Maximum link depth from root URL (default 1).
        #[serde(default)]
        max_depth: Option<u32>,
        /// Maximum pages to crawl (1–50, default 10).
        #[serde(default)]
        limit: Option<u32>,
        /// Restrict crawl to these URL path prefixes (e.g. ["/docs/", "/blog/"]).
        #[serde(default)]
        select_paths: Option<Vec<String>>,
        /// Skip these URL path prefixes during crawl.
        #[serde(default)]
        exclude_paths: Option<Vec<String>>,
    },
    /// Discover and list URLs across a site's link structure without extracting content.
    Map {
        /// Root URL to start mapping from.
        url: String,
        /// Maximum link depth to traverse (1–5, default 1).
        #[serde(default)]
        max_depth: Option<u32>,
        /// Natural language instructions to guide the mapper's focus. Note: doubles credit cost.
        #[serde(default)]
        instructions: Option<String>,
        /// Maximum concurrent paths explored.
        #[serde(default)]
        max_breadth: Option<u32>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid parameters: {e}. Provide an 'action' field \
             (one of: search, extract, crawl, map)."
        )
    })?;

    // Pre-flight: verify the API key is configured before any network call.
    if !near::agent::host::secret_exists(SECRET_NAME) {
        return Err(
            "Tavily API key not found. Set it with: ironclaw tool setup tavily-tool. \
             Get a key at https://tavily.com/ (starts with 'tvly-')."
                .to_string(),
        );
    }

    match action {
        Action::SocialMediaSearch {
            query,
            platform,
            max_results,
            include_answer,
            include_raw_content,
            include_images,
            time_range,
        } => {
            validate_non_empty(&query, "query")?;
            if query.len() > 500 {
                return Err("'query' must not exceed 500 characters".into());
            }

            let p_str = platform.unwrap_or_else(|| "combined".to_string());
            let domains = match p_str.as_str() {
                "tiktok" => vec!["tiktok.com".to_string()],
                "facebook" => vec!["facebook.com".to_string()],
                "instagram" => vec!["instagram.com".to_string()],
                "reddit" => vec!["reddit.com".to_string()],
                "linkedin" => vec!["linkedin.com".to_string()],
                "x" => vec!["x.com".to_string()],
                "combined" => vec![
                    "tiktok.com".to_string(),
                    "facebook.com".to_string(),
                    "instagram.com".to_string(),
                    "reddit.com".to_string(),
                    "linkedin.com".to_string(),
                    "x.com".to_string(),
                ],
                _ => return Err(format!("Invalid platform '{p_str}'. Must be one of: tiktok, facebook, instagram, reddit, linkedin, x, combined.")),
            };

            let results_limit = max_results.unwrap_or(DEFAULT_SEARCH_RESULTS).clamp(1, MAX_SEARCH_RESULTS);

            let mut body = json!({
                "query": query,
                "search_depth": "basic",
                "max_results": results_limit,
                "include_domains": domains,
            });

            if let Some(v) = include_answer {
                body["include_answer"] = json!(v);
            }
            if let Some(tr) = time_range {
                match tr.as_str() {
                    "day" | "week" | "month" | "year" => {
                        body["time_range"] = json!(tr);
                    }
                    _ => return Err(format!("Invalid time_range '{tr}'. Must be one of: day, week, month, year.")),
                }
            }

            if include_images.unwrap_or(false) && !include_raw_content.unwrap_or(false) {
                body["include_images"] = json!(true);
            }

            near::agent::host::log(
                near::agent::host::LogLevel::Debug,
                &format!("tavily social_media_search: query={query:?}, platform={p_str}"),
            );

            let mut search_resp = post_json("/search", &body)?;

            if include_raw_content.unwrap_or(false) {
                if let Some(results) = search_resp.get_mut("results").and_then(Value::as_array_mut) {
                    let urls: Vec<String> = results.iter()
                        .filter_map(|r| r.get("url").and_then(Value::as_str).map(|s| s.to_string()))
                        .collect();

                    if !urls.is_empty() {
                        let extract_body = json!({
                            "urls": urls,
                            "extract_depth": "advanced",
                            "include_images": include_images.unwrap_or(false),
                        });
                        near::agent::host::log(
                            near::agent::host::LogLevel::Debug,
                            &format!("tavily social_media_search extract phase: {} urls", urls.len()),
                        );
                        if let Ok(extract_resp) = post_json("/extract", &extract_body) {
                            if let Some(extract_results) = extract_resp.get("results").and_then(Value::as_array) {
                                use std::collections::HashMap;
                                let mut extract_map = HashMap::new();
                                for r in extract_results {
                                    if let Some(url) = r.get("url").and_then(Value::as_str) {
                                        let raw_content = r.get("raw_content").cloned().unwrap_or(Value::Null);
                                        let images = r.get("images").cloned().unwrap_or(Value::Null);
                                        extract_map.insert(url.to_string(), (raw_content, images));
                                    }
                                }
                                for r in results {
                                    if let Some(url) = r.get("url").and_then(Value::as_str) {
                                        if let Some((raw_content, images)) = extract_map.get(url) {
                                            r["raw_content"] = raw_content.clone();
                                            if !images.is_null() && !images.as_array().map(|a| a.is_empty()).unwrap_or(true) {
                                                r["images"] = images.clone();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            shape_search(&query, &search_resp)
        }
        Action::Search {
            query,
            search_depth,
            max_results,
            include_answer,
            include_raw_content,
            include_images,
            topic,
            auto_parameters,
        } => {
            validate_non_empty(&query, "query")?;
            if query.len() > 500 {
                return Err("'query' must not exceed 500 characters".into());
            }
            let body = search_body(
                &query,
                SearchParams {
                    search_depth,
                    max_results,
                    include_answer,
                    include_raw_content,
                    include_images,
                    topic,
                    auto_parameters,
                },
            );
            near::agent::host::log(
                near::agent::host::LogLevel::Debug,
                &format!("tavily search: query={query:?}"),
            );
            let resp = post_json("/search", &body)?;
            shape_search(&query, &resp)
        }
        Action::Extract {
            urls,
            query,
            chunks_per_source,
            extract_depth,
            include_images,
        } => {
            if urls.is_empty() {
                return Err("'urls' must not be empty".into());
            }
            if urls.len() > MAX_EXTRACT_URLS {
                return Err(format!(
                    "'urls' must contain at most {MAX_EXTRACT_URLS} URLs, got {}",
                    urls.len()
                ));
            }
            for u in &urls {
                validate_url(u)?;
            }
            let body = extract_body(&urls, query.as_deref(), chunks_per_source, extract_depth, include_images);
            near::agent::host::log(
                near::agent::host::LogLevel::Debug,
                &format!("tavily extract: {} urls", urls.len()),
            );
            let resp = post_json("/extract", &body)?;
            shape_extract(&resp)
        }
        Action::Crawl {
            url,
            max_depth,
            limit,
            select_paths,
            exclude_paths,
        } => {
            validate_url(&url)?;
            let body = crawl_body(&url, max_depth, limit, select_paths, exclude_paths);
            near::agent::host::log(
                near::agent::host::LogLevel::Debug,
                &format!("tavily crawl: url={url:?}"),
            );
            let resp = post_json("/crawl", &body)?;
            shape_crawl(&url, &resp)
        }
        Action::Map {
            url,
            max_depth,
            instructions,
            max_breadth,
        } => {
            validate_url(&url)?;
            let body = map_body(&url, max_depth, instructions.as_deref(), max_breadth);
            near::agent::host::log(
                near::agent::host::LogLevel::Debug,
                &format!("tavily map: url={url:?}"),
            );
            let resp = post_json("/map", &body)?;
            shape_map(&url, &resp)
        }
    }
}

// ==================== Request body builders ====================

/// Parameters for the `search` action, extracted to avoid clippy::too_many_arguments.
struct SearchParams {
    search_depth: Option<String>,
    max_results: Option<u32>,
    include_answer: Option<bool>,
    include_raw_content: Option<bool>,
    include_images: Option<bool>,
    topic: Option<String>,
    auto_parameters: Option<bool>,
}

fn search_body(query: &str, p: SearchParams) -> Value {
    let depth = p.search_depth.unwrap_or_else(|| "advanced".to_string());
    // Validate search_depth — default to "advanced" if invalid.
    let depth = if depth == "basic" || depth == "advanced" {
        depth
    } else {
        "advanced".to_string()
    };
    let results = p
        .max_results
        .unwrap_or(DEFAULT_SEARCH_RESULTS)
        .clamp(1, MAX_SEARCH_RESULTS);

    let mut body = json!({
        "query": query,
        "search_depth": depth,
        "max_results": results,
    });

    if let Some(v) = p.include_answer {
        body["include_answer"] = json!(v);
    }
    if let Some(v) = p.include_raw_content {
        body["include_raw_content"] = json!(v);
    }
    if let Some(v) = p.include_images {
        body["include_images"] = json!(v);
    }
    if let Some(t) = p.topic {
        let t = match t.as_str() {
            "news" | "finance" | "general" => t,
            _ => "general".to_string(),
        };
        body["topic"] = json!(t);
    }
    if let Some(v) = p.auto_parameters {
        body["auto_parameters"] = json!(v);
    }
    body
}

fn extract_body(
    urls: &[String],
    query: Option<&str>,
    chunks_per_source: Option<u32>,
    extract_depth: Option<String>,
    include_images: Option<bool>,
) -> Value {
    let mut body = json!({ "urls": urls });
    if let Some(q) = query {
        body["query"] = json!(q);
        body["chunks_per_source"] = json!(chunks_per_source.unwrap_or(3));
    }
    if let Some(d) = extract_depth {
        let d = if d == "advanced" { "advanced" } else { "basic" };
        body["extract_depth"] = json!(d);
    }
    if let Some(v) = include_images {
        body["include_images"] = json!(v);
    }
    body
}

fn crawl_body(
    url: &str,
    max_depth: Option<u32>,
    limit: Option<u32>,
    select_paths: Option<Vec<String>>,
    exclude_paths: Option<Vec<String>>,
) -> Value {
    let mut body = json!({
        "url": url,
        "max_depth": max_depth.unwrap_or(DEFAULT_CRAWL_DEPTH),
        "limit": limit.unwrap_or(DEFAULT_CRAWL_LIMIT).clamp(1, MAX_CRAWL_LIMIT),
    });
    if let Some(paths) = select_paths {
        if !paths.is_empty() {
            body["select_paths"] = json!(paths);
        }
    }
    if let Some(paths) = exclude_paths {
        if !paths.is_empty() {
            body["exclude_paths"] = json!(paths);
        }
    }
    body
}

fn map_body(
    url: &str,
    max_depth: Option<u32>,
    instructions: Option<&str>,
    max_breadth: Option<u32>,
) -> Value {
    let depth = max_depth
        .unwrap_or(DEFAULT_MAP_DEPTH)
        .clamp(1, MAX_MAP_DEPTH);
    let mut body = json!({
        "url": url,
        "max_depth": depth,
    });
    if let Some(ins) = instructions {
        body["instructions"] = json!(ins);
    }
    if let Some(b) = max_breadth {
        body["max_breadth"] = json!(b);
    }
    body
}

// ==================== Response shapers ====================

fn shape_search(query: &str, resp: &Value) -> Result<String, String> {
    let results = resp.get("results").and_then(Value::as_array).cloned().unwrap_or_default();
    let compact: Vec<Value> = results.iter().map(compact_search_result).collect();

    let mut out = json!({
        "query": query,
        "result_count": compact.len(),
        "results": compact,
    });

    // Include AI answer if present.
    if let Some(answer) = resp.get("answer").and_then(Value::as_str) {
        if !answer.is_empty() {
            out["answer"] = json!(answer);
        }
    }

    // Include images if present.
    if let Some(images) = resp.get("images") {
        if images.as_array().map(|a| !a.is_empty()).unwrap_or(false) {
            out["images"] = images.clone();
        }
    }

    serialize(&out)
}

fn compact_search_result(r: &Value) -> Value {
    let mut entry = json!({
        "title": r.get("title"),
        "url": r.get("url"),
        "content": r.get("content"),
        "score": r.get("score"),
    });
    // Include raw_content only if requested by caller (present in response).
    if let Some(raw) = r.get("raw_content") {
        if !raw.is_null() {
            entry["raw_content"] = truncate_value(raw, MAX_CONTENT_CHARS);
        }
    }
    // Include images per-result if present (e.g. from social media extraction phase).
    if let Some(imgs) = r.get("images") {
        if !imgs.is_null() && !imgs.as_array().map(|a| a.is_empty()).unwrap_or(true) {
            entry["images"] = imgs.clone();
        }
    }
    entry
}

fn shape_extract(resp: &Value) -> Result<String, String> {
    let results = resp.get("results").and_then(Value::as_array).cloned().unwrap_or_default();
    let compact: Vec<Value> = results
        .iter()
        .map(|r| {
            let raw = r.get("raw_content");
            json!({
                "url": r.get("url"),
                "raw_content": raw.map(|v| truncate_value(v, MAX_CONTENT_CHARS)),
            })
        })
        .collect();

    let failed = resp.get("failed_results").and_then(Value::as_array).cloned().unwrap_or_default();
    let failed_compact: Vec<Value> = failed
        .iter()
        .map(|r| json!({ "url": r.get("url"), "error": r.get("error") }))
        .collect();

    let out = json!({
        "result_count": compact.len(),
        "results": compact,
        "failed_count": failed_compact.len(),
        "failed_results": failed_compact,
    });
    serialize(&out)
}

fn shape_crawl(url: &str, resp: &Value) -> Result<String, String> {
    let results = resp.get("results").and_then(Value::as_array).cloned().unwrap_or_default();
    let compact: Vec<Value> = results
        .iter()
        .map(|r| {
            json!({
                "url": r.get("url"),
                "raw_content": r.get("raw_content").map(|v| truncate_value(v, MAX_CONTENT_CHARS)),
            })
        })
        .collect();

    let out = json!({
        "base_url": url,
        "page_count": compact.len(),
        "results": compact,
    });
    serialize(&out)
}

fn shape_map(url: &str, resp: &Value) -> Result<String, String> {
    let discovered = resp.get("results").cloned().unwrap_or(Value::Array(vec![]));
    let count = discovered.as_array().map(|a| a.len()).unwrap_or(0);
    let out = json!({
        "base_url": url,
        "url_count": count,
        "urls": discovered,
    });
    serialize(&out)
}

// ==================== HTTP helpers ====================

fn post_json(path: &str, body: &Value) -> Result<Value, String> {
    let url = format!("{API_BASE}{path}");
    let headers = json!({
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "IronClaw-Tavily-Tool/0.1"
    });
    let body_bytes = serde_json::to_vec(body).map_err(|e| format!("Failed to encode body: {e}"))?;
    request("POST", &url, &headers.to_string(), Some(body_bytes))
}

fn request(method: &str, url: &str, headers: &str, body: Option<Vec<u8>>) -> Result<Value, String> {
    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        // Authorization (Bearer) is injected by the host credential config.
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
                    "Tavily {method} {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        return Err(sanitize_error(resp.status, &resp.body));
    };

    let text =
        String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Failed to parse Tavily response: {e}"))
}

/// Build a readable, non-leaky error message from a failed Tavily response.
fn sanitize_error(status: u16, body: &[u8]) -> String {
    let detail = serde_json::from_slice::<Value>(body)
        .ok()
        .and_then(|v| {
            v.get("detail")
                .or_else(|| v.get("error"))
                .or_else(|| v.get("message"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| String::from_utf8_lossy(body).chars().take(300).collect());

    match status {
        401 | 403 => format!(
            "Tavily rejected the API key (HTTP {status}). \
             Check 'tavily_api_key'. Detail: {detail}"
        ),
        402 => format!("Tavily credits exhausted (HTTP 402). Detail: {detail}"),
        404 => format!("Tavily resource not found (HTTP 404): {detail}"),
        422 => format!("Tavily validation error (HTTP 422): {detail}"),
        429 => format!("Tavily rate limit exceeded (HTTP 429): {detail}"),
        _ => format!("Tavily request failed (HTTP {status}): {detail}"),
    }
}

// ==================== Validation helpers ====================

fn validate_non_empty<'a>(s: &'a str, field: &str) -> Result<&'a str, String> {
    let s = s.trim();
    if s.is_empty() {
        return Err(format!("'{field}' must not be empty"));
    }
    Ok(s)
}

fn validate_url(url: &str) -> Result<&str, String> {
    let url = url.trim();
    if url.is_empty() {
        return Err("URL must not be empty".into());
    }
    if url.len() > MAX_URL_LEN {
        return Err(format!(
            "URL exceeds maximum length of {MAX_URL_LEN} characters"
        ));
    }
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(format!(
            "Invalid URL: must start with http:// or https://, got '{url}'"
        ));
    }
    Ok(url)
}

fn truncate_value(v: &Value, max_chars: usize) -> Value {
    match v.as_str() {
        Some(s) if s.len() > max_chars => {
            let truncated: String = s.chars().take(max_chars).collect();
            json!(format!("{truncated}\n[...truncated at {max_chars} chars]"))
        }
        _ => v.clone(),
    }
}

fn serialize(value: &Value) -> Result<String, String> {
    serde_json::to_string(value).map_err(|e| format!("Failed to serialize output: {e}"))
}

// ==================== JSON Schema ====================
//
// CRITICAL: Uses top-level `required: ["action"]` + per-action `oneOf` branches.
// The host's parameter dispatcher forwards ONLY the fields listed in the matching
// branch's `properties` + `required` to the WASM sandbox. A flat schema would
// strip `query`, `urls`, `url`, etc. before `execute` runs → missing field panics.

const SCHEMA: &str = r#"{
    "type": "object",
    "required": ["action"],
    "oneOf": [
        {
            "properties": {
                "action": { "const": "social_media_search" },
                "query": {
                    "type": "string",
                    "description": "The search query (max 500 chars)."
                },
                "platform": {
                    "type": "string",
                    "enum": ["tiktok", "facebook", "instagram", "reddit", "linkedin", "x", "combined"],
                    "description": "Social media platform to search. Default is 'combined'."
                },
                "max_results": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 20,
                    "description": "Max results to return (1–20, default 5)."
                },
                "include_answer": {
                    "type": "boolean",
                    "description": "Include AI-synthesized answer summary. Default false."
                },
                "include_raw_content": {
                    "type": "boolean",
                    "description": "Include full cleaned page content per result by executing advanced extraction. Default false."
                },
                "include_images": {
                    "type": "boolean",
                    "description": "Include images related to search results. Default false."
                },
                "time_range": {
                    "type": "string",
                    "enum": ["day", "week", "month", "year"],
                    "description": "Filter results by time range (day, week, month, or year). Default is no filter."
                }
            },
            "required": ["action", "query"]
        },
        {
            "properties": {
                "action": { "const": "search" },
                "query": {
                    "type": "string",
                    "description": "The search query (max 500 chars)."
                },
                "search_depth": {
                    "type": "string",
                    "enum": ["basic", "advanced"],
                    "description": "Search depth: 'basic' (fast, 1 credit) or 'advanced' (thorough, 2 credits). Default 'advanced'."
                },
                "max_results": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 20,
                    "description": "Max results to return (1–20, default 5)."
                },
                "include_answer": {
                    "type": "boolean",
                    "description": "Include AI-synthesized answer summary. Default false."
                },
                "include_raw_content": {
                    "type": "boolean",
                    "description": "Include full cleaned page content per result. Default false."
                },
                "include_images": {
                    "type": "boolean",
                    "description": "Include images related to query. Default false."
                },
                "topic": {
                    "type": "string",
                    "enum": ["general", "news", "finance"],
                    "description": "Search category: 'general' (default), 'news', or 'finance'."
                },
                "auto_parameters": {
                    "type": "boolean",
                    "description": "Let Tavily auto-configure search parameters based on query intent. Default false."
                }
            },
            "required": ["action", "query"]
        },
        {
            "properties": {
                "action": { "const": "extract" },
                "urls": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "URLs to extract content from (max 10)."
                },
                "query": {
                    "type": "string",
                    "description": "Optional query to filter and rerank relevant chunks per source."
                },
                "chunks_per_source": {
                    "type": "integer",
                    "minimum": 1,
                    "description": "Number of content chunks (≤500 chars each) per source when query is given (default 3)."
                },
                "extract_depth": {
                    "type": "string",
                    "enum": ["basic", "advanced"],
                    "description": "Extraction depth: 'basic' (default) or 'advanced' for JS-heavy pages."
                },
                "include_images": {
                    "type": "boolean",
                    "description": "Include images in extraction results. Default false."
                }
            },
            "required": ["action", "urls"]
        },
        {
            "properties": {
                "action": { "const": "crawl" },
                "url": {
                    "type": "string",
                    "description": "Root URL (http/https) to start crawling from."
                },
                "max_depth": {
                    "type": "integer",
                    "minimum": 1,
                    "description": "Maximum link depth from root URL (default 1)."
                },
                "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 50,
                    "description": "Maximum pages to crawl (1–50, default 10)."
                },
                "select_paths": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Restrict crawl to these URL path prefixes (e.g. [\"/docs/\", \"/blog/\"])."
                },
                "exclude_paths": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Skip these URL path prefixes during crawl."
                }
            },
            "required": ["action", "url"]
        },
        {
            "properties": {
                "action": { "const": "map" },
                "url": {
                    "type": "string",
                    "description": "Root URL (http/https) to start mapping from."
                },
                "max_depth": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5,
                    "description": "Maximum link depth to traverse (1–5, default 1)."
                },
                "instructions": {
                    "type": "string",
                    "description": "Natural language instructions to guide the mapper's focus. Note: doubles credit cost per 10 pages."
                },
                "max_breadth": {
                    "type": "integer",
                    "minimum": 1,
                    "description": "Maximum concurrent paths explored."
                }
            },
            "required": ["action", "url"]
        }
    ]
}"#;

export!(TavilyTool);

// ==================== Unit Tests ====================
//
// Tests run natively (cargo test). The wit_bindgen host imports are never
// referenced by test code, so no WASM runtime is required.

#[cfg(test)]
mod tests {
    use super::*;

    // ----- Schema -----

    #[test]
    fn schema_is_valid_json() {
        let v: Value = serde_json::from_str(SCHEMA).expect("schema must be valid JSON");
        assert_eq!(v["type"], "object");
        assert_eq!(v["required"][0], "action");
        let branches = v["oneOf"].as_array().expect("oneOf must be an array");
        assert_eq!(branches.len(), 5, "must have 5 action branches");
        for b in branches {
            let req = b["required"].as_array().expect("branch needs required[]");
            assert_eq!(req[0], "action");
            assert!(b["properties"]["action"]["const"].is_string());
        }
    }

    // ----- Action deserialization -----

    #[test]
    fn parse_social_media_search_minimal() {
        let a: Action =
            serde_json::from_str(r#"{"action":"social_media_search","query":"rust lang"}"#).unwrap();
        assert!(matches!(a, Action::SocialMediaSearch { query, .. } if query == "rust lang"));
    }

    #[test]
    fn parse_social_media_search_full() {
        let a: Action = serde_json::from_str(
            r#"{"action":"social_media_search","query":"rust","platform":"reddit",
               "max_results":8,"include_answer":true,"include_raw_content":true,
               "include_images":true,"time_range":"week"}"#,
        )
        .unwrap();
        if let Action::SocialMediaSearch {
            query,
            platform,
            max_results,
            include_answer,
            include_raw_content,
            include_images,
            time_range,
        } = a
        {
            assert_eq!(query, "rust");
            assert_eq!(platform.unwrap(), "reddit");
            assert_eq!(max_results.unwrap(), 8);
            assert!(include_answer.unwrap());
            assert!(include_raw_content.unwrap());
            assert!(include_images.unwrap());
            assert_eq!(time_range.unwrap(), "week");
        } else {
            panic!("wrong variant");
        }
    }

    #[test]
    fn parse_search_minimal() {
        let a: Action =
            serde_json::from_str(r#"{"action":"search","query":"rust lang"}"#).unwrap();
        assert!(matches!(a, Action::Search { query, .. } if query == "rust lang"));
    }

    #[test]
    fn parse_search_full() {
        let a: Action = serde_json::from_str(
            r#"{"action":"search","query":"q","search_depth":"basic","max_results":10,
               "include_answer":true,"topic":"news","auto_parameters":false}"#,
        )
        .unwrap();
        if let Action::Search {
            query,
            search_depth,
            max_results,
            include_answer,
            topic,
            ..
        } = a
        {
            assert_eq!(query, "q");
            assert_eq!(search_depth.unwrap(), "basic");
            assert_eq!(max_results.unwrap(), 10);
            assert!(include_answer.unwrap());
            assert_eq!(topic.unwrap(), "news");
        } else {
            panic!("wrong variant");
        }
    }

    #[test]
    fn parse_extract_minimal() {
        let a: Action = serde_json::from_str(
            r#"{"action":"extract","urls":["https://example.com"]}"#,
        )
        .unwrap();
        assert!(matches!(a, Action::Extract { urls, .. } if urls.len() == 1));
    }

    #[test]
    fn parse_crawl_minimal() {
        let a: Action =
            serde_json::from_str(r#"{"action":"crawl","url":"https://example.com"}"#).unwrap();
        assert!(matches!(a, Action::Crawl { url, .. } if url == "https://example.com"));
    }

    #[test]
    fn parse_map_minimal() {
        let a: Action =
            serde_json::from_str(r#"{"action":"map","url":"https://example.com"}"#).unwrap();
        assert!(matches!(a, Action::Map { url, .. } if url == "https://example.com"));
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(serde_json::from_str::<Action>(r#"{"action":"delete","url":"x"}"#).is_err());
    }

    #[test]
    fn parse_search_missing_required_fails() {
        assert!(serde_json::from_str::<Action>(r#"{"action":"search"}"#).is_err());
    }

    // ----- Body builders -----

    #[test]
    fn search_body_defaults() {
        let b = search_body("q", SearchParams { search_depth: None, max_results: None, include_answer: None, include_raw_content: None, include_images: None, topic: None, auto_parameters: None });
        assert_eq!(b["query"], "q");
        assert_eq!(b["search_depth"], "advanced");
        assert_eq!(b["max_results"], DEFAULT_SEARCH_RESULTS);
        assert!(b.get("include_answer").is_none());
    }

    #[test]
    fn search_body_clamps_results() {
        let b = search_body("q", SearchParams { max_results: Some(9999), search_depth: None, include_answer: None, include_raw_content: None, include_images: None, topic: None, auto_parameters: None });
        assert_eq!(b["max_results"], MAX_SEARCH_RESULTS);
        let b2 = search_body("q", SearchParams { max_results: Some(0), search_depth: None, include_answer: None, include_raw_content: None, include_images: None, topic: None, auto_parameters: None });
        assert_eq!(b2["max_results"], 1u64);
    }

    #[test]
    fn search_body_invalid_depth_defaults_to_advanced() {
        let b = search_body("q", SearchParams { search_depth: Some("ultra".into()), max_results: None, include_answer: None, include_raw_content: None, include_images: None, topic: None, auto_parameters: None });
        assert_eq!(b["search_depth"], "advanced");
    }

    #[test]
    fn search_body_includes_optionals() {
        let b = search_body(
            "q",
            SearchParams {
                search_depth: Some("basic".into()),
                max_results: Some(10),
                include_answer: Some(true),
                include_raw_content: Some(false),
                include_images: None,
                topic: Some("news".into()),
                auto_parameters: Some(true),
            },
        );
        assert_eq!(b["search_depth"], "basic");
        assert_eq!(b["include_answer"], true);
        assert_eq!(b["include_raw_content"], false);
        assert_eq!(b["topic"], "news");
        assert_eq!(b["auto_parameters"], true);
    }

    #[test]
    fn crawl_body_clamps_limit() {
        let b = crawl_body("https://x.com", None, Some(9999), None, None);
        assert_eq!(b["limit"], MAX_CRAWL_LIMIT);
        let b2 = crawl_body("https://x.com", None, Some(0), None, None);
        assert_eq!(b2["limit"], 1u64);
    }

    #[test]
    fn crawl_body_select_paths() {
        let b = crawl_body(
            "https://x.com",
            Some(2),
            Some(20),
            Some(vec!["/docs/".into()]),
            None,
        );
        assert_eq!(b["max_depth"], 2u64);
        assert_eq!(b["select_paths"][0], "/docs/");
    }

    #[test]
    fn map_body_clamps_depth() {
        let b = map_body("https://x.com", Some(99), None, None);
        assert_eq!(b["max_depth"], MAX_MAP_DEPTH);
        let b2 = map_body("https://x.com", Some(0), None, None);
        assert_eq!(b2["max_depth"], 1u64);
    }

    // ----- Response shapers -----

    #[test]
    fn shape_search_extracts_results_and_answer() {
        let resp = json!({
            "query": "test",
            "answer": "This is the AI answer.",
            "results": [
                { "title": "A", "url": "https://a.com", "content": "snippet", "score": 0.9 }
            ]
        });
        let out: Value = serde_json::from_str(&shape_search("test", &resp).unwrap()).unwrap();
        assert_eq!(out["result_count"], 1);
        assert_eq!(out["answer"], "This is the AI answer.");
        assert_eq!(out["results"][0]["title"], "A");
        assert_eq!(out["results"][0]["score"], 0.9_f64);
        // Should NOT include raw_content when absent in result
        assert!(out["results"][0].get("raw_content").is_none());
    }

    #[test]
    fn shape_search_no_answer_when_empty() {
        let resp = json!({ "answer": "", "results": [] });
        let out: Value = serde_json::from_str(&shape_search("q", &resp).unwrap()).unwrap();
        assert!(out.get("answer").is_none());
    }

    #[test]
    fn shape_extract_separates_success_and_failure() {
        let resp = json!({
            "results": [
                { "url": "https://ok.com", "raw_content": "clean content" }
            ],
            "failed_results": [
                { "url": "https://fail.com", "error": "timeout" }
            ]
        });
        let out: Value = serde_json::from_str(&shape_extract(&resp).unwrap()).unwrap();
        assert_eq!(out["result_count"], 1);
        assert_eq!(out["failed_count"], 1);
        assert_eq!(out["results"][0]["raw_content"], "clean content");
        assert_eq!(out["failed_results"][0]["error"], "timeout");
    }

    #[test]
    fn shape_crawl_returns_page_list() {
        let resp = json!({
            "results": [
                { "url": "https://x.com/page1", "raw_content": "body1" },
                { "url": "https://x.com/page2", "raw_content": "body2" }
            ]
        });
        let out: Value = serde_json::from_str(&shape_crawl("https://x.com", &resp).unwrap()).unwrap();
        assert_eq!(out["page_count"], 2);
        assert_eq!(out["base_url"], "https://x.com");
        assert_eq!(out["results"][1]["url"], "https://x.com/page2");
    }

    #[test]
    fn shape_map_returns_urls() {
        let resp = json!({
            "results": ["https://x.com/a", "https://x.com/b"]
        });
        let out: Value = serde_json::from_str(&shape_map("https://x.com", &resp).unwrap()).unwrap();
        assert_eq!(out["url_count"], 2);
        assert_eq!(out["urls"][0], "https://x.com/a");
    }

    // ----- Validation -----

    #[test]
    fn validate_url_accepts_valid() {
        assert_eq!(validate_url("https://example.com"), Ok("https://example.com"));
        assert_eq!(validate_url("  http://x.io/p  "), Ok("http://x.io/p"));
    }

    #[test]
    fn validate_url_rejects_invalid() {
        assert!(validate_url("").is_err());
        assert!(validate_url("ftp://x.com").is_err());
        assert!(validate_url("example.com").is_err());
        assert!(validate_url(&format!("https://x.com/{}", "a".repeat(3000))).is_err());
    }

    #[test]
    fn validate_non_empty_trims_and_checks() {
        assert_eq!(validate_non_empty("  hi  ", "q"), Ok("hi"));
        assert!(validate_non_empty("", "q").is_err());
        assert!(validate_non_empty("   ", "q").is_err());
    }

    // ----- Truncation -----

    #[test]
    fn truncate_value_leaves_short_strings() {
        let v = json!("short text");
        let out = truncate_value(&v, 100);
        assert_eq!(out, json!("short text"));
    }

    #[test]
    fn truncate_value_truncates_long_strings() {
        let long = "a".repeat(MAX_CONTENT_CHARS + 500);
        let v = json!(long);
        let out = truncate_value(&v, MAX_CONTENT_CHARS);
        let s = out.as_str().unwrap();
        assert!(s.len() < long.len());
        assert!(s.contains("[...truncated"));
    }

    #[test]
    fn truncate_value_passes_through_non_strings() {
        let v = json!(42);
        assert_eq!(truncate_value(&v, 10), json!(42));
        let v2 = json!(["a", "b"]);
        assert_eq!(truncate_value(&v2, 5), json!(["a", "b"]));
    }
}
