use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum MondayAction {
    Me,
    ListBoards {
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        workspace_ids: Option<Vec<u64>>,
        #[serde(default)]
        state: Option<BoardState>,
        #[serde(default)]
        board_kind: Option<BoardKind>,
    },
    GetBoard {
        board_id: u64,
    },
    ListGroups {
        board_id: u64,
    },
    ItemsByBoard {
        board_ids: Vec<u64>,
        #[serde(default = "default_item_limit")]
        limit: u32,
        #[serde(default)]
        cursor: Option<String>,
    },
    GetItem {
        item_id: u64,
    },
    SearchItemsByColumn {
        board_id: u64,
        column_id: String,
        column_values: Vec<String>,
        #[serde(default = "default_item_limit")]
        limit: u32,
    },
    ListUpdates {
        item_id: u64,
        #[serde(default = "default_list_limit")]
        limit: u32,
    },
    ListUsers {
        #[serde(default = "default_user_limit")]
        limit: u32,
        #[serde(default)]
        kind: Option<UserKind>,
    },
    ListWorkspaces {
        #[serde(default = "default_list_limit")]
        limit: u32,
        #[serde(default)]
        kind: Option<WorkspaceKind>,
    },
    CreateItem {
        board_id: u64,
        item_name: String,
        #[serde(default)]
        group_id: Option<String>,
        #[serde(default)]
        column_values: Option<serde_json::Map<String, serde_json::Value>>,
    },
    UpdateItemColumnValues {
        board_id: u64,
        item_id: u64,
        column_values: serde_json::Map<String, serde_json::Value>,
    },
    ArchiveItem {
        item_id: u64,
    },
    DeleteItem {
        item_id: u64,
    },
    MoveItemToGroup {
        item_id: u64,
        group_id: String,
    },
    CreateGroup {
        board_id: u64,
        group_name: String,
    },
    CreateSubitem {
        parent_item_id: u64,
        item_name: String,
        #[serde(default)]
        column_values: Option<serde_json::Map<String, serde_json::Value>>,
    },
    CreateUpdate {
        item_id: u64,
        body: String,
    },
    MondayGraphqlQuery {
        query: String,
        #[serde(default)]
        variables: Option<serde_json::Value>,
    },
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BoardState {
    All,
    Active,
    Archived,
    Deleted,
}

impl BoardState {
    pub fn as_wire(self) -> &'static str {
        match self {
            BoardState::All => "all",
            BoardState::Active => "active",
            BoardState::Archived => "archived",
            BoardState::Deleted => "deleted",
        }
    }
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BoardKind {
    Public,
    Private,
    Share,
}

impl BoardKind {
    pub fn as_wire(self) -> &'static str {
        match self {
            BoardKind::Public => "public",
            BoardKind::Private => "private",
            BoardKind::Share => "share",
        }
    }
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UserKind {
    All,
    NonGuests,
    Guests,
    NonPending,
}

impl UserKind {
    pub fn as_wire(self) -> &'static str {
        match self {
            UserKind::All => "all",
            UserKind::NonGuests => "non_guests",
            UserKind::Guests => "guests",
            UserKind::NonPending => "non_pending",
        }
    }
}

#[derive(Debug, Deserialize, JsonSchema, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkspaceKind {
    Open,
    Closed,
}

impl WorkspaceKind {
    pub fn as_wire(self) -> &'static str {
        match self {
            WorkspaceKind::Open => "open",
            WorkspaceKind::Closed => "closed",
        }
    }
}

fn default_list_limit() -> u32 {
    25
}

fn default_user_limit() -> u32 {
    25
}

