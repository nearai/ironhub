//! WordPress + WooCommerce WASM tool for IronClaw.
//!
//! Wraps the WordPress core REST API (`/wp-json/wp/v2/…`) and the WooCommerce
//! REST API (`/wp-json/wc/v3/…`) so an agent can operate a self-hosted site:
//! read/write posts, products, orders, and customers, plus a `wp_request`
//! passthrough for any `/wp-json/*` route.
//!
//! # Self-hosted, baked host
//!
//! The allowlist host is compile-time-fixed in `wordpress.capabilities.json` and
//! cannot be overridden per-install from the sandbox. The installer edits the
//! host (and the WP Basic username) in the capabilities file once before
//! `ironclaw tool install`. Because the WASM sandbox cannot read that config, the
//! target site travels as the `site_url` call param on every action (the same
//! pattern as firecrawl's `url`); the baked allowlist host is the security pin
//! that `site_url` must match.
//!
//! # Authentication (host-injected, never seen by WASM)
//!
//! - WordPress core (`/wp-json/wp/…`): Application Password via HTTP Basic. The
//!   host builds `Authorization: Basic base64(username:secret)` — the username is
//!   baked in the capabilities file, the secret is `wp_app_password`.
//! - WooCommerce (`/wp-json/wc/…`): consumer key/secret as query params
//!   `consumer_key` / `consumer_secret` (secrets `woo_consumer_key`,
//!   `woo_consumer_secret`).
//!
//! The two schemes are fenced by `path_patterns` in the capabilities file so a
//! `wp/` request gets only Basic and a `wc/` request gets only the query pair.
//!
//! Requires HTTPS and pretty permalinks (REST under `/wp-json/`).

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{Map, Value};

const SECRET_WP: &str = "wp_app_password";
const SECRET_WOO_KEY: &str = "woo_consumer_key";
const SECRET_WOO_SECRET: &str = "woo_consumer_secret";
const MAX_RETRIES: u32 = 3;

struct WordpressTool;

impl exports::near::agent::tool::Guest for WordpressTool {
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
        "Read and write a self-hosted WordPress + WooCommerce site over REST. Actions: \
         'wp_request' (raw passthrough to any /wp-json/* path), and typed wrappers for posts \
         (list/get/create/update/delete_post), products (list/get/create/update/delete_product), \
         media (upload_media plus list/get/update/delete_media — upload takes a base64 file), \
         orders (list/get/update_order), and customers (list_customers). Every action needs a \
         'site_url' (your site host, e.g. 'mystore.com') — it must match the host baked into the \
         tool's capabilities at install. WordPress-core routes authenticate with an Application \
         Password (Basic, secret 'wp_app_password'); WooCommerce routes authenticate with \
         'woo_consumer_key'/'woo_consumer_secret' (query params). The host injects all credentials; \
         the tool never sees them. Requires HTTPS and pretty permalinks (/wp-json/). Deletes trash \
         by default; pass force=true to delete permanently. \
         SETUP (one-time, done by the human installer — NOT the agent): the target site host and \
         the WordPress username are baked into wordpress-tool.capabilities.json before install by \
         running the tool's 'python3 configure.py' (or editing the YOUR_WP_HOST / YOUR_WP_USERNAME \
         placeholders), then secrets are stored via 'ironclaw tool setup wordpress-tool'. If a call fails \
         with a host-not-allowed or missing-credential error, the tool has not been configured/setup \
         for this site — tell the user to run configure.py + tool setup. Always pass 'site_url' \
         equal to the configured host. If the site uses a custom REST prefix (not '/wp-json/'), the \
         installer bakes it via 'configure.py --api-prefix' and you pass the same 'api_prefix' on \
         each call."
            .to_string()
    }
}

// ==================== Actions ====================

