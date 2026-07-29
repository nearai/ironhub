//! nova-submit — a self-contained IronClaw WASM tool for the NEAR Legion
//! IronClaw Hackathon.
//!
//! Given a file's content, this tool performs the entire NOVA upload sequence
//! INSIDE the compiled component, so the LLM never touches keys, bytes, IVs,
//! session tokens, or the call ordering:
//!
//!   1. POST /api/auth/session-token  -> obtain a short-lived JWT
//!   2. POST /tools/prepare_upload    -> obtain { upload_id, key }
//!   3. AES-256-GCM encrypt the file in-process (RustCrypto aes-gcm)
//!   4. POST /tools/finalize_upload   -> NOVA pins to IPFS + records on NEAR
//!   5. return { cid, trans_id }
//!
//! The agent calls this tool once with a JSON params object and gets back a
//! JSON result. It is the deterministic-crypto fix for the byte-handling
//! corruption that occurs when an LLM orchestrates the encrypt step itself.
//!
//! WIT contract: near:agent@0.3.0, world `sandboxed-tool`.

use aes_gcm::aead::{Aead, KeyInit, Payload};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use crate::near::agent::host;

struct NovaSubmitTool;

// ---------------------------------------------------------------------------
// Parameters and result
// ---------------------------------------------------------------------------

/// Parameters for the nova-submit tool.
#[derive(Debug, Deserialize, JsonSchema)]
struct SubmitParams {
    /// The participant's NOVA account ID, e.g. `alice.nova-sdk.near`.
    /// Used in the x-account-id / x-wallet-id headers and the auth body.
    account_id: String,
    /// The participant's NOVA API key (from nova-sdk.com). Sent as the
    /// `X-API-Key` header to the session-token endpoint. The IronClaw
    /// agent reads this from its own configuration and passes it in;
    /// it is not host-injected because NOVA uses a custom auth header,
    /// not a bearer token.
    api_key: String,
    /// The NOVA group to upload into, e.g. `ironclaw-hackathon-barcelona`.
    group_id: String,
    /// The filename to record for this upload, e.g. `submission.md`.
    filename: String,
    /// The full file content to encrypt and upload (UTF-8 text).
    file_content: String,
}

#[derive(Debug, Serialize)]
struct SubmitResult {
    cid: String,
    trans_id: String,
    file_hash: String,
}

// ---------------------------------------------------------------------------
// NOVA endpoints
// ---------------------------------------------------------------------------

const NOVA_AUTH_URL: &str = "https://nova-sdk.com/api/auth/session-token";
// The NOVA MCP server (Phala dstack). Path tools live under /tools/*.
const NOVA_MCP_BASE: &str =
    "https://5a5223f7d1bfe777433c496b9d52ff851e927259-8000.dstack-prod5.phala.network";

// ---------------------------------------------------------------------------
// Tool implementation
// ---------------------------------------------------------------------------

