use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum ZulipAction {
    SearchMessages {
        #[serde(default)]
        narrow: Vec<NarrowFilter>,
        #[serde(default = "default_anchor")]
        anchor: String,
        #[serde(default = "default_num_before")]
        num_before: u32,
        #[serde(default)]
        num_after: u32,
    },
    FetchSince {
        after_message_id: u64,
        #[serde(default)]
        narrow: Vec<NarrowFilter>,
        #[serde(default = "default_num_before")]
        limit: u32,
    },
    ListStreams {
        #[serde(default = "default_true")]
        include_public: bool,
        #[serde(default = "default_true")]
        include_subscribed: bool,
        #[serde(default = "default_true")]
        exclude_archived: bool,
    },
    ListTopics {
        stream_id: u64,
    },
    ListUsers {
        #[serde(default)]
        include_custom_profile_fields: bool,
    },
}

#[derive(Debug, Deserialize, Serialize, JsonSchema, Clone)]
pub struct NarrowFilter {
    pub operator: String,
    pub operand: serde_json::Value,
    #[serde(default)]
    pub negated: bool,
}

fn default_anchor() -> String {
    "newest".to_string()
}

fn default_num_before() -> u32 {
    50
}

fn default_true() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<ZulipAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_search_messages_uses_defaults() {
        match parse(r#"{"action":"search_messages"}"#).unwrap() {
            ZulipAction::SearchMessages {
                narrow,
                anchor,
                num_before,
                num_after,
            } => {
                assert!(narrow.is_empty());
                assert_eq!(anchor, "newest");
                assert_eq!(num_before, 50);
                assert_eq!(num_after, 0);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_search_messages_with_narrow() {
        let action = parse(
            r#"{"action":"search_messages","narrow":[{"operator":"channel","operand":"general"},{"operator":"topic","operand":"release"}],"num_before":10}"#,
        )
        .unwrap();
        match action {
            ZulipAction::SearchMessages {
                narrow, num_before, ..
            } => {
                assert_eq!(narrow.len(), 2);
                assert_eq!(narrow[0].operator, "channel");
                assert_eq!(narrow[0].operand, serde_json::json!("general"));
                assert!(!narrow[0].negated);
                assert_eq!(narrow[1].operator, "topic");
                assert_eq!(num_before, 10);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_narrow_accepts_negated_and_numeric_operand() {
        let action = parse(
            r#"{"action":"search_messages","narrow":[{"operator":"sender","operand":42,"negated":true}]}"#,
        )
        .unwrap();
        match action {
            ZulipAction::SearchMessages { narrow, .. } => {
                assert_eq!(narrow[0].operand, serde_json::json!(42));
                assert!(narrow[0].negated);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_fetch_since_requires_message_id() {
        assert!(parse(r#"{"action":"fetch_since"}"#).is_err());
    }

    #[test]
    fn parse_fetch_since_defaults() {
        match parse(r#"{"action":"fetch_since","after_message_id":900}"#).unwrap() {
            ZulipAction::FetchSince {
                after_message_id,
                narrow,
                limit,
            } => {
                assert_eq!(after_message_id, 900);
                assert!(narrow.is_empty());
                assert_eq!(limit, 50);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_streams_defaults() {
        match parse(r#"{"action":"list_streams"}"#).unwrap() {
            ZulipAction::ListStreams {
                include_public,
                include_subscribed,
                exclude_archived,
            } => {
                assert!(include_public);
                assert!(include_subscribed);
                assert!(exclude_archived);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_topics_requires_stream_id() {
        assert!(parse(r#"{"action":"list_topics"}"#).is_err());
        match parse(r#"{"action":"list_topics","stream_id":7}"#).unwrap() {
            ZulipAction::ListTopics { stream_id } => assert_eq!(stream_id, 7),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_users_defaults() {
        match parse(r#"{"action":"list_users"}"#).unwrap() {
            ZulipAction::ListUsers {
                include_custom_profile_fields,
            } => assert!(!include_custom_profile_fields),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"send_message"}"#).is_err());
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(ZulipAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for name in [
            "search_messages",
            "fetch_since",
            "list_streams",
            "list_topics",
            "list_users",
        ] {
            assert!(json.contains(name), "schema missing action: {name}");
        }
    }
}
