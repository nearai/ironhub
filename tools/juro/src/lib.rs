mod api;
mod juro;
mod types;

use types::JuroAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct JuroTool;

impl exports::near::agent::tool::Guest for JuroTool {
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
        let schema = schemars::schema_for!(types::JuroAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Juro contract read access. Juro calls them contracts; finance and legal workflows often \
         call the same records agreements. Actions: list_contracts (contracts in the workspace, \
         filterable by team and template, and by updatedSince and updatedBefore for incremental \
         reads), get_contract (one contract with its metadata by ID), list_templates (contract \
         templates), get_template (one template by ID). Read-only: this tool drafts, edits, \
         sends, and signs nothing. The workspace API key is injected by the host as the \
         x-api-key header."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: JuroAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("juro-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for juro tool: {}. Expected shape: {{\"action\": \"<name>\", \
             ...fields}}. Valid action names: list_contracts, get_contract, list_templates, \
             get_template. updated_since and updated_before take ISO 8601 timestamps. Call \
             tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Juro action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        JuroAction::ListContracts {
            skip,
            limit,
            updated_since,
            updated_before,
            team_ids,
            template_id,
        } => api::list_contracts(&api::ContractQuery {
            skip,
            limit,
            updated_since: updated_since.as_deref(),
            updated_before: updated_before.as_deref(),
            team_ids: &team_ids,
            template_id: template_id.as_deref(),
        })?,
        JuroAction::GetContract { contract_id } => api::get_contract(&contract_id)?,
        JuroAction::ListTemplates { skip, limit } => api::list_templates(skip, limit)?,
        JuroAction::GetTemplate { template_id } => api::get_template(&template_id)?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &JuroAction) -> &'static str {
    match action {
        JuroAction::ListContracts { .. } => "list_contracts",
        JuroAction::GetContract { .. } => "get_contract",
        JuroAction::ListTemplates { .. } => "list_templates",
        JuroAction::GetTemplate { .. } => "get_template",
    }
}

export!(JuroTool);
