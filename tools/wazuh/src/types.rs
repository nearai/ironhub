use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum WazuhAction {
    SearchAlerts {
        #[serde(default = "default_hours_back")]
        hours_back: u32,
        #[serde(default)]
        min_rule_level: Option<u32>,
        #[serde(default)]
        agent_name: Option<String>,
        #[serde(default = "default_search_size")]
        size: u32,
    },
    SearchVulnerabilities {
        #[serde(default)]
        severity: Option<VulnerabilitySeverity>,
        #[serde(default)]
        agent_name: Option<String>,
        #[serde(default = "default_search_size")]
        size: u32,
    },
    TopAlertRules {
        #[serde(default = "default_hours_back")]
        hours_back: u32,
        #[serde(default = "default_top_size")]
        size: u32,
    },
    ClusterHealth,
    ListIndices,
    ListAgents {
        #[serde(default)]
        status: Option<AgentStatus>,
    },
    AgentSummary,
    RestartAgent {
        agent_id: String,
    },
    AddAgent {
        name: String,
        #[serde(default)]
        ip: Option<String>,
    },
    RemoveAgent {
        agent_id: String,
        #[serde(default)]
        purge: bool,
    },
    MoveAgentToGroup {
        agent_id: String,
        group: String,
    },
    TriggerActiveResponse {
        #[serde(default)]
        agent_id: Option<String>,
        command: String,
        #[serde(default)]
        arguments: Vec<String>,
    },
    RestartManager,
    UpdateCdbList {
        list_name: String,
        content: String,
    },
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum VulnerabilitySeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl VulnerabilitySeverity {
    pub fn as_wazuh(self) -> &'static str {
        match self {
            VulnerabilitySeverity::Low => "Low",
            VulnerabilitySeverity::Medium => "Medium",
            VulnerabilitySeverity::High => "High",
            VulnerabilitySeverity::Critical => "Critical",
        }
    }
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Active,
    Disconnected,
    Pending,
    NeverConnected,
}

impl AgentStatus {
    pub fn as_wazuh(self) -> &'static str {
        match self {
            AgentStatus::Active => "active",
            AgentStatus::Disconnected => "disconnected",
            AgentStatus::Pending => "pending",
            AgentStatus::NeverConnected => "never_connected",
        }
    }
}

fn default_hours_back() -> u32 {
    24
}

fn default_search_size() -> u32 {
    20
}

