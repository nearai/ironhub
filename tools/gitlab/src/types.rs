use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum GitlabAction {
    CurrentUser,

    ListProjects {
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
        #[serde(default)]
        search: Option<String>,
        #[serde(default = "default_membership")]
        membership: bool,
    },
    GetProject {
        project: String,
    },
    CreateProject {
        name: String,
        #[serde(default)]
        path: Option<String>,
        #[serde(default)]
        description: Option<String>,
        #[serde(default = "default_visibility")]
        visibility: String,
        #[serde(default = "default_true")]
        initialize_with_readme: bool,
    },

    ListIssues {
        project: String,
        #[serde(default = "default_issue_state")]
        state: String,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    GetIssue {
        project: String,
        iid: u64,
    },
    CreateIssue {
        project: String,
        title: String,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        labels: Vec<String>,
        #[serde(default)]
        assignee_ids: Vec<u64>,
    },
    UpdateIssue {
        project: String,
        iid: u64,
        #[serde(default)]
        title: Option<String>,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        state_event: Option<String>,
        #[serde(default)]
        labels: Option<Vec<String>>,
    },
    ListIssueNotes {
        project: String,
        iid: u64,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    CreateIssueNote {
        project: String,
        iid: u64,
        body: String,
    },

    ListMergeRequests {
        project: String,
        #[serde(default = "default_mr_state")]
        state: String,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    GetMergeRequest {
        project: String,
        iid: u64,
    },
    CreateMergeRequest {
        project: String,
        source_branch: String,
        target_branch: String,
        title: String,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        remove_source_branch: bool,
        #[serde(default)]
        squash: bool,
    },
    UpdateMergeRequest {
        project: String,
        iid: u64,
        #[serde(default)]
        title: Option<String>,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        state_event: Option<String>,
        #[serde(default)]
        target_branch: Option<String>,
    },
    ListMrNotes {
        project: String,
        iid: u64,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    CreateMrNote {
        project: String,
        iid: u64,
        body: String,
    },
    ApproveMergeRequest {
        project: String,
        iid: u64,
    },
    MergeMergeRequest {
        project: String,
        iid: u64,
        #[serde(default)]
        merge_commit_message: Option<String>,
        #[serde(default)]
        squash: bool,
        #[serde(default)]
        should_remove_source_branch: bool,
    },

    ListBranches {
        project: String,
        #[serde(default)]
        search: Option<String>,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    GetBranch {
        project: String,
        branch: String,
    },
    CreateBranch {
        project: String,
        branch: String,
        #[serde(rename = "ref")]
        ref_: String,
    },
    DeleteBranch {
        project: String,
        branch: String,
    },

    GetFileContent {
        project: String,
        path: String,
        #[serde(rename = "ref")]
        ref_: String,
    },
    CreateOrUpdateFile {
        project: String,
        path: String,
        branch: String,
        content: String,
        commit_message: String,
        #[serde(default)]
        encoding: Option<String>,
        #[serde(default)]
        author_email: Option<String>,
        #[serde(default)]
        author_name: Option<String>,
    },
    DeleteFile {
        project: String,
        path: String,
        branch: String,
        commit_message: String,
    },

    SearchProjects {
        query: String,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    SearchIssues {
        project: String,
        query: String,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    SearchBlobs {
        project: String,
        query: String,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },

    ListPipelines {
        project: String,
        #[serde(default)]
        status: Option<String>,
        #[serde(rename = "ref", default)]
        ref_: Option<String>,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
    GetPipeline {
        project: String,
        pipeline_id: u64,
    },
    ListJobs {
        project: String,
        pipeline_id: u64,
        #[serde(default = "default_per_page")]
        per_page: u32,
        #[serde(default = "default_page")]
        page: u32,
    },
}

fn default_per_page() -> u32 {
    20
}
fn default_page() -> u32 {
    1
}
fn default_membership() -> bool {
    true
}
fn default_visibility() -> String {
    "private".to_string()
}
fn default_issue_state() -> String {
    "opened".to_string()
}
fn default_mr_state() -> String {
    "opened".to_string()
}
fn default_true() -> bool {
    true
}
