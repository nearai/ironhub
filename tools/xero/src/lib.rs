mod api;
mod types;
mod xero;

use types::XeroAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct XeroTool;

impl exports::near::agent::tool::Guest for XeroTool {
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
        let schema = schemars::schema_for!(types::XeroAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Xero Accounting API integration. Reads and writes against a user-authorized Xero \
         organisation over OAuth2. Read actions: list_connections, get_organisation, \
         list_contacts, get_contact, list_invoices, get_invoice, list_accounts, list_payments, \
         list_bank_transactions, list_items, list_credit_notes, get_report. Write actions: \
         create_contact, update_contact, create_invoice, update_invoice, create_payment. A raw \
         xero_request action covers any Accounting API endpoint not named above. Every action \
         except list_connections requires a tenant_id naming the organisation; call \
         list_connections first to discover the tenant ids the connected token can access. \
         Created invoices default to DRAFT unless an explicit Status is supplied, and create \
         actions accept an optional idempotency_key so retries do not double-post. Authentication \
         is injected by the host; never put tokens in params."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: XeroAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("xero-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for xero tool: {}. Expected shape: {{\"action\": \"<name>\", \
             ...fields}}. Valid actions: list_connections, get_organisation, list_contacts, \
             get_contact, create_contact, update_contact, list_invoices, get_invoice, \
             create_invoice, update_invoice, list_accounts, list_payments, create_payment, \
             list_bank_transactions, list_items, list_credit_notes, get_report, xero_request. \
             All actions except list_connections require tenant_id.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Xero action dispatched: {}", action_name(&action)),
    );

    let result = dispatch_action(action)?;
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn dispatch_action(action: XeroAction) -> Result<serde_json::Value, String> {
    match action {
        XeroAction::ListConnections => api::list_connections(),
        XeroAction::GetOrganisation { tenant_id } => api::get_organisation(&tenant_id),
        XeroAction::ListContacts {
            tenant_id,
            page,
            where_filter,
            order,
            search_term,
        } => api::list_contacts(
            &tenant_id,
            page,
            where_filter.as_deref(),
            order.as_deref(),
            search_term.as_deref(),
        ),
        XeroAction::GetContact {
            tenant_id,
            contact_id,
        } => api::get_contact(&tenant_id, &contact_id),
        XeroAction::CreateContact {
            tenant_id,
            contact,
            idempotency_key,
        } => api::create_contact(&tenant_id, contact, idempotency_key.as_deref()),
        XeroAction::UpdateContact {
            tenant_id,
            contact_id,
            contact,
            idempotency_key,
        } => api::update_contact(&tenant_id, &contact_id, contact, idempotency_key.as_deref()),
        XeroAction::ListInvoices {
            tenant_id,
            page,
            where_filter,
            order,
            statuses,
        } => api::list_invoices(
            &tenant_id,
            page,
            where_filter.as_deref(),
            order.as_deref(),
            statuses.as_deref(),
        ),
        XeroAction::GetInvoice {
            tenant_id,
            invoice_id,
        } => api::get_invoice(&tenant_id, &invoice_id),
        XeroAction::CreateInvoice {
            tenant_id,
            invoice,
            idempotency_key,
        } => api::create_invoice(&tenant_id, invoice, idempotency_key.as_deref()),
        XeroAction::UpdateInvoice {
            tenant_id,
            invoice_id,
            invoice,
            idempotency_key,
        } => api::update_invoice(&tenant_id, &invoice_id, invoice, idempotency_key.as_deref()),
        XeroAction::ListAccounts {
            tenant_id,
            where_filter,
            order,
        } => api::list_accounts(&tenant_id, where_filter.as_deref(), order.as_deref()),
        XeroAction::ListPayments {
            tenant_id,
            page,
            where_filter,
            order,
        } => api::list_payments(&tenant_id, page, where_filter.as_deref(), order.as_deref()),
        XeroAction::CreatePayment {
            tenant_id,
            payment,
            idempotency_key,
        } => api::create_payment(&tenant_id, payment, idempotency_key.as_deref()),
        XeroAction::ListBankTransactions {
            tenant_id,
            page,
            where_filter,
            order,
        } => {
            api::list_bank_transactions(&tenant_id, page, where_filter.as_deref(), order.as_deref())
        }
        XeroAction::ListItems {
            tenant_id,
            where_filter,
            order,
        } => api::list_items(&tenant_id, where_filter.as_deref(), order.as_deref()),
        XeroAction::ListCreditNotes {
            tenant_id,
            page,
            where_filter,
            order,
        } => api::list_credit_notes(&tenant_id, page, where_filter.as_deref(), order.as_deref()),
        XeroAction::GetReport {
            tenant_id,
            report,
            params,
        } => api::get_report(&tenant_id, report, &params),
        XeroAction::XeroRequest {
            tenant_id,
            method,
            path,
            body,
        } => api::xero_request(tenant_id.as_deref(), method.as_str(), &path, body.as_ref()),
    }
}

fn action_name(action: &XeroAction) -> &'static str {
    match action {
        XeroAction::ListConnections => "list_connections",
        XeroAction::GetOrganisation { .. } => "get_organisation",
        XeroAction::ListContacts { .. } => "list_contacts",
        XeroAction::GetContact { .. } => "get_contact",
        XeroAction::CreateContact { .. } => "create_contact",
        XeroAction::UpdateContact { .. } => "update_contact",
        XeroAction::ListInvoices { .. } => "list_invoices",
        XeroAction::GetInvoice { .. } => "get_invoice",
        XeroAction::CreateInvoice { .. } => "create_invoice",
        XeroAction::UpdateInvoice { .. } => "update_invoice",
        XeroAction::ListAccounts { .. } => "list_accounts",
        XeroAction::ListPayments { .. } => "list_payments",
        XeroAction::CreatePayment { .. } => "create_payment",
        XeroAction::ListBankTransactions { .. } => "list_bank_transactions",
        XeroAction::ListItems { .. } => "list_items",
        XeroAction::ListCreditNotes { .. } => "list_credit_notes",
        XeroAction::GetReport { .. } => "get_report",
        XeroAction::XeroRequest { .. } => "xero_request",
    }
}

export!(XeroTool);
