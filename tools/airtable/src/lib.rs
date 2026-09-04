//! Airtable WASM Tool for IronClaw.
//!
//! Wraps the Airtable REST API (<https://airtable.com/developers/web/api>) so an
//! agent can operate a base as a shared, human-in-the-loop workspace
//! (findings tracker, asset inventory, IOC list, audit log, playbook):
//!
//! - `list_records`   — query a table (view / filter / sort / paging).
//! - `get_record`     — fetch one record by id.
//! - `create_records` — create up to 10 records.
//! - `update_records` — partial-update (PATCH) up to 10 records by id.
//! - `get_schema`     — list tables + fields (Meta API; needs `schema.bases:read`).
//!
//! There is intentionally **no delete** action.
//!
//! # Base & table
//!
//! The WASM sandbox cannot read host-stored config, so the target `base_id` and
//! `table` travel as call params (like firecrawl's `url`). Pass them explicitly,
//! or paste an Airtable URL as `base_url` and the tool extracts the
//! `app…`/`tbl…`/`viw…` ids from it.
//!
//! # Authentication
//!
//! Store an Airtable Personal Access Token: `ironclaw tool setup airtable-tool`.
//! The host injects it as a Bearer token; this tool never sees the raw value.
//! Create one at <https://airtable.com/create/tokens>.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{json, Map, Value};

const API_BASE: &str = "https://api.airtable.com/v0";
#[cfg(not(feature = "reborn"))]
const SECRET_NAME: &str = "airtable_pat";
const MAX_RETRIES: u32 = 3;

/// Airtable's hard ceiling on records per list page and per write request.
const MAX_PAGE_SIZE: u32 = 100;
const MAX_WRITE_BATCH: usize = 10;

struct AirtableTool;

impl exports::near::agent::tool::Guest for AirtableTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        #[cfg(feature = "reborn")]
        let result = execute_reborn(&req.params, req.context.as_deref());
        #[cfg(not(feature = "reborn"))]
        let result = execute_inner(&req.params);

        match result {
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
        "Read and write Airtable records (CRUD minus delete). Actions: 'list_records' \
         (query a table with view/filter/sort/paging), 'get_record' (one record by id), \
         'create_records' (add up to 10), 'update_records' (partial-update up to 10 by \
         id), 'get_schema' (list tables+fields; needs the optional 'schema.bases:read' \
         scope). The base id and table are supplied per call: pass 'base_id'+'table', or \
         paste an Airtable URL as 'base_url'. Authentication uses the 'airtable_pat' \
         Personal Access Token injected by the host as a Bearer token."
            .to_string()
    }
}

/// A sort clause for `list_records`.
#[derive(Debug, Deserialize)]
struct SortClause {
    field: String,
    #[serde(default)]
    direction: Option<String>,
}

/// A structured equality filter. Built into an escaped `filterByFormula` so
/// caller values cannot alter the formula's structure.
#[derive(Debug, Deserialize)]
struct EqualsFilter {
    field: String,
    value: String,
}

/// Tool actions. The model selects one via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    ListRecords {
        #[serde(flatten)]
        target: Target,
        #[serde(default)]
        view: Option<String>,
        #[serde(default)]
        fields: Option<Vec<String>>,
        #[serde(default)]
        filter_by_formula: Option<String>,
        #[serde(default)]
        filter: Option<EqualsFilter>,
        #[serde(default)]
        sort: Option<Vec<SortClause>>,
        #[serde(default)]
        page_size: Option<u32>,
        #[serde(default)]
        max_records: Option<u32>,
        #[serde(default)]
        offset: Option<String>,
    },
    GetRecord {
        #[serde(flatten)]
        target: Target,
        record_id: String,
    },
    CreateRecords {
        #[serde(flatten)]
        target: Target,
        records: Vec<Map<String, Value>>,
        #[serde(default)]
        typecast: Option<bool>,
    },
    UpdateRecords {
        #[serde(flatten)]
        target: Target,
        records: Vec<UpdateItem>,
        #[serde(default)]
        typecast: Option<bool>,
    },
    GetSchema {
        #[serde(default)]
        base_id: Option<String>,
        #[serde(default)]
        base_url: Option<String>,
    },
}

/// One record to update: id plus the partial field set to PATCH.
#[derive(Debug, Deserialize)]
struct UpdateItem {
    id: String,
    fields: Map<String, Value>,
}

