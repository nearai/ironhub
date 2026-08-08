use serde_json::Value;

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
}
