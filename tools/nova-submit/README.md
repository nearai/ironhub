# nova-submit

A self-contained [IronClaw](https://docs.ironclaw.com) WASM tool that encrypts a file with AES-256-GCM and uploads it to a [NOVA](https://nova-sdk.com) group on NEAR — in a single call.

Built for the NEAR Legion IronClaw Hackathon, but usable by any IronClaw agent that needs to write an encrypted file to a NOVA group.

## What it does

Given a file's content, `nova-submit` performs the entire NOVA upload sequence **inside the compiled WASM component** — the agent's language model never touches keys, nonces, ciphertext, session tokens, or the call ordering:

1. `POST /api/auth/session-token` — obtain a short-lived session token
2. `POST /tools/prepare_upload` — obtain the group's encryption key and an `upload_id`
3. AES-256-GCM encrypt the file in-process (RustCrypto `aes-gcm`)
4. `POST /tools/finalize_upload` — NOVA pins the ciphertext to IPFS and records the transaction on NEAR
5. return the IPFS `cid`, the NEAR `trans_id`, and the plaintext `file_hash`

The agent calls the tool once with a JSON parameter object and gets back a JSON result. Because the encryption is compiled and deterministic, the model cannot corrupt the byte handling — which is the whole reason this is a WASM tool rather than a script the agent drives.

## Parameters

| Parameter | Type | Notes |
|---|---|---|
| `account_id` | string | The caller's NOVA account, e.g. `alice.nova-sdk.near`. Not secret. |
| `api_key` | string | The caller's NOVA API key (from nova-sdk.com). Secret — see the note below. |
| `group_id` | string | The NOVA group to upload into. The caller's account must already be a member. |
| `filename` | string | The filename to record for the upload, e.g. `submission.md`. |
| `file_content` | string | The full UTF-8 text to encrypt and upload. |

Returns:

```json
{ "cid": "Qm...", "trans_id": "...", "file_hash": "..." }
```

## Usage

Once installed, the agent calls the tool when a task needs it. For example, in the agent chat:

> Use the nova-submit tool. account_id is `alice.nova-sdk.near`, api_key is `<key>`, group_id is `my-group`, filename is `report.md`, and file_content is `...`.

The tool returns the CID, which is the permanent reference to the encrypted file in the group.

## Capabilities

The tool's `capabilities.json` grants it network access to exactly two hosts and nothing else:

- `nova-sdk.com` — for the session-token exchange
- the NOVA MCP server on Phala — for `prepare_upload` and `finalize_upload` (the hostname embeds a Phala dstack verification hash and changes on redeploy — see *Security notes*)

It declares no host-injected credentials: the NOVA API key is passed as a call parameter (NOVA's session-token endpoint authenticates with a custom `X-API-Key` header, not a bearer token, so the host's bearer-only injection cannot be used).

## Security notes

- **API key handling.** The `api_key` is passed as a tool parameter. If your agent's caller types it into a chat, treat it as exposed and rotate it at nova-sdk.com afterward. The cleaner pattern is to supply it from the agent's `~/.ironclaw/.env` rather than chat.
- **Nonce.** The WASI p2 sandbox exposes no random number generator, so the 12-byte AES-GCM nonce is derived from the host millisecond clock. This is sufficient for unique-per-upload nonces in a low-frequency submission flow, but it is not a cryptographically strong RNG. For high-volume or adversarial use, have NOVA's `prepare_upload` return a server-generated nonce instead.
- **Encryption layout.** Output is `nonce(12) ‖ ciphertext ‖ tag(16)`, base64-encoded — byte-compatible with the NOVA SDK's `encrypt`/`decrypt` (`iv = bytes[:12]`). A file uploaded by this tool retrieves and decrypts correctly via the NOVA JS SDK and vice versa.
- **NOVA MCP hostname.** The capabilities file allowlists the NOVA MCP host at `5a5223f7d1bfe777433c496b9d52ff851e927259-8000.dstack-prod5.phala.network`. This is a [Phala dstack](https://docs.phala.network/) deployment, and the hostname embeds the dstack instance's verification hash — proof the MCP server is the exact build NOVA published. If NOVA redeploys the MCP server, the hash changes and so does the hostname; this tool then stops working until `nova-submit-tool.capabilities.json` is bumped and a new release is cut. The live hostname is tracked at [`github.com/jcarbonnell/nova`](https://github.com/jcarbonnell/nova).

## Layout

This crate lives at `tools/nova-submit/` and follows the ironhub layout: the WIT contract is shared at the repo root and referenced via a relative path, with no per-tool build script.

```
ironhub/
  wit/tool.wit                                            ← shared WIT, used by all tools
  tools/nova-submit/
    Cargo.toml
    src/lib.rs                                            ← `path: "../../wit/tool.wit"`
    nova-submit-tool.capabilities.json
    README.md
```

The canonical standalone layout — with `wit/tool.wit` and `build.sh` inside the crate — lives at [`github.com/jcarbonnell/nova/nova-submit-tool`](https://github.com/jcarbonnell/nova/tree/main/nova-submit-tool) and is the development home of the tool.

## Build

From the ironhub repo root, or from `tools/nova-submit/`:

```bash
rustup target add wasm32-wasip2
cargo build --release --target wasm32-wasip2
```

The output is `target/wasm32-wasip2/release/nova_submit_tool.wasm`. Rename to `nova-submit.wasm` when packing into a release alongside `nova-submit-tool.capabilities.json`.

## Compatibility

Built against WIT `near:agent@0.3.0` (IronClaw 0.28.x). IronClaw evolves quickly; if a future release bumps the WIT version, the tool may need to be rebuilt against the new contract.

## License

MIT