/// Tool actions. The model selects one via the `command` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "command", rename_all = "snake_case")]
enum Command {
    WpRequest {
        site_url: String,
        method: String,
        endpoint: String,
        #[serde(default)]
        query: Option<Map<String, Value>>,
        #[serde(default)]
        body: Option<Value>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    // WordPress core: posts
    ListPosts {
        #[serde(flatten)]
        list: ListArgs,
    },
    GetPost {
        site_url: String,
        id: i64,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    CreatePost {
        site_url: String,
        data: Map<String, Value>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    UpdatePost {
        site_url: String,
        id: i64,
        data: Map<String, Value>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    DeletePost {
        site_url: String,
        id: i64,
        #[serde(default)]
        force: Option<bool>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    // WordPress core: media
    UploadMedia {
        site_url: String,
        filename: String,
        content_base64: String,
        #[serde(default)]
        mime: Option<String>,
        #[serde(default)]
        title: Option<String>,
        #[serde(default)]
        alt_text: Option<String>,
        #[serde(default)]
        caption: Option<String>,
        #[serde(default)]
        post: Option<i64>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    ListMedia {
        #[serde(flatten)]
        list: ListArgs,
    },
    GetMedia {
        site_url: String,
        id: i64,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    UpdateMedia {
        site_url: String,
        id: i64,
        data: Map<String, Value>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    DeleteMedia {
        site_url: String,
        id: i64,
        #[serde(default)]
        force: Option<bool>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    // WooCommerce: products
    ListProducts {
        #[serde(flatten)]
        list: ListArgs,
    },
    GetProduct {
        site_url: String,
        id: i64,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    CreateProduct {
        site_url: String,
        data: Map<String, Value>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    UpdateProduct {
        site_url: String,
        id: i64,
        data: Map<String, Value>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    DeleteProduct {
        site_url: String,
        id: i64,
        #[serde(default)]
        force: Option<bool>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    // WooCommerce: orders
    ListOrders {
        #[serde(flatten)]
        list: ListArgs,
    },
    GetOrder {
        site_url: String,
        id: i64,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    UpdateOrder {
        site_url: String,
        id: i64,
        data: Map<String, Value>,
        #[serde(default)]
        api_prefix: Option<String>,
    },
    // WooCommerce: customers
    ListCustomers {
        #[serde(flatten)]
        list: ListArgs,
    },
}

/// Common list/query arguments shared by the `list_*` actions.
#[derive(Debug, Default, Deserialize)]
struct ListArgs {
    site_url: String,
    #[serde(default)]
    page: Option<u32>,
    #[serde(default)]
    per_page: Option<u32>,
    #[serde(default)]
    search: Option<String>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    api_prefix: Option<String>,
}

impl ListArgs {
    /// Build the query pairs a list endpoint understands. `status` is only
    /// emitted for endpoints that support it (posts/products/orders, not
    /// customers) — the caller decides by not reading it.
    fn query(&self, with_status: bool) -> Vec<(String, String)> {
        let mut q = Vec::new();
        if let Some(p) = self.page {
            q.push(("page".into(), p.to_string()));
        }
        if let Some(pp) = self.per_page {
            q.push(("per_page".into(), pp.clamp(1, 100).to_string()));
        }
        if let Some(s) = &self.search {
            q.push(("search".into(), s.clone()));
        }
        if with_status {
            if let Some(s) = &self.status {
                q.push(("status".into(), s.clone()));
            }
        }
        q
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let command: Command = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid parameters: {e}. Provide a 'command' field (one of: wp_request, list_posts, \
             get_post, create_post, update_post, delete_post, list_products, get_product, \
             create_product, update_product, delete_product, upload_media, list_media, get_media, \
             update_media, delete_media, list_orders, get_order, update_order, list_customers) and \
             a 'site_url'."
        )
    })?;

    match command {
        Command::WpRequest {
            site_url,
            method,
            endpoint,
            query,
            body,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            let m = Method::parse(&method)?;
            let mut pairs = Vec::new();
            if let Some(q) = query {
                for (k, v) in q {
                    pairs.push((k, value_to_query_string(&v)));
                }
            }
            // Body only travels on writes; ignore it on GET/DELETE.
            let body = match m {
                Method::Post | Method::Put => body,
                _ => None,
            };
            run(&site_url, &p, m, &endpoint, &pairs, body)
        }

        // ---- posts (WordPress core) ----
        Command::ListPosts { list } => {
            let p = norm_prefix(list.api_prefix.clone())?;
            let q = list.query(true);
            run(
                &list.site_url,
                &p,
                Method::Get,
                &format!("{p}wp/v2/posts"),
                &q,
                None,
            )
        }
        Command::GetPost {
            site_url,
            id,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Get,
                &format!("{p}wp/v2/posts/{id}"),
                &[],
                None,
            )
        }
        Command::CreatePost {
            site_url,
            data,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Post,
                &format!("{p}wp/v2/posts"),
                &[],
                Some(Value::Object(data)),
            )
        }
        Command::UpdatePost {
            site_url,
            id,
            data,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Put,
                &format!("{p}wp/v2/posts/{id}"),
                &[],
                Some(Value::Object(data)),
            )
        }
        Command::DeletePost {
            site_url,
            id,
            force,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Delete,
                &format!("{p}wp/v2/posts/{id}"),
                &force_query(force),
                None,
            )
        }

        // ---- media (WordPress core) ----
        Command::UploadMedia {
            site_url,
            filename,
            content_base64,
            mime,
            title,
            alt_text,
            caption,
            post,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            // Media lives under <prefix>wp/ → Basic auth, same preflight.
            let endpoint = format!("{p}wp/v2/media");
            preflight(&p, &endpoint)?;
            let base = site_base(&site_url)?;
            let bytes = decode_base64(&content_base64)?;
            if bytes.is_empty() {
                return Err("'content_base64' decoded to an empty file".into());
            }
            let fname = sanitize_filename(&filename)?;
            let ctype = mime
                .filter(|m| !m.trim().is_empty())
                .unwrap_or_else(|| mime_from_filename(&fname).to_string());
            let headers = serde_json::json!({
                "Accept": "application/json",
                "Content-Type": ctype,
                "Content-Disposition": format!("attachment; filename=\"{fname}\""),
                "User-Agent": "IronClaw-WordPress-Tool/0.1"
            })
            .to_string();
            // Metadata rides as query params so the binary body stays the file
            // and the whole upload is a single request.
            let mut q: Vec<(String, String)> = Vec::new();
            if let Some(t) = title {
                q.push(("title".into(), t));
            }
            if let Some(a) = alt_text {
                q.push(("alt_text".into(), a));
            }
            if let Some(c) = caption {
                q.push(("caption".into(), c));
            }
            if let Some(p) = post {
                q.push(("post".into(), p.to_string()));
            }
            let mut url = format!("{base}{endpoint}");
            if !q.is_empty() {
                let qs: Vec<String> = q
                    .iter()
                    .map(|(k, v)| format!("{}={}", urlencode(k), urlencode(v)))
                    .collect();
                url.push('?');
                url.push_str(&qs.join("&"));
            }
            let resp = http_send(Method::Post, &url, &headers, Some(bytes)).map_err(map_error)?;
            shape(resp)
        }
        Command::ListMedia { list } => {
            let p = norm_prefix(list.api_prefix.clone())?;
            let q = list.query(false);
            run(
                &list.site_url,
                &p,
                Method::Get,
                &format!("{p}wp/v2/media"),
                &q,
                None,
            )
        }
        Command::GetMedia {
            site_url,
            id,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Get,
                &format!("{p}wp/v2/media/{id}"),
                &[],
                None,
            )
        }
        Command::UpdateMedia {
            site_url,
            id,
            data,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Put,
                &format!("{p}wp/v2/media/{id}"),
                &[],
                Some(Value::Object(data)),
            )
        }
        Command::DeleteMedia {
            site_url,
            id,
            force,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Delete,
                &format!("{p}wp/v2/media/{id}"),
                // WordPress refuses to trash media; permanent delete is required.
                &force_query(Some(force.unwrap_or(true))),
                None,
            )
        }

        // ---- products (WooCommerce) ----
        Command::ListProducts { list } => {
            let p = norm_prefix(list.api_prefix.clone())?;
            let q = list.query(true);
            run(
                &list.site_url,
                &p,
                Method::Get,
                &format!("{p}wc/v3/products"),
                &q,
                None,
            )
        }
        Command::GetProduct {
            site_url,
            id,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Get,
                &format!("{p}wc/v3/products/{id}"),
                &[],
                None,
            )
        }
        Command::CreateProduct {
            site_url,
            data,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Post,
                &format!("{p}wc/v3/products"),
                &[],
                Some(Value::Object(data)),
            )
        }
        Command::UpdateProduct {
            site_url,
            id,
            data,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Put,
                &format!("{p}wc/v3/products/{id}"),
                &[],
                Some(Value::Object(data)),
            )
        }
        Command::DeleteProduct {
            site_url,
            id,
            force,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Delete,
                &format!("{p}wc/v3/products/{id}"),
                &force_query(force),
                None,
            )
        }

        // ---- orders (WooCommerce) ----
        Command::ListOrders { list } => {
            let p = norm_prefix(list.api_prefix.clone())?;
            let q = list.query(true);
            run(
                &list.site_url,
                &p,
                Method::Get,
                &format!("{p}wc/v3/orders"),
                &q,
                None,
            )
        }
        Command::GetOrder {
            site_url,
            id,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Get,
                &format!("{p}wc/v3/orders/{id}"),
                &[],
                None,
            )
        }
        Command::UpdateOrder {
            site_url,
            id,
            data,
            api_prefix,
        } => {
            let p = norm_prefix(api_prefix)?;
            run(
                &site_url,
                &p,
                Method::Put,
                &format!("{p}wc/v3/orders/{id}"),
                &[],
                Some(Value::Object(data)),
            )
        }

        // ---- customers (WooCommerce) ----
        Command::ListCustomers { list } => {
            let p = norm_prefix(list.api_prefix.clone())?;
            let q = list.query(false);
            run(
                &list.site_url,
                &p,
                Method::Get,
                &format!("{p}wc/v3/customers"),
                &q,
                None,
            )
        }
    }
}

