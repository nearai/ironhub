mod api;
mod irm;
mod oncall;
mod types;

use types::IrmAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct IrmTool;

impl exports::near::agent::tool::Guest for IrmTool {
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
        let schema = schemars::schema_for!(types::IrmAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Grafana IRM incident and on-call read access. Actions: list_incidents (recent \
         incidents, newest first by default), get_incident (one incident by ID, with severity, \
         status, and assigned roles), get_timeline (the incident activity feed, filterable by \
         tag and activity kind, which is where the investigation narrative lives), list_fields \
         (the custom incident metadata fields configured on the stack), list_on_call (on-call \
         schedules with who is on call right now, filterable by schedule name and team), \
         list_escalation_chains (the escalation chains to choose from), get_escalation_policy \
         (the ordered escalation steps for one chain, by chain ID). Read-only: this tool \
         declares, edits, resolves, and pages nobody. Incident actions run against the Grafana \
         instance and service account \
         token shared with the grafana tool. The on-call actions call the separate Grafana \
         OnCall API, which needs its own hostname and its own API token."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: IrmAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("irm-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for irm tool: {}. Expected shape: {{\"action\": \"<name>\", \
             ...fields}}. Valid action names: list_incidents, get_incident, get_timeline, \
             list_fields, list_on_call, list_escalation_chains, get_escalation_policy. \
             order_direction must be one of: ascending, descending. Call tool_info for the full \
             JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Grafana IRM action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        IrmAction::ListIncidents {
            limit,
            order_direction,
        } => api::list_incidents(limit, order_direction)?,
        IrmAction::GetIncident { incident_id } => api::get_incident(&incident_id)?,
        IrmAction::GetTimeline {
            incident_id,
            limit,
            tag,
            order_direction,
            activity_kind,
        } => api::get_timeline(
            &incident_id,
            limit,
            tag.as_deref(),
            order_direction,
            &activity_kind,
        )?,
        IrmAction::ListFields => api::list_fields()?,
        IrmAction::ListOnCall {
            schedule_name,
            team_id,
            page,
        } => api::list_on_call(schedule_name.as_deref(), team_id.as_deref(), page)?,
        IrmAction::ListEscalationChains { page } => api::list_escalation_chains(page)?,
        IrmAction::GetEscalationPolicy {
            escalation_chain_id,
            page,
        } => api::get_escalation_policy(&escalation_chain_id, page)?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &IrmAction) -> &'static str {
    match action {
        IrmAction::ListIncidents { .. } => "list_incidents",
        IrmAction::GetIncident { .. } => "get_incident",
        IrmAction::GetTimeline { .. } => "get_timeline",
        IrmAction::ListFields => "list_fields",
        IrmAction::ListOnCall { .. } => "list_on_call",
        IrmAction::ListEscalationChains { .. } => "list_escalation_chains",
        IrmAction::GetEscalationPolicy { .. } => "get_escalation_policy",
    }
}

export!(IrmTool);
