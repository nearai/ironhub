Use this capability to call the WhatsApp Cloud API through the Meta Graph API. Pass an `action` field naming the operation, plus that action's fields, in `params`. The input schema is a tagged union keyed on `action`; consult it for the exact fields each action takes.

Supported actions:
- Messaging: `send_text`, `send_template`, `send_image`, `send_video`, `send_document`, `send_audio`, `send_location`, `send_contacts`, `send_interactive_buttons`, `send_interactive_list`, `send_reaction`, `mark_message_read`
- Business profile and metadata: `get_phone_number_info`, `get_business_profile`, `update_business_profile`
- Templates: `list_templates`, `create_template`, `delete_template`

Messaging actions take a `phone_number_id` (the sender phone) plus a `to` recipient; profile and metadata actions take a `phone_number_id`; template actions take a `business_account_id`. Outbound messages sent outside the 24-hour customer service window must use a pre-approved template via `send_template`. Authentication is host-injected; the agent never handles the access token. Returns the raw WhatsApp API JSON for the action.
