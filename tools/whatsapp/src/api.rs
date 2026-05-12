use crate::types::{InteractiveButton, InteractiveListSection};
use crate::whatsapp::{append_query, request, require_token, url_encode, MESSAGING_PRODUCT};
use serde_json::{json, Map, Value};

const MAX_TEXT_BODY_CHARS: usize = 4096;
const MAX_INTERACTIVE_BUTTONS: usize = 3;
const MAX_INTERACTIVE_LIST_ROWS: usize = 10;
const MAX_BUTTON_TEXT_CHARS: usize = 20;

fn messages_endpoint(phone_number_id: &str) -> String {
    format!("/{}/messages", url_encode(phone_number_id))
}

fn require_non_empty(field: &str, value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err(format!("{} must not be empty", field))
    } else {
        Ok(())
    }
}

fn add_context(message: &mut Map<String, Value>, context_message_id: Option<&str>) {
    if let Some(id) = context_message_id {
        message.insert("context".into(), json!({ "message_id": id }));
    }
}

fn base_message(to: &str, msg_type: &str) -> Map<String, Value> {
    let mut m = Map::new();
    m.insert("messaging_product".into(), json!(MESSAGING_PRODUCT));
    m.insert("recipient_type".into(), json!("individual"));
    m.insert("to".into(), json!(to));
    m.insert("type".into(), json!(msg_type));
    m
}

fn post_message(phone_number_id: &str, payload: Value) -> Result<Value, String> {
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let endpoint = messages_endpoint(phone_number_id);
    let (_status, value) = request("POST", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn send_text(
    phone_number_id: &str,
    to: &str,
    body: &str,
    preview_url: bool,
    context_message_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("to", to)?;
    require_non_empty("body", body)?;
    if body.chars().count() > MAX_TEXT_BODY_CHARS {
        return Err(format!(
            "send_text body exceeds {} characters",
            MAX_TEXT_BODY_CHARS
        ));
    }

    let mut message = base_message(to, "text");
    message.insert(
        "text".into(),
        json!({ "body": body, "preview_url": preview_url }),
    );
    add_context(&mut message, context_message_id);
    post_message(phone_number_id, Value::Object(message))
}

pub struct SendTemplateRequest<'a> {
    pub phone_number_id: &'a str,
    pub to: &'a str,
    pub template_name: &'a str,
    pub language_code: &'a str,
    pub components: Option<&'a [Value]>,
}

pub fn send_template(req: &SendTemplateRequest<'_>) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", req.phone_number_id)?;
    require_non_empty("to", req.to)?;
    require_non_empty("template_name", req.template_name)?;
    require_non_empty("language_code", req.language_code)?;

    let mut template = Map::new();
    template.insert("name".into(), json!(req.template_name));
    template.insert("language".into(), json!({ "code": req.language_code }));
    if let Some(components) = req.components {
        if !components.is_empty() {
            template.insert("components".into(), json!(components));
        }
    }

    let mut message = base_message(req.to, "template");
    message.insert("template".into(), Value::Object(template));
    post_message(req.phone_number_id, Value::Object(message))
}

pub fn send_image(
    phone_number_id: &str,
    to: &str,
    image_link: &str,
    caption: Option<&str>,
    context_message_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("to", to)?;
    require_non_empty("image_link", image_link)?;

    let mut image = Map::new();
    image.insert("link".into(), json!(image_link));
    if let Some(c) = caption {
        image.insert("caption".into(), json!(c));
    }

    let mut message = base_message(to, "image");
    message.insert("image".into(), Value::Object(image));
    add_context(&mut message, context_message_id);
    post_message(phone_number_id, Value::Object(message))
}

pub fn send_video(
    phone_number_id: &str,
    to: &str,
    video_link: &str,
    caption: Option<&str>,
    context_message_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("to", to)?;
    require_non_empty("video_link", video_link)?;

    let mut video = Map::new();
    video.insert("link".into(), json!(video_link));
    if let Some(c) = caption {
        video.insert("caption".into(), json!(c));
    }

    let mut message = base_message(to, "video");
    message.insert("video".into(), Value::Object(video));
    add_context(&mut message, context_message_id);
    post_message(phone_number_id, Value::Object(message))
}

pub fn send_document(
    phone_number_id: &str,
    to: &str,
    document_link: &str,
    filename: Option<&str>,
    caption: Option<&str>,
    context_message_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("to", to)?;
    require_non_empty("document_link", document_link)?;

    let mut document = Map::new();
    document.insert("link".into(), json!(document_link));
    if let Some(f) = filename {
        document.insert("filename".into(), json!(f));
    }
    if let Some(c) = caption {
        document.insert("caption".into(), json!(c));
    }

    let mut message = base_message(to, "document");
    message.insert("document".into(), Value::Object(document));
    add_context(&mut message, context_message_id);
    post_message(phone_number_id, Value::Object(message))
}

pub fn send_audio(
    phone_number_id: &str,
    to: &str,
    audio_link: &str,
    context_message_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("to", to)?;
    require_non_empty("audio_link", audio_link)?;

    let mut message = base_message(to, "audio");
    message.insert("audio".into(), json!({ "link": audio_link }));
    add_context(&mut message, context_message_id);
    post_message(phone_number_id, Value::Object(message))
}

pub fn send_location(
    phone_number_id: &str,
    to: &str,
    latitude: f64,
    longitude: f64,
    name: Option<&str>,
    address: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("to", to)?;
    if !(-90.0..=90.0).contains(&latitude) {
        return Err(format!("latitude must be in [-90, 90]; got {}", latitude));
    }
    if !(-180.0..=180.0).contains(&longitude) {
        return Err(format!(
            "longitude must be in [-180, 180]; got {}",
            longitude
        ));
    }

    let mut location = Map::new();
    location.insert("latitude".into(), json!(latitude));
    location.insert("longitude".into(), json!(longitude));
    if let Some(n) = name {
        location.insert("name".into(), json!(n));
    }
    if let Some(a) = address {
        location.insert("address".into(), json!(a));
    }

    let mut message = base_message(to, "location");
    message.insert("location".into(), Value::Object(location));
    post_message(phone_number_id, Value::Object(message))
}

pub fn send_contacts(phone_number_id: &str, to: &str, contacts: &[Value]) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("to", to)?;
    if contacts.is_empty() {
        return Err("send_contacts requires at least one contact".to_string());
    }

    let mut message = base_message(to, "contacts");
    message.insert("contacts".into(), json!(contacts));
    post_message(phone_number_id, Value::Object(message))
}

