mod api;
mod gitlab;
mod types;

use types::GitlabAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct GitlabTool;

impl exports::near::agent::tool::Guest for GitlabTool {
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
        let schema = schemars::schema_for!(types::GitlabAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "GitLab integration via the v4 REST API. Projects (list_projects, get_project, \
         create_project), issues (list_issues, get_issue, create_issue, update_issue, \
         list_issue_notes, create_issue_note), merge requests (list_merge_requests, \
         get_merge_request, create_merge_request, update_merge_request, list_mr_notes, \
         create_mr_note, approve_merge_request, merge_merge_request), branches \
         (list_branches, get_branch, create_branch, delete_branch), files \
         (get_file_content, create_or_update_file, delete_file), search (search_projects, \
         search_issues, search_blobs), pipelines (list_pipelines, get_pipeline, list_jobs), \
         and current_user. OAuth 2.0 user-context authentication against gitlab.com with \
         host-managed token refresh.\n\
         \n\
         Parameter formats:\n\
         - `project`: pass the numeric project ID as a string. Path form (e.g. \
         `group/repo`) is also valid against the GitLab API but the host sandbox \
         currently rejects URL-encoded path separators, so numeric IDs are required. \
         Resolve a path to its ID with `search_projects` first.\n\
         - Branch names are bare strings (`main`, `feature/x`), no `refs/heads/` prefix.\n\
         - File paths in `get_file_content` / `create_or_update_file` are repository \
         paths from the repo root, no leading slash."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: GitlabAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("gitlab-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for gitlab tool: {}. Expected shape: {{\"action\": \"<name>\", ...fields}}. Valid action names: current_user, list_projects, get_project, create_project, list_issues, get_issue, create_issue, update_issue, list_issue_notes, create_issue_note, list_merge_requests, get_merge_request, create_merge_request, update_merge_request, list_mr_notes, create_mr_note, approve_merge_request, merge_merge_request, list_branches, get_branch, create_branch, delete_branch, get_file_content, create_or_update_file, delete_file, search_projects, search_issues, search_blobs, list_pipelines, get_pipeline, list_jobs. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("GitLab action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        GitlabAction::CurrentUser => api::current_user()?,
        GitlabAction::ListProjects {
            per_page,
            page,
            search,
            membership,
        } => api::list_projects(per_page, page, search.as_deref(), membership)?,
        GitlabAction::GetProject { project } => api::get_project(&project)?,
        GitlabAction::CreateProject {
            name,
            path,
            description,
            visibility,
            initialize_with_readme,
        } => api::create_project(
            &name,
            path.as_deref(),
            description.as_deref(),
            &visibility,
            initialize_with_readme,
        )?,
        GitlabAction::ListIssues {
            project,
            state,
            per_page,
            page,
        } => api::list_issues(&project, &state, per_page, page)?,
        GitlabAction::GetIssue { project, iid } => api::get_issue(&project, iid)?,
        GitlabAction::CreateIssue {
            project,
            title,
            description,
            labels,
            assignee_ids,
        } => api::create_issue(
            &project,
            &title,
            description.as_deref(),
            &labels,
            &assignee_ids,
        )?,
        GitlabAction::UpdateIssue {
            project,
            iid,
            title,
            description,
            state_event,
            labels,
        } => api::update_issue(
            &project,
            iid,
            title.as_deref(),
            description.as_deref(),
            state_event.as_deref(),
            labels.as_deref(),
        )?,
        GitlabAction::ListIssueNotes {
            project,
            iid,
            per_page,
            page,
        } => api::list_issue_notes(&project, iid, per_page, page)?,
        GitlabAction::CreateIssueNote { project, iid, body } => {
            api::create_issue_note(&project, iid, &body)?
        }
        GitlabAction::ListMergeRequests {
            project,
            state,
            per_page,
            page,
        } => api::list_merge_requests(&project, &state, per_page, page)?,
        GitlabAction::GetMergeRequest { project, iid } => api::get_merge_request(&project, iid)?,
        GitlabAction::CreateMergeRequest {
            project,
            source_branch,
            target_branch,
            title,
            description,
            remove_source_branch,
            squash,
        } => api::create_merge_request(
            &project,
            &source_branch,
            &target_branch,
            &title,
            description.as_deref(),
            remove_source_branch,
            squash,
        )?,
        GitlabAction::UpdateMergeRequest {
            project,
            iid,
            title,
            description,
            state_event,
            target_branch,
        } => api::update_merge_request(
            &project,
            iid,
            title.as_deref(),
            description.as_deref(),
            state_event.as_deref(),
            target_branch.as_deref(),
        )?,
        GitlabAction::ListMrNotes {
            project,
            iid,
            per_page,
            page,
        } => api::list_mr_notes(&project, iid, per_page, page)?,
        GitlabAction::CreateMrNote { project, iid, body } => {
            api::create_mr_note(&project, iid, &body)?
        }
        GitlabAction::ApproveMergeRequest { project, iid } => {
            api::approve_merge_request(&project, iid)?
        }
        GitlabAction::MergeMergeRequest {
            project,
            iid,
            merge_commit_message,
            squash,
            should_remove_source_branch,
        } => api::merge_merge_request(
            &project,
            iid,
            merge_commit_message.as_deref(),
            squash,
            should_remove_source_branch,
        )?,
        GitlabAction::ListBranches {
            project,
            search,
            per_page,
            page,
        } => api::list_branches(&project, search.as_deref(), per_page, page)?,
        GitlabAction::GetBranch { project, branch } => api::get_branch(&project, &branch)?,
        GitlabAction::CreateBranch {
            project,
            branch,
            ref_,
        } => api::create_branch(&project, &branch, &ref_)?,
        GitlabAction::DeleteBranch { project, branch } => api::delete_branch(&project, &branch)?,
        GitlabAction::GetFileContent {
            project,
            path,
            ref_,
        } => api::get_file_content(&project, &path, &ref_)?,
        GitlabAction::CreateOrUpdateFile {
            project,
            path,
            branch,
            content,
            commit_message,
            encoding,
            author_email,
            author_name,
        } => api::create_or_update_file(
            &project,
            &path,
            &branch,
            &content,
            &commit_message,
            encoding.as_deref(),
            author_email.as_deref(),
            author_name.as_deref(),
        )?,
        GitlabAction::DeleteFile {
            project,
            path,
            branch,
            commit_message,
        } => api::delete_file(&project, &path, &branch, &commit_message)?,
        GitlabAction::SearchProjects {
            query,
            per_page,
            page,
        } => api::search_projects(&query, per_page, page)?,
        GitlabAction::SearchIssues {
            project,
            query,
            per_page,
            page,
        } => api::search_issues(&project, &query, per_page, page)?,
        GitlabAction::SearchBlobs {
            project,
            query,
            per_page,
            page,
        } => api::search_blobs(&project, &query, per_page, page)?,
        GitlabAction::ListPipelines {
            project,
            status,
            ref_,
            per_page,
            page,
        } => api::list_pipelines(&project, status.as_deref(), ref_.as_deref(), per_page, page)?,
        GitlabAction::GetPipeline {
            project,
            pipeline_id,
        } => api::get_pipeline(&project, pipeline_id)?,
        GitlabAction::ListJobs {
            project,
            pipeline_id,
            per_page,
            page,
        } => api::list_jobs(&project, pipeline_id, per_page, page)?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &GitlabAction) -> &'static str {
    match action {
        GitlabAction::CurrentUser => "current_user",
        GitlabAction::ListProjects { .. } => "list_projects",
        GitlabAction::GetProject { .. } => "get_project",
        GitlabAction::CreateProject { .. } => "create_project",
        GitlabAction::ListIssues { .. } => "list_issues",
        GitlabAction::GetIssue { .. } => "get_issue",
        GitlabAction::CreateIssue { .. } => "create_issue",
        GitlabAction::UpdateIssue { .. } => "update_issue",
        GitlabAction::ListIssueNotes { .. } => "list_issue_notes",
        GitlabAction::CreateIssueNote { .. } => "create_issue_note",
        GitlabAction::ListMergeRequests { .. } => "list_merge_requests",
        GitlabAction::GetMergeRequest { .. } => "get_merge_request",
        GitlabAction::CreateMergeRequest { .. } => "create_merge_request",
        GitlabAction::UpdateMergeRequest { .. } => "update_merge_request",
        GitlabAction::ListMrNotes { .. } => "list_mr_notes",
        GitlabAction::CreateMrNote { .. } => "create_mr_note",
        GitlabAction::ApproveMergeRequest { .. } => "approve_merge_request",
        GitlabAction::MergeMergeRequest { .. } => "merge_merge_request",
        GitlabAction::ListBranches { .. } => "list_branches",
        GitlabAction::GetBranch { .. } => "get_branch",
        GitlabAction::CreateBranch { .. } => "create_branch",
        GitlabAction::DeleteBranch { .. } => "delete_branch",
        GitlabAction::GetFileContent { .. } => "get_file_content",
        GitlabAction::CreateOrUpdateFile { .. } => "create_or_update_file",
        GitlabAction::DeleteFile { .. } => "delete_file",
        GitlabAction::SearchProjects { .. } => "search_projects",
        GitlabAction::SearchIssues { .. } => "search_issues",
        GitlabAction::SearchBlobs { .. } => "search_blobs",
        GitlabAction::ListPipelines { .. } => "list_pipelines",
        GitlabAction::GetPipeline { .. } => "get_pipeline",
        GitlabAction::ListJobs { .. } => "list_jobs",
    }
}

export!(GitlabTool);
