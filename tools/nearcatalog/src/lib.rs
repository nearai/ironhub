//! NEAR Catalog WASM Tool for IronClaw.
//!
//! Lets an agent explore the NEAR ecosystem from public, unauthenticated data
//! sources:
//!
//! - NEAR Catalog API (`api.nearcatalog.xyz`) — apps/dApps, categories, and full
//!   project profiles.
//! - NEAR Catalog People (`nearcatalog-people` repo) — people building on NEAR.
//! - Awesome NEAR (`awesome-near` repo) — curated OSS frameworks and libraries.
//!
//! No credentials are required. Network access is restricted to the hosts
//! declared in `nearcatalog-tool.capabilities.json`.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::Value;

const API_BASE: &str = "https://api.nearcatalog.xyz";
const PEOPLE_URL: &str =
    "https://raw.githubusercontent.com/nearcatalog/nearcatalog-people/main/people-on-near.json";
const OSS_URL: &str = "https://raw.githubusercontent.com/nearcatalog/awesome-near/master/README.md";

const DEFAULT_LIMIT: usize = 25;
const MAX_LIMIT: usize = 100;
const MAX_RETRIES: u32 = 3;
/// Upper bound on the markdown returned by `list_oss` to keep output bounded.
const MAX_OSS_CHARS: usize = 20_000;

struct NearCatalogTool;

impl exports::near::agent::tool::Guest for NearCatalogTool {
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
        "Explore the NEAR ecosystem. Actions: 'list_projects' (browse the catalog; \
         optional server-side 'status'/'phase' filters), 'search' (server-side \
         keyword search across project profiles — prefer this for lookups), \
         'get_project' (full profile for one project slug), 'related_projects' \
         (projects related to a slug), 'list_categories' (all catalog categories), \
         'projects_by_category' (projects in a category slug), 'trending' \
         (currently trending projects), 'search_people' (people building on \
         NEAR), 'list_oss' \
         (curated awesome-near OSS frameworks and libraries). All data is public \
         NEAR Catalog data; no authentication is required."
            .to_string()
    }
}

/// Tool actions. The model selects one via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    /// Browse the catalog. `query` is a client-side filter; `status`/`phase` are
    /// server-side filters. Prefer `search` for keyword lookups.
    ListProjects {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        status: Option<String>,
        #[serde(default)]
        phase: Option<String>,
        #[serde(default)]
        limit: Option<usize>,
    },
    /// Server-side keyword search across project profiles (name/tagline/tags).
    Search {
        query: String,
        #[serde(default)]
        limit: Option<usize>,
    },
    /// Full profile (description, tags, links) for a single project slug.
    GetProject { slug: String },
    /// Projects related to / recommended for a given project slug.
    RelatedProjects {
        slug: String,
        #[serde(default)]
        limit: Option<usize>,
    },
    /// All catalog categories as slug → label.
    ListCategories,
    /// Projects within a category slug, or a grouping such as `trending`.
    ProjectsByCategory {
        category: String,
        #[serde(default)]
        limit: Option<usize>,
    },
    /// Currently trending projects in the NEAR ecosystem.
    Trending {
        #[serde(default)]
        limit: Option<usize>,
    },
    /// People building on NEAR, optionally filtered by `query`.
    SearchPeople {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        limit: Option<usize>,
    },
    /// Curated awesome-near OSS frameworks/libraries, optionally filtered by `query`.
    ListOss {
        #[serde(default)]
        query: Option<String>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!("Invalid parameters: {e}. Provide an 'action' field (one of: list_projects, search, get_project, related_projects, list_categories, projects_by_category, trending, search_people, list_oss).")
    })?;

    match action {
        Action::ListProjects {
            query,
            status,
            phase,
            limit,
        } => list_projects(
            query.as_deref(),
            status.as_deref(),
            phase.as_deref(),
            clamp_limit(limit),
        ),
        Action::Search { query, limit } => search_projects(&query, clamp_limit(limit)),
        Action::GetProject { slug } => get_project(&slug),
        Action::RelatedProjects { slug, limit } => related_projects(&slug, clamp_limit(limit)),
        Action::ListCategories => list_categories(),
        Action::ProjectsByCategory { category, limit } => {
            projects_by_category(&category, clamp_limit(limit))
        }
        Action::Trending { limit } => projects_by_category("trending", clamp_limit(limit)),
        Action::SearchPeople { query, limit } => {
            search_people(query.as_deref(), clamp_limit(limit))
        }
        Action::ListOss { query } => list_oss(query.as_deref()),
    }
}