/// How a record action locates its table. Explicit `base_id`/`table` win;
/// otherwise the ids are parsed out of a pasted `base_url`.
#[derive(Debug, Default, Deserialize)]
struct Target {
    #[serde(default)]
    base_id: Option<String>,
    #[serde(default)]
    table: Option<String>,
    #[serde(default)]
    base_url: Option<String>,
}

/// Resolved (base, table) plus any view parsed from a `base_url`.
struct Resolved {
    base: String,
    table: String,
    url_view: Option<String>,
}

impl Target {
    fn resolve(&self) -> Result<Resolved, String> {
        let (url_base, url_table, url_view) = self
            .base_url
            .as_deref()
            .map(parse_airtable_url)
            .unwrap_or((None, None, None));

        let base = self
            .base_id
            .clone()
            .or(url_base)
            .ok_or("Missing base: provide 'base_id' (app…) or a 'base_url' containing it")?;
        let table = self.table.clone().or(url_table).ok_or(
            "Missing table: provide 'table' (a tbl… id or table name) or a 'base_url' containing a table id",
        )?;

        validate_base_id(&base)?;
        Ok(Resolved {
            base,
            table,
            url_view,
        })
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid parameters: {e}. Provide an 'action' field (one of: list_records, \
             get_record, create_records, update_records, get_schema)."
        )
    })?;

    // Pre-flight: verify the PAT is configured before any network call.
    #[cfg(not(feature = "reborn"))]
    if !near::agent::host::secret_exists(SECRET_NAME) {
        return Err(format!(
            "Airtable token not found. Set it with: ironclaw tool setup airtable-tool. \
             Create one at https://airtable.com/create/tokens"
        ));
    }

    match action {
        Action::ListRecords {
            target,
            view,
            fields,
            filter_by_formula,
            filter,
            sort,
            page_size,
            max_records,
            offset,
        } => {
            let r = target.resolve()?;
            let formula = match (filter_by_formula, filter) {
                (Some(_), Some(_)) => {
                    return Err("Provide either 'filter_by_formula' or 'filter', not both".into())
                }
                (Some(f), None) => Some(f),
                (None, Some(f)) => Some(build_equals_formula(&f.field, &f.value)),
                (None, None) => None,
            };
            // Explicit view wins over one parsed from base_url.
            let view = view.or(r.url_view);
            let query = list_query(
                view.as_deref(),
                fields.as_deref(),
                formula.as_deref(),
                sort.as_deref(),
                page_size,
                max_records,
                offset.as_deref(),
            )?;
            let url = format!("{API_BASE}/{}/{}{}", r.base, encode_table(&r.table), query);
            let resp = http(Method::Get, &url, None).map_err(map_api_error)?;
            shape_list(&resp)
        }
        Action::GetRecord { target, record_id } => {
            let r = target.resolve()?;
            let rec = validate_record_id(&record_id)?;
            let url = format!("{API_BASE}/{}/{}/{}", r.base, encode_table(&r.table), rec);
            let resp = http(Method::Get, &url, None).map_err(map_api_error)?;
            shape_record(&resp)
        }
        Action::CreateRecords {
            target,
            records,
            typecast,
        } => {
            let r = target.resolve()?;
            if records.is_empty() {
                return Err("'records' must contain at least one field object".into());
            }
            if records.len() > MAX_WRITE_BATCH {
                return Err(format!(
                    "Airtable accepts at most {MAX_WRITE_BATCH} records per create; got {}. Split into batches.",
                    records.len()
                ));
            }
            let wrapped: Vec<Value> = records
                .into_iter()
                .map(|f| json!({ "fields": f }))
                .collect();
            let mut body = json!({ "records": wrapped });
            if typecast.unwrap_or(false) {
                body["typecast"] = json!(true);
            }
            let url = format!("{API_BASE}/{}/{}", r.base, encode_table(&r.table));
            let resp = http(Method::Post, &url, Some(&body)).map_err(map_api_error)?;
            shape_write(&resp)
        }
        Action::UpdateRecords {
            target,
            records,
            typecast,
        } => {
            let r = target.resolve()?;
            if records.is_empty() {
                return Err("'records' must contain at least one {id, fields} object".into());
            }
            if records.len() > MAX_WRITE_BATCH {
                return Err(format!(
                    "Airtable accepts at most {MAX_WRITE_BATCH} records per update; got {}. Split into batches.",
                    records.len()
                ));
            }
            let mut wrapped = Vec::with_capacity(records.len());
            for item in records {
                let id = validate_record_id(&item.id)?;
                wrapped.push(json!({ "id": id, "fields": item.fields }));
            }
            let mut body = json!({ "records": wrapped });
            if typecast.unwrap_or(false) {
                body["typecast"] = json!(true);
            }
            // PATCH = partial update (leaves unspecified fields untouched).
            let url = format!("{API_BASE}/{}/{}", r.base, encode_table(&r.table));
            let resp = http(Method::Patch, &url, Some(&body)).map_err(map_api_error)?;
            shape_write(&resp)
        }
        Action::GetSchema { base_id, base_url } => {
            let (url_base, _, _) = base_url
                .as_deref()
                .map(parse_airtable_url)
                .unwrap_or((None, None, None));
            let base = base_id
                .or(url_base)
                .ok_or("Missing base: provide 'base_id' (app…) or a 'base_url' containing it")?;
            validate_base_id(&base)?;
            let url = format!("{API_BASE}/meta/bases/{base}/tables");
            let resp = http(Method::Get, &url, None).map_err(map_schema_error)?;
            shape_schema(&resp)
        }
    }
}

