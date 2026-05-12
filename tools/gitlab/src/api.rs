use crate::gitlab::{self, project_path, url_encode};
use base64::Engine as _;

pub fn current_user() -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let (_status, value) = gitlab::request("GET", "/user", None)?;
    Ok(value)
}

pub fn list_projects(
    per_page: u32,
    page: u32,
    search: Option<&str>,
    membership: bool,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let mut endpoint = format!(
        "/projects?per_page={}&page={}&membership={}",
        per_page.min(100),
        page.max(1),
        membership
    );
    if let Some(q) = search {
        endpoint.push_str(&format!("&search={}", url_encode(q)));
    }
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn get_project(project: &str) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!("/projects/{}", project_path(project));
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn create_project(
    name: &str,
    path: Option<&str>,
    description: Option<&str>,
    visibility: &str,
    initialize_with_readme: bool,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let mut payload = serde_json::json!({
        "name": name,
        "visibility": visibility,
        "initialize_with_readme": initialize_with_readme,
    });
    if let Some(p) = path {
        payload["path"] = serde_json::Value::String(p.to_string());
    }
    if let Some(d) = description {
        payload["description"] = serde_json::Value::String(d.to_string());
    }
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let (_status, value) = gitlab::request("POST", "/projects", Some(&body))?;
    Ok(value)
}

pub fn list_issues(
    project: &str,
    state: &str,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/issues?state={}&per_page={}&page={}",
        project_path(project),
        url_encode(state),
        per_page.min(100),
        page.max(1)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn get_issue(project: &str, iid: u64) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!("/projects/{}/issues/{}", project_path(project), iid);
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn create_issue(
    project: &str,
    title: &str,
    description: Option<&str>,
    labels: &[String],
    assignee_ids: &[u64],
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    if title.trim().is_empty() {
        return Err("create_issue requires a non-empty title".to_string());
    }
    let mut payload = serde_json::json!({ "title": title });
    if let Some(d) = description {
        payload["description"] = serde_json::Value::String(d.to_string());
    }
    if !labels.is_empty() {
        payload["labels"] = serde_json::Value::String(labels.join(","));
    }
    if !assignee_ids.is_empty() {
        payload["assignee_ids"] =
            serde_json::Value::Array(assignee_ids.iter().map(|i| (*i).into()).collect());
    }
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let endpoint = format!("/projects/{}/issues", project_path(project));
    let (_status, value) = gitlab::request("POST", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn update_issue(
    project: &str,
    iid: u64,
    title: Option<&str>,
    description: Option<&str>,
    state_event: Option<&str>,
    labels: Option<&[String]>,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let mut payload = serde_json::Map::new();
    if let Some(t) = title {
        payload.insert("title".into(), serde_json::Value::String(t.to_string()));
    }
    if let Some(d) = description {
        payload.insert(
            "description".into(),
            serde_json::Value::String(d.to_string()),
        );
    }
    if let Some(s) = state_event {
        payload.insert(
            "state_event".into(),
            serde_json::Value::String(s.to_string()),
        );
    }
    if let Some(l) = labels {
        payload.insert("labels".into(), serde_json::Value::String(l.join(",")));
    }
    if payload.is_empty() {
        return Err(
            "update_issue requires at least one of title, description, state_event, labels"
                .to_string(),
        );
    }
    let body =
        serde_json::to_string(&serde_json::Value::Object(payload)).map_err(|e| e.to_string())?;
    let endpoint = format!("/projects/{}/issues/{}", project_path(project), iid);
    let (_status, value) = gitlab::request("PUT", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn list_issue_notes(
    project: &str,
    iid: u64,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/issues/{}/notes?per_page={}&page={}",
        project_path(project),
        iid,
        per_page.min(100),
        page.max(1)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn create_issue_note(
    project: &str,
    iid: u64,
    note_body: &str,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    if note_body.trim().is_empty() {
        return Err("create_issue_note requires a non-empty body".to_string());
    }
    let payload = serde_json::json!({ "body": note_body });
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let endpoint = format!("/projects/{}/issues/{}/notes", project_path(project), iid);
    let (_status, value) = gitlab::request("POST", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn list_merge_requests(
    project: &str,
    state: &str,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/merge_requests?state={}&per_page={}&page={}",
        project_path(project),
        url_encode(state),
        per_page.min(100),
        page.max(1)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn get_merge_request(project: &str, iid: u64) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!("/projects/{}/merge_requests/{}", project_path(project), iid);
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn create_merge_request(
    project: &str,
    source_branch: &str,
    target_branch: &str,
    title: &str,
    description: Option<&str>,
    remove_source_branch: bool,
    squash: bool,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    if title.trim().is_empty() {
        return Err("create_merge_request requires a non-empty title".to_string());
    }
    let mut payload = serde_json::json!({
        "source_branch": source_branch,
        "target_branch": target_branch,
        "title": title,
        "remove_source_branch": remove_source_branch,
        "squash": squash,
    });
    if let Some(d) = description {
        payload["description"] = serde_json::Value::String(d.to_string());
    }
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let endpoint = format!("/projects/{}/merge_requests", project_path(project));
    let (_status, value) = gitlab::request("POST", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn update_merge_request(
    project: &str,
    iid: u64,
    title: Option<&str>,
    description: Option<&str>,
    state_event: Option<&str>,
    target_branch: Option<&str>,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let mut payload = serde_json::Map::new();
    if let Some(t) = title {
        payload.insert("title".into(), serde_json::Value::String(t.to_string()));
    }
    if let Some(d) = description {
        payload.insert(
            "description".into(),
            serde_json::Value::String(d.to_string()),
        );
    }
    if let Some(s) = state_event {
        payload.insert(
            "state_event".into(),
            serde_json::Value::String(s.to_string()),
        );
    }
    if let Some(b) = target_branch {
        payload.insert(
            "target_branch".into(),
            serde_json::Value::String(b.to_string()),
        );
    }
    if payload.is_empty() {
        return Err(
            "update_merge_request requires at least one of title, description, state_event, target_branch"
                .to_string(),
        );
    }
    let body =
        serde_json::to_string(&serde_json::Value::Object(payload)).map_err(|e| e.to_string())?;
    let endpoint = format!("/projects/{}/merge_requests/{}", project_path(project), iid);
    let (_status, value) = gitlab::request("PUT", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn list_mr_notes(
    project: &str,
    iid: u64,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/merge_requests/{}/notes?per_page={}&page={}",
        project_path(project),
        iid,
        per_page.min(100),
        page.max(1)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn create_mr_note(
    project: &str,
    iid: u64,
    note_body: &str,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    if note_body.trim().is_empty() {
        return Err("create_mr_note requires a non-empty body".to_string());
    }
    let payload = serde_json::json!({ "body": note_body });
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let endpoint = format!(
        "/projects/{}/merge_requests/{}/notes",
        project_path(project),
        iid
    );
    let (_status, value) = gitlab::request("POST", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn approve_merge_request(project: &str, iid: u64) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/merge_requests/{}/approve",
        project_path(project),
        iid
    );
    let (_status, value) = gitlab::request("POST", &endpoint, Some("{}"))?;
    Ok(value)
}

pub fn merge_merge_request(
    project: &str,
    iid: u64,
    merge_commit_message: Option<&str>,
    squash: bool,
    should_remove_source_branch: bool,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let mut payload = serde_json::json!({
        "squash": squash,
        "should_remove_source_branch": should_remove_source_branch,
    });
    if let Some(m) = merge_commit_message {
        payload["merge_commit_message"] = serde_json::Value::String(m.to_string());
    }
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let endpoint = format!(
        "/projects/{}/merge_requests/{}/merge",
        project_path(project),
        iid
    );
    let (_status, value) = gitlab::request("PUT", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn list_branches(
    project: &str,
    search: Option<&str>,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let mut endpoint = format!(
        "/projects/{}/repository/branches?per_page={}&page={}",
        project_path(project),
        per_page.min(100),
        page.max(1)
    );
    if let Some(s) = search {
        endpoint.push_str(&format!("&search={}", url_encode(s)));
    }
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn get_branch(project: &str, branch: &str) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/repository/branches/{}",
        project_path(project),
        url_encode(branch)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn create_branch(project: &str, branch: &str, ref_: &str) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/repository/branches?branch={}&ref={}",
        project_path(project),
        url_encode(branch),
        url_encode(ref_)
    );
    let (_status, value) = gitlab::request("POST", &endpoint, Some("{}"))?;
    Ok(value)
}

pub fn delete_branch(project: &str, branch: &str) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/repository/branches/{}",
        project_path(project),
        url_encode(branch)
    );
    let (_status, _value) = gitlab::request("DELETE", &endpoint, None)?;
    Ok(serde_json::json!({ "deleted": branch }))
}

pub fn get_file_content(
    project: &str,
    path: &str,
    ref_: &str,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/repository/files/{}/raw?ref={}",
        project_path(project),
        url_encode(path),
        url_encode(ref_)
    );
    let (_status, bytes) = gitlab::request_raw("GET", &endpoint)?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(serde_json::json!({
        "path": path,
        "ref": ref_,
        "size_bytes": bytes.len(),
        "content_base64": encoded,
    }))
}

pub fn create_or_update_file(
    project: &str,
    path: &str,
    branch: &str,
    content: &str,
    commit_message: &str,
    encoding: Option<&str>,
    author_email: Option<&str>,
    author_name: Option<&str>,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let file_endpoint = format!(
        "/projects/{}/repository/files/{}",
        project_path(project),
        url_encode(path)
    );
    let lookup = format!("{}?ref={}", file_endpoint, url_encode(branch));

    let exists = match gitlab::request("GET", &lookup, None) {
        Ok(_) => true,
        Err(e) if e.starts_with("GitLab API returned 404") => false,
        Err(e) => return Err(e),
    };

    let mut payload = serde_json::json!({
        "branch": branch,
        "content": content,
        "commit_message": commit_message,
    });
    if let Some(e) = encoding {
        payload["encoding"] = serde_json::Value::String(e.to_string());
    }
    if let Some(e) = author_email {
        payload["author_email"] = serde_json::Value::String(e.to_string());
    }
    if let Some(n) = author_name {
        payload["author_name"] = serde_json::Value::String(n.to_string());
    }
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;

    let method = if exists { "PUT" } else { "POST" };
    let (_status, value) = gitlab::request(method, &file_endpoint, Some(&body))?;
    Ok(value)
}

pub fn delete_file(
    project: &str,
    path: &str,
    branch: &str,
    commit_message: &str,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/repository/files/{}?branch={}&commit_message={}",
        project_path(project),
        url_encode(path),
        url_encode(branch),
        url_encode(commit_message)
    );
    let (_status, _value) = gitlab::request("DELETE", &endpoint, None)?;
    Ok(serde_json::json!({ "deleted": path, "branch": branch }))
}

pub fn search_projects(query: &str, per_page: u32, page: u32) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/search?scope=projects&search={}&per_page={}&page={}",
        url_encode(query),
        per_page.min(100),
        page.max(1)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn search_issues(
    project: &str,
    query: &str,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/search?scope=issues&search={}&per_page={}&page={}",
        project_path(project),
        url_encode(query),
        per_page.min(100),
        page.max(1)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn search_blobs(
    project: &str,
    query: &str,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/search?scope=blobs&search={}&per_page={}&page={}",
        project_path(project),
        url_encode(query),
        per_page.min(100),
        page.max(1)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn list_pipelines(
    project: &str,
    status: Option<&str>,
    ref_: Option<&str>,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let mut endpoint = format!(
        "/projects/{}/pipelines?per_page={}&page={}",
        project_path(project),
        per_page.min(100),
        page.max(1)
    );
    if let Some(s) = status {
        endpoint.push_str(&format!("&status={}", url_encode(s)));
    }
    if let Some(r) = ref_ {
        endpoint.push_str(&format!("&ref={}", url_encode(r)));
    }
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn get_pipeline(project: &str, pipeline_id: u64) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/pipelines/{}",
        project_path(project),
        pipeline_id
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn list_jobs(
    project: &str,
    pipeline_id: u64,
    per_page: u32,
    page: u32,
) -> Result<serde_json::Value, String> {
    gitlab::require_token()?;
    let endpoint = format!(
        "/projects/{}/pipelines/{}/jobs?per_page={}&page={}",
        project_path(project),
        pipeline_id,
        per_page.min(100),
        page.max(1)
    );
    let (_status, value) = gitlab::request("GET", &endpoint, None)?;
    Ok(value)
}
