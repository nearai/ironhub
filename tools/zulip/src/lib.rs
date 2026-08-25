mod api;
mod types;
mod zulip;

use types::ZulipAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct ZulipTool;

impl exports::near::agent::tool::Guest for ZulipTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        match execute_inner(&req.params) {
            Ok(result) => exports::near::agent::tool::Response {
                output: Some(result),
                error: None,
            },
            Err(e) => exports::near::agent::tool::Response {
                output: None,
                error: Some(e),
            },
        }
    }

    fn schema() -> String {
        let schema = schemars::schema_for!(types::ZulipAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Zulip read access, for Zulip Cloud and self-hosted realms alike. Actions: \
         search_messages (fetch messages, filtered by Zulip narrow operators such as channel, \
         topic, sender, has, and search, anchored anywhere in history), fetch_since \
         (incremental read of everything after a known message ID, for cursor-based syncing), \
         list_streams (channels visible to the bot, with their stream IDs), list_topics \
         (topics in one channel, by stream ID), list_users (realm members). Read-only: this \
         tool sends, edits, and reacts to nothing. A thread is a channel plus a topic, so read \
         one by passing both operators to search_messages. The realm hostname is read from the \
         workspace file zulip/host; the bot email is the HTTP Basic username baked into the \
         tool's capabilities file and the API key is injected by the host."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: ZulipAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("zulip-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for zulip tool: {}. Expected shape: {{\"action\": \"<name>\", \
             ...fields}}. Valid action names: search_messages, fetch_since, list_streams, \
             list_topics, list_users. narrow is an array of {{\"operator\", \"operand\"}} \
             objects. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Zulip action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        ZulipAction::SearchMessages {
            narrow,
            anchor,
            num_before,
            num_after,
        } => api::search_messages(&narrow, &anchor, num_before, num_after)?,
        ZulipAction::FetchSince {
            after_message_id,
            narrow,
            limit,
        } => api::fetch_since(after_message_id, &narrow, limit)?,
        ZulipAction::ListStreams {
            include_public,
            include_subscribed,
            exclude_archived,
        } => api::list_streams(include_public, include_subscribed, exclude_archived)?,
        ZulipAction::ListTopics { stream_id } => api::list_topics(stream_id)?,
        ZulipAction::ListUsers {
            include_custom_profile_fields,
        } => api::list_users(include_custom_profile_fields)?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &ZulipAction) -> &'static str {
    match action {
        ZulipAction::SearchMessages { .. } => "search_messages",
        ZulipAction::FetchSince { .. } => "fetch_since",
        ZulipAction::ListStreams { .. } => "list_streams",
        ZulipAction::ListTopics { .. } => "list_topics",
        ZulipAction::ListUsers { .. } => "list_users",
    }
}

export!(ZulipTool);
