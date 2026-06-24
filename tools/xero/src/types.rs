use schemars::JsonSchema;
use serde::Deserialize;
use std::collections::BTreeMap;

pub type JsonObject = serde_json::Map<String, serde_json::Value>;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum XeroAction {
    ListConnections,
    GetOrganisation {
        tenant_id: String,
    },
    ListContacts {
        tenant_id: String,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        where_filter: Option<String>,
        #[serde(default)]
        order: Option<String>,
        #[serde(default)]
        search_term: Option<String>,
    },
    GetContact {
        tenant_id: String,
        contact_id: String,
    },
    CreateContact {
        tenant_id: String,
        contact: JsonObject,
        #[serde(default)]
        idempotency_key: Option<String>,
    },
    UpdateContact {
        tenant_id: String,
        contact_id: String,
        contact: JsonObject,
        #[serde(default)]
        idempotency_key: Option<String>,
    },
    ListInvoices {
        tenant_id: String,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        where_filter: Option<String>,
        #[serde(default)]
        order: Option<String>,
        #[serde(default)]
        statuses: Option<String>,
    },
    GetInvoice {
        tenant_id: String,
        invoice_id: String,
    },
    CreateInvoice {
        tenant_id: String,
        invoice: JsonObject,
        #[serde(default)]
        idempotency_key: Option<String>,
    },
    UpdateInvoice {
        tenant_id: String,
        invoice_id: String,
        invoice: JsonObject,
        #[serde(default)]
        idempotency_key: Option<String>,
    },
    ListAccounts {
        tenant_id: String,
        #[serde(default)]
        where_filter: Option<String>,
        #[serde(default)]
        order: Option<String>,
    },
    ListPayments {
        tenant_id: String,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        where_filter: Option<String>,
        #[serde(default)]
        order: Option<String>,
    },
    CreatePayment {
        tenant_id: String,
        payment: JsonObject,
        #[serde(default)]
        idempotency_key: Option<String>,
    },
    ListBankTransactions {
        tenant_id: String,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        where_filter: Option<String>,
        #[serde(default)]
        order: Option<String>,
    },
    ListItems {
        tenant_id: String,
        #[serde(default)]
        where_filter: Option<String>,
        #[serde(default)]
        order: Option<String>,
    },
    ListCreditNotes {
        tenant_id: String,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        where_filter: Option<String>,
        #[serde(default)]
        order: Option<String>,
    },
    GetReport {
        tenant_id: String,
        report: XeroReport,
        #[serde(default)]
        params: BTreeMap<String, String>,
    },
    XeroRequest {
        #[serde(default)]
        tenant_id: Option<String>,
        method: HttpMethod,
        path: String,
        #[serde(default)]
        body: Option<serde_json::Value>,
    },
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum XeroReport {
    ProfitAndLoss,
    BalanceSheet,
    TrialBalance,
    AgedReceivablesByContact,
    AgedPayablesByContact,
    BankSummary,
    ExecutiveSummary,
}

impl XeroReport {
    pub fn as_report_name(self) -> &'static str {
        match self {
            XeroReport::ProfitAndLoss => "ProfitAndLoss",
            XeroReport::BalanceSheet => "BalanceSheet",
            XeroReport::TrialBalance => "TrialBalance",
            XeroReport::AgedReceivablesByContact => "AgedReceivablesByContact",
            XeroReport::AgedPayablesByContact => "AgedPayablesByContact",
            XeroReport::BankSummary => "BankSummary",
            XeroReport::ExecutiveSummary => "ExecutiveSummary",
        }
    }
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
}