pub struct SendInteractiveButtonsRequest<'a> {
    pub phone_number_id: &'a str,
    pub to: &'a str,
    pub body: &'a str,
    pub buttons: &'a [InteractiveButton],
    pub header_text: Option<&'a str>,
    pub footer: Option<&'a str>,
}

pub fn send_interactive_buttons(req: &SendInteractiveButtonsRequest<'_>) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", req.phone_number_id)?;
    require_non_empty("to", req.to)?;
    require_non_empty("body", req.body)?;
    if req.buttons.is_empty() {
        return Err("send_interactive_buttons requires at least one button".to_string());
    }
    if req.buttons.len() > MAX_INTERACTIVE_BUTTONS {
        return Err(format!(
            "send_interactive_buttons supports at most {} buttons; got {}",
            MAX_INTERACTIVE_BUTTONS,
            req.buttons.len()
        ));
    }

    let buttons_json: Vec<Value> = req
        .buttons
        .iter()
        .map(|b| {
            json!({
                "type": "reply",
                "reply": { "id": b.id, "title": b.title },
            })
        })
        .collect();

    let mut interactive = Map::new();
    interactive.insert("type".into(), json!("button"));
    if let Some(h) = req.header_text {
        interactive.insert("header".into(), json!({ "type": "text", "text": h }));
    }
    interactive.insert("body".into(), json!({ "text": req.body }));
    if let Some(f) = req.footer {
        interactive.insert("footer".into(), json!({ "text": f }));
    }
    interactive.insert("action".into(), json!({ "buttons": buttons_json }));

    let mut message = base_message(req.to, "interactive");
    message.insert("interactive".into(), Value::Object(interactive));
    post_message(req.phone_number_id, Value::Object(message))
}

pub struct SendInteractiveListRequest<'a> {
    pub phone_number_id: &'a str,
    pub to: &'a str,
    pub body: &'a str,
    pub button_text: &'a str,
    pub sections: &'a [InteractiveListSection],
    pub header_text: Option<&'a str>,
    pub footer: Option<&'a str>,
}