fn default_item_limit() -> u32 {
    25
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<MondayAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_me_no_fields() {
        let action = parse(r#"{"action":"me"}"#).unwrap();
        assert!(matches!(action, MondayAction::Me));
    }

    #[test]
    fn parse_list_boards_uses_defaults() {
        let action = parse(r#"{"action":"list_boards"}"#).unwrap();
        match action {
            MondayAction::ListBoards {
                limit,
                page,
                workspace_ids,
                state,
                board_kind,
            } => {
                assert_eq!(limit, 25);
                assert!(page.is_none());
                assert!(workspace_ids.is_none());
                assert!(state.is_none());
                assert!(board_kind.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_boards_with_filters() {
        let action = parse(
            r#"{"action":"list_boards","limit":50,"page":2,"workspace_ids":[101,102],"state":"active","board_kind":"public"}"#,
        )
        .unwrap();
        match action {
            MondayAction::ListBoards {
                limit,
                page,
                workspace_ids,
                state,
                board_kind,
            } => {
                assert_eq!(limit, 50);
                assert_eq!(page, Some(2));
                assert_eq!(workspace_ids, Some(vec![101, 102]));
                assert_eq!(state, Some(BoardState::Active));
                assert_eq!(board_kind, Some(BoardKind::Public));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_board() {
        let action = parse(r#"{"action":"get_board","board_id":12345}"#).unwrap();
        match action {
            MondayAction::GetBoard { board_id } => assert_eq!(board_id, 12345),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_groups() {
        let action = parse(r#"{"action":"list_groups","board_id":99}"#).unwrap();
        match action {
            MondayAction::ListGroups { board_id } => assert_eq!(board_id, 99),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_items_by_board_initial() {
        let action =
            parse(r#"{"action":"items_by_board","board_ids":[123,456],"limit":10}"#).unwrap();
        match action {
            MondayAction::ItemsByBoard {
                board_ids,
                limit,
                cursor,
            } => {
                assert_eq!(board_ids, vec![123, 456]);
                assert_eq!(limit, 10);
                assert!(cursor.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_items_by_board_with_cursor() {
        let action =
            parse(r#"{"action":"items_by_board","board_ids":[123],"limit":25,"cursor":"abc123"}"#)
                .unwrap();
        match action {
            MondayAction::ItemsByBoard { cursor, .. } => {
                assert_eq!(cursor.as_deref(), Some("abc123"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_item() {
        let action = parse(r#"{"action":"get_item","item_id":777}"#).unwrap();
        match action {
            MondayAction::GetItem { item_id } => assert_eq!(item_id, 777),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_search_items_by_column() {
        let action = parse(
            r#"{"action":"search_items_by_column","board_id":42,"column_id":"status","column_values":["Done","Working on it"]}"#,
        )
        .unwrap();
        match action {
            MondayAction::SearchItemsByColumn {
                board_id,
                column_id,
                column_values,
                limit,
            } => {
                assert_eq!(board_id, 42);
                assert_eq!(column_id, "status");
                assert_eq!(column_values, vec!["Done", "Working on it"]);
                assert_eq!(limit, 25);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_updates() {
        let action = parse(r#"{"action":"list_updates","item_id":888,"limit":50}"#).unwrap();
        match action {
            MondayAction::ListUpdates { item_id, limit } => {
                assert_eq!(item_id, 888);
                assert_eq!(limit, 50);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_users_with_kind() {
        let action = parse(r#"{"action":"list_users","kind":"non_guests"}"#).unwrap();
        match action {
            MondayAction::ListUsers { limit, kind } => {
                assert_eq!(limit, 25);
                assert_eq!(kind, Some(UserKind::NonGuests));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_workspaces_with_kind() {
        let action = parse(r#"{"action":"list_workspaces","limit":10,"kind":"closed"}"#).unwrap();
        match action {
            MondayAction::ListWorkspaces { limit, kind } => {
                assert_eq!(limit, 10);
                assert_eq!(kind, Some(WorkspaceKind::Closed));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_item_with_column_values() {
        let raw = r#"{
            "action": "create_item",
            "board_id": 42,
            "item_name": "Audit task",
            "group_id": "topics",
            "column_values": {"status":{"label":"Working on it"},"date4":{"date":"2026-05-22"}}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            MondayAction::CreateItem {
                board_id,
                item_name,
                group_id,
                column_values,
            } => {
                assert_eq!(board_id, 42);
                assert_eq!(item_name, "Audit task");
                assert_eq!(group_id.as_deref(), Some("topics"));
                let cols = column_values.unwrap();
                assert!(cols.get("status").is_some());
                assert!(cols.get("date4").is_some());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_item_minimal() {
        let action =
            parse(r#"{"action":"create_item","board_id":1,"item_name":"Quick task"}"#).unwrap();
        match action {
            MondayAction::CreateItem {
                board_id,
                item_name,
                group_id,
                column_values,
            } => {
                assert_eq!(board_id, 1);
                assert_eq!(item_name, "Quick task");
                assert!(group_id.is_none());
                assert!(column_values.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_update_item_column_values() {
        let raw = r#"{
            "action": "update_item_column_values",
            "board_id": 42,
            "item_id": 7,
            "column_values": {"status":{"label":"Done"}}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            MondayAction::UpdateItemColumnValues {
                board_id,
                item_id,
                column_values,
            } => {
                assert_eq!(board_id, 42);
                assert_eq!(item_id, 7);
                assert!(column_values.get("status").is_some());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_archive_item() {
        let action = parse(r#"{"action":"archive_item","item_id":555}"#).unwrap();
        match action {
            MondayAction::ArchiveItem { item_id } => assert_eq!(item_id, 555),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_delete_item() {
        let action = parse(r#"{"action":"delete_item","item_id":666}"#).unwrap();
        match action {
            MondayAction::DeleteItem { item_id } => assert_eq!(item_id, 666),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_move_item_to_group() {
        let action =
            parse(r#"{"action":"move_item_to_group","item_id":7,"group_id":"done"}"#).unwrap();
        match action {
            MondayAction::MoveItemToGroup { item_id, group_id } => {
                assert_eq!(item_id, 7);
                assert_eq!(group_id, "done");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_group() {
        let action =
            parse(r#"{"action":"create_group","board_id":42,"group_name":"Backlog"}"#).unwrap();
        match action {
            MondayAction::CreateGroup {
                board_id,
                group_name,
            } => {
                assert_eq!(board_id, 42);
                assert_eq!(group_name, "Backlog");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_subitem() {
        let action = parse(
            r#"{"action":"create_subitem","parent_item_id":7,"item_name":"Sub","column_values":{"text":"hi"}}"#,
        )
        .unwrap();
        match action {
            MondayAction::CreateSubitem {
                parent_item_id,
                item_name,
                column_values,
            } => {
                assert_eq!(parent_item_id, 7);
                assert_eq!(item_name, "Sub");
                assert!(column_values.unwrap().get("text").is_some());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_update() {
        let action =
            parse(r#"{"action":"create_update","item_id":42,"body":"Status check"}"#).unwrap();
        match action {
            MondayAction::CreateUpdate { item_id, body } => {
                assert_eq!(item_id, 42);
                assert_eq!(body, "Status check");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_monday_graphql_query() {
        let raw = r#"{
            "action": "monday_graphql_query",
            "query": "query { me { id } }",
            "variables": {}
        }"#;
        let action = parse(raw).unwrap();
        match action {
            MondayAction::MondayGraphqlQuery { query, variables } => {
                assert!(query.contains("me"));
                assert!(variables.is_some());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_create_update_missing_body_fails() {
        assert!(parse(r#"{"action":"create_update","item_id":42}"#).is_err());
    }

    #[test]
    fn parse_items_by_board_missing_board_ids_fails() {
        assert!(parse(r#"{"action":"items_by_board"}"#).is_err());
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"delete_board"}"#).is_err());
    }

    #[test]
    fn parse_unknown_user_kind_fails() {
        assert!(parse(r#"{"action":"list_users","kind":"robots"}"#).is_err());
    }

    #[test]
    fn board_state_wire_values() {
        assert_eq!(BoardState::Active.as_wire(), "active");
        assert_eq!(BoardState::Archived.as_wire(), "archived");
    }

    #[test]
    fn user_kind_wire_values() {
        assert_eq!(UserKind::NonGuests.as_wire(), "non_guests");
        assert_eq!(UserKind::All.as_wire(), "all");
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(MondayAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for variant in [
            "me",
            "list_boards",
            "get_board",
            "list_groups",
            "items_by_board",
            "get_item",
            "search_items_by_column",
            "list_updates",
            "list_users",
            "list_workspaces",
            "create_item",
            "update_item_column_values",
            "archive_item",
            "delete_item",
            "move_item_to_group",
            "create_group",
            "create_subitem",
            "create_update",
            "monday_graphql_query",
        ] {
            assert!(json.contains(variant), "schema missing variant {}", variant);
        }
    }
}
