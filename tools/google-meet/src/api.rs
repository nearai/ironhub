use serde_json::Value;

use crate::meet::{
    append_paging, append_query, conference_record_name, get, recording_name, transcript_name,
};

pub fn list_conference_records(
    filter: Option<&str>,
    page_size: u32,
    page_token: Option<&str>,
) -> Result<Value, String> {
    let mut endpoint = String::from("/conferenceRecords");
    append_paging(&mut endpoint, page_size, page_token);
    if let Some(filter) = filter {
        append_query(&mut endpoint, "filter", filter);
    }
    get(&endpoint)
}

pub fn list_participants(
    conference_record: &str,
    page_size: u32,
    page_token: Option<&str>,
) -> Result<Value, String> {
    let parent = conference_record_name(conference_record)?;
    let mut endpoint = format!("/{}/participants", parent);
    append_paging(&mut endpoint, page_size, page_token);
    get(&endpoint)
}

pub fn list_recordings(
    conference_record: &str,
    page_size: u32,
    page_token: Option<&str>,
) -> Result<Value, String> {
    let parent = conference_record_name(conference_record)?;
    let mut endpoint = format!("/{}/recordings", parent);
    append_paging(&mut endpoint, page_size, page_token);
    get(&endpoint)
}

pub fn get_recording(recording: &str) -> Result<Value, String> {
    let name = recording_name(recording)?;
    get(&format!("/{}", name))
}

pub fn list_transcripts(
    conference_record: &str,
    page_size: u32,
    page_token: Option<&str>,
) -> Result<Value, String> {
    let parent = conference_record_name(conference_record)?;
    let mut endpoint = format!("/{}/transcripts", parent);
    append_paging(&mut endpoint, page_size, page_token);
    get(&endpoint)
}

pub fn get_transcript(transcript: &str) -> Result<Value, String> {
    let name = transcript_name(transcript)?;
    get(&format!("/{}", name))
}

pub fn list_transcript_entries(
    transcript: &str,
    page_size: u32,
    page_token: Option<&str>,
) -> Result<Value, String> {
    let parent = transcript_name(transcript)?;
    let mut endpoint = format!("/{}/entries", parent);
    append_paging(&mut endpoint, page_size, page_token);
    get(&endpoint)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_recording_rejects_a_transcript_name() {
        assert!(get_recording("conferenceRecords/a/transcripts/b").is_err());
    }

    #[test]
    fn get_transcript_rejects_a_bare_id() {
        assert!(get_transcript("b").is_err());
    }

    #[test]
    fn list_participants_rejects_an_unsafe_record_id() {
        assert!(list_participants("../spaces/x", 25, None).is_err());
    }

    #[test]
    fn list_transcript_entries_rejects_a_conference_record_name() {
        assert!(list_transcript_entries("conferenceRecords/a", 200, None).is_err());
    }
}
