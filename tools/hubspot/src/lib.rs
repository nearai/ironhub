mod api;
mod hubspot;
mod types;

use types::HubspotAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct HubspotTool;

impl exports::near::agent::tool::Guest for HubspotTool {
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
        let schema = schemars::schema_for!(types::HubspotAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "HubSpot CRM v3 read and write access. Lists, searches, fetches, creates, updates, and \
         archives contacts, companies, deals, and tickets. Lists contact lists and list members, \
         CRM owners, and per-object properties. A raw `hubspot_request` action is also exposed \
         for any CRM v3 endpoint not covered by a named action; it is bounded by the same host \
         allowlist and OAuth scopes. Authenticated with a HubSpot Private App / Service Key sent \
         as a Bearer header against api.hubapi.com. Named actions: list_contacts, list_companies, \
         list_deals, list_tickets, search_objects, get_object, create_object, update_object, \
         archive_object, list_lists, get_list_members, list_owners, list_properties, hubspot_request."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: HubspotAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("hubspot-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for hubspot tool: {}. Expected shape: {{\"action\": \"<name>\", ...fields}}. Valid action names: list_contacts, list_companies, list_deals, list_tickets, search_objects, get_object, create_object, update_object, archive_object, list_lists, get_list_members, list_owners, list_properties, hubspot_request. For object actions, object_type must be one of: contacts, companies, deals, tickets. For hubspot_request, method must be one of: GET, POST, PATCH, PUT, DELETE and path must start with /crm/v3/. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("HubSpot action dispatched: {}", action_name(&action)),
    );

    let result = dispatch_action(action)?;
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn dispatch_action(action: HubspotAction) -> Result<serde_json::Value, String> {
    match action {
        HubspotAction::ListContacts {
            limit,
            properties,
            after,
        } => api::list_objects(
            types::HubspotObjectType::Contacts,
            limit,
            &properties,
            after.as_deref(),
        ),
        HubspotAction::ListCompanies {
            limit,
            properties,
            after,
        } => api::list_objects(
            types::HubspotObjectType::Companies,
            limit,
            &properties,
            after.as_deref(),
        ),
        HubspotAction::ListDeals {
            limit,
            properties,
            after,
        } => api::list_objects(
            types::HubspotObjectType::Deals,
            limit,
            &properties,
            after.as_deref(),
        ),
        HubspotAction::ListTickets {
            limit,
            properties,
            after,
        } => api::list_objects(
            types::HubspotObjectType::Tickets,
            limit,
            &properties,
            after.as_deref(),
        ),
        HubspotAction::SearchObjects {
            object_type,
            query,
            filter_groups,
            properties,
            limit,
            after,
        } => api::search_objects(
            object_type,
            query.as_deref(),
            filter_groups.as_deref(),
            &properties,
            limit,
            after.as_deref(),
        ),
        HubspotAction::GetObject {
            object_type,
            id,
            properties,
        } => api::get_object(object_type, &id, &properties),
        HubspotAction::CreateObject {
            object_type,
            properties,
            associations,
        } => api::create_object(object_type, &properties, associations.as_deref()),
        HubspotAction::UpdateObject {
            object_type,
            id,
            properties,
        } => api::update_object(object_type, &id, &properties),
        HubspotAction::ArchiveObject { object_type, id } => api::archive_object(object_type, &id),
        HubspotAction::ListLists {
            limit,
            offset,
            query,
        } => api::list_lists(limit, offset, query.as_deref()),
        HubspotAction::GetListMembers {
            list_id,
            limit,
            after,
        } => api::get_list_members(&list_id, limit, after.as_deref()),
        HubspotAction::ListOwners {
            limit,
            after,
            email,
            archived,
        } => api::list_owners(limit, after.as_deref(), email.as_deref(), archived),
        HubspotAction::ListProperties {
            object_type,
            archived,
        } => api::list_properties(object_type, archived),
        HubspotAction::HubspotRequest { method, path, body } => {
            api::hubspot_request(method.as_str(), &path, body.as_ref())
        }
    }
}

fn action_name(action: &HubspotAction) -> &'static str {
    match action {
        HubspotAction::ListContacts { .. } => "list_contacts",
        HubspotAction::ListCompanies { .. } => "list_companies",
        HubspotAction::ListDeals { .. } => "list_deals",
        HubspotAction::ListTickets { .. } => "list_tickets",
        HubspotAction::SearchObjects { .. } => "search_objects",
        HubspotAction::GetObject { .. } => "get_object",
        HubspotAction::CreateObject { .. } => "create_object",
        HubspotAction::UpdateObject { .. } => "update_object",
        HubspotAction::ArchiveObject { .. } => "archive_object",
        HubspotAction::ListLists { .. } => "list_lists",
        HubspotAction::GetListMembers { .. } => "get_list_members",
        HubspotAction::ListOwners { .. } => "list_owners",
        HubspotAction::ListProperties { .. } => "list_properties",
        HubspotAction::HubspotRequest { .. } => "hubspot_request",
    }
}

export!(HubspotTool);
