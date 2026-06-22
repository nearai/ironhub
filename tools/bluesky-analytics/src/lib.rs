//! Bluesky (AT Protocol) read-only analytics WASM tool for IronClaw.
//!
//! Browses public Bluesky data through the unauthenticated AppView
//! `public.api.bsky.app`. No credentials, secrets, or session are required —
//! every action is a public XRPC `GET`.
//!
//! Writes (post, reply/comment, like, repost, follow) are intentionally absent:
//! they need a Bearer `accessJwt` minted by `com.atproto.server.createSession`,
//! whose login takes the app password in the request body. A stateless WASM tool
//! cannot read a secret nor have the host inject one into a body, so writes are
//! impossible here and belong on the Reborn Script lane.
//!
//! Network access is restricted to the host declared in
//! `bluesky-analytics-tool.capabilities.json`.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{json, Value};

const XRPC_BASE: &str = "https://public.api.bsky.app/xrpc";
const DEFAULT_LIMIT: u32 = 50;
const MAX_LIMIT: u32 = 100;
const MAX_RETRIES: u32 = 3;
/// Default reply-tree depth for `get_post_thread`.
const DEFAULT_THREAD_DEPTH: u32 = 6;
const MAX_THREAD_DEPTH: u32 = 100;

struct BlueskyAnalyticsTool;

impl exports::near::agent::tool::Guest for BlueskyAnalyticsTool {
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
        "Read-only Bluesky (AT Protocol) analytics via the public AppView. Actions: \
         'get_profile' (follower/follows/post counts + bio for an account), \
         'get_author_feed' (an account's posts with like/repost/reply/quote counts), \
         'get_post_thread' (a post and its reply/comment tree), 'get_followers' and \
         'get_follows' (social graph), 'get_likes' and 'get_reposted_by' (accounts that \
         engaged with a post), 'search_actors' (find accounts by keyword). Accounts are \
         named by handle (e.g. 'alice.bsky.social') or DID; posts by at-uri \
         (e.g. 'at://did:plc:.../app.bsky.feed.post/<rkey>', obtained from get_author_feed). \
         All data is public; no authentication is required. Writes are not supported."
            .to_string()
    }
}

/// Tool actions. The model selects one via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    /// Profile + follower/follows/post counts for one account.
    GetProfile { actor: String },
    /// An account's own posts, each with engagement counts.
    GetAuthorFeed {
        actor: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        cursor: Option<String>,
        /// Server-side feed filter, e.g. "posts_with_replies", "posts_no_replies",
        /// "posts_with_media", "posts_and_author_threads".
        #[serde(default)]
        filter: Option<String>,
    },
    /// A post and its nested replies (the comment tree).
    GetPostThread {
        uri: String,
        #[serde(default)]
        depth: Option<u32>,
    },
    /// Accounts that follow the given account.
    GetFollowers {
        actor: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        cursor: Option<String>,
    },
    /// Accounts the given account follows.
    GetFollows {
        actor: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        cursor: Option<String>,
    },
    /// Accounts that liked a post.
    GetLikes {
        uri: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        cursor: Option<String>,
    },
    /// Accounts that reposted a post.
    GetRepostedBy {
        uri: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        cursor: Option<String>,
    },
    /// Find accounts by keyword.
    SearchActors {
        q: String,
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        cursor: Option<String>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid params: {e}. Provide an object with an 'action' field; \
             call the tool schema for the accepted actions and fields."
        )
    })?;

    let out = match action {
        Action::GetProfile { actor } => {
            let actor = require(&actor, "actor")?;
            let v = xrpc_get("app.bsky.actor.getProfile", &[("actor", actor)])?;
            project_profile(&v)
        }
        Action::GetAuthorFeed {
            actor,
            limit,
            cursor,
            filter,
        } => {
            let actor = require(&actor, "actor")?;
            let mut q = vec![("actor", actor.to_string()), ("limit", clamp_limit(limit))];
            push_opt(&mut q, "cursor", cursor);
            push_opt(&mut q, "filter", filter);
            let v = xrpc_get_owned("app.bsky.feed.getAuthorFeed", q)?;
            let items: Vec<Value> = arr(&v, "feed").iter().map(project_feed_view).collect();
            json!({ "feed": items, "cursor": v.get("cursor") })
        }
        Action::GetPostThread { uri, depth } => {
            let uri = require_uri(&uri)?;
            let depth = depth.unwrap_or(DEFAULT_THREAD_DEPTH).min(MAX_THREAD_DEPTH);
            let v = xrpc_get(
                "app.bsky.feed.getPostThread",
                &[("uri", uri), ("depth", &depth.to_string())],
            )?;
            project_thread(v.get("thread").unwrap_or(&Value::Null))
        }
        Action::GetFollowers {
            actor,
            limit,
            cursor,
        } => actor_list(
            "app.bsky.graph.getFollowers",
            &actor,
            limit,
            cursor,
            "followers",
        )?,
        Action::GetFollows {
            actor,
            limit,
            cursor,
        } => actor_list(
            "app.bsky.graph.getFollows",
            &actor,
            limit,
            cursor,
            "follows",
        )?,
        Action::GetLikes { uri, limit, cursor } => {
            let uri = require_uri(&uri)?;
            let mut q = vec![("uri", uri.to_string()), ("limit", clamp_limit(limit))];
            push_opt(&mut q, "cursor", cursor);
            let v = xrpc_get_owned("app.bsky.feed.getLikes", q)?;
            // Each like entry wraps the liking actor under `actor`.
            let people: Vec<Value> = arr(&v, "likes")
                .iter()
                .filter_map(|l| l.get("actor"))
                .map(project_actor)
                .collect();
            json!({ "likes": people, "cursor": v.get("cursor") })
        }
        Action::GetRepostedBy { uri, limit, cursor } => {
            let uri = require_uri(&uri)?;
            let mut q = vec![("uri", uri.to_string()), ("limit", clamp_limit(limit))];
            push_opt(&mut q, "cursor", cursor);
            let v = xrpc_get_owned("app.bsky.feed.getRepostedBy", q)?;
            let people: Vec<Value> = arr(&v, "repostedBy").iter().map(project_actor).collect();
            json!({ "repostedBy": people, "cursor": v.get("cursor") })
        }
        Action::SearchActors { q, limit, cursor } => {
            let term = require(&q, "q")?;
            let mut params = vec![("q", term.to_string()), ("limit", clamp_limit(limit))];
            push_opt(&mut params, "cursor", cursor);
            let v = xrpc_get_owned("app.bsky.actor.searchActors", params)?;
            let people: Vec<Value> = arr(&v, "actors").iter().map(project_actor).collect();
            json!({ "actors": people, "cursor": v.get("cursor") })
        }
    };

    serde_json::to_string(&out).map_err(|e| format!("Failed to serialize output: {e}"))
}

