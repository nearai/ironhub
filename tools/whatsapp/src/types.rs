use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum WhatsappAction {
    SendText {
        phone_number_id: String,
        to: String,
        body: String,
        #[serde(default)]
        preview_url: bool,
        #[serde(default)]
        context_message_id: Option<String>,
    },
    SendTemplate {
        phone_number_id: String,
        to: String,
        template_name: String,
        language_code: String,
        #[serde(default)]
        components: Option<Vec<serde_json::Value>>,
    },
    SendImage {
        phone_number_id: String,
        to: String,
        image_link: String,
        #[serde(default)]
        caption: Option<String>,
        #[serde(default)]
        context_message_id: Option<String>,
    },
    SendVideo {
        phone_number_id: String,
        to: String,
        video_link: String,
        #[serde(default)]
        caption: Option<String>,
        #[serde(default)]
        context_message_id: Option<String>,
    },
    SendDocument {
        phone_number_id: String,
        to: String,
        document_link: String,
        #[serde(default)]
        filename: Option<String>,
        #[serde(default)]
        caption: Option<String>,
        #[serde(default)]
        context_message_id: Option<String>,
    },
    SendAudio {
        phone_number_id: String,
        to: String,
        audio_link: String,
        #[serde(default)]
        context_message_id: Option<String>,
    },
    SendLocation {
        phone_number_id: String,
        to: String,
        latitude: f64,
        longitude: f64,
        #[serde(default)]
        name: Option<String>,
        #[serde(default)]
        address: Option<String>,
    },
    SendContacts {
        phone_number_id: String,
        to: String,
        contacts: Vec<serde_json::Value>,
    },
    SendInteractiveButtons {
        phone_number_id: String,
        to: String,
        body: String,
        buttons: Vec<InteractiveButton>,
        #[serde(default)]
        header_text: Option<String>,
        #[serde(default)]
        footer: Option<String>,
    },
    SendInteractiveList {
        phone_number_id: String,
        to: String,
        body: String,
        button_text: String,
        sections: Vec<InteractiveListSection>,
        #[serde(default)]
        header_text: Option<String>,
        #[serde(default)]
        footer: Option<String>,
    },
    SendReaction {
        phone_number_id: String,
        to: String,
        message_id: String,
        emoji: String,
    },
    MarkMessageRead {
        phone_number_id: String,
        message_id: String,
    },

    GetPhoneNumberInfo {
        phone_number_id: String,
    },
    GetBusinessProfile {
        phone_number_id: String,
    },
    UpdateBusinessProfile {
        phone_number_id: String,
        #[serde(default)]
        about: Option<String>,
        #[serde(default)]
        address: Option<String>,
        #[serde(default)]
        description: Option<String>,
        #[serde(default)]
        email: Option<String>,
        #[serde(default)]
        vertical: Option<String>,
        #[serde(default)]
        websites: Vec<String>,
        #[serde(default)]
        profile_picture_handle: Option<String>,
    },

    ListTemplates {
        business_account_id: String,
        #[serde(default = "default_template_limit")]
        limit: u32,
        #[serde(default)]
        status: Option<String>,
        #[serde(default)]
        name: Option<String>,
    },
    CreateTemplate {
        business_account_id: String,
        name: String,
        language: String,
        category: String,
        components: Vec<serde_json::Value>,
    },
    DeleteTemplate {
        business_account_id: String,
        name: String,
        #[serde(default)]
        hsm_id: Option<String>,
    },
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct InteractiveButton {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct InteractiveListSection {
    #[serde(default)]
    pub title: Option<String>,
    pub rows: Vec<InteractiveListRow>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct InteractiveListRow {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
}

fn default_template_limit() -> u32 {
    25
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(s: &str) -> Result<WhatsappAction, serde_json::Error> {
        serde_json::from_str(s)
    }

    #[test]
    fn parse_send_text_minimal() {
        let action = parse(
            r#"{"action":"send_text","phone_number_id":"P1","to":"+15555550100","body":"hello"}"#,
        )
        .unwrap();
        match action {
            WhatsappAction::SendText {
                phone_number_id,
                to,
                body,
                preview_url,
                context_message_id,
            } => {
                assert_eq!(phone_number_id, "P1");
                assert_eq!(to, "+15555550100");
                assert_eq!(body, "hello");
                assert!(!preview_url);
                assert!(context_message_id.is_none());
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_send_text_with_reply_context() {
        let action = parse(
            r#"{"action":"send_text","phone_number_id":"P1","to":"+15555550100","body":"replying","context_message_id":"wamid.X","preview_url":true}"#,
        )
        .unwrap();
        match action {
            WhatsappAction::SendText {
                preview_url,
                context_message_id,
                ..
            } => {
                assert!(preview_url);
                assert_eq!(context_message_id.as_deref(), Some("wamid.X"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_send_template_with_components() {
        let raw = r#"{
            "action": "send_template",
            "phone_number_id": "P1",
            "to": "+15555550100",
            "template_name": "order_confirmation",
            "language_code": "en_US",
            "components": [
                {"type": "body", "parameters": [{"type": "text", "text": "Order #1234"}]}
            ]
        }"#;
        let action = parse(raw).unwrap();
        match action {
            WhatsappAction::SendTemplate {
                template_name,
                language_code,
                components,
                ..
            } => {
                assert_eq!(template_name, "order_confirmation");
                assert_eq!(language_code, "en_US");
                let comps = components.unwrap();
                assert_eq!(comps.len(), 1);
                assert_eq!(comps[0]["type"], "body");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_send_interactive_buttons() {
        let raw = r#"{
            "action": "send_interactive_buttons",
            "phone_number_id": "P1",
            "to": "+15555550100",
            "body": "Approve the request?",
            "buttons": [
                {"id": "yes", "title": "Approve"},
                {"id": "no", "title": "Decline"}
            ]
        }"#;
        let action = parse(raw).unwrap();
        match action {
            WhatsappAction::SendInteractiveButtons { buttons, .. } => {
                assert_eq!(buttons.len(), 2);
                assert_eq!(buttons[0].id, "yes");
                assert_eq!(buttons[0].title, "Approve");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_send_interactive_list_with_section_titles() {
        let raw = r#"{
            "action": "send_interactive_list",
            "phone_number_id": "P1",
            "to": "+15555550100",
            "body": "Pick a partner",
            "button_text": "Choose",
            "sections": [
                {
                    "title": "Banks",
                    "rows": [
                        {"id": "nj1", "title": "First NJ", "description": "New Jersey"}
                    ]
                }
            ]
        }"#;
        let action = parse(raw).unwrap();
        match action {
            WhatsappAction::SendInteractiveList {
                button_text,
                sections,
                ..
            } => {
                assert_eq!(button_text, "Choose");
                assert_eq!(sections.len(), 1);
                assert_eq!(sections[0].title.as_deref(), Some("Banks"));
                assert_eq!(sections[0].rows.len(), 1);
                assert_eq!(sections[0].rows[0].id, "nj1");
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_send_location_with_required_lat_lng() {
        let action = parse(
            r#"{"action":"send_location","phone_number_id":"P1","to":"+15555550100","latitude":37.7749,"longitude":-122.4194,"name":"SF"}"#,
        )
        .unwrap();
        match action {
            WhatsappAction::SendLocation {
                latitude,
                longitude,
                name,
                ..
            } => {
                assert!((latitude - 37.7749).abs() < f64::EPSILON);
                assert!((longitude + 122.4194).abs() < f64::EPSILON);
                assert_eq!(name.as_deref(), Some("SF"));
            }
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_list_templates_uses_default_limit() {
        let action = parse(r#"{"action":"list_templates","business_account_id":"WABA"}"#).unwrap();
        match action {
            WhatsappAction::ListTemplates { limit, .. } => assert_eq!(limit, 25),
            _ => panic!("wrong variant"),
        }
    }

    #[test]
    fn parse_unknown_action_fails() {
        assert!(parse(r#"{"action":"send_dm"}"#).is_err());
    }

    #[test]
    fn parse_missing_required_field_fails() {
        assert!(parse(r#"{"action":"send_text","to":"+15555550100"}"#).is_err());
    }

    #[test]
    fn schema_can_be_generated_and_serialized() {
        let schema = schemars::schema_for!(WhatsappAction);
        let json = serde_json::to_string(&schema).expect("schema serialization");
        assert!(
            json.contains("send_text")
                && json.contains("send_template")
                && json.contains("send_interactive_list")
                && json.contains("delete_template"),
            "schema should reference every variant"
        );
    }
}
