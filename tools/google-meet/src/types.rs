use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum MeetAction {
    ListConferenceRecords {
        #[serde(default)]
        filter: Option<String>,
        #[serde(default = "default_page_size")]
        page_size: u32,
        #[serde(default)]
        page_token: Option<String>,
    },
    ListParticipants {
        conference_record: String,
        #[serde(default = "default_page_size")]
        page_size: u32,
        #[serde(default)]
        page_token: Option<String>,
    },
    ListRecordings {
        conference_record: String,
        #[serde(default = "default_page_size")]
        page_size: u32,
        #[serde(default)]
        page_token: Option<String>,
    },
    GetRecording {
        recording: String,
    },
    ListTranscripts {
        conference_record: String,
        #[serde(default = "default_page_size")]
        page_size: u32,
        #[serde(default)]
        page_token: Option<String>,
    },
    GetTranscript {
        transcript: String,
    },
    ListTranscriptEntries {
        transcript: String,
        #[serde(default = "default_entry_page_size")]
        page_size: u32,
        #[serde(default)]
        page_token: Option<String>,
    },
}

fn default_page_size() -> u32 {
    25
}

fn default_entry_page_size() -> u32 {
    200
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<MeetAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_list_conference_records_uses_defaults() {
        match parse(r#"{"action":"list_conference_records"}"#).unwrap() {
            MeetAction::ListConferenceRecords {
                filter,
                page_size,
                page_token,
            } => {
                assert!(filter.is_none());
                assert_eq!(page_size, 25);
                assert!(page_token.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_conference_records_with_filter() {
        let action = parse(
            r#"{"action":"list_conference_records","filter":"start_time>=\"2026-08-01T00:00:00.000Z\"","page_size":50}"#,
        )
        .unwrap();
        match action {
            MeetAction::ListConferenceRecords {
                filter, page_size, ..
            } => {
                assert!(filter.unwrap().contains("start_time"));
                assert_eq!(page_size, 50);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_participants_requires_conference_record() {
        assert!(parse(r#"{"action":"list_participants"}"#).is_err());
        match parse(r#"{"action":"list_participants","conference_record":"conferenceRecords/abc"}"#)
            .unwrap()
        {
            MeetAction::ListParticipants {
                conference_record, ..
            } => assert_eq!(conference_record, "conferenceRecords/abc"),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_get_recording_requires_name() {
        assert!(parse(r#"{"action":"get_recording"}"#).is_err());
    }

    #[test]
    fn parse_get_transcript_requires_name() {
        assert!(parse(r#"{"action":"get_transcript"}"#).is_err());
    }

    #[test]
    fn parse_list_transcript_entries_defaults_to_large_page() {
        match parse(
            r#"{"action":"list_transcript_entries","transcript":"conferenceRecords/a/transcripts/b"}"#,
        )
        .unwrap()
        {
            MeetAction::ListTranscriptEntries {
                transcript,
                page_size,
                ..
            } => {
                assert_eq!(transcript, "conferenceRecords/a/transcripts/b");
                assert_eq!(page_size, 200);
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"create_space"}"#).is_err());
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(MeetAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        for name in [
            "list_conference_records",
            "list_participants",
            "list_recordings",
            "get_recording",
            "list_transcripts",
            "get_transcript",
            "list_transcript_entries",
        ] {
            assert!(json.contains(name), "schema missing action: {name}");
        }
    }
}