impl HttpMethod {
    pub fn as_str(self) -> &'static str {
        match self {
            HttpMethod::Get => "GET",
            HttpMethod::Post => "POST",
            HttpMethod::Put => "PUT",
            HttpMethod::Delete => "DELETE",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<XeroAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_list_connections_takes_no_fields() {
        let action = parse(r#"{"action":"list_connections"}"#).unwrap();
        assert!(matches!(action, XeroAction::ListConnections));
    }

    #[test]
    fn parse_list_invoices_minimal() {
        let action = parse(r#"{"action":"list_invoices","tenant_id":"abc"}"#).unwrap();
        match action {
            XeroAction::ListInvoices {
                tenant_id,
                page,
                statuses,
                ..
            } => {
                assert_eq!(tenant_id, "abc");
                assert!(page.is_none());
                assert!(statuses.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_invoices_with_paging_and_status() {
        let action = parse(
            r#"{"action":"list_invoices","tenant_id":"abc","page":2,"statuses":"AUTHORISED,PAID","order":"Date DESC"}"#,
        )
        .unwrap();
        match action {
            XeroAction::ListInvoices {
                page,
                statuses,
                order,
                ..
            } => {
                assert_eq!(page, Some(2));
                assert_eq!(statuses.as_deref(), Some("AUTHORISED,PAID"));
                assert_eq!(order.as_deref(), Some("Date DESC"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_invoice_with_idempotency_key() {
        let raw = r#"{
            "action": "create_invoice",
            "tenant_id": "abc",
            "invoice": {"Type":"ACCREC","Contact":{"ContactID":"c1"},"LineItems":[]},
            "idempotency_key": "inv-2026-001"
        }"#;
        let action = parse(raw).unwrap();
        match action {
            XeroAction::CreateInvoice {
                tenant_id,
                invoice,
                idempotency_key,
            } => {
                assert_eq!(tenant_id, "abc");
                assert_eq!(invoice.get("Type").and_then(|v| v.as_str()), Some("ACCREC"));
                assert_eq!(idempotency_key.as_deref(), Some("inv-2026-001"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_report() {
        let action = parse(
            r#"{"action":"get_report","tenant_id":"abc","report":"profit_and_loss","params":{"fromDate":"2026-01-01","toDate":"2026-03-31"}}"#,
        )
        .unwrap();
        match action {
            XeroAction::GetReport { report, params, .. } => {
                assert_eq!(report, XeroReport::ProfitAndLoss);
                assert_eq!(
                    params.get("fromDate").map(String::as_str),
                    Some("2026-01-01")
                );
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_xero_request_without_tenant() {
        let action =
            parse(r#"{"action":"xero_request","method":"GET","path":"/connections"}"#).unwrap();
        match action {
            XeroAction::XeroRequest {
                tenant_id,
                method,
                path,
                body,
            } => {
                assert!(tenant_id.is_none());
                assert_eq!(method, HttpMethod::Get);
                assert_eq!(path, "/connections");
                assert!(body.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"delete_org","tenant_id":"a"}"#).is_err());
    }

    #[test]
    fn parse_missing_tenant_id_fails() {
        assert!(parse(r#"{"action":"get_organisation"}"#).is_err());
    }

    #[test]
    fn parse_unknown_report_fails() {
        assert!(parse(r#"{"action":"get_report","tenant_id":"a","report":"cashflow"}"#).is_err());
    }

    #[test]
    fn report_names_are_xero_pascal_case() {
        assert_eq!(XeroReport::ProfitAndLoss.as_report_name(), "ProfitAndLoss");
        assert_eq!(
            XeroReport::AgedReceivablesByContact.as_report_name(),
            "AgedReceivablesByContact"
        );
    }

    #[test]
    fn http_method_wire_values() {
        assert_eq!(HttpMethod::Get.as_str(), "GET");
        assert_eq!(HttpMethod::Post.as_str(), "POST");
        assert_eq!(HttpMethod::Put.as_str(), "PUT");
        assert_eq!(HttpMethod::Delete.as_str(), "DELETE");
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(XeroAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for variant in [
            "list_connections",
            "get_organisation",
            "list_contacts",
            "get_contact",
            "create_contact",
            "update_contact",
            "list_invoices",
            "get_invoice",
            "create_invoice",
            "update_invoice",
            "list_accounts",
            "list_payments",
            "create_payment",
            "list_bank_transactions",
            "list_items",
            "list_credit_notes",
            "get_report",
            "xero_request",
        ] {
            assert!(json.contains(variant), "schema missing variant {}", variant);
        }
    }
}