fn default_top_size() -> u32 {
    10
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<WazuhAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_search_alerts_uses_defaults() {
        let action = parse(r#"{"action":"search_alerts"}"#).unwrap();
        match action {
            WazuhAction::SearchAlerts {
                hours_back,
                min_rule_level,
                agent_name,
                size,
            } => {
                assert_eq!(hours_back, 24);
                assert!(min_rule_level.is_none());
                assert!(agent_name.is_none());
                assert_eq!(size, 20);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_search_alerts_with_filters() {
        let action = parse(
            r#"{"action":"search_alerts","hours_back":1,"min_rule_level":12,"agent_name":"host-01","size":5}"#,
        )
        .unwrap();
        match action {
            WazuhAction::SearchAlerts {
                hours_back,
                min_rule_level,
                agent_name,
                size,
            } => {
                assert_eq!(hours_back, 1);
                assert_eq!(min_rule_level, Some(12));
                assert_eq!(agent_name.as_deref(), Some("host-01"));
                assert_eq!(size, 5);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_search_vulnerabilities_with_severity() {
        let action = parse(
            r#"{"action":"search_vulnerabilities","severity":"critical","agent_name":"host-01"}"#,
        )
        .unwrap();
        match action {
            WazuhAction::SearchVulnerabilities {
                severity,
                agent_name,
                size,
            } => {
                assert_eq!(severity, Some(VulnerabilitySeverity::Critical));
                assert_eq!(agent_name.as_deref(), Some("host-01"));
                assert_eq!(size, 20);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_top_alert_rules_defaults() {
        let action = parse(r#"{"action":"top_alert_rules"}"#).unwrap();
        match action {
            WazuhAction::TopAlertRules { hours_back, size } => {
                assert_eq!(hours_back, 24);
                assert_eq!(size, 10);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_cluster_health_no_fields() {
        let action = parse(r#"{"action":"cluster_health"}"#).unwrap();
        assert!(matches!(action, WazuhAction::ClusterHealth));
    }

    #[test]
    fn parse_list_indices_no_fields() {
        let action = parse(r#"{"action":"list_indices"}"#).unwrap();
        assert!(matches!(action, WazuhAction::ListIndices));
    }

    #[test]
    fn parse_list_agents_with_status() {
        let action = parse(r#"{"action":"list_agents","status":"never_connected"}"#).unwrap();
        match action {
            WazuhAction::ListAgents { status } => {
                assert_eq!(status, Some(AgentStatus::NeverConnected));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_agent_summary_no_fields() {
        let action = parse(r#"{"action":"agent_summary"}"#).unwrap();
        assert!(matches!(action, WazuhAction::AgentSummary));
    }

    #[test]
    fn parse_unknown_severity_fails() {
        assert!(parse(r#"{"action":"search_vulnerabilities","severity":"unknown"}"#).is_err());
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"reboot"}"#).is_err());
    }

    #[test]
    fn vulnerability_severity_wire_values() {
        assert_eq!(VulnerabilitySeverity::Low.as_wazuh(), "Low");
        assert_eq!(VulnerabilitySeverity::Critical.as_wazuh(), "Critical");
    }

    #[test]
    fn agent_status_wire_values() {
        assert_eq!(AgentStatus::Active.as_wazuh(), "active");
        assert_eq!(AgentStatus::NeverConnected.as_wazuh(), "never_connected");
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(WazuhAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for name in [
            "search_alerts",
            "search_vulnerabilities",
            "top_alert_rules",
            "cluster_health",
            "list_indices",
            "list_agents",
            "agent_summary",
            "restart_agent",
            "add_agent",
            "remove_agent",
            "move_agent_to_group",
            "trigger_active_response",
            "restart_manager",
            "update_cdb_list",
        ] {
            assert!(json.contains(name), "schema missing action: {name}");
        }
    }

    #[test]
    fn parse_restart_agent() {
        let action = parse(r#"{"action":"restart_agent","agent_id":"003"}"#).unwrap();
        match action {
            WazuhAction::RestartAgent { agent_id } => assert_eq!(agent_id, "003"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_add_agent_with_ip() {
        let action =
            parse(r#"{"action":"add_agent","name":"laptop-01","ip":"192.0.2.10"}"#).unwrap();
        match action {
            WazuhAction::AddAgent { name, ip } => {
                assert_eq!(name, "laptop-01");
                assert_eq!(ip.as_deref(), Some("192.0.2.10"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_add_agent_without_ip() {
        let action = parse(r#"{"action":"add_agent","name":"laptop-02"}"#).unwrap();
        match action {
            WazuhAction::AddAgent { name, ip } => {
                assert_eq!(name, "laptop-02");
                assert!(ip.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_remove_agent_defaults_purge_false() {
        let action = parse(r#"{"action":"remove_agent","agent_id":"007"}"#).unwrap();
        match action {
            WazuhAction::RemoveAgent { agent_id, purge } => {
                assert_eq!(agent_id, "007");
                assert!(!purge);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_move_agent_to_group() {
        let action =
            parse(r#"{"action":"move_agent_to_group","agent_id":"003","group":"high-priority"}"#)
                .unwrap();
        match action {
            WazuhAction::MoveAgentToGroup { agent_id, group } => {
                assert_eq!(agent_id, "003");
                assert_eq!(group, "high-priority");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_trigger_active_response_targeted() {
        let action = parse(
            r#"{"action":"trigger_active_response","agent_id":"003","command":"firewall-drop","arguments":["192.0.2.100"]}"#,
        )
        .unwrap();
        match action {
            WazuhAction::TriggerActiveResponse {
                agent_id,
                command,
                arguments,
            } => {
                assert_eq!(agent_id.as_deref(), Some("003"));
                assert_eq!(command, "firewall-drop");
                assert_eq!(arguments, vec!["192.0.2.100"]);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_trigger_active_response_broadcast() {
        let action = parse(
            r#"{"action":"trigger_active_response","command":"firewall-drop","arguments":["192.0.2.100"]}"#,
        )
        .unwrap();
        match action {
            WazuhAction::TriggerActiveResponse {
                agent_id, command, ..
            } => {
                assert!(agent_id.is_none());
                assert_eq!(command, "firewall-drop");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_restart_manager_no_fields() {
        let action = parse(r#"{"action":"restart_manager"}"#).unwrap();
        assert!(matches!(action, WazuhAction::RestartManager));
    }

    #[test]
    fn parse_update_cdb_list() {
        let action = parse(
            r#"{"action":"update_cdb_list","list_name":"blocked-ips","content":"192.0.2.100:\n203.0.113.50:\n"}"#,
        )
        .unwrap();
        match action {
            WazuhAction::UpdateCdbList { list_name, content } => {
                assert_eq!(list_name, "blocked-ips");
                assert!(content.contains("192.0.2.100"));
            }
            _ => panic!("wrong variant"),
        }
    }
}
