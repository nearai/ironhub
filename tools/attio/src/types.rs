use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum AttioAction {
    ListRecords {
        object: String,
        #[serde(default)]
        filter: Option<serde_json::Value>,
        #[serde(default)]
        sorts: Option<serde_json::Value>,
        #[serde(default = "default_query_limit")]
        limit: u32,
        #[serde(default)]
        offset: u32,
    },
    GetRecord {
        object: String,
        record_id: String,
    },
    CreateRecord {
        object: String,
        values: serde_json::Map<String, serde_json::Value>,
    },
    UpdateRecord {
        object: String,
        record_id: String,
        values: serde_json::Map<String, serde_json::Value>,
    },
    AssertRecord {
        object: String,
        matching_attribute: String,
        values: serde_json::Map<String, serde_json::Value>,
    },
    DeleteRecord {
        object: String,
        record_id: String,
    },
    ListAttributes {
        object: String,
    },
    ListObjects,
    ListLists,
    QueryListEntries {
        list: String,
        #[serde(default)]
        filter: Option<serde_json::Value>,
        #[serde(default)]
        sorts: Option<serde_json::Value>,
        #[serde(default = "default_query_limit")]
        limit: u32,
        #[serde(default)]
        offset: u32,
    },
    ListNotes {
        #[serde(default)]
        parent_object: Option<String>,
        #[serde(default)]
        parent_record_id: Option<String>,
        #[serde(default = "default_page_limit")]
        limit: u32,
        #[serde(default)]
        offset: u32,
    },
    CreateNote {
        parent_object: String,
        parent_record_id: String,
        title: String,
        content: String,
        #[serde(default)]
        format: NoteFormat,
    },
    ListTasks {
        #[serde(default = "default_page_limit")]
        limit: u32,
        #[serde(default)]
        offset: u32,
    },
    CreateTask {
        content: String,
        #[serde(default)]
        deadline_at: Option<String>,
        #[serde(default)]
        is_completed: Option<bool>,
        #[serde(default)]
        linked_records: Option<serde_json::Value>,
        #[serde(default)]
        assignees: Option<serde_json::Value>,
    },
    #[serde(rename = "self")]
    SelfInfo,
    AttioRequest {
        method: HttpMethod,
        path: String,
        #[serde(default)]
        body: Option<serde_json::Value>,
    },
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum NoteFormat {
    #[default]
    Plaintext,
    Markdown,
}

impl NoteFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            NoteFormat::Plaintext => "plaintext",
            NoteFormat::Markdown => "markdown",
        }
    }
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Patch,
    Put,
    Delete,
}

impl HttpMethod {
    pub fn as_str(self) -> &'static str {
        match self {
            HttpMethod::Get => "GET",
            HttpMethod::Post => "POST",
            HttpMethod::Patch => "PATCH",
            HttpMethod::Put => "PUT",
            HttpMethod::Delete => "DELETE",
        }
    }
}

fn default_query_limit() -> u32 {
    50
}

