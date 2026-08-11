use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum JuroAction {
    ListContracts {
        #[serde(default)]
        skip: u32,
        #[serde(default = "default_limit")]
        limit: u32,
        #[serde(default)]
        updated_since: Option<String>,
        #[serde(default)]
        updated_before: Option<String>,
        #[serde(default)]
        team_ids: Vec<String>,
        #[serde(default)]
        template_id: Option<String>,
    },
    GetContract {
        contract_id: String,
    },
    ListTemplates {
        #[serde(default)]
        skip: u32,
        #[serde(default = "default_limit")]
        limit: u32,
    },
    GetTemplate {
        template_id: String,
    },
    GetFinanceTerms {
        contract_id: String,
        #[serde(default)]
        field_titles: Vec<String>,
    },
    GetSignedVersion {
        contract_id: String,
    },
}

fn default_limit() -> u32 {
    50
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<JuroAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_list_contracts_uses_defaults() {
        match parse(r#"{"action":"list_contracts"}"#).unwrap() {
            JuroAction::ListContracts {
                skip,
                limit,
                updated_since,
                updated_before,
                team_ids,
                template_id,
            } => {
                assert_eq!(skip, 0);
                assert_eq!(limit, 50);
                assert!(updated_since.is_none());
                assert!(updated_before.is_none());
                assert!(team_ids.is_empty());
                assert!(template_id.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_contracts_with_cursor_and_filters() {
        let action = parse(
            r#"{"action":"list_contracts","updated_since":"2026-08-01T00:00:00Z","team_ids":["t1","t2"],"limit":10}"#,
        )
        .unwrap();
        match action {
            JuroAction::ListContracts {
                updated_since,
                team_ids,
                limit,
                ..
            } => {
                assert_eq!(updated_since.as_deref(), Some("2026-08-01T00:00:00Z"));
                assert_eq!(team_ids, vec!["t1", "t2"]);
                assert_eq!(limit, 10);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_contract_requires_id() {
        assert!(parse(r#"{"action":"get_contract"}"#).is_err());
        match parse(r#"{"action":"get_contract","contract_id":"c-1"}"#).unwrap() {
            JuroAction::GetContract { contract_id } => assert_eq!(contract_id, "c-1"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_templates_defaults() {
        match parse(r#"{"action":"list_templates"}"#).unwrap() {
            JuroAction::ListTemplates { skip, limit } => {
                assert_eq!(skip, 0);
                assert_eq!(limit, 50);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_template_requires_id() {
        assert!(parse(r#"{"action":"get_template"}"#).is_err());
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"sign_contract"}"#).is_err());
    }

    #[test]
    fn parse_get_finance_terms_defaults_to_all_fields() {
        match parse(r#"{"action":"get_finance_terms","contract_id":"c-1"}"#).unwrap() {
            JuroAction::GetFinanceTerms {
                contract_id,
                field_titles,
            } => {
                assert_eq!(contract_id, "c-1");
                assert!(field_titles.is_empty());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_finance_terms_with_named_fields() {
        let action = parse(
            r#"{"action":"get_finance_terms","contract_id":"c-1","field_titles":["Total Value","Payment Terms"]}"#,
        )
        .unwrap();
        match action {
            JuroAction::GetFinanceTerms { field_titles, .. } => {
                assert_eq!(field_titles, vec!["Total Value", "Payment Terms"]);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_finance_terms_requires_contract_id() {
        assert!(parse(r#"{"action":"get_finance_terms"}"#).is_err());
    }

    #[test]
    fn parse_get_signed_version_requires_contract_id() {
        assert!(parse(r#"{"action":"get_signed_version"}"#).is_err());
        match parse(r#"{"action":"get_signed_version","contract_id":"c-9"}"#).unwrap() {
            JuroAction::GetSignedVersion { contract_id } => assert_eq!(contract_id, "c-9"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(JuroAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for name in [
            "list_contracts",
            "get_contract",
            "list_templates",
            "get_template",
        ] {
            assert!(json.contains(name), "schema missing action: {name}");
        }
    }
}