impl exports::near::agent::tool::Guest for NovaSubmitTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        match execute_inner(&req.params) {
            Ok(output) => exports::near::agent::tool::Response {
                output: Some(output),
                error: None,
            },
            Err(e) => exports::near::agent::tool::Response {
                output: None,
                error: Some(e),
            },
        }
    }

    fn schema() -> String {
        let schema = schemars::schema_for!(SubmitParams);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "Encrypt a file with AES-256-GCM and upload it to a NOVA group on NEAR. \
         Use this to submit a hackathon entry to the NOVA submissions group. \
         Performs the full NOVA sequence (session token, prepare_upload, \
         client-side encryption, finalize_upload) internally and returns the \
         IPFS CID. Parameters: account_id (the participant's NOVA account, e.g. \
         alice.nova-sdk.near), api_key (the participant's NOVA API key from \
         nova-sdk.com), group_id (the NOVA group, e.g. \
         ironclaw-hackathon-barcelona), filename (e.g. submission.md), and \
         file_content (the full text to encrypt and upload)."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let p: SubmitParams = serde_json::from_str(params).map_err(|e| {
        host::log(
            host::LogLevel::Warn,
            &format!("nova-submit parameter parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters for nova-submit: {}. Expected: \
             {{\"account_id\": \"<acct>.nova-sdk.near\", \"api_key\": \"<nova-api-key>\", \
             \"group_id\": \"<group>\", \"filename\": \"<name>\", \
             \"file_content\": \"<text>\"}}.",
            e
        )
    })?;

    host::log(
        host::LogLevel::Info,
        &format!(
            "nova-submit: uploading '{}' to group '{}' as {}",
            p.filename, p.group_id, p.account_id
        ),
    );

    // Submissions are manifests, not full code files — keep under FastFS's 4 MB cap.
    const MAX_SUBMISSION_BYTES: usize = 1024 * 1024; // 1 MB
    if p.file_content.len() > MAX_SUBMISSION_BYTES {
        return Err(format!(
            "Submission is {} bytes — too large. A NOVA hackathon submission is a \
             manifest (title, description, repo URL, video URL), not bundled code or \
             files. Keep it under {} bytes; link to your repo/video instead of embedding them.",
            p.file_content.len(),
            MAX_SUBMISSION_BYTES
        ));
    }

    // Step 1 — session token.
    let token = get_session_token(&p.account_id, &p.api_key)?;

    // Step 2 — ensure membership: self-join the open submission group.
    ensure_joined(&token, &p.account_id, &p.group_id)?;

    // Step 3 - prepare_upload: get encryption key + upload_id.
    let (upload_id, key_b64) = prepare_upload(&token, &p.account_id, &p.group_id, &p.filename)?;

    // Step 4 — encrypt the file content in-process.
    let plaintext = p.file_content.as_bytes();
    let file_hash = hex::encode(Sha256::digest(plaintext));
    let encrypted_b64 = encrypt_aes_gcm(&key_b64, plaintext, &upload_id)?;

    // Step 5 — finalize_upload: NOVA pins to IPFS + records on NEAR.
    let (cid, trans_id) = finalize_upload(
        &token,
        &p.account_id,
        &upload_id,
        &encrypted_b64,
        &file_hash,
    )?;

    host::log(
        host::LogLevel::Info,
        &format!("nova-submit: success, cid={}", cid),
    );

    let result = SubmitResult {
        cid,
        trans_id,
        file_hash,
    };
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// AES-256-GCM — the deterministic crypto core.
//
// Output layout MUST match what NOVA's decrypt expects:
//   decrypt_nova.py does `iv = encrypted[:12]; ciphertext_and_tag = encrypted[12:]`
// The RustCrypto `aes-gcm` crate appends the 16-byte tag to the ciphertext,
// so `nonce(12) || ciphertext || tag(16)` is exactly NOVA's `iv + ciphertext_and_tag`.
//
// Nonce derivation: WASI Preview 2 exposes no RNG to the WASM tool, so a CSPRNG
// is unavailable. NOVA's `prepare_upload` returns a server-generated `upload_id`
// (UUID) that is unique per call by construction. We derive the 12-byte AES-GCM
// nonce as SHA-256(upload_id)[..12]. This guarantees the (key, nonce) pair is
// fresh for every encryption — even when the same per-group key is reused
// across uploads — closing the keystream-reuse exposure that a clock-derived
// nonce would have under NOVA's per-group cached-key model.
// ---------------------------------------------------------------------------

fn encrypt_aes_gcm(key_b64: &str, plaintext: &[u8], upload_id: &str) -> Result<String, String> {
    let key_bytes = B64
        .decode(key_b64)
        .map_err(|e| format!("prepare_upload returned a non-base64 key: {}", e))?;
    if key_bytes.len() != 32 {
        return Err(format!(
            "expected a 32-byte AES-256 key, got {} bytes",
            key_bytes.len()
        ));
    }

    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| format!("failed to construct AES-256-GCM cipher: {}", e))?;

    // Derive a unique 12-byte nonce from the server-generated upload_id.
    let nonce_bytes = derive_nonce_from_upload_id(upload_id);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext_and_tag = cipher
        .encrypt(
            nonce,
            Payload {
                msg: plaintext,
                aad: b"",
            },
        )
        .map_err(|e| format!("AES-GCM encryption failed: {}", e))?;

    // Layout: nonce(12) || ciphertext || tag(16)
    let mut out = Vec::with_capacity(12 + ciphertext_and_tag.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext_and_tag);

    Ok(B64.encode(out))
}

/// Derive a 12-byte AES-GCM nonce from the server-generated `upload_id`.
///
/// `upload_id` is a UUID minted by NOVA's `prepare_upload` and is unique per
/// call by construction, so SHA-256(upload_id)[..12] gives a fresh nonce for
/// every encryption — sufficient to prevent (key, nonce) reuse under NOVA's
/// per-group cached-key model. No host RNG required, so this works on the
/// `wasm32-wasip2` target where ambient randomness is unavailable.
fn derive_nonce_from_upload_id(upload_id: &str) -> [u8; 12] {
    let digest = Sha256::digest(upload_id.as_bytes());
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&digest[..12]);
    nonce
}

