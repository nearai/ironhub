use crate::monday::graphql_call;
use crate::types::{BoardKind, BoardState, UserKind, WorkspaceKind};

const LIMIT_MAX: u32 = 100;

pub fn me() -> Result<serde_json::Value, String> {
    let query = "query { me { id name email created_at is_admin is_guest } }";
    graphql_call(query, serde_json::json!({}))
}

pub fn list_boards(
    limit: u32,
    page: Option<u32>,
    workspace_ids: Option<&[u64]>,
    state: Option<BoardState>,
    board_kind: Option<BoardKind>,
) -> Result<serde_json::Value, String> {
    let query = "query($limit: Int!, $page: Int, $workspace_ids: [ID], $state: State, $board_kind: BoardKind) { \
                 boards(limit: $limit, page: $page, workspace_ids: $workspace_ids, state: $state, board_kind: $board_kind) { \
                 id name state board_kind board_folder_id description workspace_id } }";
    let mut variables = serde_json::Map::new();
    variables.insert(
        "limit".into(),
        serde_json::Value::Number(clamp_limit(limit).into()),
    );
    if let Some(p) = page {
        variables.insert("page".into(), serde_json::Value::Number(p.into()));
    }
    if let Some(ids) = workspace_ids {
        variables.insert("workspace_ids".into(), ids_to_string_array(ids));
    }
    if let Some(s) = state {
        variables.insert(
            "state".into(),
            serde_json::Value::String(s.as_wire().to_string()),
        );
    }
    if let Some(k) = board_kind {
        variables.insert(
            "board_kind".into(),
            serde_json::Value::String(k.as_wire().to_string()),
        );
    }
    graphql_call(query, serde_json::Value::Object(variables))
}

pub fn get_board(board_id: u64) -> Result<serde_json::Value, String> {
    let query = "query($ids: [ID!]) { \
                 boards(ids: $ids) { \
                 id name description state board_kind workspace_id \
                 columns { id title type settings_str } \
                 groups { id title color } \
                 owners { id name email } } }";
    let variables = serde_json::json!({ "ids": [board_id.to_string()] });
    graphql_call(query, variables)
}

pub fn list_groups(board_id: u64) -> Result<serde_json::Value, String> {
    let query = "query($ids: [ID!]) { boards(ids: $ids) { id groups { id title color archived deleted } } }";
    let variables = serde_json::json!({ "ids": [board_id.to_string()] });
    graphql_call(query, variables)
}

pub fn items_by_board(
    board_ids: &[u64],
    limit: u32,
    cursor: Option<&str>,
) -> Result<serde_json::Value, String> {
    let clamped = clamp_limit(limit);
    if let Some(c) = cursor {
        let query = "query($cursor: String!, $limit: Int!) { \
                     next_items_page(cursor: $cursor, limit: $limit) { \
                     cursor items { id name group { id title } column_values { id text value } } } }";
        let variables = serde_json::json!({ "cursor": c, "limit": clamped });
        return graphql_call(query, variables);
    }
    let query = "query($board_ids: [ID!], $limit: Int!) { \
                 boards(ids: $board_ids) { \
                 id items_page(limit: $limit) { \
                 cursor items { id name group { id title } column_values { id text value } } } } }";
    let id_strings: Vec<String> = board_ids.iter().map(u64::to_string).collect();
    let variables = serde_json::json!({ "board_ids": id_strings, "limit": clamped });
    graphql_call(query, variables)
}

pub fn get_item(item_id: u64) -> Result<serde_json::Value, String> {
    let query = "query($ids: [ID!]) { \
                 items(ids: $ids) { \
                 id name state created_at updated_at \
                 board { id name } \
                 group { id title } \
                 creator { id name email } \
                 column_values { id type text value } \
                 subitems { id name } } }";
    let variables = serde_json::json!({ "ids": [item_id.to_string()] });
    graphql_call(query, variables)
}

pub fn search_items_by_column(
    board_id: u64,
    column_id: &str,
    column_values: &[String],
    limit: u32,
) -> Result<serde_json::Value, String> {
    let query = "query($board_id: ID!, $columns: [ItemsPageByColumnValuesQuery!], $limit: Int!) { \
                 items_page_by_column_values(board_id: $board_id, columns: $columns, limit: $limit) { \
                 cursor items { id name column_values { id text value } } } }";
    let columns = serde_json::json!([{
        "column_id": column_id,
        "column_values": column_values,
    }]);
    let variables = serde_json::json!({
        "board_id": board_id.to_string(),
        "columns": columns,
        "limit": clamp_limit(limit),
    });
    graphql_call(query, variables)
}