// ---------------------------------------------------------------------------
// Shared action helpers
// ---------------------------------------------------------------------------

/// Followers/follows share the same shape: actor in, list of actors out.
fn actor_list(
    nsid: &str,
    actor: &str,
    limit: Option<u32>,
    cursor: Option<String>,
    key: &str,
) -> Result<Value, String> {
    let actor = require(actor, "actor")?;
    let mut q = vec![("actor", actor.to_string()), ("limit", clamp_limit(limit))];
    push_opt(&mut q, "cursor", cursor);
    let v = xrpc_get_owned(nsid, q)?;
    let people: Vec<Value> = arr(&v, key).iter().map(project_actor).collect();
    Ok(json!({ key: people, "cursor": v.get("cursor") }))
}

fn require<'a>(value: &'a str, field: &str) -> Result<&'a str, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        Err(format!("Missing required field '{field}'."))
    } else {
        Ok(trimmed)
    }
}

/// Post-scoped actions need an at-uri; validate before issuing any request.
fn require_uri(uri: &str) -> Result<&str, String> {
    let trimmed = uri.trim();
    if !trimmed.starts_with("at://") {
        return Err(format!(
            "Invalid post uri '{trimmed}': expected an at-uri like \
             'at://did:plc:.../app.bsky.feed.post/<rkey>'. Obtain one from get_author_feed."
        ));
    }
    Ok(trimmed)
}

fn clamp_limit(limit: Option<u32>) -> String {
    limit
        .unwrap_or(DEFAULT_LIMIT)
        .clamp(1, MAX_LIMIT)
        .to_string()
}