fn clamp_limit(limit: Option<usize>) -> usize {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

// ==================== Actions ====================

fn list_projects(
    query: Option<&str>,
    status: Option<&str>,
    phase: Option<&str>,
    limit: usize,
) -> Result<String, String> {
    let mut params: Vec<String> = Vec::new();
    if let Some(s) = status {
        let s = validate_choice(s, "status", &["active", "inactive"])?;
        params.push(format!("status={}", url_encode(&s)));
    }
    if let Some(p) = phase {
        let p = validate_choice(p, "phase", &["mainnet", "testnet"])?;
        params.push(format!("phase={}", url_encode(&p)));
    }
    let mut url = format!("{API_BASE}/projects");
    if !params.is_empty() {
        url.push('?');
        url.push_str(&params.join("&"));
    }

    let value = http_get_json(&url)?;
    let map = value
        .as_object()
        .ok_or("Unexpected NEAR Catalog response: expected an object of projects")?;

    let (total, projects) = shape_projects(map.values(), query, limit);

    let out = serde_json::json!({
        "query": query,
        "status": status,
        "phase": phase,
        "match_count": total,
        "returned": projects.len(),
        "projects": projects,
    });
    serialize(&out)
}

fn search_projects(keyword: &str, limit: usize) -> Result<String, String> {
    let keyword = keyword.trim();
    if keyword.is_empty() {
        return Err("search requires a non-empty 'query' keyword".into());
    }
    let value = http_get_json(&format!("{API_BASE}/search?kw={}", url_encode(keyword)))?;
    let map = value
        .as_object()
        .ok_or("Unexpected search response: expected an object of projects")?;

    let (total, projects) = shape_projects(map.values(), None, limit);

    let out = serde_json::json!({
        "query": keyword,
        "match_count": total,
        "returned": projects.len(),
        "projects": projects,
    });
    serialize(&out)
}

fn related_projects(slug: &str, limit: usize) -> Result<String, String> {
    let slug = validate_slug(slug)?;
    let value = http_get_json(&format!(
        "{API_BASE}/related-projects?pid={}",
        url_encode(slug)
    ))?;
    let map = value.as_object().ok_or_else(|| {
        format!(
            "No related projects found for slug '{slug}'. Use list_projects or search to discover valid slugs."
        )
    })?;

    let (total, projects) = shape_projects(map.values(), None, limit);

    let out = serde_json::json!({
        "slug": slug,
        "match_count": total,
        "returned": projects.len(),
        "projects": projects,
    });
    serialize(&out)
}

fn get_project(slug: &str) -> Result<String, String> {
    let slug = validate_slug(slug)?;
    let value = http_get_json(&format!("{API_BASE}/project?pid={}", url_encode(slug)))?;

    // The API returns `false` (or an empty body) for unknown slugs.
    if value.get("profile").is_none() {
        return Err(format!(
            "No NEAR Catalog project found for slug '{slug}'. Use list_projects to discover valid slugs."
        ));
    }
    serialize(&value)
}

fn list_categories() -> Result<String, String> {
    let value = http_get_json(&format!("{API_BASE}/categories"))?;
    let map = value
        .as_object()
        .ok_or("Unexpected categories response: expected an object")?;

    let categories: Vec<Value> = map
        .iter()
        .map(|(slug, label)| {
            serde_json::json!({
                "slug": slug,
                "label": label.as_str().unwrap_or(slug),
            })
        })
        .collect();

    let out = serde_json::json!({
        "count": categories.len(),
        "categories": categories,
    });
    serialize(&out)
}

fn projects_by_category(category: &str, limit: usize) -> Result<String, String> {
    let category = validate_slug(category)?;
    let value = http_get_json(&format!(
        "{API_BASE}/projects-by-category?cid={}",
        url_encode(category)
    ))?;

    let data = value.get("data").and_then(Value::as_object).ok_or_else(|| {
        format!(
            "No projects found for category '{category}'. Use list_categories to discover valid category slugs."
        )
    })?;

    let (total, projects) = shape_projects(data.values(), None, limit);

    let out = serde_json::json!({
        "category": category,
        "category_title": value.get("cat_title").and_then(Value::as_str),
        "match_count": total,
        "returned": projects.len(),
        "projects": projects,
    });
    serialize(&out)
}

fn search_people(query: Option<&str>, limit: usize) -> Result<String, String> {
    let value = http_get_json(PEOPLE_URL)?;
    let people = value
        .as_array()
        .ok_or("Unexpected people response: expected an array")?;

    let mut matched: Vec<Value> = people
        .iter()
        .filter(|p| person_matches(p, query))
        .map(summarize_person)
        .collect();

    let total = matched.len();
    matched.truncate(limit);

    let out = serde_json::json!({
        "query": query,
        "match_count": total,
        "returned": matched.len(),
        "people": matched,
    });
    serialize(&out)
}

fn list_oss(query: Option<&str>) -> Result<String, String> {
    let markdown = http_get_text(OSS_URL)?;
    let (content, truncated) = filter_oss(&markdown, query);

    let out = serde_json::json!({
        "source": "https://github.com/nearcatalog/awesome-near",
        "query": query,
        "truncated": truncated,
        "markdown": content,
    });
    serialize(&out)
}

// ==================== Matching / shaping helpers ====================

/// Filter (client-side), summarize, name-sort, and truncate a set of raw project
/// entries. Returns the pre-truncation match count and the trimmed summaries.
fn shape_projects<'a, I>(entries: I, query: Option<&str>, limit: usize) -> (usize, Vec<Value>)
where
    I: Iterator<Item = &'a Value>,
{
    let mut projects: Vec<Value> = entries
        .filter(|p| project_matches(p, query))
        .map(summarize_project)
        .collect();
    let total = projects.len();
    projects.sort_by_key(project_name);
    projects.truncate(limit);
    (total, projects)
}

/// True if a project's name, tagline, or tag labels contain `query` (case-insensitive).
fn project_matches(project: &Value, query: Option<&str>) -> bool {
    let Some(q) = query.map(|s| s.to_lowercase()).filter(|s| !s.is_empty()) else {
        return true;
    };
    let profile = project.get("profile").unwrap_or(&Value::Null);
    let mut haystack = String::new();
    for key in ["name", "tagline"] {
        if let Some(s) = profile.get(key).and_then(Value::as_str) {
            haystack.push_str(s);
            haystack.push(' ');
        }
    }
    if let Some(tags) = profile.get("tags").and_then(Value::as_object) {
        for label in tags.values().filter_map(Value::as_str) {
            haystack.push_str(label);
            haystack.push(' ');
        }
    }
    haystack.to_lowercase().contains(&q)
}

/// Reduce a raw project entry to a compact summary for list responses.
fn summarize_project(project: &Value) -> Value {
    let profile = project.get("profile").unwrap_or(&Value::Null);
    let tags: Vec<&str> = profile
        .get("tags")
        .and_then(Value::as_object)
        .map(|m| m.values().filter_map(Value::as_str).collect())
        .unwrap_or_default();

    serde_json::json!({
        "slug": project.get("slug").and_then(Value::as_str),
        "name": profile.get("name").and_then(Value::as_str),
        "tagline": profile.get("tagline").and_then(Value::as_str),
        "phase": profile.get("phase").and_then(Value::as_str),
        "status": profile.get("status").and_then(Value::as_str).filter(|s| !s.is_empty()),
        "tags": tags,
        "image": profile.get("image").and_then(|i| i.get("url")).and_then(Value::as_str),
    })
}

fn project_name(project: &Value) -> String {
    project
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_lowercase()
}

/// True if a person's name, organization, job title, or description contains `query`.
fn person_matches(person: &Value, query: Option<&str>) -> bool {
    let Some(q) = query.map(|s| s.to_lowercase()).filter(|s| !s.is_empty()) else {
        return true;
    };
    let mut haystack = String::new();
    for key in ["name", "organization", "team", "jobTitle", "description"] {
        if let Some(s) = person.get(key).and_then(Value::as_str) {
            haystack.push_str(s);
            haystack.push(' ');
        }
    }
    haystack.to_lowercase().contains(&q)
}

/// Keep only the contact-relevant fields of a person record.
fn summarize_person(person: &Value) -> Value {
    let get = |k: &str| person.get(k).and_then(Value::as_str).unwrap_or("");
    serde_json::json!({
        "name": get("name"),
        "organization": get("organization"),
        "job_title": get("jobTitle"),
        "description": get("description"),
        "twitter": get("twitter"),
        "telegram": get("telegram"),
        "website": get("website"),
        "preferred_contact": get("preferredContact"),
    })
}

/// Filter the awesome-near markdown by `query`, keeping matching list items and
/// section headers. Returns the (possibly truncated) content and whether it was
/// truncated.
fn filter_oss(markdown: &str, query: Option<&str>) -> (String, bool) {
    let content = match query.map(|s| s.to_lowercase()).filter(|s| !s.is_empty()) {
        None => markdown.to_string(),
        Some(q) => markdown
            .lines()
            .filter(|line| {
                let trimmed = line.trim_start();
                trimmed.starts_with('#') || line.to_lowercase().contains(&q)
            })
            .collect::<Vec<_>>()
            .join("\n"),
    };

    if content.len() > MAX_OSS_CHARS {
        let mut end = MAX_OSS_CHARS;
        while end > 0 && !content.is_char_boundary(end) {
            end -= 1;
        }
        (content[..end].to_string(), true)
    } else {
        (content, false)
    }
}

// ==================== HTTP helpers ====================

fn http_get_json(url: &str) -> Result<Value, String> {
    let body = http_get_text(url)?;
    serde_json::from_str(&body).map_err(|e| format!("Failed to parse NEAR Catalog response: {e}"))
}

fn http_get_text(url: &str) -> Result<String, String> {
    let headers = serde_json::json!({
        "Accept": "application/json",
        "User-Agent": "IronClaw-NearCatalog-Tool/0.1"
    });

    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        let resp = near::agent::host::http_request("GET", url, &headers.to_string(), None, None)
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        if (200..300).contains(&resp.status) {
            break resp;
        }

        if attempt < MAX_RETRIES && (resp.status == 429 || resp.status >= 500) {
            near::agent::host::log(
                near::agent::host::LogLevel::Warn,
                &format!(
                    "NEAR Catalog request to {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        return Err(format!(
            "NEAR Catalog request failed (HTTP {}): {}",
            resp.status,
            String::from_utf8_lossy(&resp.body)
        ));
    };

    String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))
}