// ==================== Airtable URL parsing ====================

/// Extract the first `app…` (base), `tbl…` (table), and `viw…` (view) id from a
/// pasted Airtable URL. Ids are alphanumeric; splitting on every non-alphanumeric
/// byte yields clean tokens regardless of surrounding URL punctuation.
fn parse_airtable_url(url: &str) -> (Option<String>, Option<String>, Option<String>) {
    let mut base = None;
    let mut table = None;
    let mut view = None;
    for seg in url.split(|c: char| !c.is_ascii_alphanumeric()) {
        if seg.len() < 4 {
            continue;
        }
        if base.is_none() && seg.starts_with("app") {
            base = Some(seg.to_string());
        } else if table.is_none() && seg.starts_with("tbl") {
            table = Some(seg.to_string());
        } else if view.is_none() && seg.starts_with("viw") {
            view = Some(seg.to_string());
        }
    }
    (base, table, view)
}

// ==================== Query builder ====================

#[allow(clippy::too_many_arguments)]
fn list_query(
    view: Option<&str>,
    fields: Option<&[String]>,
    filter_by_formula: Option<&str>,
    sort: Option<&[SortClause]>,
    page_size: Option<u32>,
    max_records: Option<u32>,
    offset: Option<&str>,
) -> Result<String, String> {
    let mut parts: Vec<String> = Vec::new();
    if let Some(v) = view {
        parts.push(format!("view={}", urlencode(v)));
    }
    if let Some(fields) = fields {
        for f in fields {
            parts.push(format!("fields%5B%5D={}", urlencode(f)));
        }
    }
    if let Some(f) = filter_by_formula {
        parts.push(format!("filterByFormula={}", urlencode(f)));
    }
    if let Some(sort) = sort {
        for (i, clause) in sort.iter().enumerate() {
            parts.push(format!(
                "sort%5B{i}%5D%5Bfield%5D={}",
                urlencode(&clause.field)
            ));
            let dir = match clause.direction.as_deref() {
                None => "asc",
                Some("asc") => "asc",
                Some("desc") => "desc",
                Some(other) => {
                    return Err(format!(
                        "Invalid sort direction '{other}': use 'asc' or 'desc'"
                    ))
                }
            };
            parts.push(format!("sort%5B{i}%5D%5Bdirection%5D={dir}"));
        }
    }
    if let Some(ps) = page_size {
        parts.push(format!("pageSize={}", ps.clamp(1, MAX_PAGE_SIZE)));
    }
    if let Some(mr) = max_records {
        parts.push(format!("maxRecords={mr}"));
    }
    if let Some(o) = offset {
        parts.push(format!("offset={}", urlencode(o)));
    }
    if parts.is_empty() {
        Ok(String::new())
    } else {
        Ok(format!("?{}", parts.join("&")))
    }
}

/// Build a safe `filterByFormula` equality test from caller-supplied strings.
/// The value is wrapped as a formula string literal with `\` and `"` escaped, so
/// caller content is data, never formula syntax.
fn build_equals_formula(field: &str, value: &str) -> String {
    let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
    // Field names are referenced with {braces}; drop any stray brace from the name.
    let field = field.replace(['{', '}'], "");
    format!("{{{field}}}=\"{escaped}\"")
}

// ==================== Response shapers ====================

