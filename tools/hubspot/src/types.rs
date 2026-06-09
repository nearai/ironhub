use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum HubspotAction {
    ListContacts {
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        properties: Vec<String>,
        #[serde(default)]
        after: Option<String>,
    },
    ListCompanies {
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        properties: Vec<String>,
        #[serde(default)]
        after: Option<String>,
    },
    ListDeals {
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        properties: Vec<String>,
        #[serde(default)]
        after: Option<String>,
    },
    ListTickets {
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        properties: Vec<String>,
        #[serde(default)]
        after: Option<String>,
    },
    SearchObjects {
        object_type: HubspotObjectType,
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        filter_groups: Option<Vec<serde_json::Value>>,
        #[serde(default)]
        properties: Vec<String>,
        #[serde(default = "default_search_limit")]
        limit: u32,
        #[serde(default)]
        after: Option<String>,
    },
    GetObject {
        object_type: HubspotObjectType,
        id: String,
        #[serde(default)]
        properties: Vec<String>,
    },
    CreateObject {
        object_type: HubspotObjectType,
        properties: serde_json::Map<String, serde_json::Value>,
        #[serde(default)]
        associations: Option<Vec<serde_json::Value>>,
    },
    UpdateObject {
        object_type: HubspotObjectType,
        id: String,
        properties: serde_json::Map<String, serde_json::Value>,
    },
    ArchiveObject {
        object_type: HubspotObjectType,
        id: String,
    },
    ListLists {
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        offset: u32,
        #[serde(default)]
        query: Option<String>,
    },
    GetListMembers {
        list_id: String,
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        after: Option<String>,
    },
    ListOwners {
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        after: Option<String>,
        #[serde(default)]
        email: Option<String>,
        #[serde(default)]
        archived: bool,
    },
    ListProperties {
        object_type: HubspotObjectType,
        #[serde(default)]
        archived: bool,
    },
    HubspotRequest {
        method: HttpMethod,
        path: String,
        #[serde(default)]
        body: Option<serde_json::Value>,
    },
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HubspotObjectType {
    Contacts,
    Companies,
    Deals,
    Tickets,
}

impl HubspotObjectType {
    pub fn as_path(self) -> &'static str {
        match self {
            HubspotObjectType::Contacts => "contacts",
            HubspotObjectType::Companies => "companies",
            HubspotObjectType::Deals => "deals",
            HubspotObjectType::Tickets => "tickets",
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

fn default_list_limit() -> u32 {
    20
}

fn default_search_limit() -> u32 {
    10
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<HubspotAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_list_contacts_minimal_uses_defaults() {
        let action = parse(r#"{"action":"list_contacts"}"#).unwrap();
        match action {
            HubspotAction::ListContacts {
                limit,
                properties,
                after,
            } => {
                assert_eq!(limit, 20);
                assert!(properties.is_empty());
                assert!(after.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_companies_with_properties_and_cursor() {
        let action = parse(
            r#"{"action":"list_companies","limit":50,"properties":["name","domain"],"after":"NXTQ"}"#,
        )
        .unwrap();
        match action {
            HubspotAction::ListCompanies {
                limit,
                properties,
                after,
            } => {
                assert_eq!(limit, 50);
                assert_eq!(properties, vec!["name", "domain"]);
                assert_eq!(after.as_deref(), Some("NXTQ"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_deals_default_limit() {
        let action = parse(r#"{"action":"list_deals"}"#).unwrap();
        match action {
            HubspotAction::ListDeals { limit, .. } => assert_eq!(limit, 20),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_tickets_with_cursor_only() {
        let action = parse(r#"{"action":"list_tickets","after":"PG3"}"#).unwrap();
        match action {
            HubspotAction::ListTickets {
                limit,
                properties,
                after,
            } => {
                assert_eq!(limit, 20);
                assert!(properties.is_empty());
                assert_eq!(after.as_deref(), Some("PG3"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_search_objects_with_filter_groups() {
        let raw = r#"{
            "action": "search_objects",
            "object_type": "deals",
            "query": "Acme",
            "filter_groups": [{"filters":[{"propertyName":"amount","operator":"GT","value":"1000"}]}],
            "properties": ["amount","dealname"],
            "limit": 25
        }"#;
        let action = parse(raw).unwrap();
        match action {
            HubspotAction::SearchObjects {
                object_type,
                query,
                filter_groups,
                properties,
                limit,
                ..
            } => {
                assert_eq!(object_type, HubspotObjectType::Deals);
                assert_eq!(query.as_deref(), Some("Acme"));
                let groups = filter_groups.unwrap();
                assert_eq!(groups.len(), 1);
                assert_eq!(properties, vec!["amount", "dealname"]);
                assert_eq!(limit, 25);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_search_objects_default_limit() {
        let action =
            parse(r#"{"action":"search_objects","object_type":"contacts","query":"jane"}"#)
                .unwrap();
        match action {
            HubspotAction::SearchObjects { limit, .. } => assert_eq!(limit, 10),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_object() {
        let action = parse(
            r#"{"action":"get_object","object_type":"tickets","id":"12345","properties":["subject"]}"#,
        )
        .unwrap();
        match action {
            HubspotAction::GetObject {
                object_type,
                id,
                properties,
            } => {
                assert_eq!(object_type, HubspotObjectType::Tickets);
                assert_eq!(id, "12345");
                assert_eq!(properties, vec!["subject"]);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_unknown_object_type_fails() {
        assert!(parse(r#"{"action":"get_object","object_type":"leads","id":"1"}"#).is_err());
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"delete_contact","id":"1"}"#).is_err());
    }

    #[test]
    fn parse_missing_required_field_fails() {
        assert!(parse(r#"{"action":"get_object","id":"1"}"#).is_err());
    }

    #[test]
    fn parse_create_object_with_associations() {
        let raw = r#"{
            "action": "create_object",
            "object_type": "contacts",
            "properties": {"email":"jane@example.com","firstname":"Jane"},
            "associations": [{"to":{"id":"42"},"types":[{"associationCategory":"HUBSPOT_DEFINED","associationTypeId":1}]}]
        }"#;
        let action = parse(raw).unwrap();
        match action {
            HubspotAction::CreateObject {
                object_type,
                properties,
                associations,
            } => {
                assert_eq!(object_type, HubspotObjectType::Contacts);
                assert_eq!(
                    properties.get("email").and_then(|v| v.as_str()),
                    Some("jane@example.com")
                );
                assert_eq!(associations.unwrap().len(), 1);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_object_without_associations() {
        let action = parse(
            r#"{"action":"create_object","object_type":"companies","properties":{"name":"Acme"}}"#,
        )
        .unwrap();
        match action {
            HubspotAction::CreateObject {
                object_type,
                properties,
                associations,
            } => {
                assert_eq!(object_type, HubspotObjectType::Companies);
                assert_eq!(
                    properties.get("name").and_then(|v| v.as_str()),
                    Some("Acme")
                );
                assert!(associations.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_update_object() {
        let raw = r#"{
            "action": "update_object",
            "object_type": "deals",
            "id": "9876",
            "properties": {"dealstage":"closedwon"}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            HubspotAction::UpdateObject {
                object_type,
                id,
                properties,
            } => {
                assert_eq!(object_type, HubspotObjectType::Deals);
                assert_eq!(id, "9876");
                assert_eq!(
                    properties.get("dealstage").and_then(|v| v.as_str()),
                    Some("closedwon")
                );
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_archive_object() {
        let action =
            parse(r#"{"action":"archive_object","object_type":"tickets","id":"5555"}"#).unwrap();
        match action {
            HubspotAction::ArchiveObject { object_type, id } => {
                assert_eq!(object_type, HubspotObjectType::Tickets);
                assert_eq!(id, "5555");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_lists_with_query() {
        let action =
            parse(r#"{"action":"list_lists","limit":30,"offset":60,"query":"active"}"#).unwrap();
        match action {
            HubspotAction::ListLists {
                limit,
                offset,
                query,
            } => {
                assert_eq!(limit, 30);
                assert_eq!(offset, 60);
                assert_eq!(query.as_deref(), Some("active"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_list_members() {
        let action = parse(r#"{"action":"get_list_members","list_id":"abc","limit":50}"#).unwrap();
        match action {
            HubspotAction::GetListMembers {
                list_id,
                limit,
                after,
            } => {
                assert_eq!(list_id, "abc");
                assert_eq!(limit, 50);
                assert!(after.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_owners_with_email_filter() {
        let action = parse(
            r#"{"action":"list_owners","limit":10,"email":"alice@example.com","archived":true}"#,
        )
        .unwrap();
        match action {
            HubspotAction::ListOwners {
                limit,
                email,
                archived,
                ..
            } => {
                assert_eq!(limit, 10);
                assert_eq!(email.as_deref(), Some("alice@example.com"));
                assert!(archived);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_properties_archived() {
        let action =
            parse(r#"{"action":"list_properties","object_type":"contacts","archived":true}"#)
                .unwrap();
        match action {
            HubspotAction::ListProperties {
                object_type,
                archived,
            } => {
                assert_eq!(object_type, HubspotObjectType::Contacts);
                assert!(archived);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_hubspot_request_with_body() {
        let raw = r#"{
            "action": "hubspot_request",
            "method": "POST",
            "path": "/crm/v3/objects/contacts/batch/read",
            "body": {"inputs":[{"id":"1"}]}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            HubspotAction::HubspotRequest { method, path, body } => {
                assert_eq!(method, HttpMethod::Post);
                assert_eq!(path, "/crm/v3/objects/contacts/batch/read");
                assert!(body.unwrap().get("inputs").is_some());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_hubspot_request_unknown_method_fails() {
        assert!(
            parse(r#"{"action":"hubspot_request","method":"BREW","path":"/crm/v3/x"}"#).is_err()
        );
    }

    #[test]
    fn object_type_path_is_lowercase_plural() {
        assert_eq!(HubspotObjectType::Contacts.as_path(), "contacts");
        assert_eq!(HubspotObjectType::Companies.as_path(), "companies");
        assert_eq!(HubspotObjectType::Deals.as_path(), "deals");
        assert_eq!(HubspotObjectType::Tickets.as_path(), "tickets");
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
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(HubspotAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for variant in [
            "list_contacts",
            "list_companies",
            "list_deals",
            "list_tickets",
            "search_objects",
            "get_object",
            "create_object",
            "update_object",
            "archive_object",
            "list_lists",
            "get_list_members",
            "list_owners",
            "list_properties",
            "hubspot_request",
        ] {
            assert!(json.contains(variant), "schema missing variant {}", variant);
        }
    }
}