pub fn list_updates(item_id: u64, limit: u32) -> Result<serde_json::Value, String> {
    let query = "query($ids: [ID!], $limit: Int!) { \
                 items(ids: $ids) { \
                 id updates(limit: $limit) { \
                 id body text_body created_at updated_at creator { id name } } } }";
    let variables = serde_json::json!({
        "ids": [item_id.to_string()],
        "limit": clamp_limit(limit),
    });
    graphql_call(query, variables)
}

pub fn list_users(limit: u32, kind: Option<UserKind>) -> Result<serde_json::Value, String> {
    let query = "query($limit: Int!, $kind: UserKind) { \
                 users(limit: $limit, kind: $kind) { id name email enabled is_admin is_guest } }";
    let mut variables = serde_json::Map::new();
    variables.insert(
        "limit".into(),
        serde_json::Value::Number(clamp_limit(limit).into()),
    );
    if let Some(k) = kind {
        variables.insert(
            "kind".into(),
            serde_json::Value::String(k.as_wire().to_string()),
        );
    }
    graphql_call(query, serde_json::Value::Object(variables))
}

pub fn list_workspaces(
    limit: u32,
    kind: Option<WorkspaceKind>,
) -> Result<serde_json::Value, String> {
    let query = "query($limit: Int!, $kind: WorkspaceKind) { \
                 workspaces(limit: $limit, kind: $kind) { id name kind description created_at } }";
    let mut variables = serde_json::Map::new();
    variables.insert(
        "limit".into(),
        serde_json::Value::Number(clamp_limit(limit).into()),
    );
    if let Some(k) = kind {
        variables.insert(
            "kind".into(),
            serde_json::Value::String(k.as_wire().to_string()),
        );
    }
    graphql_call(query, serde_json::Value::Object(variables))
}

pub fn create_item(
    board_id: u64,
    item_name: &str,
    group_id: Option<&str>,
    column_values: Option<&serde_json::Map<String, serde_json::Value>>,
) -> Result<serde_json::Value, String> {
    let query = "mutation($board_id: ID!, $item_name: String!, $group_id: String, $column_values: JSON) { \
                 create_item(board_id: $board_id, item_name: $item_name, group_id: $group_id, column_values: $column_values) { \
                 id name } }";
    let mut variables = serde_json::Map::new();
    variables.insert(
        "board_id".into(),
        serde_json::Value::String(board_id.to_string()),
    );
    variables.insert(
        "item_name".into(),
        serde_json::Value::String(item_name.to_string()),
    );
    if let Some(g) = group_id {
        variables.insert("group_id".into(), serde_json::Value::String(g.to_string()));
    }
    if let Some(cols) = column_values {
        variables.insert("column_values".into(), column_values_string(cols)?);
    }
    graphql_call(query, serde_json::Value::Object(variables))
}

pub fn update_item_column_values(
    board_id: u64,
    item_id: u64,
    column_values: &serde_json::Map<String, serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let query = "mutation($board_id: ID!, $item_id: ID!, $column_values: JSON!) { \
                 change_multiple_column_values(board_id: $board_id, item_id: $item_id, column_values: $column_values) { \
                 id name } }";
    let variables = serde_json::json!({
        "board_id": board_id.to_string(),
        "item_id": item_id.to_string(),
        "column_values": column_values_string(column_values)?,
    });
    graphql_call(query, variables)
}

pub fn archive_item(item_id: u64) -> Result<serde_json::Value, String> {
    let query = "mutation($item_id: ID!) { archive_item(item_id: $item_id) { id } }";
    let variables = serde_json::json!({ "item_id": item_id.to_string() });
    graphql_call(query, variables)
}

pub fn delete_item(item_id: u64) -> Result<serde_json::Value, String> {
    let query = "mutation($item_id: ID!) { delete_item(item_id: $item_id) { id } }";
    let variables = serde_json::json!({ "item_id": item_id.to_string() });
    graphql_call(query, variables)
}