fn shape_list(resp: &Value) -> Result<String, String> {
    let records = resp
        .get("records")
        .and_then(Value::as_array)
        .ok_or("Unexpected Airtable response: missing 'records'")?;
    let compact: Vec<Value> = records.iter().map(compact_record).collect();
    let out = json!({
        "count": compact.len(),
        "records": compact,
        "offset": resp.get("offset"),
    });
    serialize(&out)
}

fn shape_record(resp: &Value) -> Result<String, String> {
    serialize(&compact_record(resp))
}

fn shape_write(resp: &Value) -> Result<String, String> {
    let records = resp
        .get("records")
        .and_then(Value::as_array)
        .ok_or("Unexpected Airtable response: missing 'records'")?;
    let compact: Vec<Value> = records.iter().map(compact_record).collect();
    let out = json!({
        "count": compact.len(),
        "records": compact,
    });
    serialize(&out)
}

fn compact_record(record: &Value) -> Value {
    json!({
        "id": record.get("id"),
        "fields": record.get("fields"),
        "created_time": record.get("createdTime"),
    })
}

fn shape_schema(resp: &Value) -> Result<String, String> {
    let tables = resp
        .get("tables")
        .and_then(Value::as_array)
        .ok_or("Unexpected Airtable schema response: missing 'tables'")?;
    let compact: Vec<Value> = tables
        .iter()
        .map(|t| {
            let fields: Vec<Value> = t
                .get("fields")
                .and_then(Value::as_array)
                .map(|fs| {
                    fs.iter()
                        .map(|f| json!({ "name": f.get("name"), "type": f.get("type") }))
                        .collect()
                })
                .unwrap_or_default();
            json!({
                "id": t.get("id"),
                "name": t.get("name"),
                "primary_field_id": t.get("primaryFieldId"),
                "fields": fields,
            })
        })
        .collect();
    let out = json!({
        "table_count": compact.len(),
        "tables": compact,
    });
    serialize(&out)
}

// ==================== HTTP ====================

enum Method {
    Get,
    Post,
    Patch,
}

impl Method {
    fn as_str(&self) -> &'static str {
        match self {
            Method::Get => "GET",
            Method::Post => "POST",
            Method::Patch => "PATCH",
        }
    }
}

/// A failed Airtable response, kept structured so callers can branch on status
/// (notably `get_schema` on 403 — the optional `schema.bases:read` scope).
struct ApiError {
    status: u16,
    detail: String,
}

fn http(method: Method, url: &str, body: Option<&Value>) -> Result<Value, ApiError> {
    let headers = json!({
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "IronClaw-Airtable-Tool/0.1"
    })
    .to_string();
    let body_bytes = match body {
        Some(b) => Some(serde_json::to_vec(b).map_err(|e| ApiError {
            status: 0,
            detail: format!("Failed to encode request body: {e}"),
        })?),
        None => None,
    };

    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        // Authorization (Bearer) is injected by the host credential config.
        let resp = near::agent::host::http_request(
            method.as_str(),
            url,
            &headers,
            body_bytes.as_deref(),
            None,
        )
        .map_err(|e| ApiError {
            status: 0,
            detail: format!("HTTP request failed: {e}"),
        })?;

        if (200..300).contains(&resp.status) {
            break resp;
        }

        if attempt < MAX_RETRIES && (resp.status == 429 || resp.status >= 500) {
            near::agent::host::log(
                near::agent::host::LogLevel::Warn,
                &format!(
                    "Airtable {} {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    method.as_str(),
                    resp.status
                ),
            );
            continue;
        }

        return Err(ApiError {
            status: resp.status,
            detail: extract_detail(&resp.body),
        });
    };

    let text = String::from_utf8(response.body).map_err(|e| ApiError {
        status: response.status,
        detail: format!("Invalid UTF-8 response: {e}"),
    })?;
    serde_json::from_str(&text).map_err(|e| ApiError {
        status: response.status,
        detail: format!("Failed to parse Airtable response: {e}"),
    })
}