pub fn send_interactive_list(req: &SendInteractiveListRequest<'_>) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", req.phone_number_id)?;
    require_non_empty("to", req.to)?;
    require_non_empty("body", req.body)?;
    require_non_empty("button_text", req.button_text)?;
    if req.button_text.chars().count() > MAX_BUTTON_TEXT_CHARS {
        return Err(format!(
            "button_text must be at most {} characters",
            MAX_BUTTON_TEXT_CHARS
        ));
    }
    if req.sections.is_empty() {
        return Err("send_interactive_list requires at least one section".to_string());
    }
    let total_rows: usize = req.sections.iter().map(|s| s.rows.len()).sum();
    if total_rows == 0 {
        return Err("send_interactive_list requires at least one row across sections".to_string());
    }
    if total_rows > MAX_INTERACTIVE_LIST_ROWS {
        return Err(format!(
            "send_interactive_list supports at most {} rows total; got {}",
            MAX_INTERACTIVE_LIST_ROWS, total_rows
        ));
    }

    let sections_json: Vec<Value> = req
        .sections
        .iter()
        .map(|section| {
            let rows: Vec<Value> = section
                .rows
                .iter()
                .map(|row| {
                    let mut r = Map::new();
                    r.insert("id".into(), json!(row.id));
                    r.insert("title".into(), json!(row.title));
                    if let Some(d) = &row.description {
                        r.insert("description".into(), json!(d));
                    }
                    Value::Object(r)
                })
                .collect();
            let mut s = Map::new();
            if let Some(t) = &section.title {
                s.insert("title".into(), json!(t));
            }
            s.insert("rows".into(), json!(rows));
            Value::Object(s)
        })
        .collect();

    let mut interactive = Map::new();
    interactive.insert("type".into(), json!("list"));
    if let Some(h) = req.header_text {
        interactive.insert("header".into(), json!({ "type": "text", "text": h }));
    }
    interactive.insert("body".into(), json!({ "text": req.body }));
    if let Some(f) = req.footer {
        interactive.insert("footer".into(), json!({ "text": f }));
    }
    interactive.insert(
        "action".into(),
        json!({
            "button": req.button_text,
            "sections": sections_json,
        }),
    );

    let mut message = base_message(req.to, "interactive");
    message.insert("interactive".into(), Value::Object(interactive));
    post_message(req.phone_number_id, Value::Object(message))
}

pub fn send_reaction(
    phone_number_id: &str,
    to: &str,
    message_id: &str,
    emoji: &str,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("to", to)?;
    require_non_empty("message_id", message_id)?;
    let emoji_chars = emoji.chars().count();
    if emoji_chars > 2 {
        return Err(format!(
            "emoji must be a single emoji or empty to remove reaction; got {} characters",
            emoji_chars
        ));
    }

    let mut message = base_message(to, "reaction");
    message.insert(
        "reaction".into(),
        json!({ "message_id": message_id, "emoji": emoji }),
    );
    post_message(phone_number_id, Value::Object(message))
}

pub fn mark_message_read(phone_number_id: &str, message_id: &str) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    require_non_empty("message_id", message_id)?;
    let payload = json!({
        "messaging_product": MESSAGING_PRODUCT,
        "status": "read",
        "message_id": message_id,
    });
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let endpoint = messages_endpoint(phone_number_id);
    let (_status, value) = request("POST", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn get_phone_number_info(phone_number_id: &str) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    let endpoint = format!("/{}", url_encode(phone_number_id));
    let (_status, value) = request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn get_business_profile(phone_number_id: &str) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", phone_number_id)?;
    let mut endpoint = format!("/{}/whatsapp_business_profile", url_encode(phone_number_id));
    append_query(
        &mut endpoint,
        "fields",
        "about,address,description,email,profile_picture_url,vertical,websites",
    );
    let (_status, value) = request("GET", &endpoint, None)?;
    Ok(value)
}

pub struct UpdateBusinessProfileRequest<'a> {
    pub phone_number_id: &'a str,
    pub about: Option<&'a str>,
    pub address: Option<&'a str>,
    pub description: Option<&'a str>,
    pub email: Option<&'a str>,
    pub vertical: Option<&'a str>,
    pub websites: &'a [String],
    pub profile_picture_handle: Option<&'a str>,
}

