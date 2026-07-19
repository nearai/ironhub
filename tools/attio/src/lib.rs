mod api;
mod attio;
mod types;

use types::AttioAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct AttioTool;

impl exports::near::agent::tool::Guest for AttioTool {
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
        let schema = schemars::schema_for!(types::AttioAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Attio CRM API v2 read and write access. Queries records with filters and sorts, fetches, \
         creates, updates, asserts (upsert), and deletes records for any object (people, companies, \
         deals, users, workspaces, or custom), reads the object catalog and per-object attribute \
         schemas, lists lists and queries list entries, and lists and creates notes and tasks. A \
         raw `attio_request` action is exposed for any v2 endpoint not covered by a named action; \
         it is bounded by the same host allowlist. Record writes take a `values` object shaped as \
         Attio attribute values; call `list_attributes` first to discover attribute slugs. \
         Authenticated with an Attio workspace API key sent as a Bearer header against \
         api.attio.com. Named actions: list_records, get_record, create_record, update_record, \
         assert_record, delete_record, list_attributes, list_objects, list_lists, \
         query_list_entries, list_notes, create_note, list_tasks, create_task, self, attio_request."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: AttioAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("attio-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for attio tool: {}. Expected shape: {{\"action\": \"<name>\", \
             ...fields}}. Valid action names: list_records, get_record, create_record, \
             update_record, assert_record, delete_record, list_attributes, list_objects, \
             list_lists, query_list_entries, list_notes, create_note, list_tasks, create_task, \
             self, attio_request. For record actions, object is an object slug or id (people, \
             companies, deals, users, workspaces, or a custom slug). For attio_request, method \
             must be one of GET, POST, PATCH, PUT, DELETE and path must start with /v2/. Call \
             tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Attio action dispatched: {}", action_name(&action)),
    );

    let result = dispatch_action(action)?;
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn dispatch_action(action: AttioAction) -> Result<serde_json::Value, String> {
    match action {
        AttioAction::ListRecords {
            object,
            filter,
            sorts,
            limit,
            offset,
        } => api::list_records(&object, filter.as_ref(), sorts.as_ref(), limit, offset),
        AttioAction::GetRecord { object, record_id } => api::get_record(&object, &record_id),
        AttioAction::CreateRecord { object, values } => api::create_record(&object, &values),
        AttioAction::UpdateRecord {
            object,
            record_id,
            values,
        } => api::update_record(&object, &record_id, &values),
        AttioAction::AssertRecord {
            object,
            matching_attribute,
            values,
        } => api::assert_record(&object, &matching_attribute, &values),
        AttioAction::DeleteRecord { object, record_id } => api::delete_record(&object, &record_id),
        AttioAction::ListAttributes { object } => api::list_attributes(&object),
        AttioAction::ListObjects => api::list_objects(),
        AttioAction::ListLists => api::list_lists(),
        AttioAction::QueryListEntries {
            list,
            filter,
            sorts,
            limit,
            offset,
        } => api::query_list_entries(&list, filter.as_ref(), sorts.as_ref(), limit, offset),
        AttioAction::ListNotes {
            parent_object,
            parent_record_id,
            limit,
            offset,
        } => api::list_notes(
            parent_object.as_deref(),
            parent_record_id.as_deref(),
            limit,
            offset,
        ),
        AttioAction::CreateNote {
            parent_object,
            parent_record_id,
            title,
            content,
            format,
        } => api::create_note(&parent_object, &parent_record_id, &title, &content, format),
        AttioAction::ListTasks { limit, offset } => api::list_tasks(limit, offset),
        AttioAction::CreateTask {
            content,
            deadline_at,
            is_completed,
            linked_records,
            assignees,
        } => api::create_task(
            &content,
            deadline_at.as_deref(),
            is_completed,
            linked_records.as_ref(),
            assignees.as_ref(),
        ),
        AttioAction::SelfInfo => api::self_info(),
        AttioAction::AttioRequest { method, path, body } => {
            api::attio_request(method.as_str(), &path, body.as_ref())
        }
    }
}

fn action_name(action: &AttioAction) -> &'static str {
    match action {
        AttioAction::ListRecords { .. } => "list_records",
        AttioAction::GetRecord { .. } => "get_record",
        AttioAction::CreateRecord { .. } => "create_record",
        AttioAction::UpdateRecord { .. } => "update_record",
        AttioAction::AssertRecord { .. } => "assert_record",
        AttioAction::DeleteRecord { .. } => "delete_record",
        AttioAction::ListAttributes { .. } => "list_attributes",
        AttioAction::ListObjects => "list_objects",
        AttioAction::ListLists => "list_lists",
        AttioAction::QueryListEntries { .. } => "query_list_entries",
        AttioAction::ListNotes { .. } => "list_notes",
        AttioAction::CreateNote { .. } => "create_note",
        AttioAction::ListTasks { .. } => "list_tasks",
        AttioAction::CreateTask { .. } => "create_task",
        AttioAction::SelfInfo => "self",
        AttioAction::AttioRequest { .. } => "attio_request",
    }
}

export!(AttioTool);
