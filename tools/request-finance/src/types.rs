use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum RequestFinanceAction {
    ListInvoices {
        #[serde(default = "default_take")]
        take: u32,
        #[serde(default)]
        skip: u32,
        #[serde(default)]
        search: Option<String>,
        #[serde(default)]
        status: Vec<String>,
        #[serde(default)]
        variant: Option<InvoiceVariant>,
        #[serde(default)]
        filter_by: Option<InvoiceDirection>,
        #[serde(default)]
        with_links: bool,
    },
    GetInvoice {
        id: String,
        #[serde(default)]
        with_links: bool,
    },
    ListClients {
        #[serde(default = "default_client_type")]
        client_type: String,
        #[serde(default = "default_take")]
        take: u32,
        #[serde(default)]
        skip: u32,
        #[serde(default)]
        search: Option<String>,
    },
    GetClient {
        client_id: String,
    },
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InvoiceVariant {
    Invoice,
    Salary,
}

impl InvoiceVariant {
    pub fn as_request_finance(self) -> &'static str {
        match self {
            InvoiceVariant::Invoice => "rnf_invoice",
            InvoiceVariant::Salary => "rnf_salary",
        }
    }
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InvoiceDirection {
    Sent,
    Received,
}

impl InvoiceDirection {
    pub fn as_request_finance(self) -> &'static str {
        match self {
            InvoiceDirection::Sent => "sent",
            InvoiceDirection::Received => "received",
        }
    }
}

fn default_take() -> u32 {
    25
}

fn default_client_type() -> String {
    "customer".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<RequestFinanceAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_list_invoices_uses_defaults() {
        match parse(r#"{"action":"list_invoices"}"#).unwrap() {
            RequestFinanceAction::ListInvoices {
                take,
                skip,
                search,
                status,
                variant,
                filter_by,
                with_links,
            } => {
                assert_eq!(take, 25);
                assert_eq!(skip, 0);
                assert!(search.is_none());
                assert!(status.is_empty());
                assert!(variant.is_none());
                assert!(filter_by.is_none());
                assert!(!with_links);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_invoices_with_filters() {
        let action = parse(
            r#"{"action":"list_invoices","take":50,"variant":"salary","filter_by":"received","status":["paid","pending"]}"#,
        )
        .unwrap();
        match action {
            RequestFinanceAction::ListInvoices {
                take,
                status,
                variant,
                filter_by,
                ..
            } => {
                assert_eq!(take, 50);
                assert_eq!(status, vec!["paid", "pending"]);
                assert_eq!(variant, Some(InvoiceVariant::Salary));
                assert_eq!(filter_by, Some(InvoiceDirection::Received));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_invoice_requires_id() {
        assert!(parse(r#"{"action":"get_invoice"}"#).is_err());
        match parse(r#"{"action":"get_invoice","id":"inv-1","with_links":true}"#).unwrap() {
            RequestFinanceAction::GetInvoice { id, with_links } => {
                assert_eq!(id, "inv-1");
                assert!(with_links);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_clients_defaults_to_customer() {
        match parse(r#"{"action":"list_clients"}"#).unwrap() {
            RequestFinanceAction::ListClients {
                client_type, take, ..
            } => {
                assert_eq!(client_type, "customer");
                assert_eq!(take, 25);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_client_requires_id() {
        assert!(parse(r#"{"action":"get_client"}"#).is_err());
    }

    #[test]
    fn parse_unknown_variant_fails() {
        assert!(parse(r#"{"action":"list_invoices","variant":"payroll"}"#).is_err());
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"create_invoice"}"#).is_err());
    }

    #[test]
    fn invoice_variant_wire_values() {
        assert_eq!(InvoiceVariant::Invoice.as_request_finance(), "rnf_invoice");
        assert_eq!(InvoiceVariant::Salary.as_request_finance(), "rnf_salary");
    }

    #[test]
    fn invoice_direction_wire_values() {
        assert_eq!(InvoiceDirection::Sent.as_request_finance(), "sent");
        assert_eq!(InvoiceDirection::Received.as_request_finance(), "received");
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(RequestFinanceAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for name in ["list_invoices", "get_invoice", "list_clients", "get_client"] {
            assert!(json.contains(name), "schema missing action: {name}");
        }
    }
}
