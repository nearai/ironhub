//! YouTube Data API v3 & Transcript WASM Tool for Ironclaw.
//!
//! Provides token-optimized public read actions for YouTube videos, comments, channels, playlists, and video transcripts.
//!
//! Actions:
//! - `get_video_details`  — Fetch metadata & stats (views, likes, comments) for video IDs (1 unit quota).
//! - `list_comments`      — Fetch comment threads & top replies for a video or channel (1 unit quota).
//! - `get_channel_stats`  — Fetch subscriber, view, and video counts + Uploads playlist ID (1 unit quota).
//! - `get_channel_videos` — Fetch recent videos from a channel's Uploads playlist (1 unit quota).
//! - `search_videos`      — Keyword video search (100 units quota — use sparingly).
//! - `get_transcript`     — Retrieve full text transcript for a video ID via youtube-transcript.ai (2 req/s rate limit).

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::Value;

#[cfg(not(feature = "reborn"))]
const SECRET_NAME: &str = "youtube_api_key";
const BASE_HOST: &str = "www.googleapis.com";
const HTTP_TIMEOUT_MS: u32 = 30_000;

struct YouTubeTool;

impl exports::near::agent::tool::Guest for YouTubeTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        #[cfg(feature = "reborn")]
        let result = execute_reborn(&req.params, req.context.as_deref());
        #[cfg(not(feature = "reborn"))]
        let result = execute_inner(&req.params);

        match result.and_then(encode_guest_output) {
            Ok(output_json) => exports::near::agent::tool::Response {
                output: Some(output_json),
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
        "YouTube Data API v3 integration for video statistics, comment sentiment, channel analytics, \
         uploads playlist tracking, search, and direct video transcript retrieval."
            .to_string()
    }
}

/// The WIT response carries JSON text, not arbitrary display text. The tool's
/// compact YAML is therefore returned as a JSON string value so the host can
/// decode it without reinterpreting YAML scalars or objects as JSON.
fn encode_guest_output(output: String) -> Result<String, String> {
    serde_json::to_string(&output).map_err(|_| "youtube_output_encode_failed".to_string())
}

#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case", deny_unknown_fields)]
enum Action {
    GetVideoDetails {
        video_id: String,
    },
    ListComments {
        #[serde(default)]
        video_id: Option<String>,
        #[serde(default)]
        channel_id: Option<String>,
        #[serde(default)]
        max_results: Option<u32>,
        #[serde(default)]
        order: Option<String>,
        #[serde(default)]
        page_token: Option<String>,
    },
    GetChannelStats {
        #[serde(default)]
        channel_id: Option<String>,
        #[serde(default)]
        handle: Option<String>,
        #[serde(default)]
        for_username: Option<String>,
    },
    GetChannelVideos {
        #[serde(default)]
        playlist_id: Option<String>,
        #[serde(default)]
        channel_id: Option<String>,
        #[serde(default)]
        max_results: Option<u32>,
        #[serde(default)]
        page_token: Option<String>,
    },
    SearchVideos {
        query: String,
        #[serde(default)]
        max_results: Option<u32>,
        #[serde(default)]
        order: Option<String>,
        #[serde(default)]
        type_filter: Option<String>,
        #[serde(default)]
        published_after: Option<String>,
        #[serde(default)]
        page_token: Option<String>,
    },
    GetTranscript {
        video_id: String,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid parameters: {e}. Provide an 'action' field (one of: get_video_details, list_comments, get_channel_stats, get_channel_videos, search_videos, get_transcript)."
        )
    })?;

    match action {
        Action::GetTranscript { video_id } => run_get_transcript(video_id),
        other_action => {
            #[cfg(not(feature = "reborn"))]
            if !near::agent::host::secret_exists(SECRET_NAME) {
                return Err(
                    "YouTube API key ('youtube_api_key') not configured in capabilities. Please run setup for tool."
                        .to_string(),
                );
            }
            match other_action {
                Action::GetVideoDetails { video_id } => run_get_video_details(video_id),
                Action::ListComments {
                    video_id,
                    channel_id,
                    max_results,
                    order,
                    page_token,
                } => run_list_comments(video_id, channel_id, max_results, order, page_token),
                Action::GetChannelStats {
                    channel_id,
                    handle,
                    for_username,
                } => run_get_channel_stats(channel_id, handle, for_username),
                Action::GetChannelVideos {
                    playlist_id,
                    channel_id,
                    max_results,
                    page_token,
                } => run_get_channel_videos(playlist_id, channel_id, max_results, page_token),
                Action::SearchVideos {
                    query,
                    max_results,
                    order,
                    type_filter,
                    published_after,
                    page_token,
                } => run_search_videos(
                    query,
                    max_results,
                    order,
                    type_filter,
                    published_after,
                    page_token,
                ),
                Action::GetTranscript { .. } => unreachable!(),
            }
        }
    }
}