pub fn move_item_to_group(item_id: u64, group_id: &str) -> Result<serde_json::Value, String> {
    let query = "mutation($item_id: ID!, $group_id: String!) { \
                 move_item_to_group(item_id: $item_id, group_id: $group_id) { id } }";
    let variables = serde_json::json!({
        "item_id": item_id.to_string(),
        "group_id": group_id,
    });
    graphql_call(query, variables)
}

pub fn create_group(board_id: u64, group_name: &str) -> Result<serde_json::Value, String> {
    let query = "mutation($board_id: ID!, $group_name: String!) { \
                 create_group(board_id: $board_id, group_name: $group_name) { id title } }";
    let variables = serde_json::json!({
        "board_id": board_id.to_string(),
        "group_name": group_name,
    });
    graphql_call(query, variables)
}

pub fn create_subitem(
    parent_item_id: u64,
    item_name: &str,
    column_values: Option<&serde_json::Map<String, serde_json::Value>>,
) -> Result<serde_json::Value, String> {
    let query = "mutation($parent_item_id: ID!, $item_name: String!, $column_values: JSON) { \
                 create_subitem(parent_item_id: $parent_item_id, item_name: $item_name, column_values: $column_values) { \
                 id name } }";
    let mut variables = serde_json::Map::new();
    variables.insert(
        "parent_item_id".into(),
        serde_json::Value::String(parent_item_id.to_string()),
    );
    variables.insert(
        "item_name".into(),
        serde_json::Value::String(item_name.to_string()),
    );
    if let Some(cols) = column_values {
        variables.insert("column_values".into(), column_values_string(cols)?);
    }
    graphql_call(query, serde_json::Value::Object(variables))
}

pub fn create_update(item_id: u64, body: &str) -> Result<serde_json::Value, String> {
    let query =
        "mutation($item_id: ID!, $body: String!) { create_update(item_id: $item_id, body: $body) { id } }";
    let variables = serde_json::json!({
        "item_id": item_id.to_string(),
        "body": body,
    });
    graphql_call(query, variables)
}

pub fn monday_graphql_query(
    query: &str,
    variables: Option<&serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let vars = variables.cloned().unwrap_or(serde_json::json!({}));
    graphql_call(query, vars)
}

fn column_values_string(
    column_values: &serde_json::Map<String, serde_json::Value>,
) -> Result<serde_json::Value, String> {
    serde_json::to_string(&serde_json::Value::Object(column_values.clone()))
        .map(serde_json::Value::String)
        .map_err(|e| format!("Failed to serialize column_values JSON: {}", e))
}

fn ids_to_string_array(ids: &[u64]) -> serde_json::Value {
    serde_json::Value::Array(
        ids.iter()
            .map(|id| serde_json::Value::String(id.to_string()))
            .collect(),
    )
}

fn clamp_limit(limit: u32) -> u32 {
    limit.clamp(1, LIMIT_MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_caps_at_max() {
        assert_eq!(clamp_limit(1_000), LIMIT_MAX);
    }

    #[test]
    fn clamp_zero_becomes_one() {
        assert_eq!(clamp_limit(0), 1);
    }

    #[test]
    fn clamp_in_range_passes_through() {
        assert_eq!(clamp_limit(42), 42);
    }

    #[test]
    fn ids_to_string_array_quotes_each_id() {
        let arr = ids_to_string_array(&[1, 22, 333]);
        let v = arr.as_array().unwrap();
        assert_eq!(v.len(), 3);
        assert_eq!(v[0].as_str(), Some("1"));
        assert_eq!(v[1].as_str(), Some("22"));
        assert_eq!(v[2].as_str(), Some("333"));
    }

    #[test]
    fn column_values_string_stringifies_object() {
        let mut map = serde_json::Map::new();
        map.insert(
            "status".into(),
            serde_json::json!({ "label": "Working on it" }),
        );
        let v = column_values_string(&map).unwrap();
        let s = v.as_str().unwrap();
        assert!(s.contains("\"status\""));
        assert!(s.contains("Working on it"));
    }

    #[test]
    fn column_values_string_empty_object_is_stringified() {
        let map = serde_json::Map::new();
        let v = column_values_string(&map).unwrap();
        assert_eq!(v.as_str(), Some("{}"));
    }
}
