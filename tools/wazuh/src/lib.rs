mod api;
mod types;
mod wazuh;

use types::WazuhAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct WazuhTool;

impl exports::near::agent::tool::Guest for WazuhTool {
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
        let schema = schemars::schema_for!(types::WazuhAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Wazuh read and control access. Indexer (OpenSearch) actions over HTTP Basic auth: \
         search_alerts (recent alert events with optional rule.level and agent filters), \
         search_vulnerabilities (vulnerability detector findings filtered by severity and \
         agent), top_alert_rules (aggregation of the most common rule descriptions in a time \
         window), cluster_health, list_indices. Server API actions exchange Basic credentials \
         for a short-lived JWT at /security/user/authenticate per call: list_agents (with \
         optional status filter), agent_summary, restart_agent, add_agent, remove_agent (with \
         purge flag), move_agent_to_group, trigger_active_response (push a command like \
         firewall-drop to one agent or the whole fleet), restart_manager, update_cdb_list \
         (push to CDB block/allow lists that drive the rule engine)."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: WazuhAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("wazuh-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for wazuh tool: {}. Expected shape: {{\"action\": \"<name>\", ...fields}}. Valid action names: search_alerts, search_vulnerabilities, top_alert_rules, cluster_health, list_indices, list_agents, agent_summary, restart_agent, add_agent, remove_agent, move_agent_to_group, trigger_active_response, restart_manager, update_cdb_list. severity must be one of: low, medium, high, critical. status must be one of: active, disconnected, pending, never_connected. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Wazuh action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        WazuhAction::SearchAlerts {
            hours_back,
            min_rule_level,
            agent_name,
            size,
        } => api::search_alerts(hours_back, min_rule_level, agent_name.as_deref(), size)?,
        WazuhAction::SearchVulnerabilities {
            severity,
            agent_name,
            size,
        } => api::search_vulnerabilities(severity, agent_name.as_deref(), size)?,
        WazuhAction::TopAlertRules { hours_back, size } => api::top_alert_rules(hours_back, size)?,
        WazuhAction::ClusterHealth => api::cluster_health()?,
        WazuhAction::ListIndices => api::list_indices()?,
        WazuhAction::ListAgents { status } => api::list_agents(status)?,
        WazuhAction::AgentSummary => api::agent_summary()?,
        WazuhAction::RestartAgent { agent_id } => api::restart_agent(&agent_id)?,
        WazuhAction::AddAgent { name, ip } => api::add_agent(&name, ip.as_deref())?,
        WazuhAction::RemoveAgent { agent_id, purge } => api::remove_agent(&agent_id, purge)?,
        WazuhAction::MoveAgentToGroup { agent_id, group } => {
            api::move_agent_to_group(&agent_id, &group)?
        }
        WazuhAction::TriggerActiveResponse {
            agent_id,
            command,
            arguments,
        } => api::trigger_active_response(agent_id.as_deref(), &command, &arguments)?,
        WazuhAction::RestartManager => api::restart_manager()?,
        WazuhAction::UpdateCdbList { list_name, content } => {
            api::update_cdb_list(&list_name, &content)?
        }
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &WazuhAction) -> &'static str {
    match action {
        WazuhAction::SearchAlerts { .. } => "search_alerts",
        WazuhAction::SearchVulnerabilities { .. } => "search_vulnerabilities",
        WazuhAction::TopAlertRules { .. } => "top_alert_rules",
        WazuhAction::ClusterHealth => "cluster_health",
        WazuhAction::ListIndices => "list_indices",
        WazuhAction::ListAgents { .. } => "list_agents",
        WazuhAction::AgentSummary => "agent_summary",
        WazuhAction::RestartAgent { .. } => "restart_agent",
        WazuhAction::AddAgent { .. } => "add_agent",
        WazuhAction::RemoveAgent { .. } => "remove_agent",
        WazuhAction::MoveAgentToGroup { .. } => "move_agent_to_group",
        WazuhAction::TriggerActiveResponse { .. } => "trigger_active_response",
        WazuhAction::RestartManager => "restart_manager",
        WazuhAction::UpdateCdbList { .. } => "update_cdb_list",
    }
}

export!(WazuhTool);