/// `?force=true` for permanent deletes; empty (trash) otherwise.
fn force_query(force: Option<bool>) -> Vec<(String, String)> {
    if force.unwrap_or(false) {
        vec![("force".into(), "true".into())]
    } else {
        Vec::new()
    }
}

/// Core request path shared by every action: validate, preflight secrets, build
/// the URL against the caller's `site_url`, call the host, shape the response.
fn run(
    site_url: &str,
    prefix: &str,
    method: Method,
    endpoint: &str,
    query: &[(String, String)],
    body: Option<Value>,
) -> Result<String, String> {
    let endpoint = check_endpoint(prefix, endpoint)?;
    preflight(prefix, endpoint)?;
    let base = site_base(site_url)?;
    let mut url = format!("{base}{endpoint}");
    if !query.is_empty() {
        let qs: Vec<String> = query
            .iter()
            .map(|(k, v)| format!("{}={}", urlencode(k), urlencode(v)))
            .collect();
        url.push('?');
        url.push_str(&qs.join("&"));
    }
    let resp = http(method, &url, body.as_ref()).map_err(map_error)?;
    shape(resp)
}

/// Normalise the REST API prefix. Defaults to `/wp-json/`; a caller (whose site
/// uses a custom `rest_url_prefix`, matching what configure.py bakes into the
/// allowlist) may override it. Always returned with a leading and trailing `/`.
fn norm_prefix(prefix: Option<String>) -> Result<String, String> {
    let raw = prefix.unwrap_or_default();
    let raw = raw.trim();
    if raw.is_empty() {
        return Ok("/wp-json/".to_string());
    }
    if raw.contains("://")
        || raw.contains('?')
        || raw.contains('#')
        || raw.contains(char::is_whitespace)
    {
        return Err(format!(
            "Invalid 'api_prefix' '{raw}': use a path like '/wp-json/' or '/api/' (no scheme/query)"
        ));
    }
    let core = raw.trim_matches('/');
    if core.is_empty() {
        return Err("Invalid 'api_prefix': cannot be just '/'".into());
    }
    if !core
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'/' | b'.'))
    {
        return Err(format!(
            "Invalid 'api_prefix' '{raw}': allowed characters are letters, digits, '-', '_', '.', '/'"
        ));
    }
    Ok(format!("/{core}/"))
}

