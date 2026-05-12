//! Microsoft 365 integration tool for IronClaw.
//!
//! Wraps Microsoft Graph v1.0 across Outlook mail, Teams channel messaging,
//! Excel workbook operations, OneDrive and SharePoint file management, and
//! Outlook Calendar. OAuth 2.0 user-context authentication against Azure AD,
//! with host-managed token refresh.

mod api;
mod documents;
mod graph;
mod types;

use types::MicrosoftAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct MicrosoftTool;

impl exports::near::agent::tool::Guest for MicrosoftTool {
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
        let schema = schemars::schema_for!(types::MicrosoftAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Microsoft 365 integration via Microsoft Graph. Outlook mail (send_mail, \
         list_recent_messages, me), OneDrive and SharePoint files (list_drive, \
         upload_file), Excel workbook ranges (read_excel_range, write_excel_range), \
         Teams channel messaging (list_teams, list_channels, send_channel_message), \
         Outlook Calendar (list_calendar_events, create_calendar_event), and \
         document generation (create_word_document, create_powerpoint) with direct \
         upload to OneDrive. OAuth 2.0 user-context authentication against Azure \
         AD with host-managed token refresh.\n\
         \n\
         Parameter formats:\n\
         - Excel: `worksheet` and `range` are separate fields, not a combined \
         `Sheet1!A1:B10` string. Pass `worksheet: \"Sheet1\"` and `range: \"A1:B10\"`.\n\
         - OneDrive / SharePoint file paths use forward slashes, no leading slash. \
         Example: `Documents/report.docx`, not `/Documents/report.docx`.\n\
         - Recipients in send_mail are an array of objects: \
         `[{\"address\": \"x@example.com\", \"name\": \"X\"}]`.\n\
         - Calendar datetimes use ISO 8601 with timezone offset: \
         `2026-04-15T14:00:00-07:00`."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: MicrosoftAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!(
                "microsoft-tool parameter parse failed: {} | raw={}",
                e, params
            ),
        );
        format!(
            "Invalid parameters for microsoft tool: {}. Expected shape: {{\"action\": \"<name>\", ...fields}}. Valid action names: me, send_mail, list_recent_messages, list_drive, upload_file, read_excel_range, write_excel_range, list_teams, list_channels, send_channel_message, list_calendar_events, create_calendar_event, create_word_document, create_powerpoint. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Microsoft action dispatched: {}", action_name(&action)),
    );

    match action {
        MicrosoftAction::Me => {
            let r = api::me()?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::SendMail {
            to,
            cc,
            bcc,
            subject,
            body,
            body_is_html,
            save_to_sent_items,
        } => {
            let r = api::send_mail(
                &to,
                &cc,
                &bcc,
                &subject,
                &body,
                body_is_html,
                save_to_sent_items,
            )?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::ListRecentMessages { limit, filter } => {
            let r = api::list_recent_messages(limit, filter.as_deref())?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::ListDrive { folder_id } => {
            let r = api::list_drive(folder_id.as_deref())?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::UploadFile {
            parent_folder_id,
            name,
            content_base64,
        } => {
            let r = api::upload_file(parent_folder_id.as_deref(), &name, &content_base64)?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::ReadExcelRange {
            workbook_id,
            worksheet,
            range,
        } => {
            let r = api::read_excel_range(&workbook_id, &worksheet, &range)?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::WriteExcelRange {
            workbook_id,
            worksheet,
            range,
            values,
        } => {
            let r = api::write_excel_range(&workbook_id, &worksheet, &range, &values)?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::ListTeams => {
            let r = api::list_teams()?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::ListChannels { team_id } => {
            let r = api::list_channels(&team_id)?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::SendChannelMessage {
            team_id,
            channel_id,
            content,
            content_is_html,
        } => {
            let r = api::send_channel_message(&team_id, &channel_id, &content, content_is_html)?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::ListCalendarEvents { start, end } => {
            let r = api::list_calendar_events(start.as_deref(), end.as_deref())?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::CreateCalendarEvent {
            subject,
            start,
            end,
            attendees,
            location,
            body,
        } => {
            let r = api::create_calendar_event(
                &subject,
                &start,
                &end,
                &attendees,
                location.as_deref(),
                body.as_deref(),
            )?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::CreateWordDocument {
            parent_folder_id,
            name,
            title,
            subtitle,
            sections,
        } => {
            let r = documents::create_word_document(
                parent_folder_id.as_deref(),
                &name,
                &title,
                subtitle.as_deref(),
                &sections,
            )?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
        MicrosoftAction::CreatePowerpoint {
            parent_folder_id,
            name,
            slides,
        } => {
            let r = documents::create_powerpoint(parent_folder_id.as_deref(), &name, &slides)?;
            serde_json::to_string(&r).map_err(|e| e.to_string())
        }
    }
}

fn action_name(action: &MicrosoftAction) -> &'static str {
    match action {
        MicrosoftAction::Me => "me",
        MicrosoftAction::SendMail { .. } => "send_mail",
        MicrosoftAction::ListRecentMessages { .. } => "list_recent_messages",
        MicrosoftAction::SendChannelMessage { .. } => "send_channel_message",
        MicrosoftAction::ListTeams => "list_teams",
        MicrosoftAction::ListChannels { .. } => "list_channels",
        MicrosoftAction::ReadExcelRange { .. } => "read_excel_range",
        MicrosoftAction::WriteExcelRange { .. } => "write_excel_range",
        MicrosoftAction::ListDrive { .. } => "list_drive",
        MicrosoftAction::UploadFile { .. } => "upload_file",
        MicrosoftAction::ListCalendarEvents { .. } => "list_calendar_events",
        MicrosoftAction::CreateCalendarEvent { .. } => "create_calendar_event",
        MicrosoftAction::CreateWordDocument { .. } => "create_word_document",
        MicrosoftAction::CreatePowerpoint { .. } => "create_powerpoint",
    }
}

export!(MicrosoftTool);