// ==================== Validation / encoding ====================

/// Validate a catalog slug/category id. Slugs are lowercase alphanumerics plus
/// `-`, `_`, and `.` — reject anything that could alter the request path.
fn validate_slug(slug: &str) -> Result<&str, String> {
    let slug = slug.trim();
    if slug.is_empty() {
        return Err("slug must not be empty".into());
    }
    if slug.len() > 128 {
        return Err("slug exceeds maximum length of 128 characters".into());
    }
    if !slug
        .bytes()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || matches!(b, b'-' | b'_' | b'.'))
    {
        return Err(format!(
            "Invalid slug '{slug}': only lowercase letters, digits, '-', '_', and '.' are allowed"
        ));
    }
    Ok(slug)
}

/// Validate a value against a fixed allow-list (case-insensitive). Prevents
/// arbitrary text reaching the request query string.
fn validate_choice(val: &str, field: &str, allowed: &[&str]) -> Result<String, String> {
    let v = val.trim().to_lowercase();
    if allowed.contains(&v.as_str()) {
        Ok(v)
    } else {
        Err(format!(
            "Invalid {field} '{val}': allowed values are {}",
            allowed.join(", ")
        ))
    }
}

/// Percent-encode a string for safe use in a URL query value.
fn url_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 2);
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

