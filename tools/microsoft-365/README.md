---
name: microsoft-365
version: 0.1.0
description: Microsoft Graph integration. 14 actions across Outlook, Excel, Teams, OneDrive, SharePoint, Calendar, plus Word and PowerPoint document generation. OAuth via Microsoft Entra ID.
use_cases:
  - List recent Outlook emails
  - Manage OneDrive and SharePoint files
  - Send Teams channel messages
value_prop: "Microsoft Graph integration."
value_tags:
  - Automation
  - Productivity
---

# microsoft-365

Microsoft 365 integration tool for the IronClaw agent runtime. Wraps Microsoft Graph v1.0 across Outlook mail, Excel workbook operations, Teams channel messaging, OneDrive and SharePoint file management, Outlook Calendar scheduling, and Word and PowerPoint document generation. OAuth 2.0 user-context authentication against Microsoft Entra ID.

## Actions

| Action | Surface | Notes |
|---|---|---|
| `me` | profile | Returns id, displayName, mail, userPrincipalName, jobTitle. |
| `send_mail` | Outlook | Recipients in `to` / `cc` / `bcc`. Plain text or HTML body. |
| `list_recent_messages` | Outlook | Inbox listing with optional OData `$filter`. |
| `list_drive` | OneDrive | Drive root or a folder by item id. |
| `upload_file` | OneDrive | Base64-encoded bytes, simple upload up to 4 MB. |
| `read_excel_range` | Excel | A1 notation or named range. Returns values, text, formulas, number formats. |
| `write_excel_range` | Excel | 2D values array. Preserves formats unless overwritten. |
| `list_teams` | Teams | Joined teams of the authenticated user (organizational tenants only). |
| `list_channels` | Teams | Channels in a given team. |
| `send_channel_message` | Teams | Plain text or HTML body posted as the user. |
| `list_calendar_events` | Calendar | Optional ISO-8601 window via `start` / `end`. |
| `create_calendar_event` | Calendar | Subject, ISO-8601 range, optional attendees and body. |
| `create_word_document` | Word | Structured input (title, subtitle, sections, paragraphs, tables) generated as `.docx` and uploaded. |
| `create_powerpoint` | PowerPoint | Title-and-bullets slides generated as `.pptx` and uploaded. |

## Authentication

OAuth 2.0 user-context with PKCE against `login.microsoftonline.com`. The host exchanges the authorization code for an access and refresh token pair, stores them encrypted, and injects `Authorization: Bearer <token>` on `graph.microsoft.com` requests. The WASM tool never sees the raw token.

### Setup

1. Register an application at <https://entra.microsoft.com> under Applications, App registrations, New registration.
2. Set supported account types based on tenant policy. For broadest coverage, pick "Accounts in any organizational directory and personal Microsoft accounts".
3. Set the redirect URI to `Web` and value `http://localhost:9876/callback`. Microsoft requires the literal string `localhost`; `127.0.0.1` is rejected.
4. Under Certificates & secrets, create a client secret. Copy the Value immediately (it only displays once).
5. Under API permissions, add Microsoft Graph delegated permissions: `Mail.ReadWrite`, `Mail.Send`, `ChannelMessage.Send`, `Team.ReadBasic.All`, `Channel.ReadBasic.All`, `Files.ReadWrite.All`, `Sites.ReadWrite.All`, `Calendars.ReadWrite`, `User.Read`, `offline_access`. Click Grant admin consent if the tenant requires it.
6. If supporting personal Microsoft accounts, open the Manifest tab and set `api.requestedAccessTokenVersion` to `2`.
7. Export the client id and secret on the IronClaw host (or write them to `~/.ironclaw/.env`):

   ```sh
   export MICROSOFT_OAUTH_CLIENT_ID=...
   export MICROSOFT_OAUTH_CLIENT_SECRET=...
   ```

8. Run `ironclaw tool auth microsoft-365`. A browser opens to the consent screen, the callback lands on `localhost:9876`, and the host stores the tokens. Refresh tokens are rotated automatically; re-authentication is required only when scopes change or consent is revoked.

## Inputs

The schema is derived from the `MicrosoftAction` tagged enum in `src/types.rs` via `schemars` and surfaced through the `schema()` Guest function. The agent discovers the action surface by calling `tool_info`.

## Tenant boundaries

The Teams actions (`list_teams`, `list_channels`, `send_channel_message`) require an organizational tenant. Personal Microsoft accounts receive HTTP 403 from these endpoints because Microsoft does not expose Teams business APIs to consumer MSAs. The error surfaces honestly. There is no spoofing or fallback path.

The `me` action's `mail` field reflects the user's identifier, which is not guaranteed to be a provisioned Outlook mailbox. Personal Microsoft accounts that have never opted into Outlook.com return 202 from `send_mail` (Graph queues the request) but the message is silently dropped because there is no mailbox to dispatch from. Organizational accounts and personal accounts with a provisioned `@outlook.com` or `@hotmail.com` address deliver normally.

## Build

```sh
cargo build --release --target wasm32-wasip2
```

Produces `target/wasm32-wasip2/release/microsoft_365_tool.wasm`. Install into IronClaw by copying that file plus `microsoft-365-tool.capabilities.json` (renamed to `microsoft-365.capabilities.json`) into `~/.ironclaw/tools/`.

## Tests

```sh
cargo test
```

Pure host-side tests cover the URL encoder, the Graph error extractor, XML escaping for the PowerPoint generator, and filename extension handling.

## License

Dual MIT and Apache-2.0. See the repository root for license files.
