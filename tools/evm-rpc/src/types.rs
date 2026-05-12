use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(tag = "action", rename_all = "snake_case")]
#[allow(clippy::enum_variant_names)]
pub enum EvmRpcAction {
    EthBlockNumber {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    EthChainId {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    EthGasPrice {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    EthGetBalance {
        address: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block: Option<String>,
    },
    EthGetTransactionCount {
        address: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block: Option<String>,
    },
    EthGetCode {
        address: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block: Option<String>,
    },
    EthGetStorageAt {
        address: String,
        slot: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        block: Option<String>,
    },
    EthCall {
        to: String,
        data: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        from: Option<String>,
        #[serde(default)]
        value: Option<String>,
        #[serde(default)]
        block: Option<String>,
    },
    EthEstimateGas {
        to: String,
        #[serde(default)]
        data: Option<String>,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        from: Option<String>,
        #[serde(default)]
        value: Option<String>,
    },
    EthGetBlockByNumber {
        block: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        full: Option<bool>,
    },
    EthGetBlockByHash {
        block_hash: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        full: Option<bool>,
    },
    EthGetTransactionByHash {
        tx_hash: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    EthGetTransactionReceipt {
        tx_hash: String,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
    },
    EthGetLogs {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        rpc_url: Option<String>,
        #[serde(default)]
        from_block: Option<String>,
        #[serde(default)]
        to_block: Option<String>,
        #[serde(default)]
        address: Option<String>,
        #[serde(default)]
        topics: Option<Vec<Option<String>>>,
    },
}
