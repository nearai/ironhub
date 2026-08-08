# Google Meet

Read access to past Google Meet conferences via the
[Meet REST API v2](https://developers.google.com/workspace/meet/api/reference/rest/v2).
Lists conferences, who attended, and the recordings and transcripts they produced, including the
spoken text with speaker attribution.

The tool is read-only. It creates no meeting spaces, changes no settings, and ends no
conferences.

## Actions

| Action | Method + path | Purpose |
|---|---|---|
| `list_conference_records` | `GET /v2/conferenceRecords` | Past conferences, newest first |
| `list_participants` | `GET /v2/{parent}/participants` | Who attended a conference |
| `list_recordings` | `GET /v2/{parent}/recordings` | Recording metadata for a conference |
| `get_recording` | `GET /v2/{name}` | One recording by resource name |
| `list_transcripts` | `GET /v2/{parent}/transcripts` | Transcript metadata for a conference |
| `get_transcript` | `GET /v2/{name}` | One transcript by resource name |
| `list_transcript_entries` | `GET /v2/{parent}/entries` | **The actual spoken text** |

## Start from the conference record

Everything hangs off a conference record. Call `list_conference_records` first, take the `name`
from a result, and pass it to the other actions. Resource names are used exactly as the API
returns them:

```json
{ "action": "list_transcripts", "conference_record": "conferenceRecords/abc123" }
```

```json
{ "action": "list_transcript_entries",
  "transcript": "conferenceRecords/abc123/transcripts/xyz789" }
```

`conference_record` also accepts a bare id for convenience. The nested names must be complete,
so a wrong-collection name is rejected rather than silently rewritten.

## The text is in the entries, not the transcript

This is the one thing worth knowing before using the tool. `get_transcript` returns **metadata**:
processing state and a `docsDestination` pointing at a Google Doc. The words themselves come from
`list_transcript_entries`, one entry per utterance with speaker attribution, which is also what
makes them useful for extracting decisions and actions.

Recordings behave the same way. A recording resource is a **Drive pointer** carrying a
`driveDestination.exportUri`; the MP4 lives in the organiser's Drive and is not downloadable
through this API.

## Filtering conferences

`list_conference_records` accepts Google's EBNF filter over `start_time`, `end_time`,
`space.meeting_code` and `space.name`:

```json
{
  "action": "list_conference_records",
  "filter": "start_time>=\"2026-08-01T00:00:00.000Z\" AND start_time<=\"2026-08-08T00:00:00.000Z\""
}
```

`end_time IS NULL` selects conferences still in progress. Results are ordered by start time
descending, so an unfiltered first page is a reasonable "what happened recently" query.

## Auth

Google OAuth with a single read-only scope, `meetings.space.readonly`. Enable the Meet API in
Google Cloud Console, create a Web application OAuth client with redirect URI
`http://localhost:9876/callback`, then:

```sh
export GOOGLE_MEET_OAUTH_CLIENT_ID=<client id>
export GOOGLE_MEET_OAUTH_CLIENT_SECRET=<client secret>
```

and run `ironclaw tool auth google-meet`. The host manages refresh and injects the token as a
Bearer header; the tool never sees it.

This credential is deliberately **separate** from the first-party Google tools, because those
tokens do not carry the Meet scope.

## Limits

- **Artifacts only exist if they were enabled.** Recording and transcription are per-meeting
  settings. A conference with neither returns empty lists, and that is not an error.
- **Visibility follows the consenting user.** Conference records are scoped to what that user can
  see. Workspace-wide coverage needs domain-wide delegation, configured in Google Workspace
  rather than here.
- Recording media is not retrievable here; follow `driveDestination.exportUri` with a Drive tool.
- Transcript entries cap at 10,000 words per entry and are paginated; `list_transcript_entries`
  defaults to a page size of 200 because a full meeting is many entries.
- `spaces` write methods (`create`, `patch`, `endActiveConference`) are deliberately not exposed.
- Smart notes (`conferenceRecords.smartNotes`) are not yet exposed.