/// Pull a concise human message out of an Airtable error body.
fn extract_detail(body: &[u8]) -> String {
    serde_json::from_slice::<Value>(body)
        .ok()
        .and_then(|v| {
            let err = v.get("error")?;
            // error may be a string or an object {type, message}.
            if let Some(s) = err.as_str() {
                return Some(s.to_string());
            }
            err.get("message")
                .or_else(|| err.get("type"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| String::from_utf8_lossy(body).chars().take(300).collect())
}

/// Generic error mapping for record actions.
fn map_api_error(e: ApiError) -> String {
    match e.status {
        401 | 403 => format!(
            "Airtable rejected the request (HTTP {}). Check the 'airtable_pat' token, its scopes \
             (data.records:read/write), and that it has access to this base. Detail: {}",
            e.status, e.detail
        ),
        404 => format!(
            "Airtable base or table not found (HTTP 404). Check 'base_id' and 'table'. Detail: {}",
            e.detail
        ),
        422 => format!(
            "Airtable rejected the data (HTTP 422): {}. Check field names and value types.",
            e.detail
        ),
        429 => format!("Airtable rate limit exceeded (HTTP 429): {}", e.detail),
        0 => e.detail,
        s => format!("Airtable request failed (HTTP {s}): {}", e.detail),
    }
}

/// `get_schema`-specific mapping: a 403 means the optional `schema.bases:read`
/// scope is missing — not a failure of the tool, so say so actionably (LITE mode).
fn map_schema_error(e: ApiError) -> String {
    match e.status {
        403 => format!(
            "Schema read needs the 'schema.bases:read' scope, which this token lacks. That scope \
             is OPTIONAL: skip get_schema and use list_records/get_record on the table you pass — \
             field names appear as the keys of each record's 'fields'. Detail: {}",
            e.detail
        ),
        404 => format!(
            "Airtable base not found (HTTP 404). Check 'base_id'. Detail: {}",
            e.detail
        ),
        _ => map_api_error(e),
    }
}

// ==================== Validation & encoding ====================

/// A base id is always `app` followed by alphanumerics — validate before
/// interpolating it into the request path.
fn validate_base_id(base: &str) -> Result<(), String> {
    if base.starts_with("app") && base.len() > 3 && base.bytes().all(|b| b.is_ascii_alphanumeric())
    {
        Ok(())
    } else {
        Err(format!(
            "Invalid base id '{base}': expected an Airtable base id like 'appXXXXXXXXXXXXXX'"
        ))
    }
}

/// Record ids are `rec` + alphanumerics. Validate before path interpolation.
fn validate_record_id(id: &str) -> Result<&str, String> {
    let id = id.trim();
    if id.starts_with("rec") && id.len() > 3 && id.bytes().all(|b| b.is_ascii_alphanumeric()) {
        Ok(id)
    } else {
        Err(format!(
            "Invalid record id '{id}': expected an Airtable record id like 'recXXXXXXXXXXXXXX'"
        ))
    }
}

/// A table may be a `tbl…` id (used as-is) or a human table name (percent-encoded
/// so it is safe in the path). Either way the result is a single path segment.
fn encode_table(table: &str) -> String {
    if table.starts_with("tbl") && table.bytes().all(|b| b.is_ascii_alphanumeric()) {
        table.to_string()
    } else {
        urlencode(table)
    }
}

/// Percent-encode a string for use in a URL path segment or query value.
/// Encodes everything outside the RFC 3986 unreserved set.
fn urlencode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for &b in s.as_bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

fn serialize(value: &Value) -> Result<String, String> {
    serde_json::to_string(value).map_err(|e| format!("Failed to serialize output: {e}"))
}

// NOTE: This schema uses the top-level `required` + `oneOf` (per-action branch)
// shape, matching the github tool. The host forwards only the fields named in the
// matching branch's `properties`/`required` set; a flat schema with
// `required: ["action"]` alone causes every other argument (base_id, table,
// record_id, records, ...) to be stripped before the tool sees it. Each branch
// therefore lists `action` (pinned to a const) plus that action's fields, and
// re-lists the mandatory ones in its `required`. Do NOT add a top-level
// `additionalProperties: false`: with per-branch properties it would reject every
// real argument. Note the `target` (base_id/table/base_url) is flattened and fully
// optional — the tool resolves it at runtime — so it appears in `properties` but
// never in a branch's `required`.
const SCHEMA: &str = r#"{
    "type": "object",
    "required": ["action"],
    "oneOf": [
        {
            "properties": {
                "action": { "const": "list_records" },
                "base_id": {
                    "type": "string",
                    "description": "Airtable base id (starts with 'app'). Provide this or 'base_url'."
                },
                "base_url": {
                    "type": "string",
                    "description": "A pasted Airtable URL; the base/table/view ids are extracted from it. Alternative to base_id+table."
                },
                "table": {
                    "type": "string",
                    "description": "Table id (starts with 'tbl') or table name. Required for record actions unless given via base_url."
                },
                "view": {
                    "type": "string",
                    "description": "list_records: a view id/name. Airtable applies the view's filter, sort, and hidden columns server-side. Prefer this over filter_by_formula for human-curated reads."
                },
                "fields": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "list_records: only return these fields."
                },
                "filter_by_formula": {
                    "type": "string",
                    "description": "list_records: a raw Airtable formula. Power use; prefer 'filter' or 'view'. Mutually exclusive with 'filter'."
                },
                "filter": {
                    "type": "object",
                    "properties": {
                        "field": { "type": "string" },
                        "value": { "type": "string" }
                    },
                    "required": ["field", "value"],
                    "description": "list_records: safe equality filter {field=value}; the value is escaped. Mutually exclusive with 'filter_by_formula'."
                },
                "sort": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "field": { "type": "string" },
                            "direction": { "type": "string", "enum": ["asc", "desc"] }
                        },
                        "required": ["field"]
                    },
                    "description": "list_records: sort clauses, applied in order."
                },
                "page_size": {
                    "type": "integer",
                    "description": "list_records: records per page (1-100, clamped to 100).",
                    "minimum": 1
                },
                "max_records": {
                    "type": "integer",
                    "description": "list_records: total cap across pages.",
                    "minimum": 1
                },
                "offset": {
                    "type": "string",
                    "description": "list_records: pagination token from a prior list_records 'offset' to fetch the next page."
                }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "get_record" },
                "base_id": {
                    "type": "string",
                    "description": "Airtable base id (starts with 'app'). Provide this or 'base_url'."
                },
                "base_url": {
                    "type": "string",
                    "description": "A pasted Airtable URL; the base/table/view ids are extracted from it. Alternative to base_id+table."
                },
                "table": {
                    "type": "string",
                    "description": "Table id (starts with 'tbl') or table name. Required for record actions unless given via base_url."
                },
                "record_id": {
                    "type": "string",
                    "description": "get_record: the record id (starts with 'rec')."
                }
            },
            "required": ["action", "record_id"]
        },
        {
            "properties": {
                "action": { "const": "create_records" },
                "base_id": {
                    "type": "string",
                    "description": "Airtable base id (starts with 'app'). Provide this or 'base_url'."
                },
                "base_url": {
                    "type": "string",
                    "description": "A pasted Airtable URL; the base/table/view ids are extracted from it. Alternative to base_id+table."
                },
                "table": {
                    "type": "string",
                    "description": "Table id (starts with 'tbl') or table name. Required for record actions unless given via base_url."
                },
                "records": {
                    "type": "array",
                    "items": { "type": "object" },
                    "description": "create_records: array of field objects, e.g. [{\"Name\":\"a\"}] (max 10)."
                },
                "typecast": {
                    "type": "boolean",
                    "description": "create/update: let Airtable coerce string values to the field's type and create new select options. Default false."
                }
            },
            "required": ["action", "records"]
        },
        {
            "properties": {
                "action": { "const": "update_records" },
                "base_id": {
                    "type": "string",
                    "description": "Airtable base id (starts with 'app'). Provide this or 'base_url'."
                },
                "base_url": {
                    "type": "string",
                    "description": "A pasted Airtable URL; the base/table/view ids are extracted from it. Alternative to base_id+table."
                },
                "table": {
                    "type": "string",
                    "description": "Table id (starts with 'tbl') or table name. Required for record actions unless given via base_url."
                },
                "records": {
                    "type": "array",
                    "items": { "type": "object" },
                    "description": "update_records: array of {id, fields}, e.g. [{\"id\":\"recX\",\"fields\":{\"Status\":\"Fixed\"}}] (max 10)."
                },
                "typecast": {
                    "type": "boolean",
                    "description": "create/update: let Airtable coerce string values to the field's type and create new select options. Default false."
                }
            },
            "required": ["action", "records"]
        },
        {
            "properties": {
                "action": { "const": "get_schema" },
                "base_id": {
                    "type": "string",
                    "description": "Airtable base id (starts with 'app'). Provide this or 'base_url'."
                },
                "base_url": {
                    "type": "string",
                    "description": "A pasted Airtable URL; the base/table/view ids are extracted from it. Alternative to base_id+table."
                }
            },
            "required": ["action"]
        }
    ]
}"#;

