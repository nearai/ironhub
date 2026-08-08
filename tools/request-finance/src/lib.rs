mod api;
mod request_finance;
mod types;

use types::RequestFinanceAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct RequestFinanceTool;

impl exports::near::agent::tool::Guest for RequestFinanceTool {
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
        let schema = schemars::schema_for!(types::RequestFinanceAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Request Finance read access for invoices and payment requests. Actions: list_invoices \
         (invoices and payment requests, filterable by free-text search, status, variant \
         (invoice or salary), and direction (sent or received)), get_invoice (one invoice by \
         ID, optionally with share and payment links), list_clients (customers or suppliers in \
         the workspace), get_client (one client by ID). Read-only: this tool creates no \
         invoices, changes no payment state, and never executes a payment. The workspace API \
         key is injected by the host."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: RequestFinanceAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!(
                "request-finance-tool parameter parse failed: {} | raw={}",
                e, params
            ),
        );
        format!(
            "Invalid parameters for request-finance tool: {}. Expected shape: {{\"action\": \
             \"<name>\", ...fields}}. Valid action names: list_invoices, get_invoice, \
             list_clients, get_client. variant must be one of: invoice, salary. filter_by must \
             be one of: sent, received. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!(
            "Request Finance action dispatched: {}",
            action_name(&action)
        ),
    );

    let result = match action {
        RequestFinanceAction::ListInvoices {
            take,
            skip,
            search,
            status,
            variant,
            filter_by,
            with_links,
        } => api::list_invoices(&api::InvoiceQuery {
            take,
            skip,
            search: search.as_deref(),
            status: &status,
            variant,
            filter_by,
            with_links,
        })?,
        RequestFinanceAction::GetInvoice { id, with_links } => api::get_invoice(&id, with_links)?,
        RequestFinanceAction::ListClients {
            client_type,
            take,
            skip,
            search,
        } => api::list_clients(&client_type, take, skip, search.as_deref())?,
        RequestFinanceAction::GetClient { client_id } => api::get_client(&client_id)?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &RequestFinanceAction) -> &'static str {
    match action {
        RequestFinanceAction::ListInvoices { .. } => "list_invoices",
        RequestFinanceAction::GetInvoice { .. } => "get_invoice",
        RequestFinanceAction::ListClients { .. } => "list_clients",
        RequestFinanceAction::GetClient { .. } => "get_client",
    }
}

export!(RequestFinanceTool);