/// Which secrets a route needs, relative to the REST prefix. WooCommerce routes
/// (`<prefix>wc/`) need both consumer keys; WordPress-core routes (`<prefix>wp/`)
/// need the app password. Other routes are left unchecked (public / own auth).
fn route_secrets(prefix: &str, endpoint: &str) -> &'static [&'static str] {
    if endpoint.starts_with(&format!("{prefix}wc/")) {
        &[SECRET_WOO_KEY, SECRET_WOO_SECRET]
    } else if endpoint.starts_with(&format!("{prefix}wp/")) {
        &[SECRET_WP]
    } else {
        &[]
    }
}

fn preflight(prefix: &str, endpoint: &str) -> Result<(), String> {
    for name in route_secrets(prefix, endpoint) {
        if !near::agent::host::secret_exists(name) {
            return Err(missing_secret_message(name));
        }
    }
    Ok(())
}

fn missing_secret_message(name: &str) -> String {
    match name {
        SECRET_WP => "WordPress credential missing. Set it with: ironclaw tool setup wordpress-tool \
             (secret 'wp_app_password'). Create an Application Password under Users → Profile → \
             Application Passwords."
            .to_string(),
        SECRET_WOO_KEY | SECRET_WOO_SECRET => "WooCommerce credentials missing. Set them with: \
             ironclaw tool setup wordpress-tool (secrets 'woo_consumer_key' and 'woo_consumer_secret'). \
             Create a key under WooCommerce → Settings → Advanced → REST API."
            .to_string(),
        other => format!("Required secret '{other}' is not set. Run: ironclaw tool setup wordpress-tool"),
    }
}

/// Normalise a caller-supplied `site_url` into an `https://<host>` base.
/// Strips any scheme, path, or query, lowercases the host, and rejects anything
/// that is not a bare hostname (so it cannot smuggle a path/port/other host).
fn site_base(site_url: &str) -> Result<String, String> {
    let s = site_url.trim();
    let s = s
        .strip_prefix("https://")
        .or_else(|| s.strip_prefix("http://"))
        .unwrap_or(s);
    // Host is everything up to the first '/', '?', or '#'.
    let host = s.split(['/', '?', '#']).next().unwrap_or("").trim();
    let host = host.to_ascii_lowercase();
    if host.is_empty() {
        return Err(
            "Invalid 'site_url': provide your WordPress site host, e.g. 'mystore.com'".into(),
        );
    }
    let valid = host
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'-')
        && host.contains('.')
        && !host.starts_with('.')
        && !host.ends_with('.');
    if !valid {
        return Err(format!(
            "Invalid 'site_url' host '{host}': expected a bare domain like 'mystore.com' \
             (no scheme, path, or port)"
        ));
    }
    Ok(format!("https://{host}"))
}

/// Every request must target the REST namespace under the configured prefix.
fn check_endpoint<'a>(prefix: &str, endpoint: &'a str) -> Result<&'a str, String> {
    let e = endpoint.trim();
    if e.starts_with(prefix) {
        Ok(e)
    } else {
        Err(format!(
            "Invalid 'endpoint' '{e}': must start with the REST prefix '{prefix}' \
             (e.g. '{prefix}wp/v2/posts' or '{prefix}wc/v3/orders'). If your site uses a custom \
             REST prefix, pass it as 'api_prefix'."
        ))
    }
}

/// Stringify a JSON value for use as a query parameter. Strings pass through;
/// everything else uses its compact JSON form (numbers/bools become their
/// literal text).
fn value_to_query_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

// ==================== Response shaping ====================

/// List endpoints return a JSON array; wrap it with a count for readability.
/// Everything else (single objects) passes through unchanged so nothing is lost.
fn shape(resp: Value) -> Result<String, String> {
    let out = match resp {
        Value::Array(items) => serde_json::json!({ "count": items.len(), "items": items }),
        other => other,
    };
    serialize(&out)
}

// ==================== HTTP ====================

#[derive(Clone, Copy)]
enum Method {
    Get,
    Post,
    Put,
    Delete,
}