#[cfg(feature = "reborn")]
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ToolContext {
    capability_id: String,
}

#[cfg(feature = "reborn")]
fn execute_reborn(params: &str, context: Option<&str>) -> Result<String, String> {
    let context = context.ok_or_else(|| "missing_invocation_context".to_string())?;
    let context: ToolContext =
        serde_json::from_str(context).map_err(|_| "invalid_invocation_context".to_string())?;
    let action = match context.capability_id.as_str() {
        "youtube.get_video_details" => "get_video_details",
        "youtube.list_comments" => "list_comments",
        "youtube.get_channel_stats" => "get_channel_stats",
        "youtube.get_channel_videos" => "get_channel_videos",
        "youtube.search_videos" => "search_videos",
        "youtube.get_transcript" => "get_transcript",
        _ => return Err("unsupported_youtube_capability".to_string()),
    };

    let mut params: Value =
        serde_json::from_str(params).map_err(|_| "invalid_parameters".to_string())?;
    let object = params
        .as_object_mut()
        .ok_or_else(|| "invalid_parameters".to_string())?;
    if object.contains_key("action") {
        return Err("invalid_parameters".to_string());
    }
    object.insert("action".to_string(), Value::String(action.to_string()));
    execute_inner(&params.to_string())
}

fn run_get_transcript(video_id: String) -> Result<String, String> {
    let clean_id = video_id.trim();
    if clean_id.is_empty()
        || clean_id.len() > 64
        || !clean_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(
            "'video_id' must contain only ASCII letters, digits, '-' or '_' (max 64).".to_string(),
        );
    }

    let url = format!("https://youtube-transcript.ai/transcript/{clean_id}.txt");
    let headers_json = serde_json::json!({
        "Accept": "text/plain, */*",
        "User-Agent": "Ironclaw-YouTube-Tool/0.1.0"
    })
    .to_string();

    let res =
        near::agent::host::http_request("GET", &url, &headers_json, None, Some(HTTP_TIMEOUT_MS))
            .map_err(|e| format!("HTTP request to youtube-transcript.ai failed: {e}"))?;

    if res.status < 200 || res.status >= 300 {
        let body_str = String::from_utf8_lossy(&res.body);
        return Err(format!(
            "Failed to fetch transcript from youtube-transcript.ai (HTTP {}): {}",
            res.status, body_str
        ));
    }

    let transcript_text = String::from_utf8_lossy(&res.body);
    let mut out_yaml = String::new();
    out_yaml.push_str(&format!("video_id: \"{clean_id}\"\n"));
    out_yaml.push_str("transcript: |\n");
    for line in transcript_text.lines() {
        out_yaml.push_str(&format!("  {line}\n"));
    }

    Ok(out_yaml)
}

fn fetch_youtube_api(endpoint: &str, query_params: &[(&str, String)]) -> Result<Value, String> {
    let mut query_parts = Vec::new();
    for (k, v) in query_params {
        let encoded_v = url_encode(v);
        query_parts.push(format!("{k}={encoded_v}"));
    }
    let query_string = query_parts.join("&");
    let full_path = if query_string.is_empty() {
        format!("/youtube/v3/{endpoint}")
    } else {
        format!("/youtube/v3/{endpoint}?{query_string}")
    };

    let url = format!("https://{BASE_HOST}{full_path}");
    let headers_json = serde_json::json!({
        "Accept": "application/json",
        "User-Agent": "Ironclaw-YouTube-Tool/0.1.0"
    })
    .to_string();

    let res =
        near::agent::host::http_request("GET", &url, &headers_json, None, Some(HTTP_TIMEOUT_MS))
            .map_err(|e| format!("HTTP request failed: {e}"))?;

    if res.status < 200 || res.status >= 300 {
        let body_str = String::from_utf8_lossy(&res.body);
        return Err(format!(
            "YouTube API returned HTTP {}: {}",
            res.status, body_str
        ));
    }

    serde_json::from_slice(&res.body).map_err(|e| format!("Failed to parse JSON response: {e}"))
}