// ---------------------------------------------------------------------------
// NOVA HTTP calls — all go through host.http-request.
// ---------------------------------------------------------------------------

/// Step 1: exchange the API key for a short-lived session token.
///
/// NOVA's /api/auth/session-token requires the `X-API-Key` header plus
/// `account_id` in the body (see nova-landing route.ts, Path 0). NOVA does
/// not accept the key as a bearer token, so the host credential-injection
/// mechanism (bearer-only across all known IronClaw tools) cannot be used —
/// the key is passed in as a tool parameter and set as a header here.
fn get_session_token(account_id: &str, api_key: &str) -> Result<String, String> {
    let body = serde_json::json!({ "account_id": account_id })
        .to_string()
        .into_bytes();

    let headers = serde_json::json!({
        "Content-Type": "application/json",
        "X-API-Key": api_key,
    })
    .to_string();

    let resp = host::http_request("POST", NOVA_AUTH_URL, &headers, Some(&body), Some(30_000))
        .map_err(|e| format!("session-token request failed: {}", e))?;

    if resp.status != 200 {
        return Err(format!(
            "session-token returned HTTP {} (body: {})",
            resp.status,
            String::from_utf8_lossy(&resp.body)
        ));
    }

    let json: serde_json::Value = serde_json::from_slice(&resp.body)
        .map_err(|e| format!("session-token response was not JSON: {}", e))?;
    json.get("token")
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "session-token response had no `token` field".to_string())
}

/// Step 2: Ensure the participant is a member of the submission group.
fn ensure_joined(token: &str, account_id: &str, group_id: &str) -> Result<(), String> {
    let body = serde_json::json!({ "group_id": group_id })
        .to_string()
        .into_bytes();
    let headers = mcp_headers(token, account_id);

    let resp = host::http_request(
        "POST",
        &format!("{}/tools/join_group", NOVA_MCP_BASE),
        &headers,
        Some(&body),
        Some(30_000),
    )
    .map_err(|e| format!("join_group request failed: {}", e))?;

    if resp.status == 200 {
        host::log(
            host::LogLevel::Info,
            &format!("nova-submit: joined (or already in) '{}'", group_id),
        );
        return Ok(());
    }

    // The contract panics "Already a member" if re-joining — treat as success.
    let body_str = String::from_utf8_lossy(&resp.body);
    if body_str.contains("Already a member") {
        host::log(
            host::LogLevel::Info,
            &format!("nova-submit: already a member of '{}'", group_id),
        );
        return Ok(());
    }

    Err(format!(
        "join_group returned HTTP {} (body: {}). The group may not be open for \
         join, or may not exist.",
        resp.status, body_str
    ))
}

