use std::collections::BTreeMap;

use crate::types::{JsonObject, XeroReport};
use crate::xero::{
    append_query, ensure_no_validation_errors, request, require_token, url_encode, RequestOptions,
    ACCOUNTING_PREFIX, CONNECTIONS_PATH,
};

fn collection_path(resource: &str) -> String {
    format!("{}/{}", ACCOUNTING_PREFIX, resource)
}

fn resource_path(resource: &str, id: &str) -> String {
    format!("{}/{}/{}", ACCOUNTING_PREFIX, resource, url_encode(id))
}

fn get_list(
    tenant_id: &str,
    resource: &str,
    page: Option<u32>,
    where_filter: Option<&str>,
    order: Option<&str>,
    extra: &[(&str, &str)],
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut path = collection_path(resource);
    if let Some(p) = page {
        append_query(&mut path, "page", &p.to_string());
    }
    if let Some(w) = where_filter {
        append_query(&mut path, "where", w);
    }
    if let Some(o) = order {
        append_query(&mut path, "order", o);
    }
    for (name, value) in extra {
        append_query(&mut path, name, value);
    }
    let (_, body) = request("GET", &path, RequestOptions::read(tenant_id))?;
    Ok(body)
}

fn post_wrapped(
    tenant_id: &str,
    mut path: String,
    wrapper_key: &str,
    object: JsonObject,
    idempotency_key: Option<&str>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let payload = serde_json::json!({ wrapper_key: [serde_json::Value::Object(object)] });
    let body = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize Xero request payload: {}", e))?;
    append_query(&mut path, "summarizeErrors", "false");
    let (_, response) = request(
        "POST",
        &path,
        RequestOptions::write(tenant_id, &body, idempotency_key),
    )?;
    ensure_no_validation_errors(&response)?;
    Ok(response)
}

pub fn list_connections() -> Result<serde_json::Value, String> {
    require_token()?;
    let (_, body) = request("GET", CONNECTIONS_PATH, RequestOptions::no_tenant())?;
    Ok(body)
}

pub fn get_organisation(tenant_id: &str) -> Result<serde_json::Value, String> {
    require_token()?;
    let (_, body) = request(
        "GET",
        &collection_path("Organisation"),
        RequestOptions::read(tenant_id),
    )?;
    Ok(body)
}

pub fn list_contacts(
    tenant_id: &str,
    page: Option<u32>,
    where_filter: Option<&str>,
    order: Option<&str>,
    search_term: Option<&str>,
) -> Result<serde_json::Value, String> {
    let extra: Vec<(&str, &str)> = match search_term {
        Some(term) => vec![("searchTerm", term)],
        None => Vec::new(),
    };
    get_list(tenant_id, "Contacts", page, where_filter, order, &extra)
}

pub fn get_contact(tenant_id: &str, contact_id: &str) -> Result<serde_json::Value, String> {
    require_token()?;
    let (_, body) = request(
        "GET",
        &resource_path("Contacts", contact_id),
        RequestOptions::read(tenant_id),
    )?;
    Ok(body)
}

pub fn create_contact(
    tenant_id: &str,
    contact: JsonObject,
    idempotency_key: Option<&str>,
) -> Result<serde_json::Value, String> {
    post_wrapped(
        tenant_id,
        collection_path("Contacts"),
        "Contacts",
        contact,
        idempotency_key,
    )
}

pub fn update_contact(
    tenant_id: &str,
    contact_id: &str,
    contact: JsonObject,
    idempotency_key: Option<&str>,
) -> Result<serde_json::Value, String> {
    post_wrapped(
        tenant_id,
        resource_path("Contacts", contact_id),
        "Contacts",
        contact,
        idempotency_key,
    )
}

pub fn list_invoices(
    tenant_id: &str,
    page: Option<u32>,
    where_filter: Option<&str>,
    order: Option<&str>,
    statuses: Option<&str>,
) -> Result<serde_json::Value, String> {
    let extra: Vec<(&str, &str)> = match statuses {
        Some(s) => vec![("Statuses", s)],
        None => Vec::new(),
    };
    get_list(tenant_id, "Invoices", page, where_filter, order, &extra)
}

pub fn get_invoice(tenant_id: &str, invoice_id: &str) -> Result<serde_json::Value, String> {
    require_token()?;
    let (_, body) = request(
        "GET",
        &resource_path("Invoices", invoice_id),
        RequestOptions::read(tenant_id),
    )?;
    Ok(body)
}

pub fn create_invoice(
    tenant_id: &str,
    mut invoice: JsonObject,
    idempotency_key: Option<&str>,
) -> Result<serde_json::Value, String> {
    invoice
        .entry("Status")
        .or_insert_with(|| serde_json::Value::String("DRAFT".to_string()));
    post_wrapped(
        tenant_id,
        collection_path("Invoices"),
        "Invoices",
        invoice,
        idempotency_key,
    )
}

