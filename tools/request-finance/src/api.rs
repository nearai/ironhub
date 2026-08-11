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
    pub creation_date_range: Option<&'a str>,
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
    if let Some(range) = query.creation_date_range {
        append_query(&mut endpoint, "creationDateRange", range);
    }
    append_query(&mut endpoint, "withLinks", bool_param(query.with_links));
    append_query(&mut endpoint, "format", "paginated");
    get(&endpoint)
}

pub fn fetch_since(
    created_from: &str,
    created_to: Option<&str>,
    take: u32,
    skip: u32,
) -> Result<Value, String> {
    let range = creation_date_range(created_from, created_to)?;
    list_invoices(&InvoiceQuery {
        take,
        skip,
        search: None,
        status: &[],
        variant: None,
        filter_by: None,
        with_links: false,
        creation_date_range: Some(&range),
    })
}

fn creation_date_range(from: &str, to: Option<&str>) -> Result<String, String> {
    require_non_empty(from, "created_from")?;
    let mut range = serde_json::Map::new();
    range.insert("from".into(), Value::String(from.to_string()));
    if let Some(to) = to {
        require_non_empty(to, "created_to")?;
        range.insert("to".into(), Value::String(to.to_string()));
    }
    serde_json::to_string(&Value::Object(range))
        .map_err(|e| format!("Failed to serialize creationDateRange: {}", e))
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

    #[test]
    fn creation_date_range_rejects_blank_bounds() {
        assert!(creation_date_range("   ", None).is_err());
        assert!(creation_date_range("2026-08-01T00:00:00.000Z", Some(" ")).is_err());
    }

    #[test]
    fn creation_date_range_emits_only_from_when_open_ended() {
        let range = creation_date_range("2026-08-01T00:00:00.000Z", None).unwrap();
        assert_eq!(range, r#"{"from":"2026-08-01T00:00:00.000Z"}"#);
    }

    #[test]
    fn creation_date_range_emits_both_bounds_when_closed() {
        let range =
            creation_date_range("2026-08-01T00:00:00.000Z", Some("2026-08-08T00:00:00.000Z"))
                .unwrap();
        assert_eq!(
            range,
            r#"{"from":"2026-08-01T00:00:00.000Z","to":"2026-08-08T00:00:00.000Z"}"#
        );
    }

    #[test]
    fn creation_date_range_survives_url_encoding_intact() {
        let range = creation_date_range("2026-08-01T00:00:00.000Z", None).unwrap();
        let encoded = url_encode(&range);
        assert!(!encoded.contains('{'));
        assert!(!encoded.contains('"'));
        assert!(!encoded.contains(':'));
        assert!(encoded.contains("%7B"));
        assert!(encoded.contains("%22"));
    }
}