fn push_opt(q: &mut Vec<(&'static str, String)>, key: &'static str, value: Option<String>) {
    if let Some(v) = value {
        let v = v.trim();
        if !v.is_empty() {
            q.push((key, v.to_string()));
        }
    }
}

// ---------------------------------------------------------------------------
// Compact projections (token-killer: keep only analytics-relevant fields)
// ---------------------------------------------------------------------------

fn project_profile(v: &Value) -> Value {
    json!({
        "handle": v.get("handle"),
        "did": v.get("did"),
        "displayName": v.get("displayName"),
        "description": v.get("description"),
        "followersCount": v.get("followersCount"),
        "followsCount": v.get("followsCount"),
        "postsCount": v.get("postsCount"),
        "createdAt": v.get("createdAt"),
    })
}

fn project_actor(v: &Value) -> Value {
    json!({
        "handle": v.get("handle"),
        "did": v.get("did"),
        "displayName": v.get("displayName"),
        "description": v.get("description"),
    })
}

/// A feed view = a post plus optional `reason` (repost) / `reply` markers.
fn project_feed_view(item: &Value) -> Value {
    let post = item.get("post").unwrap_or(&Value::Null);
    let mut out = project_post(post);
    if let Some(obj) = out.as_object_mut() {
        let is_repost = item
            .get("reason")
            .and_then(|r| r.get("$type"))
            .and_then(|t| t.as_str())
            .map(|t| t.contains("reasonRepost"))
            .unwrap_or(false);
        obj.insert("isRepost".into(), json!(is_repost));
        obj.insert("isReply".into(), json!(item.get("reply").is_some()));
    }
    out
}

/// Project a single post view to its analytics essentials.
fn project_post(post: &Value) -> Value {
    let record = post.get("record");
    json!({
        "uri": post.get("uri"),
        "cid": post.get("cid"),
        "text": record.and_then(|r| r.get("text")),
        "createdAt": record.and_then(|r| r.get("createdAt")),
        "langs": record.and_then(|r| r.get("langs")),
        "likeCount": post.get("likeCount"),
        "repostCount": post.get("repostCount"),
        "replyCount": post.get("replyCount"),
        "quoteCount": post.get("quoteCount"),
        "author": post.get("author").map(project_actor),
        "indexedAt": post.get("indexedAt"),
    })
}

/// Recursively project a thread node (post + nested replies = comments).
fn project_thread(node: &Value) -> Value {
    let kind = node.get("$type").and_then(|t| t.as_str()).unwrap_or("");
    if kind.contains("notFoundPost") {
        return json!({ "notFound": true, "uri": node.get("uri") });
    }
    if kind.contains("blockedPost") {
        return json!({ "blocked": true, "uri": node.get("uri") });
    }
    let post = node.get("post").unwrap_or(&Value::Null);
    let replies: Vec<Value> = node
        .get("replies")
        .and_then(|r| r.as_array())
        .map(|a| a.iter().map(project_thread).collect())
        .unwrap_or_default();
    json!({ "post": project_post(post), "replies": replies })
}

// ---------------------------------------------------------------------------
// HTTP (public, unauthenticated XRPC GET)
// ---------------------------------------------------------------------------

fn xrpc_get(nsid: &str, params: &[(&str, &str)]) -> Result<Value, String> {
    let owned: Vec<(&str, String)> = params.iter().map(|(k, v)| (*k, v.to_string())).collect();
    xrpc_get_owned(nsid, owned)
}

fn xrpc_get_owned(nsid: &str, params: Vec<(&str, String)>) -> Result<Value, String> {
    let mut url = format!("{XRPC_BASE}/{nsid}");
    if !params.is_empty() {
        let qs: Vec<String> = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, encode(v)))
            .collect();
        url.push('?');
        url.push_str(&qs.join("&"));
    }
    http_get_json(&url)
}

fn http_get_json(url: &str) -> Result<Value, String> {
    let body = http_get_text(url)?;
    serde_json::from_str(&body).map_err(|e| format!("Failed to parse Bluesky response: {e}"))
}

fn http_get_text(url: &str) -> Result<String, String> {
    let headers = json!({
        "Accept": "application/json",
        "User-Agent": "IronClaw-Bluesky-Analytics-Tool/0.1"
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
                    "Bluesky request to {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        return Err(format!(
            "Bluesky request failed (HTTP {}): {}",
            resp.status,
            String::from_utf8_lossy(&resp.body)
        ));
    };

    String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))
}

/// Percent-encode a query-parameter value (RFC 3986 unreserved set kept as-is).
/// at-uris and search terms contain ':', '/', and spaces that must be escaped.
fn encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{b:02X}")),
        }
    }
    out
}

// ---------------------------------------------------------------------------

fn arr<'a>(v: &'a Value, key: &str) -> &'a [Value] {
    v.get(key)
        .and_then(|x| x.as_array())
        .map(|a| a.as_slice())
        .unwrap_or(&[])
}

const SCHEMA: &str = r#"{
    "type": "object",
    "properties": {
        "action": {
            "type": "string",
            "enum": ["get_profile", "get_author_feed", "get_post_thread", "get_followers", "get_follows", "get_likes", "get_reposted_by", "search_actors"],
            "description": "Which read-only Bluesky operation to perform."
        },
        "actor": {
            "type": "string",
            "description": "Account identifier: a handle (e.g. 'alice.bsky.social') or DID (e.g. 'did:plc:...'). REQUIRED for get_profile, get_author_feed, get_followers, get_follows."
        },
        "uri": {
            "type": "string",
            "description": "Post at-uri (e.g. 'at://did:plc:.../app.bsky.feed.post/<rkey>'). REQUIRED for get_post_thread, get_likes, get_reposted_by. Obtain one from get_author_feed output."
        },
        "q": {
            "type": "string",
            "description": "Keyword query. REQUIRED for search_actors (matches handle/display name/bio)."
        },
        "limit": {
            "type": "integer",
            "description": "Max results for list actions (1-100, default 50). Applies to get_author_feed, get_followers, get_follows, get_likes, get_reposted_by, search_actors.",
            "minimum": 1,
            "maximum": 100,
            "default": 50
        },
        "cursor": {
            "type": "string",
            "description": "Opaque pagination cursor from a previous response. Pass it back to fetch the next page."
        },
        "filter": {
            "type": "string",
            "description": "Optional server-side filter for get_author_feed: 'posts_with_replies', 'posts_no_replies', 'posts_with_media', or 'posts_and_author_threads'.",
            "enum": ["posts_with_replies", "posts_no_replies", "posts_with_media", "posts_and_author_threads"]
        },
        "depth": {
            "type": "integer",
            "description": "Reply-tree depth for get_post_thread (default 6, max 100).",
            "minimum": 0,
            "maximum": 100
        }
    },
    "required": ["action"],
    "additionalProperties": false
}"#;

export!(BlueskyAnalyticsTool);
