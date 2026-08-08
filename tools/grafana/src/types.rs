use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum GrafanaAction {
    ListAlerts {
        #[serde(default = "default_active")]
        active: bool,
        #[serde(default)]
        silenced: bool,
        #[serde(default)]
        inhibited: bool,
        #[serde(default)]
        filter: Vec<String>,
    },
    ListAlertRules,
    GetAlertRule {
        uid: String,
    },
    SearchDashboards {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        tag: Vec<String>,
        #[serde(default)]
        kind: Option<SearchKind>,
        #[serde(default = "default_search_limit")]
        limit: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    GetDashboard {
        uid: String,
    },
    ListDatasources,
    QueryMetrics {
        datasource_uid: String,
        expr: String,
        #[serde(default = "default_from")]
        from: String,
        #[serde(default = "default_to")]
        to: String,
        #[serde(default = "default_max_data_points")]
        max_data_points: u32,
    },
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SearchKind {
    Dashboard,
    Folder,
}

impl SearchKind {
    pub fn as_grafana(self) -> &'static str {
        match self {
            SearchKind::Dashboard => "dash-db",
            SearchKind::Folder => "dash-folder",
        }
    }
}

fn default_active() -> bool {
    true
}

fn default_search_limit() -> u32 {
    100
}

fn default_page() -> u32 {
    1
}

fn default_from() -> String {
    "now-1h".to_string()
}

fn default_to() -> String {
    "now".to_string()
}

fn default_max_data_points() -> u32 {
    100
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<GrafanaAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_list_alerts_uses_defaults() {
        let action = parse(r#"{"action":"list_alerts"}"#).unwrap();
        match action {
            GrafanaAction::ListAlerts {
                active,
                silenced,
                inhibited,
                filter,
            } => {
                assert!(active);
                assert!(!silenced);
                assert!(!inhibited);
                assert!(filter.is_empty());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_alerts_with_label_filters() {
        let action = parse(
            r#"{"action":"list_alerts","silenced":true,"filter":["severity=critical","team=infra"]}"#,
        )
        .unwrap();
        match action {
            GrafanaAction::ListAlerts {
                silenced, filter, ..
            } => {
                assert!(silenced);
                assert_eq!(filter, vec!["severity=critical", "team=infra"]);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_alert_rules_no_fields() {
        assert!(matches!(
            parse(r#"{"action":"list_alert_rules"}"#).unwrap(),
            GrafanaAction::ListAlertRules
        ));
    }

    #[test]
    fn parse_get_alert_rule() {
        match parse(r#"{"action":"get_alert_rule","uid":"abc123"}"#).unwrap() {
            GrafanaAction::GetAlertRule { uid } => assert_eq!(uid, "abc123"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_alert_rule_requires_uid() {
        assert!(parse(r#"{"action":"get_alert_rule"}"#).is_err());
    }

    #[test]
    fn parse_search_dashboards_defaults() {
        match parse(r#"{"action":"search_dashboards"}"#).unwrap() {
            GrafanaAction::SearchDashboards {
                query,
                tag,
                kind,
                limit,
                page,
            } => {
                assert!(query.is_none());
                assert!(tag.is_empty());
                assert!(kind.is_none());
                assert_eq!(limit, 100);
                assert_eq!(page, 1);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_search_dashboards_with_kind() {
        match parse(r#"{"action":"search_dashboards","query":"rpc","kind":"folder","limit":5}"#)
            .unwrap()
        {
            GrafanaAction::SearchDashboards {
                query, kind, limit, ..
            } => {
                assert_eq!(query.as_deref(), Some("rpc"));
                assert_eq!(kind, Some(SearchKind::Folder));
                assert_eq!(limit, 5);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_unknown_kind_fails() {
        assert!(parse(r#"{"action":"search_dashboards","kind":"panel"}"#).is_err());
    }

    #[test]
    fn parse_query_metrics_defaults() {
        match parse(r#"{"action":"query_metrics","datasource_uid":"ds1","expr":"up"}"#).unwrap() {
            GrafanaAction::QueryMetrics {
                datasource_uid,
                expr,
                from,
                to,
                max_data_points,
            } => {
                assert_eq!(datasource_uid, "ds1");
                assert_eq!(expr, "up");
                assert_eq!(from, "now-1h");
                assert_eq!(to, "now");
                assert_eq!(max_data_points, 100);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_query_metrics_requires_expr() {
        assert!(parse(r#"{"action":"query_metrics","datasource_uid":"ds1"}"#).is_err());
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"delete_dashboard"}"#).is_err());
    }

    #[test]
    fn search_kind_wire_values() {
        assert_eq!(SearchKind::Dashboard.as_grafana(), "dash-db");
        assert_eq!(SearchKind::Folder.as_grafana(), "dash-folder");
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(GrafanaAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for name in [
            "list_alerts",
            "list_alert_rules",
            "get_alert_rule",
            "search_dashboards",
            "get_dashboard",
            "list_datasources",
            "query_metrics",
        ] {
            assert!(json.contains(name), "schema missing action: {name}");
        }
    }
}