fn default_page_limit() -> u32 {
    25
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<AttioAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_list_records_minimal_uses_defaults() {
        let action = parse(r#"{"action":"list_records","object":"people"}"#).unwrap();
        match action {
            AttioAction::ListRecords {
                object,
                filter,
                sorts,
                limit,
                offset,
            } => {
                assert_eq!(object, "people");
                assert!(filter.is_none());
                assert!(sorts.is_none());
                assert_eq!(limit, 50);
                assert_eq!(offset, 0);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_records_with_filter_and_sorts() {
        let raw = r#"{
            "action":"list_records",
            "object":"companies",
            "filter":{"name":{"$contains":"Acme"}},
            "sorts":[{"attribute":"name","direction":"asc"}],
            "limit":25,
            "offset":50
        }"#;
        let action = parse(raw).unwrap();
        match action {
            AttioAction::ListRecords {
                object,
                filter,
                sorts,
                limit,
                offset,
            } => {
                assert_eq!(object, "companies");
                assert!(filter.unwrap().get("name").is_some());
                assert!(sorts.unwrap().is_array());
                assert_eq!(limit, 25);
                assert_eq!(offset, 50);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_record() {
        let action =
            parse(r#"{"action":"get_record","object":"people","record_id":"rec_123"}"#).unwrap();
        match action {
            AttioAction::GetRecord { object, record_id } => {
                assert_eq!(object, "people");
                assert_eq!(record_id, "rec_123");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_record_with_values() {
        let raw = r#"{
            "action":"create_record",
            "object":"people",
            "values":{"name":[{"first_name":"Ada","last_name":"Lovelace"}],"email_addresses":["ada@example.com"]}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            AttioAction::CreateRecord { object, values } => {
                assert_eq!(object, "people");
                assert!(values.contains_key("name"));
                assert!(values.contains_key("email_addresses"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_update_record() {
        let raw = r#"{
            "action":"update_record",
            "object":"deals",
            "record_id":"rec_9",
            "values":{"stage":["Won"]}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            AttioAction::UpdateRecord {
                object,
                record_id,
                values,
            } => {
                assert_eq!(object, "deals");
                assert_eq!(record_id, "rec_9");
                assert!(values.contains_key("stage"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_assert_record() {
        let raw = r#"{
            "action":"assert_record",
            "object":"people",
            "matching_attribute":"email_addresses",
            "values":{"email_addresses":["ada@example.com"]}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            AttioAction::AssertRecord {
                object,
                matching_attribute,
                values,
            } => {
                assert_eq!(object, "people");
                assert_eq!(matching_attribute, "email_addresses");
                assert!(values.contains_key("email_addresses"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_delete_record() {
        let action =
            parse(r#"{"action":"delete_record","object":"people","record_id":"rec_1"}"#).unwrap();
        assert!(matches!(action, AttioAction::DeleteRecord { .. }));
    }

    #[test]
    fn parse_list_attributes() {
        let action = parse(r#"{"action":"list_attributes","object":"companies"}"#).unwrap();
        match action {
            AttioAction::ListAttributes { object } => assert_eq!(object, "companies"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_no_field_actions() {
        assert!(matches!(
            parse(r#"{"action":"list_objects"}"#).unwrap(),
            AttioAction::ListObjects
        ));
        assert!(matches!(
            parse(r#"{"action":"list_lists"}"#).unwrap(),
            AttioAction::ListLists
        ));
        assert!(matches!(
            parse(r#"{"action":"self"}"#).unwrap(),
            AttioAction::SelfInfo
        ));
    }

    #[test]
    fn parse_query_list_entries_defaults() {
        let action = parse(r#"{"action":"query_list_entries","list":"list_abc"}"#).unwrap();
        match action {
            AttioAction::QueryListEntries {
                list,
                limit,
                offset,
                ..
            } => {
                assert_eq!(list, "list_abc");
                assert_eq!(limit, 50);
                assert_eq!(offset, 0);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_notes_with_parent_filter() {
        let raw = r#"{"action":"list_notes","parent_object":"people","parent_record_id":"rec_7","limit":10}"#;
        let action = parse(raw).unwrap();
        match action {
            AttioAction::ListNotes {
                parent_object,
                parent_record_id,
                limit,
                offset,
            } => {
                assert_eq!(parent_object.as_deref(), Some("people"));
                assert_eq!(parent_record_id.as_deref(), Some("rec_7"));
                assert_eq!(limit, 10);
                assert_eq!(offset, 0);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_note_default_format_is_plaintext() {
        let raw = r#"{
            "action":"create_note",
            "parent_object":"people",
            "parent_record_id":"rec_7",
            "title":"Call summary",
            "content":"Discussed the pilot."
        }"#;
        let action = parse(raw).unwrap();
        match action {
            AttioAction::CreateNote {
                parent_object,
                parent_record_id,
                title,
                content,
                format,
            } => {
                assert_eq!(parent_object, "people");
                assert_eq!(parent_record_id, "rec_7");
                assert_eq!(title, "Call summary");
                assert_eq!(content, "Discussed the pilot.");
                assert_eq!(format, NoteFormat::Plaintext);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_note_markdown_format() {
        let raw = r##"{
            "action":"create_note",
            "parent_object":"companies",
            "parent_record_id":"rec_2",
            "title":"Notes",
            "content":"# Heading",
            "format":"markdown"
        }"##;
        let action = parse(raw).unwrap();
        match action {
            AttioAction::CreateNote { format, .. } => assert_eq!(format, NoteFormat::Markdown),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_tasks_default_limit() {
        let action = parse(r#"{"action":"list_tasks"}"#).unwrap();
        match action {
            AttioAction::ListTasks { limit, offset } => {
                assert_eq!(limit, 25);
                assert_eq!(offset, 0);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_task_minimal() {
        let action = parse(r#"{"action":"create_task","content":"Follow up with Ada"}"#).unwrap();
        match action {
            AttioAction::CreateTask {
                content,
                deadline_at,
                is_completed,
                linked_records,
                assignees,
            } => {
                assert_eq!(content, "Follow up with Ada");
                assert!(deadline_at.is_none());
                assert!(is_completed.is_none());
                assert!(linked_records.is_none());
                assert!(assignees.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_attio_request_with_body() {
        let raw = r#"{
            "action":"attio_request",
            "method":"POST",
            "path":"/v2/objects/people/records/query",
            "body":{"limit":1}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            AttioAction::AttioRequest { method, path, body } => {
                assert_eq!(method, HttpMethod::Post);
                assert_eq!(path, "/v2/objects/people/records/query");
                assert!(body.unwrap().get("limit").is_some());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"purge_everything"}"#).is_err());
    }

    #[test]
    fn parse_missing_required_field_fails() {
        assert!(parse(r#"{"action":"get_record","object":"people"}"#).is_err());
    }

    #[test]
    fn parse_attio_request_unknown_method_fails() {
        assert!(parse(r#"{"action":"attio_request","method":"BREW","path":"/v2/x"}"#).is_err());
    }

    #[test]
    fn http_method_wire_values() {
        assert_eq!(HttpMethod::Get.as_str(), "GET");
        assert_eq!(HttpMethod::Post.as_str(), "POST");
        assert_eq!(HttpMethod::Patch.as_str(), "PATCH");
        assert_eq!(HttpMethod::Put.as_str(), "PUT");
        assert_eq!(HttpMethod::Delete.as_str(), "DELETE");
    }

    #[test]
    fn note_format_wire_values() {
        assert_eq!(NoteFormat::Plaintext.as_str(), "plaintext");
        assert_eq!(NoteFormat::Markdown.as_str(), "markdown");
        assert_eq!(NoteFormat::default(), NoteFormat::Plaintext);
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(AttioAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for variant in [
            "list_records",
            "get_record",
            "create_record",
            "update_record",
            "assert_record",
            "delete_record",
            "list_attributes",
            "list_objects",
            "list_lists",
            "query_list_entries",
            "list_notes",
            "create_note",
            "list_tasks",
            "create_task",
            "self",
            "attio_request",
        ] {
            assert!(json.contains(variant), "schema missing variant {}", variant);
        }
    }
}
