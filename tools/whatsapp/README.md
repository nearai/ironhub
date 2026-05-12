# whatsapp

WhatsApp Cloud API integration tool for the IronClaw agent runtime. Sends text, template, media, location, contacts, interactive button and list messages, manages the business profile, reads phone number metadata, and manages message templates per WhatsApp Business Account. Authenticated with a permanent System User access token against `graph.facebook.com/v23.0`.

## Actions

| Action | Surface | Notes |
|---|---|---|
| `send_text` | messages | Up to 4096 chars. Optional `preview_url` for link previews. Optional reply context. |
| `send_template` | messages | Pre-approved template name, language code, optional components for header/body/button parameters. Bypasses the 24-hour window. |
| `send_image` | messages | Public HTTPS link plus optional caption. |
| `send_video` | messages | Public HTTPS link plus optional caption. |
| `send_document` | messages | Public HTTPS link, optional filename and caption. |
| `send_audio` | messages | Public HTTPS link. |
| `send_location` | messages | Latitude, longitude, optional name and address. Validates coordinate ranges. |
| `send_contacts` | messages | Array of contact card objects (name, phones, emails, etc.). |
| `send_interactive_buttons` | messages | Body plus 1 to 3 reply buttons. Optional header text and footer. |
| `send_interactive_list` | messages | Body, button label, and sections of selectable rows (max 10 rows total). |
| `send_reaction` | messages | React with an emoji to a previous message; empty emoji removes the reaction. |
| `mark_message_read` | messages | Marks an inbound message as read. |
| `get_phone_number_info` | phone | Display name, verified name, quality rating, certificate state. |
| `get_business_profile` | profile | About, address, description, email, vertical, websites, profile picture URL. |
| `update_business_profile` | profile | Partial update; requires at least one editable field. |
| `list_templates` | templates | Workspace-account-scoped. Optional name filter, status filter, page size. |
| `create_template` | templates | Name, language, category, components. Awaits Meta approval before sendable. |
| `delete_template` | templates | By name; optional `hsm_id` for disambiguation when multiple language versions exist. |

## Authentication

Permanent System User access token, Bearer header, against `graph.facebook.com`. The host injects `Authorization: Bearer <token>` on every request. The WASM tool never sees the raw token.

This is **deployment-time provisioned**, not exec-OAuth. The exec deploying the IronClaw instance does not OAuth into WhatsApp; the operator sets the System User token before the agent runs.

### Setup

1. Open Meta Business Manager at <https://business.facebook.com> and switch to the business that owns the WhatsApp Business Account.
2. Business Settings, then System Users in the left sidebar. Click Add and create a System User with role Admin. Name it (e.g. `IronClaw Service Account`).
3. Click the new System User. Click Add Assets, choose WhatsApp Accounts, select the WhatsApp Business Account this IronClaw instance will send from, and grant Full control.
4. Click Generate New Token. Choose the connected app. Set the token to never expire. Select `whatsapp_business_messaging` and `whatsapp_business_management`. Click Generate token.
5. Copy the access token immediately. It is not shown again.
6. Note the WhatsApp Business Account ID (visible in WhatsApp Manager, Account tools, Phone numbers section, the WABA id) and the Phone Number ID for the sender phone (also in Phone numbers).
7. On the IronClaw host:

   ```sh
   export WHATSAPP_ACCESS_TOKEN=<the token>
   ```

8. Run `ironclaw tool install whatsapp`. The phone number id and business account id are passed as action parameters; they are not stored as IronClaw secrets because they are not sensitive.

## Inputs

The schema is derived from the `WhatsappAction` tagged enum in `src/types.rs` via `schemars` and surfaced through the `schema()` Guest function. The agent discovers the action surface by calling `tool_info`.

## The 24-hour customer service window

Free-form messages (anything other than templates) can only be sent to recipients who messaged the business within the last 24 hours. Outside that window the API returns an error and the message is rejected. Outbound notifications to cold or stale contacts must use a pre-approved template via `send_template`. The tool surfaces Meta's error verbatim including the `error_user_title` and `error_user_msg` fields when this happens.

## Phone number formatting

`to` accepts E.164 phone numbers (e.g. `+15555550100`). Local formats with leading zeros are silently rejected by Meta with a non-obvious error code. Validate format upstream of the agent if user input may include local formats.

## Media handling

The tool sends media via public HTTPS link (`image_link`, `video_link`, `document_link`, `audio_link`). Meta downloads the media at send time. Media upload via `POST /{phone_number_id}/media` (multipart/form-data) returning a Meta-hosted media id is deferred to a follow-up; the host runtime does not currently expose multipart construction.

## Out of scope (v1)

Webhook subscription management, two-step verification, phone number registration, conversation analytics, payment flows, sticker upload, message status callbacks. These are deployment-time provisioning steps or separate API surfaces and are intentionally not surfaced through the runtime tool.

## Build

```sh
cargo build --release --target wasm32-wasip2
```

Produces `target/wasm32-wasip2/release/whatsapp_tool.wasm`. Install into IronClaw by copying that file plus `whatsapp-tool.capabilities.json` into `~/.ironclaw/tools/`.

## License

Dual MIT and Apache-2.0. See the repository root for license files.