impl Method {
    fn as_str(&self) -> &'static str {
        match self {
            Method::Get => "GET",
            Method::Post => "POST",
            Method::Put => "PUT",
            Method::Delete => "DELETE",
        }
    }

    fn parse(s: &str) -> Result<Method, String> {
        match s.trim().to_ascii_uppercase().as_str() {
            "GET" => Ok(Method::Get),
            "POST" => Ok(Method::Post),
            "PUT" => Ok(Method::Put),
            "DELETE" => Ok(Method::Delete),
            other => Err(format!(
                "Invalid 'method' '{other}': use GET, POST, PUT, or DELETE."
            )),
        }
    }
}

/// A failed REST response, kept structured so `map_error` can give actionable
/// guidance by status.
struct ApiError {
    status: u16,
    detail: String,
}

/// JSON request: standard headers + a JSON body. Most actions use this.
fn http(method: Method, url: &str, body: Option<&Value>) -> Result<Value, ApiError> {
    let headers = serde_json::json!({
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "IronClaw-WordPress-Tool/0.1"
    })
    .to_string();
    let body_bytes = match body {
        Some(b) => Some(serde_json::to_vec(b).map_err(|e| ApiError {
            status: 0,
            detail: format!("Failed to encode request body: {e}"),
        })?),
        None => None,
    };
    http_send(method, url, &headers, body_bytes)
}

/// Core request loop: caller supplies the full headers JSON and raw body bytes.
/// Used directly by media upload (binary body + Content-Disposition) and via
/// `http` for JSON actions. Retries on 429/5xx.
fn http_send(
    method: Method,
    url: &str,
    headers: &str,
    body_bytes: Option<Vec<u8>>,
) -> Result<Value, ApiError> {
    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        // Credentials (Basic header / consumer-key query params) are injected by
        // the host per the capabilities file; this tool never sees them.
        let resp = near::agent::host::http_request(
            method.as_str(),
            url,
            headers,
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
                    "WordPress {} {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
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
    // Some successful WP/Woo responses (e.g. 204 on delete edge cases) can be
    // empty; treat an empty body as a null JSON value rather than a parse error.
    if text.trim().is_empty() {
        return Ok(Value::Null);
    }
    serde_json::from_str(&text).map_err(|e| ApiError {
        status: response.status,
        detail: format!("Failed to parse response: {e}"),
    })
}

/// Pull a concise message out of a WP/Woo error body (`{code, message, data}`).
fn extract_detail(body: &[u8]) -> String {
    serde_json::from_slice::<Value>(body)
        .ok()
        .and_then(|v| {
            v.get("message")
                .and_then(Value::as_str)
                .map(str::to_string)
                .or_else(|| v.get("code").and_then(Value::as_str).map(str::to_string))
        })
        .unwrap_or_else(|| String::from_utf8_lossy(body).chars().take(300).collect())
}

fn map_error(e: ApiError) -> String {
    match e.status {
        401 => format!(
            "Authentication failed (HTTP 401): {}. Check the credentials set via \
             'ironclaw tool setup wordpress-tool' and that the baked host/username match this site.",
            e.detail
        ),
        403 => format!(
            "Forbidden (HTTP 403): {}. The account lacks permission for this operation.",
            e.detail
        ),
        404 => format!(
            "Not found (HTTP 404): {}. Check the id/endpoint, and that REST is enabled with pretty \
             permalinks (/wp-json/).",
            e.detail
        ),
        400 | 422 => format!(
            "Request rejected (HTTP {}): {}. Check field names and value types in 'data'/'query'.",
            e.status, e.detail
        ),
        429 => format!("Rate limited (HTTP 429): {}", e.detail),
        0 => e.detail,
        s => format!("Request failed (HTTP {s}): {}", e.detail),
    }
}

// ==================== Encoding ====================

/// Percent-encode a string for a URL query value (RFC 3986 unreserved set).
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

// ==================== Media helpers ====================

/// Decode a base64 payload into raw bytes. Tolerates surrounding whitespace, a
/// `data:...;base64,` URL prefix, and missing `=` padding.
fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    let s = input.trim();
    // Strip a data-URL prefix like "data:image/png;base64,".
    let s = if s.starts_with("data:") {
        s.split_once("base64,").map(|(_, b)| b).unwrap_or(s)
    } else {
        s
    };
    let mut cleaned: String = s.chars().filter(|c| !c.is_whitespace()).collect();
    if cleaned.is_empty() {
        return Err("'content_base64' is empty".into());
    }
    while !cleaned.len().is_multiple_of(4) {
        cleaned.push('=');
    }
    base64::engine::general_purpose::STANDARD
        .decode(cleaned.as_bytes())
        .map_err(|e| format!("'content_base64' is not valid base64: {e}"))
}

/// Reduce a caller-supplied name to a safe single filename: basename only, no
/// control chars or quotes (which would break the Content-Disposition header).
fn sanitize_filename(name: &str) -> Result<String, String> {
    let base = name.rsplit(['/', '\\']).next().unwrap_or(name).trim();
    let cleaned: String = base
        .chars()
        .filter(|c| !c.is_control() && *c != '"' && *c != '\\')
        .collect();
    let cleaned = cleaned.trim().to_string();
    if cleaned.is_empty() {
        return Err("'filename' is empty or invalid".into());
    }
    Ok(cleaned)
}