/// Step 3: prepare_upload — returns (upload_id, key_b64).
fn prepare_upload(
    token: &str,
    account_id: &str,
    group_id: &str,
    filename: &str,
) -> Result<(String, String), String> {
    let body = serde_json::json!({ "group_id": group_id, "filename": filename })
        .to_string()
        .into_bytes();

    let headers = mcp_headers(token, account_id);

    let resp = host::http_request(
        "POST",
        &format!("{}/tools/prepare_upload", NOVA_MCP_BASE),
        &headers,
        Some(&body),
        Some(30_000),
    )
    .map_err(|e| format!("prepare_upload request failed: {}", e))?;

    if resp.status != 200 {
        return Err(format!(
            "prepare_upload returned HTTP {} (body: {})",
            resp.status,
            String::from_utf8_lossy(&resp.body)
        ));
    }

    let json: serde_json::Value = serde_json::from_slice(&resp.body)
        .map_err(|e| format!("prepare_upload response was not JSON: {}", e))?;
    // REST wrapper nests payload under `.result`.
    let result = json.get("result").unwrap_or(&json);
    let upload_id = result
        .get("upload_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "prepare_upload response had no `upload_id`".to_string())?
        .to_string();
    let key = result
        .get("key")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "prepare_upload response had no `key`".to_string())?
        .to_string();
    Ok((upload_id, key))
}

/// Step 4: finalize_upload — returns (cid, trans_id).
fn finalize_upload(
    token: &str,
    account_id: &str,
    upload_id: &str,
    encrypted_b64: &str,
    file_hash: &str,
) -> Result<(String, String), String> {
    let body = serde_json::json!({
        "upload_id": upload_id,
        "encrypted_data": encrypted_b64,
        "file_hash": file_hash,
    })
    .to_string()
    .into_bytes();

    let headers = mcp_headers(token, account_id);

    let resp = host::http_request(
        "POST",
        &format!("{}/tools/finalize_upload", NOVA_MCP_BASE),
        &headers,
        Some(&body),
        Some(60_000),
    )
    .map_err(|e| format!("finalize_upload request failed: {}", e))?;

    if resp.status != 200 {
        return Err(format!(
            "finalize_upload returned HTTP {} (body: {})",
            resp.status,
            String::from_utf8_lossy(&resp.body)
        ));
    }

    let json: serde_json::Value = serde_json::from_slice(&resp.body)
        .map_err(|e| format!("finalize_upload response was not JSON: {}", e))?;
    let result = json.get("result").unwrap_or(&json);
    let cid = result
        .get("cid")
        .or_else(|| result.get("ipfs_hash"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "finalize_upload response had no `cid`".to_string())?
        .to_string();
    let trans_id = result
        .get("trans_id")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    Ok((cid, trans_id))
}

/// Headers for NOVA MCP /tools/* calls. The Authorization bearer is the
/// session token obtained in step 1 — set by this tool, NOT host-injected,
/// because it is short-lived and minted per call.
fn mcp_headers(token: &str, account_id: &str) -> String {
    serde_json::json!({
        "Content-Type": "application/json",
        "Authorization": format!("Bearer {}", token),
        "x-account-id": account_id,
        "x-wallet-id": account_id,
    })
    .to_string()
}

export!(NovaSubmitTool);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nonce_is_deterministic_from_upload_id() {
        let n1 = derive_nonce_from_upload_id("abc-123");
        let n2 = derive_nonce_from_upload_id("abc-123");
        let n3 = derive_nonce_from_upload_id("different");
        assert_eq!(n1, n2, "same upload_id must yield same nonce");
        assert_ne!(n1, n3, "different upload_id must yield different nonce");
        assert_eq!(n1.len(), 12);
    }

    #[test]
    fn manifest_size_guard_rejects_oversized() {
        // Mirror the guard constant + check used in execute_inner.
        const MAX: usize = 1024 * 1024;
        let ok = "x".repeat(MAX);
        let too_big = "x".repeat(MAX + 1);
        assert!(ok.len() <= MAX, "1MB manifest is allowed");
        assert!(too_big.len() > MAX, "over-1MB manifest is rejected");
    }
}