pub fn update_business_profile(req: &UpdateBusinessProfileRequest<'_>) -> Result<Value, String> {
    require_token()?;
    require_non_empty("phone_number_id", req.phone_number_id)?;

    let mut payload = Map::new();
    payload.insert("messaging_product".into(), json!(MESSAGING_PRODUCT));
    if let Some(a) = req.about {
        payload.insert("about".into(), json!(a));
    }
    if let Some(a) = req.address {
        payload.insert("address".into(), json!(a));
    }
    if let Some(d) = req.description {
        payload.insert("description".into(), json!(d));
    }
    if let Some(e) = req.email {
        payload.insert("email".into(), json!(e));
    }
    if let Some(v) = req.vertical {
        payload.insert("vertical".into(), json!(v));
    }
    if !req.websites.is_empty() {
        payload.insert("websites".into(), json!(req.websites));
    }
    if let Some(h) = req.profile_picture_handle {
        payload.insert("profile_picture_handle".into(), json!(h));
    }
    if payload.len() == 1 {
        return Err(
            "update_business_profile requires at least one of about, address, description, email, vertical, websites, profile_picture_handle"
                .to_string(),
        );
    }
    let body = serde_json::to_string(&Value::Object(payload)).map_err(|e| e.to_string())?;
    let endpoint = format!(
        "/{}/whatsapp_business_profile",
        url_encode(req.phone_number_id)
    );
    let (_status, value) = request("POST", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn list_templates(
    business_account_id: &str,
    limit: u32,
    status: Option<&str>,
    name: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("business_account_id", business_account_id)?;
    let mut endpoint = format!("/{}/message_templates", url_encode(business_account_id));
    append_query(&mut endpoint, "limit", &limit.min(1000).to_string());
    if let Some(s) = status {
        append_query(&mut endpoint, "status", s);
    }
    if let Some(n) = name {
        append_query(&mut endpoint, "name", n);
    }
    let (_status, value) = request("GET", &endpoint, None)?;
    Ok(value)
}

pub fn create_template(
    business_account_id: &str,
    name: &str,
    language: &str,
    category: &str,
    components: &[Value],
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("business_account_id", business_account_id)?;
    require_non_empty("name", name)?;
    require_non_empty("language", language)?;
    require_non_empty("category", category)?;
    if components.is_empty() {
        return Err("create_template requires at least one component".to_string());
    }
    let payload = json!({
        "name": name,
        "language": language,
        "category": category,
        "components": components,
    });
    let body = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    let endpoint = format!("/{}/message_templates", url_encode(business_account_id));
    let (_status, value) = request("POST", &endpoint, Some(&body))?;
    Ok(value)
}

pub fn delete_template(
    business_account_id: &str,
    name: &str,
    hsm_id: Option<&str>,
) -> Result<Value, String> {
    require_token()?;
    require_non_empty("business_account_id", business_account_id)?;
    require_non_empty("name", name)?;
    let mut endpoint = format!("/{}/message_templates", url_encode(business_account_id));
    append_query(&mut endpoint, "name", name);
    if let Some(id) = hsm_id {
        append_query(&mut endpoint, "hsm_id", id);
    }
    let (_status, _value) = request("DELETE", &endpoint, None)?;
    Ok(json!({ "deleted": name }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn require_non_empty_accepts_non_blank() {
        assert!(require_non_empty("field", "value").is_ok());
    }

    #[test]
    fn require_non_empty_rejects_blank_and_whitespace() {
        assert!(require_non_empty("field", "").is_err());
        assert!(require_non_empty("field", "   ").is_err());
    }

    #[test]
    fn messages_endpoint_url_encodes_phone_number_id() {
        assert_eq!(messages_endpoint("123/x"), "/123%2Fx/messages");
    }

    #[test]
    fn base_message_includes_required_fields() {
        let m = base_message("+15555550100", "text");
        assert_eq!(m["messaging_product"], "whatsapp");
        assert_eq!(m["recipient_type"], "individual");
        assert_eq!(m["to"], "+15555550100");
        assert_eq!(m["type"], "text");
    }

    #[test]
    fn add_context_inserts_when_id_provided() {
        let mut m = base_message("+15555550100", "text");
        add_context(&mut m, Some("wamid.X"));
        assert_eq!(m["context"]["message_id"], "wamid.X");
    }

    #[test]
    fn add_context_no_op_when_id_missing() {
        let mut m = base_message("+15555550100", "text");
        add_context(&mut m, None);
        assert!(m.get("context").is_none());
    }
}