/// Best-effort content type from a filename extension. WordPress validates the
/// upload against its allowed MIME types, so an explicit `mime` param overrides
/// this when the guess is wrong.
fn mime_from_filename(name: &str) -> &'static str {
    let ext = name
        .rsplit('.')
        .next()
        .filter(|e| !e.is_empty() && *e != name)
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "avif" => "image/avif",
        "tiff" | "tif" => "image/tiff",
        "pdf" => "application/pdf",
        "mp4" | "m4v" => "video/mp4",
        "mov" => "video/quicktime",
        "webm" => "video/webm",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" | "oga" => "audio/ogg",
        "zip" => "application/zip",
        "txt" => "text/plain",
        "csv" => "text/csv",
        "doc" => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        _ => "application/octet-stream",
    }
}

export!(WordpressTool);

// NOTE: top-level `required` + `oneOf` (per-action branch) shape. The host
// forwards only fields named in the matching branch's `properties`/`required`;
// a flat schema would strip every argument outside the branch. Each branch pins
// `command` to a const and lists that action's fields. No top-level
// `additionalProperties: false`.
const SCHEMA: &str = r#"{
    "type": "object",
    "required": ["command"],
    "oneOf": [
        {
            "properties": {
                "command": { "const": "wp_request" },
                "site_url": { "type": "string", "description": "Your site host, e.g. 'mystore.com'. Must match the host baked into the tool at install." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "method": { "type": "string", "enum": ["GET", "POST", "PUT", "DELETE"], "description": "HTTP method." },
                "endpoint": { "type": "string", "description": "REST path starting with '/wp-json/', e.g. '/wp-json/wp/v2/pages' or '/wp-json/wc/v3/coupons'." },
                "query": { "type": "object", "description": "Query parameters as a flat object; values are stringified." },
                "body": { "type": "object", "description": "JSON body for POST/PUT (ignored for GET/DELETE)." }
            },
            "required": ["command", "site_url", "method", "endpoint"]
        },
        {
            "properties": {
                "command": { "const": "list_posts" },
                "site_url": { "type": "string", "description": "Your site host, e.g. 'mystore.com'." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "page": { "type": "integer", "description": "Page number (1-based).", "minimum": 1 },
                "per_page": { "type": "integer", "description": "Items per page (1-100, clamped).", "minimum": 1 },
                "search": { "type": "string", "description": "Full-text search term." },
                "status": { "type": "string", "description": "Post status filter, e.g. 'publish', 'draft', 'any'." }
            },
            "required": ["command", "site_url"]
        },
        {
            "properties": {
                "command": { "const": "get_post" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Post id." }
            },
            "required": ["command", "site_url", "id"]
        },
        {
            "properties": {
                "command": { "const": "create_post" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "data": { "type": "object", "description": "Post fields, e.g. {\"title\":\"…\",\"content\":\"…\",\"status\":\"draft\"}." }
            },
            "required": ["command", "site_url", "data"]
        },
        {
            "properties": {
                "command": { "const": "update_post" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Post id." },
                "data": { "type": "object", "description": "Fields to change (partial update)." }
            },
            "required": ["command", "site_url", "id", "data"]
        },
        {
            "properties": {
                "command": { "const": "delete_post" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Post id." },
                "force": { "type": "boolean", "description": "true = delete permanently; false/omitted = move to trash (default)." }
            },
            "required": ["command", "site_url", "id"]
        },
        {
            "properties": {
                "command": { "const": "list_products" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "page": { "type": "integer", "minimum": 1, "description": "Page number (1-based)." },
                "per_page": { "type": "integer", "minimum": 1, "description": "Items per page (1-100)." },
                "search": { "type": "string", "description": "Search term." },
                "status": { "type": "string", "description": "Product status, e.g. 'publish', 'draft'." }
            },
            "required": ["command", "site_url"]
        },
        {
            "properties": {
                "command": { "const": "get_product" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Product id." }
            },
            "required": ["command", "site_url", "id"]
        },
        {
            "properties": {
                "command": { "const": "create_product" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "data": { "type": "object", "description": "Product fields, e.g. {\"name\":\"…\",\"type\":\"simple\",\"regular_price\":\"9.99\"}." }
            },
            "required": ["command", "site_url", "data"]
        },
        {
            "properties": {
                "command": { "const": "update_product" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Product id." },
                "data": { "type": "object", "description": "Fields to change (partial update)." }
            },
            "required": ["command", "site_url", "id", "data"]
        },
        {
            "properties": {
                "command": { "const": "delete_product" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Product id." },
                "force": { "type": "boolean", "description": "true = delete permanently; false/omitted = trash (default). Note: WooCommerce may require force=true for some resources." }
            },
            "required": ["command", "site_url", "id"]
        },
        {
            "properties": {
                "command": { "const": "upload_media" },
                "site_url": { "type": "string", "description": "Your site host, e.g. 'mystore.com'." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "filename": { "type": "string", "description": "File name including extension, e.g. 'logo.png'. Used for the Content-Disposition and to guess the MIME type." },
                "content_base64": { "type": "string", "description": "The file's bytes, base64-encoded. A 'data:...;base64,' prefix is accepted. Keep files small (a few MB) — very large files can exceed the WASM sandbox memory limit." },
                "mime": { "type": "string", "description": "Optional explicit MIME type (e.g. 'image/png'). Overrides the guess from the filename extension." },
                "title": { "type": "string", "description": "Optional media title." },
                "alt_text": { "type": "string", "description": "Optional alt text (accessibility)." },
                "caption": { "type": "string", "description": "Optional caption." },
                "post": { "type": "integer", "description": "Optional parent post id to attach the media to." }
            },
            "required": ["command", "site_url", "filename", "content_base64"]
        },
        {
            "properties": {
                "command": { "const": "list_media" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "page": { "type": "integer", "minimum": 1, "description": "Page number (1-based)." },
                "per_page": { "type": "integer", "minimum": 1, "description": "Items per page (1-100)." },
                "search": { "type": "string", "description": "Search term." }
            },
            "required": ["command", "site_url"]
        },
        {
            "properties": {
                "command": { "const": "get_media" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Media (attachment) id." }
            },
            "required": ["command", "site_url", "id"]
        },
        {
            "properties": {
                "command": { "const": "update_media" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Media (attachment) id." },
                "data": { "type": "object", "description": "Fields to change, e.g. {\"title\":\"…\",\"alt_text\":\"…\",\"caption\":\"…\"}." }
            },
            "required": ["command", "site_url", "id", "data"]
        },
        {
            "properties": {
                "command": { "const": "delete_media" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Media (attachment) id." },
                "force": { "type": "boolean", "description": "WordPress cannot trash media, so this defaults to true (permanent delete). Set false only if you have a plugin that supports trashing media." }
            },
            "required": ["command", "site_url", "id"]
        },
        {
            "properties": {
                "command": { "const": "list_orders" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "page": { "type": "integer", "minimum": 1, "description": "Page number (1-based)." },
                "per_page": { "type": "integer", "minimum": 1, "description": "Items per page (1-100)." },
                "search": { "type": "string", "description": "Search term." },
                "status": { "type": "string", "description": "Order status, e.g. 'processing', 'completed', 'any'." }
            },
            "required": ["command", "site_url"]
        },
        {
            "properties": {
                "command": { "const": "get_order" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Order id." }
            },
            "required": ["command", "site_url", "id"]
        },
        {
            "properties": {
                "command": { "const": "update_order" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "id": { "type": "integer", "description": "Order id." },
                "data": { "type": "object", "description": "Fields to change, e.g. {\"status\":\"completed\"}." }
            },
            "required": ["command", "site_url", "id", "data"]
        },
        {
            "properties": {
                "command": { "const": "list_customers" },
                "site_url": { "type": "string", "description": "Your site host." },
                "api_prefix": { "type": "string", "description": "Optional REST path prefix if your site does not use the default '/wp-json/' (e.g. '/api/'). Must match the prefix baked into the tool at install." },
                "page": { "type": "integer", "minimum": 1, "description": "Page number (1-based)." },
                "per_page": { "type": "integer", "minimum": 1, "description": "Items per page (1-100)." },
                "search": { "type": "string", "description": "Search term (email/name)." }
            },
            "required": ["command", "site_url"]
        }
    ]
}"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn site_base_strips_scheme_and_path() {
        assert_eq!(site_base("mystore.com").unwrap(), "https://mystore.com");
        assert_eq!(
            site_base("https://Shop.Example.com/wp-json/x?y=1").unwrap(),
            "https://shop.example.com"
        );
        assert_eq!(site_base("http://a.b.co/path").unwrap(), "https://a.b.co");
    }

    #[test]
    fn site_base_rejects_bad_hosts() {
        assert!(site_base("").is_err());
        assert!(site_base("localhost").is_err()); // no dot
        assert!(site_base("has space.com").is_err());
        assert!(site_base("host:8080.com/../x").is_err()); // ':' not allowed
        assert!(site_base(".leadingdot.com").is_err());
    }

    #[test]
    fn endpoint_must_match_prefix() {
        assert!(check_endpoint("/wp-json/", "/wp-json/wp/v2/posts").is_ok());
        assert!(check_endpoint("/wp-json/", "/wp-json/wc/v3/orders").is_ok());
        assert!(check_endpoint("/wp-json/", "/wp/v2/posts").is_err());
        assert!(check_endpoint("/wp-json/", "https://x/wp-json/").is_err());
        // custom prefix
        assert!(check_endpoint("/api/", "/api/wp/v2/posts").is_ok());
        assert!(check_endpoint("/api/", "/wp-json/wp/v2/posts").is_err());
    }

    #[test]
    fn route_secrets_by_prefix() {
        assert_eq!(
            route_secrets("/wp-json/", "/wp-json/wc/v3/orders"),
            &[SECRET_WOO_KEY, SECRET_WOO_SECRET]
        );
        assert_eq!(
            route_secrets("/wp-json/", "/wp-json/wp/v2/posts"),
            &[SECRET_WP]
        );
        assert!(route_secrets("/wp-json/", "/wp-json/myplugin/v1/x").is_empty());
        // custom prefix routes the same way
        assert_eq!(
            route_secrets("/api/", "/api/wc/v3/orders"),
            &[SECRET_WOO_KEY, SECRET_WOO_SECRET]
        );
        assert_eq!(route_secrets("/api/", "/api/wp/v2/posts"), &[SECRET_WP]);
        // a default-prefix endpoint under a custom prefix is not matched
        assert!(route_secrets("/api/", "/wp-json/wp/v2/posts").is_empty());
    }

    #[test]
    fn norm_prefix_cases() {
        assert_eq!(norm_prefix(None).unwrap(), "/wp-json/");
        assert_eq!(norm_prefix(Some("".into())).unwrap(), "/wp-json/");
        assert_eq!(norm_prefix(Some("/api/".into())).unwrap(), "/api/");
        assert_eq!(norm_prefix(Some("api".into())).unwrap(), "/api/");
        assert_eq!(norm_prefix(Some("wp-json".into())).unwrap(), "/wp-json/");
        assert_eq!(
            norm_prefix(Some("/custom/rest/".into())).unwrap(),
            "/custom/rest/"
        );
        assert!(norm_prefix(Some("/".into())).is_err());
        assert!(norm_prefix(Some("https://x/api/".into())).is_err());
        assert!(norm_prefix(Some("/a b/".into())).is_err());
    }

    #[test]
    fn method_parse() {
        assert!(matches!(Method::parse("get").unwrap(), Method::Get));
        assert!(matches!(Method::parse("PUT").unwrap(), Method::Put));
        assert!(Method::parse("PATCH").is_err());
    }

    #[test]
    fn force_query_flag() {
        assert!(force_query(None).is_empty());
        assert!(force_query(Some(false)).is_empty());
        assert_eq!(
            force_query(Some(true)),
            vec![("force".to_string(), "true".to_string())]
        );
    }

    #[test]
    fn list_args_query_clamps_and_scopes_status() {
        let a = ListArgs {
            site_url: "x.com".into(),
            page: Some(2),
            per_page: Some(500),
            search: Some("hat".into()),
            status: Some("publish".into()),
            api_prefix: None,
        };
        let with = a.query(true);
        assert!(with.contains(&("per_page".into(), "100".into()))); // clamped
        assert!(with.contains(&("status".into(), "publish".into())));
        let without = a.query(false);
        assert!(!without.iter().any(|(k, _)| k == "status"));
    }

    #[test]
    fn command_dispatch_parses() {
        let p = r#"{"command":"get_post","site_url":"mystore.com","id":42}"#;
        let c: Command = serde_json::from_str(p).unwrap();
        assert!(matches!(c, Command::GetPost { id: 42, .. }));
    }

    #[test]
    fn value_to_query_string_variants() {
        assert_eq!(value_to_query_string(&Value::String("a b".into())), "a b");
        assert_eq!(value_to_query_string(&serde_json::json!(5)), "5");
        assert_eq!(value_to_query_string(&serde_json::json!(true)), "true");
    }

    #[test]
    fn base64_decode_tolerant() {
        // "hello" == aGVsbG8=
        assert_eq!(decode_base64("aGVsbG8=").unwrap(), b"hello");
        // whitespace/newlines tolerated
        assert_eq!(decode_base64("aGVs\n bG8=").unwrap(), b"hello");
        // missing padding tolerated
        assert_eq!(decode_base64("aGVsbG8").unwrap(), b"hello");
        // data-URL prefix stripped
        assert_eq!(
            decode_base64("data:text/plain;base64,aGVsbG8=").unwrap(),
            b"hello"
        );
        assert!(decode_base64("!!!not base64!!!").is_err());
    }

    #[test]
    fn sanitize_filename_basename_only() {
        assert_eq!(sanitize_filename("logo.png").unwrap(), "logo.png");
        assert_eq!(sanitize_filename("/a/b/pic.jpg").unwrap(), "pic.jpg");
        assert_eq!(sanitize_filename("evil\"name.png").unwrap(), "evilname.png");
        assert!(sanitize_filename("   ").is_err());
    }

    #[test]
    fn mime_from_filename_guesses() {
        assert_eq!(mime_from_filename("a.PNG"), "image/png");
        assert_eq!(mime_from_filename("photo.jpeg"), "image/jpeg");
        assert_eq!(mime_from_filename("doc.pdf"), "application/pdf");
        assert_eq!(mime_from_filename("noext"), "application/octet-stream");
        assert_eq!(mime_from_filename("weird.xyz"), "application/octet-stream");
    }

    #[test]
    fn schema_is_valid_json_with_all_branches() {
        let v: Value = serde_json::from_str(SCHEMA).expect("SCHEMA must be valid JSON");
        let branches = v["oneOf"].as_array().expect("oneOf array");
        assert_eq!(branches.len(), 20, "one branch per command");
        // Every branch exposes api_prefix so the host does not strip it.
        for b in branches {
            assert!(
                b["properties"].get("api_prefix").is_some(),
                "branch missing api_prefix: {}",
                b["properties"]["command"]
            );
        }
    }

    #[test]
    fn upload_media_command_parses() {
        let p = r#"{"command":"upload_media","site_url":"mystore.com","filename":"a.png","content_base64":"aGVsbG8=","alt_text":"hi"}"#;
        let c: Command = serde_json::from_str(p).unwrap();
        assert!(matches!(c, Command::UploadMedia { .. }));
    }
}
