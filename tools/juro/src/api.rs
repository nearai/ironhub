use serde_json::{json, Value};

use crate::juro::{append_query, get, require_non_empty, url_encode};

pub struct ContractQuery<'a> {
    pub skip: u32,
    pub limit: u32,
    pub updated_since: Option<&'a str>,
    pub updated_before: Option<&'a str>,
    pub team_ids: &'a [String],
    pub template_id: Option<&'a str>,
}

pub fn list_contracts(query: &ContractQuery<'_>) -> Result<Value, String> {
    let mut endpoint = String::from("/v3/contracts");
    append_query(&mut endpoint, "skip", &query.skip.to_string());
    append_query(&mut endpoint, "limit", &query.limit.to_string());
    if let Some(since) = query.updated_since {
        append_query(&mut endpoint, "updatedSince", since);
    }
    if let Some(before) = query.updated_before {
        append_query(&mut endpoint, "updatedBefore", before);
    }
    for team_id in query.team_ids {
        append_query(&mut endpoint, "teamIds", team_id);
    }
    if let Some(template_id) = query.template_id {
        append_query(&mut endpoint, "templateId", template_id);
    }
    get(&endpoint)
}

pub fn get_contract(contract_id: &str) -> Result<Value, String> {
    require_non_empty(contract_id, "contract_id")?;
    get(&format!("/v3/contracts/{}", url_encode(contract_id)))
}

pub fn get_finance_terms(contract_id: &str, field_titles: &[String]) -> Result<Value, String> {
    let contract = get_contract(contract_id)?;
    let fields = contract
        .get("fields")
        .and_then(|entry| entry.as_array())
        .ok_or_else(|| {
            format!(
                "Juro contract {} returned no `fields` array; the contract may carry no \
                 smartfields, or the API shape has changed",
                contract_id
            )
        })?;

    let selected: Vec<Value> = fields
        .iter()
        .filter(|field| field_matches(field, field_titles))
        .cloned()
        .collect();

    let missing: Vec<&String> = field_titles
        .iter()
        .filter(|wanted| !fields.iter().any(|field| title_equals(field, wanted)))
        .collect();

    Ok(json!({
        "contractId": contract_id,
        "status": contract.get("status").cloned().unwrap_or(Value::Null),
        "fields": selected,
        "requestedFieldsNotFound": missing,
    }))
}

fn field_matches(field: &Value, field_titles: &[String]) -> bool {
    if field_titles.is_empty() {
        return true;
    }
    field_titles
        .iter()
        .any(|wanted| title_equals(field, wanted))
}

fn title_equals(field: &Value, wanted: &str) -> bool {
    field
        .get("title")
        .and_then(|title| title.as_str())
        .map(|title| title.eq_ignore_ascii_case(wanted.trim()))
        .unwrap_or(false)
}

pub fn get_signed_version(contract_id: &str) -> Result<Value, String> {
    let contract = get_contract(contract_id)?;
    Ok(json!({
        "contractId": contract_id,
        "status": contract.get("status").cloned().unwrap_or(Value::Null),
        "signingSides": contract.get("signingSides").cloned().unwrap_or(Value::Null),
        "signedDocumentPath": format!("/v3/contracts/{}/pdf/binary", url_encode(contract_id)),
    }))
}

pub fn list_templates(skip: u32, limit: u32) -> Result<Value, String> {
    let mut endpoint = String::from("/v3/templates");
    append_query(&mut endpoint, "skip", &skip.to_string());
    append_query(&mut endpoint, "limit", &limit.to_string());
    get(&endpoint)
}

pub fn get_template(template_id: &str) -> Result<Value, String> {
    require_non_empty(template_id, "template_id")?;
    get(&format!("/v3/templates/{}", url_encode(template_id)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_contract_rejects_blank_id() {
        assert!(get_contract("   ").is_err());
    }

    #[test]
    fn get_template_rejects_blank_id() {
        assert!(get_template("").is_err());
    }

    fn field(title: &str) -> Value {
        json!({ "uid": "u1", "title": title, "type": "text", "value": "v" })
    }

    #[test]
    fn empty_filter_matches_every_field() {
        assert!(field_matches(&field("Total Value"), &[]));
    }

    #[test]
    fn filter_matches_on_title_ignoring_case_and_padding() {
        let titles = vec!["  total value  ".to_string()];
        assert!(field_matches(&field("Total Value"), &titles));
    }

    #[test]
    fn filter_rejects_an_unrelated_title() {
        let titles = vec!["Payment Terms".to_string()];
        assert!(!field_matches(&field("Total Value"), &titles));
    }

    #[test]
    fn title_equals_is_false_when_the_field_has_no_title() {
        assert!(!title_equals(&json!({ "uid": "u1" }), "Total Value"));
    }

    #[test]
    fn get_finance_terms_rejects_blank_id() {
        assert!(get_finance_terms("   ", &[]).is_err());
    }

    #[test]
    fn get_signed_version_rejects_blank_id() {
        assert!(get_signed_version("").is_err());
    }
}
