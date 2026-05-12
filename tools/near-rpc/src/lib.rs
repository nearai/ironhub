mod api;
mod rpc;
mod types;

use types::NearRpcAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct NearRpcTool;

impl exports::near::agent::tool::Guest for NearRpcTool {
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
        let schema = schemars::schema_for!(NearRpcAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "NEAR Protocol JSON-RPC. Read account state, balances, access keys, \
         contract code and storage. Call view functions on smart contracts. \
         Read blocks, chunks, validators, transactions, and state changes. \
         Check gas prices and protocol config. Submit signed transactions \
         with finality control. Query node status, health, and network info. \
         Light-client proofs and next-block lookup. Supports mainnet, \
         testnet, archival endpoints, and custom RPC URLs.\n\
         \n\
         Parameter formats:\n\
         - `account_id`: lowercase, ends in `.near` (mainnet) or `.testnet`. \
         Implicit accounts are 64-char hex strings.\n\
         - `args_base64`: contract function arguments encoded as base64. Encode \
         the JSON args object using the standard alphabet. \
         `{\"account_id\":\"alice.near\"}` becomes \
         `eyJhY2NvdW50X2lkIjoiYWxpY2UubmVhciJ9`. Never pass raw JSON.\n\
         - `block_id`: numeric block height (as a number) or 44-char base58 block \
         hash string. Omit for latest.\n\
         - `finality`: \"optimistic\" or \"final\"; defaults to \"final\" when omitted."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: NearRpcAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("near-rpc parse failed: {} | raw={}", e, params),
        );
        format!(
            "Invalid parameters: {}. Expected: {{\"action\": \"<name>\", ...}}. Actions: {}.",
            e,
            ALL_ACTIONS.join(", ")
        )
    })?;

    crate::near::agent::host::log(
        crate::near::agent::host::LogLevel::Info,
        &format!("NEAR RPC: {}", action_name(&action)),
    );

    dispatch(action)
}

const ALL_ACTIONS: &[&str] = &[
    "view_account",
    "view_account_balance",
    "view_access_key",
    "view_access_key_list",
    "view_state",
    "view_code",
    "view_function",
    "get_block",
    "get_chunk",
    "get_recent_blocks",
    "get_transaction",
    "tx_status",
    "send_tx",
    "broadcast_tx_async",
    "broadcast_tx_commit",
    "status",
    "health",
    "network_info",
    "client_config",
    "validators",
    "gas_price",
    "protocol_config",
    "genesis_config",
    "changes",
    "changes_in_block",
    "light_client_proof",
    "next_light_client_block",
];