#[cfg(feature = "reborn")]
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ToolContext {
    capability_id: String,
}

#[cfg(feature = "reborn")]
fn execute_reborn(params: &str, context: Option<&str>) -> Result<String, String> {
    let context = context.ok_or_else(|| "missing_invocation_context".to_string())?;
    let context: ToolContext =
        serde_json::from_str(context).map_err(|_| "invalid_invocation_context".to_string())?;
    let operation = match context.capability_id.as_str() {
        "airtable.list_records" => "list_records",
        "airtable.get_record" => "get_record",
        "airtable.create_records" => "create_records",
        "airtable.update_records" => "update_records",
        "airtable.get_schema" => "get_schema",
        _ => return Err("unsupported_capability".to_string()),
    };
    let mut params: serde_json::Value =
        serde_json::from_str(params).map_err(|_| "invalid_parameters".to_string())?;
    let object = params
        .as_object_mut()
        .ok_or_else(|| "invalid_parameters".to_string())?;
    if object.contains_key("action") {
        return Err("public_selector_is_not_allowed".to_string());
    }
    object.insert(
        "action".to_string(),
        serde_json::Value::String(operation.to_string()),
    );
    execute_inner(&params.to_string())
}

export!(AirtableTool);

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
            serde_json::from_str::<Action>(
                r#"{"action":"list_records","base_id":"appX","table":"tblY"}"#
            ),
            Ok(Action::ListRecords { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(
                r#"{"action":"get_record","base_id":"appX","table":"tblY","record_id":"recZ"}"#
            ),
            Ok(Action::GetRecord { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(
                r#"{"action":"create_records","base_id":"appX","table":"tblY","records":[{"Name":"a"}]}"#
            ),
            Ok(Action::CreateRecords { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(
                r#"{"action":"update_records","base_id":"appX","table":"tblY","records":[{"id":"recZ","fields":{"S":"x"}}]}"#
            ),
            Ok(Action::UpdateRecords { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"get_schema","base_id":"appX"}"#),
            Ok(Action::GetSchema { .. })
        ));
    }

    #[test]
    fn no_delete_action() {
        assert!(serde_json::from_str::<Action>(
            r#"{"action":"delete_records","base_id":"appX","table":"tblY"}"#
        )
        .is_err());
    }

    #[test]
    fn parse_url_extracts_ids() {
        let (b, t, v) = parse_airtable_url(
            "https://airtable.com/appWsWZ4C1XPTSsN1/tblI3bH6Lp5mZSVra/viw2Yh2TDvZQScvDK?blocks=hide",
        );
        assert_eq!(b.as_deref(), Some("appWsWZ4C1XPTSsN1"));
        assert_eq!(t.as_deref(), Some("tblI3bH6Lp5mZSVra"));
        assert_eq!(v.as_deref(), Some("viw2Yh2TDvZQScvDK"));
    }

    #[test]
    fn parse_url_partial() {
        let (b, t, v) = parse_airtable_url("https://airtable.com/appABCDEFGHIJKLMN");
        assert_eq!(b.as_deref(), Some("appABCDEFGHIJKLMN"));
        assert!(t.is_none());
        assert!(v.is_none());
    }

    #[test]
    fn target_resolves_explicit_over_url() {
        let t = Target {
            base_id: Some("appEXPLICIT0000".into()),
            table: Some("tblEXPLICIT0000".into()),
            base_url: Some("https://airtable.com/appURL000000000/tblURL000000000".into()),
        };
        let r = t.resolve().unwrap();
        assert_eq!(r.base, "appEXPLICIT0000");
        assert_eq!(r.table, "tblEXPLICIT0000");
    }

    #[test]
    fn target_resolves_from_url() {
        let t = Target {
            base_id: None,
            table: None,
            base_url: Some(
                "https://airtable.com/appURL000000000/tblURL000000000/viwURL000000000".into(),
            ),
        };
        let r = t.resolve().unwrap();
        assert_eq!(r.base, "appURL000000000");
        assert_eq!(r.table, "tblURL000000000");
        assert_eq!(r.url_view.as_deref(), Some("viwURL000000000"));
    }

    #[test]
    fn target_missing_base_errors() {
        let t = Target {
            base_id: None,
            table: Some("tblX0000000000".into()),
            base_url: None,
        };
        assert!(t.resolve().is_err());
    }

    #[test]
    fn validate_base_id_rules() {
        assert!(validate_base_id("appWsWZ4C1XPTSsN1").is_ok());
        assert!(validate_base_id("app").is_err());
        assert!(validate_base_id("tblX").is_err());
        assert!(validate_base_id("app../escape").is_err());
    }

    #[test]
    fn validate_record_id_rules() {
        assert_eq!(validate_record_id("recABC123"), Ok("recABC123"));
        assert!(validate_record_id("rec").is_err());
        assert!(validate_record_id("../escape").is_err());
        assert!(validate_record_id("rec/slash").is_err());
    }

    #[test]
    fn encode_table_passes_ids_encodes_names() {
        assert_eq!(encode_table("tblI3bH6Lp5mZSVra"), "tblI3bH6Lp5mZSVra");
        assert_eq!(encode_table("My Findings"), "My%20Findings");
        assert_eq!(encode_table("a/b"), "a%2Fb");
    }

    #[test]
    fn build_equals_formula_escapes() {
        assert_eq!(build_equals_formula("Status", "Open"), "{Status}=\"Open\"");
        // a quote in the value cannot break out of the string literal
        assert_eq!(build_equals_formula("Name", "a\"b"), "{Name}=\"a\\\"b\"");
        // braces in the field name are stripped
        assert_eq!(build_equals_formula("a}b", "x"), "{ab}=\"x\"");
    }

    #[test]
    fn list_query_builds_and_clamps() {
        let q = list_query(
            Some("Grid view"),
            Some(&["Name".to_string(), "Sev".to_string()]),
            Some("{Sev}=\"High\""),
            Some(&[SortClause {
                field: "Name".into(),
                direction: Some("desc".into()),
            }]),
            Some(999),
            Some(50),
            Some("off123"),
        )
        .unwrap();
        assert!(q.starts_with('?'));
        assert!(q.contains("view=Grid%20view"));
        assert!(q.contains("fields%5B%5D=Name"));
        assert!(q.contains("filterByFormula=%7BSev%7D%3D%22High%22"));
        assert!(q.contains("sort%5B0%5D%5Bfield%5D=Name"));
        assert!(q.contains("sort%5B0%5D%5Bdirection%5D=desc"));
        assert!(q.contains("pageSize=100")); // clamped
        assert!(q.contains("maxRecords=50"));
        assert!(q.contains("offset=off123"));
    }

    #[test]
    fn list_query_empty_when_no_options() {
        assert_eq!(
            list_query(None, None, None, None, None, None, None).unwrap(),
            ""
        );
    }

    #[test]
    fn list_query_bad_sort_direction_errors() {
        let r = list_query(
            None,
            None,
            None,
            Some(&[SortClause {
                field: "X".into(),
                direction: Some("sideways".into()),
            }]),
            None,
            None,
            None,
        );
        assert!(r.is_err());
    }

    #[test]
    fn shape_list_compacts_and_keeps_offset() {
        let resp = json!({
            "records": [
                { "id": "rec1", "createdTime": "2026-01-01T00:00:00Z", "fields": { "Name": "A" }, "extra": "drop" }
            ],
            "offset": "page2"
        });
        let out: Value = serde_json::from_str(&shape_list(&resp).unwrap()).unwrap();
        assert_eq!(out["count"], 1);
        assert_eq!(out["records"][0]["id"], "rec1");
        assert_eq!(out["records"][0]["fields"]["Name"], "A");
        assert!(out["records"][0].get("extra").is_none());
        assert_eq!(out["offset"], "page2");
    }

    #[test]
    fn shape_schema_compacts_fields() {
        let resp = json!({
            "tables": [
                {
                    "id": "tbl1",
                    "name": "Findings",
                    "primaryFieldId": "fld1",
                    "fields": [
                        { "id": "fld1", "name": "Title", "type": "singleLineText", "options": {} },
                        { "id": "fld2", "name": "Severity", "type": "singleSelect" }
                    ]
                }
            ]
        });
        let out: Value = serde_json::from_str(&shape_schema(&resp).unwrap()).unwrap();
        assert_eq!(out["table_count"], 1);
        assert_eq!(out["tables"][0]["name"], "Findings");
        assert_eq!(out["tables"][0]["fields"][1]["name"], "Severity");
        assert_eq!(out["tables"][0]["fields"][1]["type"], "singleSelect");
        // options dropped
        assert!(out["tables"][0]["fields"][0].get("options").is_none());
    }

    #[test]
    fn extract_detail_handles_string_and_object() {
        assert_eq!(extract_detail(br#"{"error":"NOT_FOUND"}"#), "NOT_FOUND");
        assert_eq!(
            extract_detail(br#"{"error":{"type":"INVALID","message":"bad field"}}"#),
            "bad field"
        );
    }

    #[test]
    fn map_schema_error_403_is_actionable() {
        let msg = map_schema_error(ApiError {
            status: 403,
            detail: "x".into(),
        });
        assert!(msg.contains("schema.bases:read"));
        assert!(msg.contains("OPTIONAL"));
    }
}
