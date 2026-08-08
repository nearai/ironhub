use serde_json::Value;

use crate::types::NarrowFilter;
use crate::zulip::{append_query, bool_param, get};

pub fn search_messages(
    narrow: &[NarrowFilter],
    anchor: &str,
    num_before: u32,
    num_after: u32,
) -> Result<Value, String> {
    let mut endpoint = String::from("/messages");
    append_query(&mut endpoint, "anchor", anchor);
    append_query(&mut endpoint, "num_before", &num_before.to_string());
    append_query(&mut endpoint, "num_after", &num_after.to_string());
    append_narrow(&mut endpoint, narrow)?;
    get(&endpoint)
}

pub fn fetch_since(
    after_message_id: u64,
    narrow: &[NarrowFilter],
    limit: u32,
) -> Result<Value, String> {
    let mut endpoint = String::from("/messages");
    append_query(&mut endpoint, "anchor", &after_message_id.to_string());
    append_query(&mut endpoint, "num_before", "0");
    append_query(&mut endpoint, "num_after", &limit.to_string());
    append_narrow(&mut endpoint, narrow)?;
    get(&endpoint)
}

pub fn list_streams(
    include_public: bool,
    include_subscribed: bool,
    exclude_archived: bool,
) -> Result<Value, String> {
    let mut endpoint = String::from("/streams");
    append_query(&mut endpoint, "include_public", bool_param(include_public));
    append_query(
        &mut endpoint,
        "include_subscribed",
        bool_param(include_subscribed),
    );
    append_query(
        &mut endpoint,
        "exclude_archived",
        bool_param(exclude_archived),
    );
    get(&endpoint)
}

pub fn list_topics(stream_id: u64) -> Result<Value, String> {
    get(&format!("/users/me/{}/topics", stream_id))
}

pub fn list_users(include_custom_profile_fields: bool) -> Result<Value, String> {
    let mut endpoint = String::from("/users");
    append_query(
        &mut endpoint,
        "include_custom_profile_fields",
        bool_param(include_custom_profile_fields),
    );
    get(&endpoint)
}

fn append_narrow(endpoint: &mut String, narrow: &[NarrowFilter]) -> Result<(), String> {
    if narrow.is_empty() {
        return Ok(());
    }
    let encoded = serde_json::to_string(narrow)
        .map_err(|e| format!("Failed to serialize narrow filter: {}", e))?;
    append_query(endpoint, "narrow", &encoded);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn filter(operator: &str, operand: &str) -> NarrowFilter {
        NarrowFilter {
            operator: operator.to_string(),
            operand: serde_json::json!(operand),
            negated: false,
        }
    }

    #[test]
    fn append_narrow_is_a_noop_when_empty() {
        let mut endpoint = String::from("/messages?anchor=newest");
        append_narrow(&mut endpoint, &[]).unwrap();
        assert_eq!(endpoint, "/messages?anchor=newest");
    }

    #[test]
    fn append_narrow_encodes_filters_as_json() {
        let mut endpoint = String::from("/messages?anchor=newest");
        append_narrow(&mut endpoint, &[filter("channel", "general")]).unwrap();
        assert!(endpoint.contains("narrow="));
        assert!(!endpoint.contains('"'));
        assert!(endpoint.contains("channel"));
        assert!(endpoint.contains("general"));
    }

    #[test]
    fn append_narrow_carries_every_filter() {
        let mut endpoint = String::from("/messages");
        append_narrow(
            &mut endpoint,
            &[filter("channel", "general"), filter("topic", "release")],
        )
        .unwrap();
        assert!(endpoint.contains("channel"));
        assert!(endpoint.contains("topic"));
        assert!(endpoint.contains("release"));
    }
}
