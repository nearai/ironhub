use serde_json::Value;

use crate::request_finance::{append_query, bool_param, get, require_non_empty, url_encode};
use crate::types::{InvoiceDirection, InvoiceVariant};

pub struct InvoiceQuery<'a> {
    pub take: u32,
    pub skip: u32,
    pub search: Option<&'a str>,
    pub status: &'a [String],
    pub variant: Option<InvoiceVariant>,
    pub filter_by: Option<InvoiceDirection>,
    pub with_links: bool,
}

pub fn list_invoices(query: &InvoiceQuery<'_>) -> Result<Value, String> {
    let mut endpoint = String::from("/invoices");
    append_query(&mut endpoint, "take", &query.take.to_string());
    append_query(&mut endpoint, "skip", &query.skip.to_string());
    if let Some(search) = query.search {
        append_query(&mut endpoint, "search", search);
    }
    for status in query.status {
        append_query(&mut endpoint, "status", status);
    }
    if let Some(variant) = query.variant {
        append_query(&mut endpoint, "variant", variant.as_request_finance());
    }
    if let Some(direction) = query.filter_by {
        append_query(&mut endpoint, "filterBy", direction.as_request_finance());
    }
    append_query(&mut endpoint, "withLinks", bool_param(query.with_links));
    append_query(&mut endpoint, "format", "paginated");
    get(&endpoint)
}

pub fn get_invoice(id: &str, with_links: bool) -> Result<Value, String> {
    require_non_empty(id, "id")?;
    let mut endpoint = format!("/invoices/{}", url_encode(id));
    append_query(&mut endpoint, "withLinks", bool_param(with_links));
    get(&endpoint)
}

pub fn list_clients(
    client_type: &str,
    take: u32,
    skip: u32,
    search: Option<&str>,
) -> Result<Value, String> {
    require_non_empty(client_type, "client_type")?;
    let mut endpoint = String::from("/clients");
    append_query(&mut endpoint, "type", client_type);
    append_query(&mut endpoint, "take", &take.to_string());
    append_query(&mut endpoint, "skip", &skip.to_string());
    if let Some(search) = search {
        append_query(&mut endpoint, "search", search);
    }
    append_query(&mut endpoint, "format", "paginated");
    get(&endpoint)
}

pub fn get_client(client_id: &str) -> Result<Value, String> {
    require_non_empty(client_id, "client_id")?;
    get(&format!("/clients/{}", url_encode(client_id)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_invoice_rejects_blank_id() {
        assert!(get_invoice("   ", false).is_err());
    }

    #[test]
    fn get_client_rejects_blank_id() {
        assert!(get_client("").is_err());
    }

    #[test]
    fn list_clients_rejects_blank_type() {
        assert!(list_clients("  ", 25, 0, None).is_err());
    }
}
