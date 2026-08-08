mod api;
mod meet;
mod types;

use types::MeetAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct GoogleMeetTool;

impl exports::near::agent::tool::Guest for GoogleMeetTool {
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
        let schema = schemars::schema_for!(types::MeetAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Google Meet read access to past meetings via the Meet REST API v2. Actions: \
         list_conference_records (past conferences, newest first, filterable by start_time, \
         end_time, space.meeting_code, or space.name), list_participants (who attended a \
         conference), list_recordings and get_recording (recording metadata), list_transcripts \
         and get_transcript (transcript metadata), list_transcript_entries (the actual spoken \
         text, entry by entry with speaker attribution). Start from list_conference_records to \
         get a conference record name, then pass that name to the other actions. The spoken \
         words live in list_transcript_entries, not in get_transcript. Read-only: this tool \
         creates no meeting spaces, changes no settings, and ends no conferences."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: MeetAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!(
                "google-meet-tool parameter parse failed: {} | raw={}",
                e, params
            ),
        );
        format!(
            "Invalid parameters for google-meet tool: {}. Expected shape: {{\"action\": \
             \"<name>\", ...fields}}. Valid action names: list_conference_records, \
             list_participants, list_recordings, get_recording, list_transcripts, \
             get_transcript, list_transcript_entries. Resource names are passed exactly as the \
             API returns them, for example conferenceRecords/abc/transcripts/xyz. Call \
             tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("Google Meet action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        MeetAction::ListConferenceRecords {
            filter,
            page_size,
            page_token,
        } => api::list_conference_records(filter.as_deref(), page_size, page_token.as_deref())?,
        MeetAction::ListParticipants {
            conference_record,
            page_size,
            page_token,
        } => api::list_participants(&conference_record, page_size, page_token.as_deref())?,
        MeetAction::ListRecordings {
            conference_record,
            page_size,
            page_token,
        } => api::list_recordings(&conference_record, page_size, page_token.as_deref())?,
        MeetAction::GetRecording { recording } => api::get_recording(&recording)?,
        MeetAction::ListTranscripts {
            conference_record,
            page_size,
            page_token,
        } => api::list_transcripts(&conference_record, page_size, page_token.as_deref())?,
        MeetAction::GetTranscript { transcript } => api::get_transcript(&transcript)?,
        MeetAction::ListTranscriptEntries {
            transcript,
            page_size,
            page_token,
        } => api::list_transcript_entries(&transcript, page_size, page_token.as_deref())?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &MeetAction) -> &'static str {
    match action {
        MeetAction::ListConferenceRecords { .. } => "list_conference_records",
        MeetAction::ListParticipants { .. } => "list_participants",
        MeetAction::ListRecordings { .. } => "list_recordings",
        MeetAction::GetRecording { .. } => "get_recording",
        MeetAction::ListTranscripts { .. } => "list_transcripts",
        MeetAction::GetTranscript { .. } => "get_transcript",
        MeetAction::ListTranscriptEntries { .. } => "list_transcript_entries",
    }
}

export!(GoogleMeetTool);