pub fn update_invoice(
    tenant_id: &str,
    invoice_id: &str,
    invoice: JsonObject,
    idempotency_key: Option<&str>,
) -> Result<serde_json::Value, String> {
    post_wrapped(
        tenant_id,
        resource_path("Invoices", invoice_id),
        "Invoices",
        invoice,
        idempotency_key,
    )
}

pub fn list_accounts(
    tenant_id: &str,
    where_filter: Option<&str>,
    order: Option<&str>,
) -> Result<serde_json::Value, String> {
    get_list(tenant_id, "Accounts", None, where_filter, order, &[])
}

pub fn list_payments(
    tenant_id: &str,
    page: Option<u32>,
    where_filter: Option<&str>,
    order: Option<&str>,
) -> Result<serde_json::Value, String> {
    get_list(tenant_id, "Payments", page, where_filter, order, &[])
}

pub fn create_payment(
    tenant_id: &str,
    payment: JsonObject,
    idempotency_key: Option<&str>,
) -> Result<serde_json::Value, String> {
    post_wrapped(
        tenant_id,
        collection_path("Payments"),
        "Payments",
        payment,
        idempotency_key,
    )
}

pub fn list_bank_transactions(
    tenant_id: &str,
    page: Option<u32>,
    where_filter: Option<&str>,
    order: Option<&str>,
) -> Result<serde_json::Value, String> {
    get_list(
        tenant_id,
        "BankTransactions",
        page,
        where_filter,
        order,
        &[],
    )
}

pub fn list_items(
    tenant_id: &str,
    where_filter: Option<&str>,
    order: Option<&str>,
) -> Result<serde_json::Value, String> {
    get_list(tenant_id, "Items", None, where_filter, order, &[])
}

pub fn list_credit_notes(
    tenant_id: &str,
    page: Option<u32>,
    where_filter: Option<&str>,
    order: Option<&str>,
) -> Result<serde_json::Value, String> {
    get_list(tenant_id, "CreditNotes", page, where_filter, order, &[])
}

pub fn get_report(
    tenant_id: &str,
    report: XeroReport,
    params: &BTreeMap<String, String>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    let mut path = format!("{}/Reports/{}", ACCOUNTING_PREFIX, report.as_report_name());
    for (name, value) in params {
        append_query(&mut path, name, value);
    }
    let (_, body) = request("GET", &path, RequestOptions::read(tenant_id))?;
    Ok(body)
}

pub fn xero_request(
    tenant_id: Option<&str>,
    method: &str,
    path: &str,
    body: Option<&serde_json::Value>,
) -> Result<serde_json::Value, String> {
    require_token()?;
    validate_request_path(path)?;
    if path != CONNECTIONS_PATH && tenant_id.is_none() {
        return Err(
            "xero_request to an Accounting API path requires tenant_id; only /connections may \
             omit it."
                .to_string(),
        );
    }
    let body_string = match body {
        Some(v) => Some(
            serde_json::to_string(v)
                .map_err(|e| format!("Failed to serialize raw request body: {}", e))?,
        ),
        None => None,
    };
    let opts = RequestOptions {
        tenant_id,
        idempotency_key: None,
        body: body_string.as_deref(),
    };
    let (_, response) = request(method, path, opts)?;
    Ok(response)
}

fn validate_request_path(path: &str) -> Result<(), String> {
    if path == CONNECTIONS_PATH {
        return Ok(());
    }
    let prefix = format!("{}/", ACCOUNTING_PREFIX);
    if !path.starts_with(&prefix) {
        return Err(format!(
            "Path must start with {}/ or be {} (tool is scoped to the Xero Accounting API and \
             the connections endpoint): {}",
            ACCOUNTING_PREFIX, CONNECTIONS_PATH, path
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn collection_path_builds_accounting_url() {
        assert_eq!(collection_path("Invoices"), "/api.xro/2.0/Invoices");
    }

    #[test]
    fn resource_path_encodes_id() {
        assert_eq!(
            resource_path("Contacts", "a b"),
            "/api.xro/2.0/Contacts/a%20b"
        );
    }

    #[test]
    fn validate_request_path_accepts_accounting_and_connections() {
        assert!(validate_request_path("/api.xro/2.0/Invoices").is_ok());
        assert!(validate_request_path("/api.xro/2.0/Reports/ProfitAndLoss").is_ok());
        assert!(validate_request_path("/connections").is_ok());
    }

    #[test]
    fn validate_request_path_rejects_other_paths() {
        assert!(validate_request_path("/payroll.xro/2.0/Employees").is_err());
        assert!(validate_request_path("/api.xro/1.0/Invoices").is_err());
        assert!(validate_request_path("api.xro/2.0/Invoices").is_err());
        assert!(validate_request_path("/connections/extra").is_err());
    }
}