fn url_encode(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len());
    for b in input.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(b as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", b));
            }
        }
    }
    encoded
}

fn run_get_video_details(video_id: String) -> Result<String, String> {
    let query = vec![
        ("part", "snippet,contentDetails,statistics".to_string()),
        ("id", video_id),
    ];
    let data = fetch_youtube_api("videos", &query)?;
    let items = data.get("items").and_then(|v| v.as_array());

    let mut out_yaml = String::from("videos:\n");
    if let Some(items) = items {
        if items.is_empty() {
            out_yaml.push_str("  - note: \"No videos found for given ID\"\n");
        }
        for item in items {
            let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let snippet = item.get("snippet");
            let stats = item.get("statistics");
            let details = item.get("contentDetails");

            let title = snippet
                .and_then(|s| s.get("title"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let channel_title = snippet
                .and_then(|s| s.get("channelTitle"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let channel_id = snippet
                .and_then(|s| s.get("channelId"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let published_at = snippet
                .and_then(|s| s.get("publishedAt"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let duration = details
                .and_then(|d| d.get("duration"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let view_count = stats
                .and_then(|s| s.get("viewCount"))
                .and_then(|v| v.as_str())
                .unwrap_or("0");
            let like_count = stats
                .and_then(|s| s.get("likeCount"))
                .and_then(|v| v.as_str())
                .unwrap_or("0");
            let comment_count = stats
                .and_then(|s| s.get("commentCount"))
                .and_then(|v| v.as_str())
                .unwrap_or("0");

            out_yaml.push_str(&format!("  - id: \"{id}\"\n"));
            out_yaml.push_str(&format!("    title: {:?}\n", title));
            out_yaml.push_str(&format!("    channel_title: {:?}\n", channel_title));
            out_yaml.push_str(&format!("    channel_id: \"{channel_id}\"\n"));
            out_yaml.push_str(&format!("    published_at: \"{published_at}\"\n"));
            out_yaml.push_str(&format!("    duration: \"{duration}\"\n"));
            out_yaml.push_str(&format!("    view_count: {view_count}\n"));
            out_yaml.push_str(&format!("    like_count: {like_count}\n"));
            out_yaml.push_str(&format!("    comment_count: {comment_count}\n"));
        }
    } else {
        out_yaml.push_str("  - note: \"No videos returned\"\n");
    }

    Ok(out_yaml)
}

fn run_list_comments(
    video_id: Option<String>,
    channel_id: Option<String>,
    max_results: Option<u32>,
    order: Option<String>,
    page_token: Option<String>,
) -> Result<String, String> {
    if video_id.is_none() && channel_id.is_none() {
        return Err(
            "Either 'video_id' or 'channel_id' must be specified for list_comments.".to_string(),
        );
    }

    let mut query = vec![("part", "snippet,replies".to_string())];
    if let Some(vid) = video_id {
        query.push(("videoId", vid));
    }
    if let Some(cid) = channel_id {
        query.push(("channelId", cid));
    }
    let limit = max_results.unwrap_or(20).min(100);
    query.push(("maxResults", limit.to_string()));
    query.push(("order", order.unwrap_or_else(|| "relevance".to_string())));
    if let Some(token) = page_token {
        query.push(("pageToken", token));
    }

    let data = fetch_youtube_api("commentThreads", &query)?;
    let next_page_token = data
        .get("nextPageToken")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let mut out_yaml = String::new();
    if !next_page_token.is_empty() {
        out_yaml.push_str(&format!("next_page_token: \"{next_page_token}\"\n"));
    }
    out_yaml.push_str("comments:\n");

    if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
        if items.is_empty() {
            out_yaml.push_str("  - note: \"No comments found\"\n");
        }
        for item in items {
            let top_level = item
                .get("snippet")
                .and_then(|s| s.get("topLevelComment"))
                .and_then(|c| c.get("snippet"));

            if let Some(top) = top_level {
                let author = top
                    .get("authorDisplayName")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Anonymous");
                let text = top
                    .get("textDisplay")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let likes = top.get("likeCount").and_then(|v| v.as_u64()).unwrap_or(0);
                let published = top
                    .get("publishedAt")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let reply_count = item
                    .get("snippet")
                    .and_then(|s| s.get("totalReplyCount"))
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);

                let clean_text = text.replace('\n', " ").replace('\r', "");

                out_yaml.push_str(&format!("  - author: {:?}\n", author));
                out_yaml.push_str(&format!("    text: {:?}\n", clean_text));
                out_yaml.push_str(&format!("    likes: {likes}\n"));
                out_yaml.push_str(&format!("    published_at: \"{published}\"\n"));
                out_yaml.push_str(&format!("    reply_count: {reply_count}\n"));
            }
        }
    } else {
        out_yaml.push_str("  - note: \"No comment threads returned\"\n");
    }

    Ok(out_yaml)
}

fn run_get_channel_stats(
    channel_id: Option<String>,
    handle: Option<String>,
    for_username: Option<String>,
) -> Result<String, String> {
    let mut query = vec![("part", "snippet,statistics,contentDetails".to_string())];
    if let Some(cid) = channel_id {
        query.push(("id", cid));
    } else if let Some(h) = handle {
        let clean_handle = if h.starts_with('@') {
            h
        } else {
            format!("@{h}")
        };
        query.push(("forHandle", clean_handle));
    } else if let Some(u) = for_username {
        query.push(("forUsername", u));
    } else {
        return Err("One of 'channel_id', 'handle', or 'for_username' is required.".to_string());
    }

    let data = fetch_youtube_api("channels", &query)?;
    let mut out_yaml = String::from("channels:\n");

    if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
        if items.is_empty() {
            out_yaml.push_str("  - note: \"No channel found\"\n");
        }
        for item in items {
            let id = item.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let snippet = item.get("snippet");
            let stats = item.get("statistics");
            let content_details = item.get("contentDetails");

            let title = snippet
                .and_then(|s| s.get("title"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let custom_url = snippet
                .and_then(|s| s.get("customUrl"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let published_at = snippet
                .and_then(|s| s.get("publishedAt"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let views = stats
                .and_then(|s| s.get("viewCount"))
                .and_then(|v| v.as_str())
                .unwrap_or("0");
            let subscribers = stats
                .and_then(|s| s.get("subscriberCount"))
                .and_then(|v| v.as_str())
                .unwrap_or("0");
            let video_count = stats
                .and_then(|s| s.get("videoCount"))
                .and_then(|v| v.as_str())
                .unwrap_or("0");

            let uploads_playlist_id = content_details
                .and_then(|cd| cd.get("relatedPlaylists"))
                .and_then(|rp| rp.get("uploads"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            out_yaml.push_str(&format!("  - id: \"{id}\"\n"));
            out_yaml.push_str(&format!("    title: {:?}\n", title));
            out_yaml.push_str(&format!("    custom_url: \"{custom_url}\"\n"));
            out_yaml.push_str(&format!("    published_at: \"{published_at}\"\n"));
            out_yaml.push_str(&format!("    views: {views}\n"));
            out_yaml.push_str(&format!("    subscribers: {subscribers}\n"));
            out_yaml.push_str(&format!("    video_count: {video_count}\n"));
            out_yaml.push_str(&format!(
                "    uploads_playlist_id: \"{uploads_playlist_id}\"\n"
            ));
        }
    } else {
        out_yaml.push_str("  - note: \"No channel data returned\"\n");
    }

    Ok(out_yaml)
}

fn run_get_channel_videos(
    playlist_id: Option<String>,
    channel_id: Option<String>,
    max_results: Option<u32>,
    page_token: Option<String>,
) -> Result<String, String> {
    let resolved_playlist_id = if let Some(pid) = playlist_id {
        pid
    } else if let Some(cid) = channel_id {
        let channel_info = fetch_youtube_api(
            "channels",
            &[("part", "contentDetails".to_string()), ("id", cid)],
        )?;
        let uploads_id = channel_info
            .get("items")
            .and_then(|items| items.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("contentDetails"))
            .and_then(|cd| cd.get("relatedPlaylists"))
            .and_then(|rp| rp.get("uploads"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if uploads_id.is_empty() {
            return Err("Could not find uploads playlist for specified channel_id.".to_string());
        }
        uploads_id
    } else {
        return Err(
            "Either 'playlist_id' or 'channel_id' must be provided for get_channel_videos."
                .to_string(),
        );
    };

    let limit = max_results.unwrap_or(20).min(50);
    let mut query = vec![
        ("part", "snippet,contentDetails".to_string()),
        ("playlistId", resolved_playlist_id),
        ("maxResults", limit.to_string()),
    ];
    if let Some(token) = page_token {
        query.push(("pageToken", token));
    }

    let data = fetch_youtube_api("playlistItems", &query)?;
    let next_page_token = data
        .get("nextPageToken")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let mut out_yaml = String::new();
    if !next_page_token.is_empty() {
        out_yaml.push_str(&format!("next_page_token: \"{next_page_token}\"\n"));
    }
    out_yaml.push_str("playlist_items:\n");

    if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
        if items.is_empty() {
            out_yaml.push_str("  - note: \"No playlist items found\"\n");
        }
        for item in items {
            let snippet = item.get("snippet");
            let video_id = snippet
                .and_then(|s| s.get("resourceId"))
                .and_then(|r| r.get("videoId"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let title = snippet
                .and_then(|s| s.get("title"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let channel_title = snippet
                .and_then(|s| s.get("channelTitle"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let published_at = snippet
                .and_then(|s| s.get("publishedAt"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            out_yaml.push_str(&format!("  - video_id: \"{video_id}\"\n"));
            out_yaml.push_str(&format!("    title: {:?}\n", title));
            out_yaml.push_str(&format!("    channel_title: {:?}\n", channel_title));
            out_yaml.push_str(&format!("    published_at: \"{published_at}\"\n"));
        }
    } else {
        out_yaml.push_str("  - note: \"No items returned\"\n");
    }

    Ok(out_yaml)
}

fn run_search_videos(
    query_text: String,
    max_results: Option<u32>,
    order: Option<String>,
    type_filter: Option<String>,
    published_after: Option<String>,
    page_token: Option<String>,
) -> Result<String, String> {
    let limit = max_results.unwrap_or(10).min(50);
    let mut query = vec![
        ("part", "snippet".to_string()),
        ("q", query_text),
        ("maxResults", limit.to_string()),
        ("type", type_filter.unwrap_or_else(|| "video".to_string())),
    ];
    if let Some(ord) = order {
        query.push(("order", ord));
    }
    if let Some(after) = published_after {
        query.push(("publishedAfter", after));
    }
    if let Some(token) = page_token {
        query.push(("pageToken", token));
    }

    let data = fetch_youtube_api("search", &query)?;
    let next_page_token = data
        .get("nextPageToken")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let mut out_yaml = String::new();
    if !next_page_token.is_empty() {
        out_yaml.push_str(&format!("next_page_token: \"{next_page_token}\"\n"));
    }
    out_yaml.push_str("search_results:\n");

    if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
        if items.is_empty() {
            out_yaml.push_str("  - note: \"No search results found\"\n");
        }
        for item in items {
            let id_obj = item.get("id");
            let kind = id_obj
                .and_then(|i| i.get("kind"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let video_id = id_obj
                .and_then(|i| i.get("videoId"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let channel_id = id_obj
                .and_then(|i| i.get("channelId"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let snippet = item.get("snippet");
            let title = snippet
                .and_then(|s| s.get("title"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let channel_title = snippet
                .and_then(|s| s.get("channelTitle"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let published_at = snippet
                .and_then(|s| s.get("publishedAt"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let description = snippet
                .and_then(|s| s.get("description"))
                .and_then(|v| v.as_str())
                .unwrap_or("");

            let clean_desc = description.replace('\n', " ").replace('\r', "");

            out_yaml.push_str(&format!("  - kind: \"{kind}\"\n"));
            if !video_id.is_empty() {
                out_yaml.push_str(&format!("    video_id: \"{video_id}\"\n"));
            }
            if !channel_id.is_empty() {
                out_yaml.push_str(&format!("    channel_id: \"{channel_id}\"\n"));
            }
            out_yaml.push_str(&format!("    title: {:?}\n", title));
            out_yaml.push_str(&format!("    channel_title: {:?}\n", channel_title));
            out_yaml.push_str(&format!("    published_at: \"{published_at}\"\n"));
            out_yaml.push_str(&format!("    description: {:?}\n", clean_desc));
        }
    } else {
        out_yaml.push_str("  - note: \"No items returned\"\n");
    }

    Ok(out_yaml)
}

const SCHEMA: &str = r#"{
  "type": "object",
  "required": ["action"],
  "oneOf": [
    {
      "properties": {
        "action": { "const": "get_video_details" },
        "video_id": { "type": "string", "description": "Single video ID or comma-separated video IDs." }
      },
      "required": ["action", "video_id"]
    },
    {
      "properties": {
        "action": { "const": "list_comments" },
        "video_id": { "type": "string", "description": "Video ID to fetch comments for. Optional if channel_id provided." },
        "channel_id": { "type": "string", "description": "Channel ID to fetch comments for. Optional if video_id provided." },
        "max_results": { "type": "integer", "minimum": 1, "maximum": 100, "description": "Max comments to fetch (1-100). Default is 20." },
        "order": { "type": "string", "enum": ["time", "relevance"], "description": "Sorting order. Default is 'relevance'." },
        "page_token": { "type": "string", "description": "Page token for pagination. Optional." }
      },
      "required": ["action"]
    },
    {
      "properties": {
        "action": { "const": "get_channel_stats" },
        "channel_id": { "type": "string", "description": "Channel ID (e.g. 'UC...'). Optional if handle or for_username is provided." },
        "handle": { "type": "string", "description": "YouTube channel handle (e.g. '@Google'). Optional." },
        "for_username": { "type": "string", "description": "Legacy YouTube username. Optional." }
      },
      "required": ["action"]
    },
    {
      "properties": {
        "action": { "const": "get_channel_videos" },
        "playlist_id": { "type": "string", "description": "Uploads playlist ID. Optional if channel_id is provided." },
        "channel_id": { "type": "string", "description": "Channel ID to auto-resolve uploads playlist for. Optional if playlist_id is provided." },
        "max_results": { "type": "integer", "minimum": 1, "maximum": 50, "description": "Max videos to retrieve (1-50). Default is 20." },
        "page_token": { "type": "string", "description": "Page token for pagination. Optional." }
      },
      "required": ["action"]
    },
    {
      "properties": {
        "action": { "const": "search_videos" },
        "query": { "type": "string", "description": "Search keyword or topic." },
        "max_results": { "type": "integer", "minimum": 1, "maximum": 50, "description": "Max search results (1-50). Default is 10." },
        "order": { "type": "string", "enum": ["date", "rating", "relevance", "title", "videoCount", "viewCount"], "description": "Sort order. Default is 'relevance'." },
        "type_filter": { "type": "string", "enum": ["video", "channel", "playlist"], "description": "Filter result type. Default is 'video'." },
        "published_after": { "type": "string", "description": "RFC3339 timestamp (e.g. '2026-01-01T00:00:00Z'). Optional." },
        "page_token": { "type": "string", "description": "Page token for pagination. Optional." }
      },
      "required": ["action", "query"]
    },
    {
      "properties": {
        "action": { "const": "get_transcript" },
        "video_id": { "type": "string", "description": "YouTube video ID (e.g. 'dQw4w9WgXcQ') to fetch text transcript for." }
      },
      "required": ["action", "video_id"]
    }
  ]
}"#;

export!(YouTubeTool);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_is_valid_json() -> Result<(), String> {
        let v: Value = serde_json::from_str(SCHEMA).map_err(|e| e.to_string())?;
        if v["type"] != "object" {
            return Err("Schema root must be object".to_string());
        }
        let branches = v["oneOf"].as_array().ok_or("oneOf must be array")?;
        if branches.len() != 6 {
            return Err(format!(
                "Expected 6 action branches, got {}",
                branches.len()
            ));
        }
        Ok(())
    }

    #[test]
    fn test_url_encode() -> Result<(), String> {
        if url_encode("hello world") != "hello%20world" {
            return Err("Space encoding failed".to_string());
        }
        if url_encode("@Google") != "%40Google" {
            return Err("@ encoding failed".to_string());
        }
        Ok(())
    }

    #[test]
    fn guest_output_is_a_json_encoded_string() -> Result<(), String> {
        let raw = "videos:\n  - title: test\n{not json} true 123";
        let encoded = encode_guest_output(raw.to_string())?;
        let decoded: Value = serde_json::from_str(&encoded).map_err(|e| e.to_string())?;
        if decoded != Value::String(raw.to_string()) {
            return Err(format!("unexpected decoded output: {decoded:?}"));
        }
        Ok(())
    }

    #[cfg(feature = "reborn")]
    #[test]
    fn reborn_context_selects_action_and_rejects_override() {
        let error = execute_reborn(
            r#"{"action":"search_videos","video_id":"abc"}"#,
            Some(r#"{"capability_id":"youtube.get_transcript"}"#),
        )
        .unwrap_err();
        assert_eq!(error, "invalid_parameters");

        let error = execute_reborn(
            r#"{"video_id":"abc"}"#,
            Some(r#"{"capability_id":"youtube.unknown"}"#),
        )
        .unwrap_err();
        assert_eq!(error, "unsupported_youtube_capability");
    }
}
