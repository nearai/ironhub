use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum IrmAction {
    ListIncidents {
        #[serde(default = "default_limit")]
        limit: u32,
        #[serde(default)]
        order_direction: OrderDirection,
    },
    GetIncident {
        incident_id: String,
    },
    GetTimeline {
        incident_id: String,
        #[serde(default = "default_limit")]
        limit: u32,
        #[serde(default)]
        tag: Option<String>,
        #[serde(default)]
        order_direction: OrderDirection,
        #[serde(default)]
        activity_kind: Vec<String>,
    },
    ListFields,
    ListOnCall {
        #[serde(default)]
        schedule_name: Option<String>,
        #[serde(default)]
        team_id: Option<String>,
        #[serde(default)]
        page: Option<u32>,
    },
    ListEscalationChains {
        #[serde(default)]
        page: Option<u32>,
    },
    GetEscalationPolicy {
        escalation_chain_id: String,
        #[serde(default)]
        page: Option<u32>,
    },
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum OrderDirection {
    Ascending,
    #[default]
    Descending,
}

impl OrderDirection {
    pub fn as_grafana(self) -> &'static str {
        match self {
            OrderDirection::Ascending => "ASC",
            OrderDirection::Descending => "DESC",
        }
    }
}

fn default_limit() -> u32 {
    20
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<IrmAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_list_incidents_uses_defaults() {
        match parse(r#"{"action":"list_incidents"}"#).unwrap() {
            IrmAction::ListIncidents {
                limit,
                order_direction,
            } => {
                assert_eq!(limit, 20);
                assert_eq!(order_direction, OrderDirection::Descending);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_incidents_with_ascending_order() {
        match parse(r#"{"action":"list_incidents","limit":5,"order_direction":"ascending"}"#)
            .unwrap()
        {
            IrmAction::ListIncidents {
                limit,
                order_direction,
            } => {
                assert_eq!(limit, 5);
                assert_eq!(order_direction, OrderDirection::Ascending);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_incident() {
        match parse(r#"{"action":"get_incident","incident_id":"inc-1"}"#).unwrap() {
            IrmAction::GetIncident { incident_id } => assert_eq!(incident_id, "inc-1"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_incident_requires_id() {
        assert!(parse(r#"{"action":"get_incident"}"#).is_err());
    }

    #[test]
    fn parse_get_timeline_defaults() {
        match parse(r#"{"action":"get_timeline","incident_id":"inc-1"}"#).unwrap() {
            IrmAction::GetTimeline {
                incident_id,
                limit,
                tag,
                order_direction,
                activity_kind,
            } => {
                assert_eq!(incident_id, "inc-1");
                assert_eq!(limit, 20);
                assert!(tag.is_none());
                assert_eq!(order_direction, OrderDirection::Descending);
                assert!(activity_kind.is_empty());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_timeline_with_filters() {
        let action = parse(
            r#"{"action":"get_timeline","incident_id":"inc-1","tag":"summary","activity_kind":["userNote","incidentStatusUpdated"]}"#,
        )
        .unwrap();
        match action {
            IrmAction::GetTimeline {
                tag, activity_kind, ..
            } => {
                assert_eq!(tag.as_deref(), Some("summary"));
                assert_eq!(activity_kind, vec!["userNote", "incidentStatusUpdated"]);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_fields_no_fields() {
        assert!(matches!(
            parse(r#"{"action":"list_fields"}"#).unwrap(),
            IrmAction::ListFields
        ));
    }

    #[test]
    fn parse_list_on_call_defaults_to_every_schedule() {
        match parse(r#"{"action":"list_on_call"}"#).unwrap() {
            IrmAction::ListOnCall {
                schedule_name,
                team_id,
                page,
            } => {
                assert!(schedule_name.is_none());
                assert!(team_id.is_none());
                assert!(page.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_on_call_with_filters() {
        match parse(
            r#"{"action":"list_on_call","schedule_name":"Primary","team_id":"T1","page":2}"#,
        )
        .unwrap()
        {
            IrmAction::ListOnCall {
                schedule_name,
                team_id,
                page,
            } => {
                assert_eq!(schedule_name.as_deref(), Some("Primary"));
                assert_eq!(team_id.as_deref(), Some("T1"));
                assert_eq!(page, Some(2));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_escalation_chains_needs_nothing() {
        match parse(r#"{"action":"list_escalation_chains"}"#).unwrap() {
            IrmAction::ListEscalationChains { page } => assert!(page.is_none()),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_escalation_policy_with_a_chain_id() {
        match parse(r#"{"action":"get_escalation_policy","escalation_chain_id":"F5CD4B2G3H"}"#)
            .unwrap()
        {
            IrmAction::GetEscalationPolicy {
                escalation_chain_id,
                ..
            } => assert_eq!(escalation_chain_id, "F5CD4B2G3H"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_escalation_policy_requires_a_chain_id() {
        assert!(parse(r#"{"action":"get_escalation_policy"}"#).is_err());
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"declare_incident"}"#).is_err());
    }

    #[test]
    fn parse_unknown_order_direction_fails() {
        assert!(parse(r#"{"action":"list_incidents","order_direction":"sideways"}"#).is_err());
    }

    #[test]
    fn order_direction_wire_values() {
        assert_eq!(OrderDirection::Ascending.as_grafana(), "ASC");
        assert_eq!(OrderDirection::Descending.as_grafana(), "DESC");
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(IrmAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for name in [
            "list_incidents",
            "get_incident",
            "get_timeline",
            "list_fields",
            "list_on_call",
            "list_escalation_chains",
            "get_escalation_policy",
        ] {
            assert!(json.contains(name), "schema missing action: {name}");
        }
    }
}
