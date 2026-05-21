mod api;
mod monday;
mod types;

use types::MondayAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct MondayTool;

impl exports::near::agent::tool::Guest for MondayTool {
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
        let schema = schemars::schema_for!(types::MondayAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "monday.com API v2 (GraphQL) integration. Reads the current account (me), boards (list, \
         get, list groups), items (paginated by board, single get, search by column value, \
         updates), users, and workspaces. Writes: create_item, update_item_column_values (via \
         change_multiple_column_values), archive_item, delete_item, move_item_to_group, \
         create_group, create_subitem, create_update. A raw monday_graphql_query action proxies \
         any query or mutation against api.monday.com/v2 bounded by the same host allowlist and \
         token scope. Authenticated with a personal API v2 token sent as the raw Authorization \
         header value (no Bearer prefix). monday GraphQL returns HTTP 200 even on errors; this \
         tool inspects the response errors[] array and surfaces failures as tool errors."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: MondayAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("monday-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for monday tool: {}. Expected shape: {{\"action\": \"<name>\", ...fields}}. Valid action names: me, list_boards, get_board, list_groups, items_by_board, get_item, search_items_by_column, list_updates, list_users, list_workspaces, create_item, update_item_column_values, archive_item, delete_item, move_item_to_group, create_group, create_subitem, create_update, monday_graphql_query. board_state must be one of: all, active, archived, deleted. board_kind: public, private, share. user kind: all, non_guests, guests, non_pending. workspace kind: open, closed. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("monday action dispatched: {}", action_name(&action)),
    );

    let result = dispatch_action(action)?;
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn dispatch_action(action: MondayAction) -> Result<serde_json::Value, String> {
    match action {
        MondayAction::Me => api::me(),
        MondayAction::ListBoards {
            limit,
            page,
            workspace_ids,
            state,
            board_kind,
        } => api::list_boards(limit, page, workspace_ids.as_deref(), state, board_kind),
        MondayAction::GetBoard { board_id } => api::get_board(board_id),
        MondayAction::ListGroups { board_id } => api::list_groups(board_id),
        MondayAction::ItemsByBoard {
            board_ids,
            limit,
            cursor,
        } => api::items_by_board(&board_ids, limit, cursor.as_deref()),
        MondayAction::GetItem { item_id } => api::get_item(item_id),
        MondayAction::SearchItemsByColumn {
            board_id,
            column_id,
            column_values,
            limit,
        } => api::search_items_by_column(board_id, &column_id, &column_values, limit),
        MondayAction::ListUpdates { item_id, limit } => api::list_updates(item_id, limit),
        MondayAction::ListUsers { limit, kind } => api::list_users(limit, kind),
        MondayAction::ListWorkspaces { limit, kind } => api::list_workspaces(limit, kind),
        MondayAction::CreateItem {
            board_id,
            item_name,
            group_id,
            column_values,
        } => api::create_item(
            board_id,
            &item_name,
            group_id.as_deref(),
            column_values.as_ref(),
        ),
        MondayAction::UpdateItemColumnValues {
            board_id,
            item_id,
            column_values,
        } => api::update_item_column_values(board_id, item_id, &column_values),
        MondayAction::ArchiveItem { item_id } => api::archive_item(item_id),
        MondayAction::DeleteItem { item_id } => api::delete_item(item_id),
        MondayAction::MoveItemToGroup { item_id, group_id } => {
            api::move_item_to_group(item_id, &group_id)
        }
        MondayAction::CreateGroup {
            board_id,
            group_name,
        } => api::create_group(board_id, &group_name),
        MondayAction::CreateSubitem {
            parent_item_id,
            item_name,
            column_values,
        } => api::create_subitem(parent_item_id, &item_name, column_values.as_ref()),
        MondayAction::CreateUpdate { item_id, body } => api::create_update(item_id, &body),
        MondayAction::MondayGraphqlQuery { query, variables } => {
            api::monday_graphql_query(&query, variables.as_ref())
        }
    }
}

fn action_name(action: &MondayAction) -> &'static str {
    match action {
        MondayAction::Me => "me",
        MondayAction::ListBoards { .. } => "list_boards",
        MondayAction::GetBoard { .. } => "get_board",
        MondayAction::ListGroups { .. } => "list_groups",
        MondayAction::ItemsByBoard { .. } => "items_by_board",
        MondayAction::GetItem { .. } => "get_item",
        MondayAction::SearchItemsByColumn { .. } => "search_items_by_column",
        MondayAction::ListUpdates { .. } => "list_updates",
        MondayAction::ListUsers { .. } => "list_users",
        MondayAction::ListWorkspaces { .. } => "list_workspaces",
        MondayAction::CreateItem { .. } => "create_item",
        MondayAction::UpdateItemColumnValues { .. } => "update_item_column_values",
        MondayAction::ArchiveItem { .. } => "archive_item",
        MondayAction::DeleteItem { .. } => "delete_item",
        MondayAction::MoveItemToGroup { .. } => "move_item_to_group",
        MondayAction::CreateGroup { .. } => "create_group",
        MondayAction::CreateSubitem { .. } => "create_subitem",
        MondayAction::CreateUpdate { .. } => "create_update",
        MondayAction::MondayGraphqlQuery { .. } => "monday_graphql_query",
    }
}

export!(MondayTool);