fn dispatch(action: NearRpcAction) -> Result<String, String> {
    match action {
        NearRpcAction::ViewAccount {
            account_id,
            network,
            rpc_url,
            block_height,
            block_hash,
        } => api::view_account(
            &account_id,
            &network,
            rpc_url.as_deref(),
            block_height,
            block_hash.as_deref(),
        ),
        NearRpcAction::ViewAccountBalance {
            account_id,
            network,
            rpc_url,
        } => api::view_account_balance(&account_id, &network, rpc_url.as_deref()),
        NearRpcAction::ViewAccessKey {
            account_id,
            public_key,
            network,
            rpc_url,
            block_height,
            block_hash,
        } => api::view_access_key(
            &account_id,
            &public_key,
            &network,
            rpc_url.as_deref(),
            block_height,
            block_hash.as_deref(),
        ),
        NearRpcAction::ViewAccessKeyList {
            account_id,
            network,
            rpc_url,
            block_height,
            block_hash,
        } => api::view_access_key_list(
            &account_id,
            &network,
            rpc_url.as_deref(),
            block_height,
            block_hash.as_deref(),
        ),
        NearRpcAction::ViewState {
            account_id,
            prefix_base64,
            include_proof,
            network,
            rpc_url,
            block_height,
            block_hash,
        } => api::view_state(
            &account_id,
            &prefix_base64,
            include_proof,
            &network,
            rpc_url.as_deref(),
            block_height,
            block_hash.as_deref(),
        ),
        NearRpcAction::ViewCode {
            account_id,
            network,
            rpc_url,
            block_height,
            block_hash,
        } => api::view_code(
            &account_id,
            &network,
            rpc_url.as_deref(),
            block_height,
            block_hash.as_deref(),
        ),
        NearRpcAction::ViewFunction {
            account_id,
            method_name,
            args_base64,
            network,
            rpc_url,
            block_height,
            block_hash,
        } => api::view_function(
            &account_id,
            &method_name,
            &args_base64,
            &network,
            rpc_url.as_deref(),
            block_height,
            block_hash.as_deref(),
        ),
        NearRpcAction::GetBlock {
            block_height,
            block_hash,
            network,
            rpc_url,
        } => api::get_block(
            block_height,
            block_hash.as_deref(),
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::GetChunk {
            chunk_id,
            block_height,
            block_hash,
            shard_id,
            network,
            rpc_url,
        } => api::get_chunk(
            chunk_id.as_deref(),
            block_height,
            block_hash.as_deref(),
            shard_id,
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::GetRecentBlocks {
            count,
            network,
            rpc_url,
        } => api::get_recent_blocks(count, &network, rpc_url.as_deref()),
        NearRpcAction::GetTransaction {
            tx_hash,
            sender_account_id,
            wait_until,
            network,
            rpc_url,
        } => api::get_transaction(
            &tx_hash,
            &sender_account_id,
            wait_until.as_deref(),
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::TxStatus {
            tx_hash,
            sender_account_id,
            wait_until,
            network,
            rpc_url,
        } => api::tx_status(
            &tx_hash,
            &sender_account_id,
            wait_until.as_deref(),
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::SendTx {
            signed_tx_base64,
            wait_until,
            network,
            rpc_url,
        } => api::send_tx(
            &signed_tx_base64,
            wait_until.as_deref(),
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::BroadcastTxAsync {
            signed_tx_base64,
            network,
            rpc_url,
        } => api::broadcast_tx_async(&signed_tx_base64, &network, rpc_url.as_deref()),
        NearRpcAction::BroadcastTxCommit {
            signed_tx_base64,
            network,
            rpc_url,
        } => api::broadcast_tx_commit(&signed_tx_base64, &network, rpc_url.as_deref()),
        NearRpcAction::Status { network, rpc_url } => api::status(&network, rpc_url.as_deref()),
        NearRpcAction::Health { network, rpc_url } => api::health(&network, rpc_url.as_deref()),
        NearRpcAction::NetworkInfo { network, rpc_url } => {
            api::network_info(&network, rpc_url.as_deref())
        }
        NearRpcAction::ClientConfig { network, rpc_url } => {
            api::client_config(&network, rpc_url.as_deref())
        }
        NearRpcAction::Validators {
            block_height,
            block_hash,
            network,
            rpc_url,
        } => api::validators(
            block_height,
            block_hash.as_deref(),
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::GasPrice {
            block_height,
            block_hash,
            network,
            rpc_url,
        } => api::gas_price(
            block_height,
            block_hash.as_deref(),
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::ProtocolConfig {
            block_height,
            block_hash,
            epoch_id,
            network,
            rpc_url,
        } => api::protocol_config(
            block_height,
            block_hash.as_deref(),
            epoch_id.as_deref(),
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::GenesisConfig { network, rpc_url } => {
            api::genesis_config(&network, rpc_url.as_deref())
        }
        NearRpcAction::Changes {
            changes_type,
            account_ids,
            key_prefix_base64,
            public_key,
            block_height,
            block_hash,
            network,
            rpc_url,
        } => api::changes(
            api::ChangesQuery {
                changes_type: &changes_type,
                account_ids: &account_ids,
                key_prefix_base64: key_prefix_base64.as_deref(),
                public_key: public_key.as_deref(),
                block_height,
                block_hash: block_hash.as_deref(),
            },
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::ChangesInBlock {
            block_height,
            block_hash,
            network,
            rpc_url,
        } => api::changes_in_block(
            block_height,
            block_hash.as_deref(),
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::LightClientProof {
            proof_type,
            transaction_hash,
            sender_id,
            receipt_id,
            receiver_id,
            light_client_head,
            network,
            rpc_url,
        } => api::light_client_proof(
            api::LightClientProofRequest {
                proof_type: &proof_type,
                transaction_hash: transaction_hash.as_deref(),
                sender_id: sender_id.as_deref(),
                receipt_id: receipt_id.as_deref(),
                receiver_id: receiver_id.as_deref(),
                light_client_head: &light_client_head,
            },
            &network,
            rpc_url.as_deref(),
        ),
        NearRpcAction::NextLightClientBlock {
            last_block_hash,
            network,
            rpc_url,
        } => api::next_light_client_block(&last_block_hash, &network, rpc_url.as_deref()),
    }
}

fn action_name(action: &NearRpcAction) -> &'static str {
    match action {
        NearRpcAction::ViewAccount { .. } => "view_account",
        NearRpcAction::ViewAccountBalance { .. } => "view_account_balance",
        NearRpcAction::ViewAccessKey { .. } => "view_access_key",
        NearRpcAction::ViewAccessKeyList { .. } => "view_access_key_list",
        NearRpcAction::ViewState { .. } => "view_state",
        NearRpcAction::ViewCode { .. } => "view_code",
        NearRpcAction::ViewFunction { .. } => "view_function",
        NearRpcAction::GetBlock { .. } => "get_block",
        NearRpcAction::GetChunk { .. } => "get_chunk",
        NearRpcAction::GetRecentBlocks { .. } => "get_recent_blocks",
        NearRpcAction::GetTransaction { .. } => "get_transaction",
        NearRpcAction::TxStatus { .. } => "tx_status",
        NearRpcAction::SendTx { .. } => "send_tx",
        NearRpcAction::BroadcastTxAsync { .. } => "broadcast_tx_async",
        NearRpcAction::BroadcastTxCommit { .. } => "broadcast_tx_commit",
        NearRpcAction::Status { .. } => "status",
        NearRpcAction::Health { .. } => "health",
        NearRpcAction::NetworkInfo { .. } => "network_info",
        NearRpcAction::ClientConfig { .. } => "client_config",
        NearRpcAction::Validators { .. } => "validators",
        NearRpcAction::GasPrice { .. } => "gas_price",
        NearRpcAction::ProtocolConfig { .. } => "protocol_config",
        NearRpcAction::GenesisConfig { .. } => "genesis_config",
        NearRpcAction::Changes { .. } => "changes",
        NearRpcAction::ChangesInBlock { .. } => "changes_in_block",
        NearRpcAction::LightClientProof { .. } => "light_client_proof",
        NearRpcAction::NextLightClientBlock { .. } => "next_light_client_block",
    }
}

export!(NearRpcTool);