fn serialize(value: &Value) -> Result<String, String> {
    serde_json::to_string(value).map_err(|e| format!("Failed to serialize output: {e}"))
}

const SCHEMA: &str = r#"{
    "type": "object",
    "properties": {
        "action": {
            "type": "string",
            "enum": ["list_projects", "search", "get_project", "related_projects", "list_categories", "projects_by_category", "trending", "search_people", "list_oss"],
            "description": "Which NEAR Catalog operation to perform."
        },
        "query": {
            "type": "string",
            "description": "Keyword/filter. REQUIRED for 'search' (server-side keyword match across project profiles — best for finding projects by topic). For 'list_projects' it is a client-side filter over name/tagline/tags. For 'search_people' it matches name/organization/job title/description. For 'list_oss' it keeps matching library lines plus section headers."
        },
        "status": {
            "type": "string",
            "enum": ["active", "inactive"],
            "description": "Optional server-side filter for 'list_projects': operational status."
        },
        "phase": {
            "type": "string",
            "enum": ["mainnet", "testnet"],
            "description": "Optional server-side filter for 'list_projects': ecosystem phase."
        },
        "slug": {
            "type": "string",
            "description": "Project slug for 'get_project' and 'related_projects' (e.g. 'ref-finance'). Lowercase letters, digits, '-', '_', '.'. Discover slugs with 'list_projects' or 'search'."
        },
        "category": {
            "type": "string",
            "description": "For 'projects_by_category': a category slug (e.g. 'ai', 'defi', 'infrastructure') discovered via 'list_categories'. For trending projects use the 'trending' action instead."
        },
        "limit": {
            "type": "integer",
            "description": "Maximum results to return (1-100, default 25). Applies to list_projects, search, related_projects, projects_by_category, trending, and search_people.",
            "minimum": 1,
            "maximum": 100,
            "default": 25
        }
    },
    "required": ["action"],
    "additionalProperties": false
}"#;

