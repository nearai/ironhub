mod api;
mod types;
mod whatsapp;

use types::WhatsappAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct WhatsappTool;

impl exports::near::agent::tool::Guest for WhatsappTool {
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
        let schema = schemars::schema_for!(types::WhatsappAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "WhatsApp Cloud API integration. Send messages (send_text, send_template, send_image, \
         send_video, send_document, send_audio, send_location, send_contacts, \
         send_interactive_buttons, send_interactive_list, send_reaction, mark_message_read), \
         manage the business profile (get_business_profile, update_business_profile, \
         get_phone_number_info), and manage message templates (list_templates, create_template, \
         delete_template). Authenticated with a permanent System User access token; the exec \
         is not asked to OAuth into WhatsApp. Outbound messages outside the 24-hour customer \
         service window must use a pre-approved template."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: WhatsappAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("whatsapp-tool parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for whatsapp tool: {}. Expected shape: {{\"action\": \"<name>\", ...fields}}. Valid action names: send_text, send_template, send_image, send_video, send_document, send_audio, send_location, send_contacts, send_interactive_buttons, send_interactive_list, send_reaction, mark_message_read, get_phone_number_info, get_business_profile, update_business_profile, list_templates, create_template, delete_template. Call tool_info for the full JSON schema.",
            e
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("WhatsApp action dispatched: {}", action_name(&action)),
    );

    let result = match action {
        WhatsappAction::SendText {
            phone_number_id,
            to,
            body,
            preview_url,
            context_message_id,
        } => api::send_text(
            &phone_number_id,
            &to,
            &body,
            preview_url,
            context_message_id.as_deref(),
        )?,
        WhatsappAction::SendTemplate {
            phone_number_id,
            to,
            template_name,
            language_code,
            components,
        } => api::send_template(&api::SendTemplateRequest {
            phone_number_id: &phone_number_id,
            to: &to,
            template_name: &template_name,
            language_code: &language_code,
            components: components.as_deref(),
        })?,
        WhatsappAction::SendImage {
            phone_number_id,
            to,
            image_link,
            caption,
            context_message_id,
        } => api::send_image(
            &phone_number_id,
            &to,
            &image_link,
            caption.as_deref(),
            context_message_id.as_deref(),
        )?,
        WhatsappAction::SendVideo {
            phone_number_id,
            to,
            video_link,
            caption,
            context_message_id,
        } => api::send_video(
            &phone_number_id,
            &to,
            &video_link,
            caption.as_deref(),
            context_message_id.as_deref(),
        )?,
        WhatsappAction::SendDocument {
            phone_number_id,
            to,
            document_link,
            filename,
            caption,
            context_message_id,
        } => api::send_document(
            &phone_number_id,
            &to,
            &document_link,
            filename.as_deref(),
            caption.as_deref(),
            context_message_id.as_deref(),
        )?,
        WhatsappAction::SendAudio {
            phone_number_id,
            to,
            audio_link,
            context_message_id,
        } => api::send_audio(
            &phone_number_id,
            &to,
            &audio_link,
            context_message_id.as_deref(),
        )?,
        WhatsappAction::SendLocation {
            phone_number_id,
            to,
            latitude,
            longitude,
            name,
            address,
        } => api::send_location(
            &phone_number_id,
            &to,
            latitude,
            longitude,
            name.as_deref(),
            address.as_deref(),
        )?,
        WhatsappAction::SendContacts {
            phone_number_id,
            to,
            contacts,
        } => api::send_contacts(&phone_number_id, &to, &contacts)?,
        WhatsappAction::SendInteractiveButtons {
            phone_number_id,
            to,
            body,
            buttons,
            header_text,
            footer,
        } => api::send_interactive_buttons(&api::SendInteractiveButtonsRequest {
            phone_number_id: &phone_number_id,
            to: &to,
            body: &body,
            buttons: &buttons,
            header_text: header_text.as_deref(),
            footer: footer.as_deref(),
        })?,
        WhatsappAction::SendInteractiveList {
            phone_number_id,
            to,
            body,
            button_text,
            sections,
            header_text,
            footer,
        } => api::send_interactive_list(&api::SendInteractiveListRequest {
            phone_number_id: &phone_number_id,
            to: &to,
            body: &body,
            button_text: &button_text,
            sections: &sections,
            header_text: header_text.as_deref(),
            footer: footer.as_deref(),
        })?,
        WhatsappAction::SendReaction {
            phone_number_id,
            to,
            message_id,
            emoji,
        } => api::send_reaction(&phone_number_id, &to, &message_id, &emoji)?,
        WhatsappAction::MarkMessageRead {
            phone_number_id,
            message_id,
        } => api::mark_message_read(&phone_number_id, &message_id)?,
        WhatsappAction::GetPhoneNumberInfo { phone_number_id } => {
            api::get_phone_number_info(&phone_number_id)?
        }
        WhatsappAction::GetBusinessProfile { phone_number_id } => {
            api::get_business_profile(&phone_number_id)?
        }
        WhatsappAction::UpdateBusinessProfile {
            phone_number_id,
            about,
            address,
            description,
            email,
            vertical,
            websites,
            profile_picture_handle,
        } => api::update_business_profile(&api::UpdateBusinessProfileRequest {
            phone_number_id: &phone_number_id,
            about: about.as_deref(),
            address: address.as_deref(),
            description: description.as_deref(),
            email: email.as_deref(),
            vertical: vertical.as_deref(),
            websites: &websites,
            profile_picture_handle: profile_picture_handle.as_deref(),
        })?,
        WhatsappAction::ListTemplates {
            business_account_id,
            limit,
            status,
            name,
        } => api::list_templates(
            &business_account_id,
            limit,
            status.as_deref(),
            name.as_deref(),
        )?,
        WhatsappAction::CreateTemplate {
            business_account_id,
            name,
            language,
            category,
            components,
        } => api::create_template(
            &business_account_id,
            &name,
            &language,
            &category,
            &components,
        )?,
        WhatsappAction::DeleteTemplate {
            business_account_id,
            name,
            hsm_id,
        } => api::delete_template(&business_account_id, &name, hsm_id.as_deref())?,
    };

    serde_json::to_string(&result).map_err(|e| e.to_string())
}

fn action_name(action: &WhatsappAction) -> &'static str {
    match action {
        WhatsappAction::SendText { .. } => "send_text",
        WhatsappAction::SendTemplate { .. } => "send_template",
        WhatsappAction::SendImage { .. } => "send_image",
        WhatsappAction::SendVideo { .. } => "send_video",
        WhatsappAction::SendDocument { .. } => "send_document",
        WhatsappAction::SendAudio { .. } => "send_audio",
        WhatsappAction::SendLocation { .. } => "send_location",
        WhatsappAction::SendContacts { .. } => "send_contacts",
        WhatsappAction::SendInteractiveButtons { .. } => "send_interactive_buttons",
        WhatsappAction::SendInteractiveList { .. } => "send_interactive_list",
        WhatsappAction::SendReaction { .. } => "send_reaction",
        WhatsappAction::MarkMessageRead { .. } => "mark_message_read",
        WhatsappAction::GetPhoneNumberInfo { .. } => "get_phone_number_info",
        WhatsappAction::GetBusinessProfile { .. } => "get_business_profile",
        WhatsappAction::UpdateBusinessProfile { .. } => "update_business_profile",
        WhatsappAction::ListTemplates { .. } => "list_templates",
        WhatsappAction::CreateTemplate { .. } => "create_template",
        WhatsappAction::DeleteTemplate { .. } => "delete_template",
    }
}

export!(WhatsappTool);
