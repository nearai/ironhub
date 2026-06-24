Use this capability to call Microsoft 365 via Microsoft Graph v1.0. Pass an `action` field naming the operation, plus that action's fields, in `params`. The input schema is a tagged union keyed on `action`; consult it for the exact fields each action takes.

Supported actions:
- Identity: `me`
- Outlook mail: `send_mail`, `list_recent_messages`
- OneDrive and SharePoint files: `list_drive`, `upload_file`
- Excel workbook ranges: `read_excel_range`, `write_excel_range`
- Teams channel messaging: `list_teams`, `list_channels`, `send_channel_message`
- Outlook Calendar: `list_calendar_events`, `create_calendar_event`
- Document generation: `create_word_document`, `create_powerpoint`

Parameter notes:
- Excel: `worksheet` and `range` are separate fields, not a combined `Sheet1!A1:B10` string. Pass `worksheet: "Sheet1"` and `range: "A1:B10"`.
- OneDrive and SharePoint file paths use forward slashes with no leading slash, for example `Documents/report.docx`.
- Mail recipients are arrays of address strings; calendar datetimes use ISO 8601 with a timezone offset, for example `2026-04-15T14:00:00-07:00`.

Authentication is host-injected: the agent never handles the OAuth token. Returns the raw Microsoft Graph API JSON for the action.
