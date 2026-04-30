use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum NearRpcAction {
    ViewAccount {
        account_id: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
    },
    ViewAccountBalance {
        account_id: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    ViewAccessKey {
        account_id: String,
        public_key: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
    },
    ViewAccessKeyList {
        account_id: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
    },
    ViewState {
        account_id: String,
        #[serde(default)]
        prefix_base64: String,
        #[serde(default)]
        include_proof: bool,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
    },
    ViewCode {
        account_id: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
    },
    ViewFunction {
        account_id: String,
        method_name: String,
        #[serde(default = "default_empty_args")]
        args_base64: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
    },

    GetBlock {
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    GetChunk {
        #[serde(default)]
        chunk_id: Option<String>,
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
        #[serde(default)]
        shard_id: Option<u64>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    GetRecentBlocks {
        #[serde(default = "default_block_count")]
        count: u32,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },

    GetTransaction {
        tx_hash: String,
        sender_account_id: String,
        #[serde(default)]
        wait_until: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    TxStatus {
        tx_hash: String,
        sender_account_id: String,
        #[serde(default)]
        wait_until: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    SendTx {
        signed_tx_base64: String,
        #[serde(default)]
        wait_until: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    BroadcastTxAsync {
        signed_tx_base64: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    BroadcastTxCommit {
        signed_tx_base64: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },

    Status {
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    Health {
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    NetworkInfo {
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    ClientConfig {
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },

    Validators {
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },

    GasPrice {
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    ProtocolConfig {
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
        #[serde(default)]
        epoch_id: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    GenesisConfig {
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },

    Changes {
        changes_type: String,
        #[serde(default)]
        account_ids: Vec<String>,
        #[serde(default)]
        key_prefix_base64: Option<String>,
        #[serde(default)]
        public_key: Option<String>,
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    ChangesInBlock {
        #[serde(default)]
        block_height: Option<u64>,
        #[serde(default)]
        block_hash: Option<String>,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },

    LightClientProof {
        proof_type: String,
        #[serde(default)]
        transaction_hash: Option<String>,
        #[serde(default)]
        sender_id: Option<String>,
        #[serde(default)]
        receipt_id: Option<String>,
        #[serde(default)]
        receiver_id: Option<String>,
        light_client_head: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    NextLightClientBlock {
        last_block_hash: String,
        #[serde(default = "default_network")]
        network: String,
        #[serde(default)]
        rpc_url: Option<String>,
    },
}

fn default_network() -> String {
    "mainnet".to_string()
}

fn default_empty_args() -> String {
    "e30=".to_string()
}

fn default_block_count() -> u32 {
    5
}