export!(NearCatalogTool);

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn schema_is_valid_json() {
        let v: Value = serde_json::from_str(SCHEMA).expect("schema must be valid JSON");
        assert_eq!(v["type"], "object");
        assert!(v["properties"]["action"]["enum"].is_array());
    }

    #[test]
    fn action_deserializes_each_variant() {
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"list_projects"}"#),
            Ok(Action::ListProjects { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"get_project","slug":"ref-finance"}"#),
            Ok(Action::GetProject { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"list_categories"}"#),
            Ok(Action::ListCategories)
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"search","query":"privacy"}"#),
            Ok(Action::Search { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"related_projects","slug":"ref-finance"}"#),
            Ok(Action::RelatedProjects { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(
                r#"{"action":"list_projects","status":"active","phase":"mainnet"}"#
            ),
            Ok(Action::ListProjects { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"projects_by_category","category":"ai"}"#),
            Ok(Action::ProjectsByCategory { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"trending"}"#),
            Ok(Action::Trending { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"search_people"}"#),
            Ok(Action::SearchPeople { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"list_oss"}"#),
            Ok(Action::ListOss { .. })
        ));
    }

    #[test]
    fn get_project_requires_slug() {
        assert!(serde_json::from_str::<Action>(r#"{"action":"get_project"}"#).is_err());
    }

    #[test]
    fn search_requires_query() {
        assert!(serde_json::from_str::<Action>(r#"{"action":"search"}"#).is_err());
    }

    #[test]
    fn related_projects_requires_slug() {
        assert!(serde_json::from_str::<Action>(r#"{"action":"related_projects"}"#).is_err());
    }

    #[test]
    fn validate_choice_enforces_allow_list() {
        assert_eq!(
            validate_choice("Active", "status", &["active", "inactive"]),
            Ok("active".to_string())
        );
        assert_eq!(
            validate_choice(" mainnet ", "phase", &["mainnet", "testnet"]),
            Ok("mainnet".to_string())
        );
        assert!(validate_choice("bogus", "status", &["active", "inactive"]).is_err());
        assert!(validate_choice("a&b=c", "phase", &["mainnet", "testnet"]).is_err());
    }

    #[test]
    fn clamp_limit_bounds() {
        assert_eq!(clamp_limit(None), DEFAULT_LIMIT);
        assert_eq!(clamp_limit(Some(0)), 1);
        assert_eq!(clamp_limit(Some(5)), 5);
        assert_eq!(clamp_limit(Some(9999)), MAX_LIMIT);
    }

    #[test]
    fn validate_slug_accepts_valid() {
        assert_eq!(validate_slug("ref-finance"), Ok("ref-finance"));
        assert_eq!(validate_slug("near_ai.v2"), Ok("near_ai.v2"));
        assert_eq!(validate_slug("  trimmed  "), Ok("trimmed"));
    }

    #[test]
    fn validate_slug_rejects_invalid() {
        assert!(validate_slug("").is_err());
        assert!(validate_slug("UpperCase").is_err());
        assert!(validate_slug("path/traversal").is_err());
        assert!(validate_slug("has space").is_err());
        assert!(validate_slug("query=injection").is_err());
    }

    #[test]
    fn url_encode_escapes_query_chars() {
        assert_eq!(url_encode("a b"), "a%20b");
        assert_eq!(url_encode("a&b=c"), "a%26b%3Dc");
        assert_eq!(url_encode("ref-finance"), "ref-finance");
    }

    #[test]
    fn project_matches_filters() {
        let p = json!({
            "slug": "ironclaw",
            "profile": {
                "name": "IronClaw",
                "tagline": "Secure AI agent platform",
                "tags": { "ai": "AI", "bot": "Bot" }
            }
        });
        assert!(project_matches(&p, None));
        assert!(project_matches(&p, Some("ironclaw")));
        assert!(project_matches(&p, Some("secure"))); // tagline
        assert!(project_matches(&p, Some("AI"))); // tag label, case-insensitive
        assert!(!project_matches(&p, Some("defi")));
    }

    #[test]
    fn summarize_project_extracts_fields() {
        let p = json!({
            "slug": "ironclaw",
            "profile": {
                "name": "IronClaw",
                "tagline": "Secure AI",
                "phase": "mainnet",
                "tags": { "ai": "AI" },
                "image": { "url": "https://example.com/i.jpg" }
            }
        });
        let s = summarize_project(&p);
        assert_eq!(s["slug"], "ironclaw");
        assert_eq!(s["name"], "IronClaw");
        assert_eq!(s["phase"], "mainnet");
        assert_eq!(s["tags"][0], "AI");
        assert_eq!(s["image"], "https://example.com/i.jpg");
    }

    #[test]
    fn person_matches_filters() {
        let p = json!({
            "name": "Owen Hassall",
            "organization": "Proximity Labs",
            "jobTitle": "Developer Relations",
            "description": "Shade Agents and Chain Abstraction"
        });
        assert!(person_matches(&p, None));
        assert!(person_matches(&p, Some("proximity")));
        assert!(person_matches(&p, Some("chain abstraction")));
        assert!(!person_matches(&p, Some("nonexistent")));
    }

    #[test]
    fn summarize_person_renames_fields() {
        let p = json!({
            "name": "Owen",
            "organization": "Proximity",
            "jobTitle": "DevRel",
            "twitter": "https://x.com/x"
        });
        let s = summarize_person(&p);
        assert_eq!(s["name"], "Owen");
        assert_eq!(s["job_title"], "DevRel");
        assert_eq!(s["twitter"], "https://x.com/x");
        assert_eq!(s["telegram"], ""); // missing → empty
    }

    #[test]
    fn filter_oss_no_query_returns_all() {
        let md = "# Title\n- lib a\n- lib b";
        let (content, truncated) = filter_oss(md, None);
        assert_eq!(content, md);
        assert!(!truncated);
    }

    #[test]
    fn filter_oss_keeps_headers_and_matches() {
        let md = "# Wallets\n- near-api-js wallet sdk\n- unrelated tool\n## Tools\n- cli helper";
        let (content, _) = filter_oss(md, Some("wallet"));
        assert!(content.contains("# Wallets")); // header kept
        assert!(content.contains("## Tools")); // header kept
        assert!(content.contains("near-api-js")); // matches "wallet"
        assert!(!content.contains("cli helper")); // no match, not a header
    }
}
