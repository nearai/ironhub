mod api;
mod rpc;
mod types;

use types::EvmRpcAction;

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

struct EvmRpcTool;

impl exports::near::agent::tool::Guest for EvmRpcTool {
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
        let schema = schemars::schema_for!(EvmRpcAction);
        serde_json::to_string(&schema).expect("schema serialization is infallible")
    }

    fn description() -> String {
        "EVM JSON-RPC. Read native and ERC-20 balances, contract code and \
         storage, call view functions, fetch blocks, transactions, receipts, \
         and event logs. Built-in chain shortcuts: ethereum, polygon, \
         arbitrum, optimism, base, bnb, avalanche. Pass `rpc_url` for any \
         other EVM-compatible network. Read-only: no transaction signing in \
         this tool.\n\
         \n\
         Parameter formats (all hex strings use 0x prefix):\n\
         - Block numbers: hex string like \"0x112a880\" (= block 18000000), \
         or tags \"latest\", \"earliest\", \"pending\", \"safe\", \"finalized\".\n\
         - Addresses: 40 hex chars after 0x.\n\
         - Tx and block hashes: 64 hex chars after 0x.\n\
         - Storage slots, call data, log topics: hex string.\n\
         - Logs `topics`: array of strings or nulls; use null to wildcard a slot."
            .to_string()
    }
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: EvmRpcAction = serde_json::from_str(params).map_err(|e| {
        crate::near::agent::host::log(
            crate::near::agent::host::LogLevel::Warn,
            &format!("evm-rpc parse failed: {} | raw={}", e, params),
        );
        format!("invalid params: {e}")
    })?;

    match action {
        EvmRpcAction::EthBlockNumber { chain, rpc_url } => {
            api::block_number(chain.as_deref(), rpc_url.as_deref())
        }
        EvmRpcAction::EthChainId { chain, rpc_url } => {
            api::chain_id(chain.as_deref(), rpc_url.as_deref())
        }
        EvmRpcAction::EthGasPrice { chain, rpc_url } => {
            api::gas_price(chain.as_deref(), rpc_url.as_deref())
        }
        EvmRpcAction::EthGetBalance {
            address,
            chain,
            rpc_url,
            block,
        } => api::get_balance(
            &address,
            chain.as_deref(),
            rpc_url.as_deref(),
            block.as_deref(),
        ),
        EvmRpcAction::EthGetTransactionCount {
            address,
            chain,
            rpc_url,
            block,
        } => api::get_transaction_count(
            &address,
            chain.as_deref(),
            rpc_url.as_deref(),
            block.as_deref(),
        ),
        EvmRpcAction::EthGetCode {
            address,
            chain,
            rpc_url,
            block,
        } => api::get_code(
            &address,
            chain.as_deref(),
            rpc_url.as_deref(),
            block.as_deref(),
        ),
        EvmRpcAction::EthGetStorageAt {
            address,
            slot,
            chain,
            rpc_url,
            block,
        } => api::get_storage_at(
            &address,
            &slot,
            chain.as_deref(),
            rpc_url.as_deref(),
            block.as_deref(),
        ),
        EvmRpcAction::EthCall {
            to,
            data,
            chain,
            rpc_url,
            from,
            value,
            block,
        } => api::eth_call(
            &to,
            &data,
            chain.as_deref(),
            rpc_url.as_deref(),
            from.as_deref(),
            value.as_deref(),
            block.as_deref(),
        ),
        EvmRpcAction::EthEstimateGas {
            to,
            data,
            chain,
            rpc_url,
            from,
            value,
        } => api::estimate_gas(
            &to,
            data.as_deref(),
            chain.as_deref(),
            rpc_url.as_deref(),
            from.as_deref(),
            value.as_deref(),
        ),
        EvmRpcAction::EthGetBlockByNumber {
            block,
            chain,
            rpc_url,
            full,
        } => api::get_block_by_number(&block, chain.as_deref(), rpc_url.as_deref(), full),
        EvmRpcAction::EthGetBlockByHash {
            block_hash,
            chain,
            rpc_url,
            full,
        } => api::get_block_by_hash(&block_hash, chain.as_deref(), rpc_url.as_deref(), full),
        EvmRpcAction::EthGetTransactionByHash {
            tx_hash,
            chain,
            rpc_url,
        } => api::get_transaction_by_hash(&tx_hash, chain.as_deref(), rpc_url.as_deref()),
        EvmRpcAction::EthGetTransactionReceipt {
            tx_hash,
            chain,
            rpc_url,
        } => api::get_transaction_receipt(&tx_hash, chain.as_deref(), rpc_url.as_deref()),
        EvmRpcAction::EthGetLogs {
            chain,
            rpc_url,
            from_block,
            to_block,
            address,
            topics,
        } => {
            let topics_ref = topics.as_deref();
            api::get_logs(
                chain.as_deref(),
                rpc_url.as_deref(),
                from_block.as_deref(),
                to_block.as_deref(),
                address.as_deref(),
                topics_ref,
            )
        }
    }
}

export!(EvmRpcTool);

#[cfg(test)]
mod tests {
    use super::*;
    use crate::exports::near::agent::tool::Guest as _;

    #[test]
    fn schema_serializes_to_json_object() {
        let schema_str = EvmRpcTool::schema();
        let parsed: serde_json::Value = serde_json::from_str(&schema_str).unwrap();
        assert!(parsed.is_object());
    }

    #[test]
    fn description_mentions_chain_shortcuts() {
        let d = EvmRpcTool::description();
        for chain in ["ethereum", "polygon", "arbitrum", "optimism", "base", "bnb", "avalanche"] {
            assert!(d.contains(chain), "description missing chain shortcut: {chain}");
        }
    }

    #[test]
    fn parse_eth_block_number_with_chain() {
        let action: EvmRpcAction =
            serde_json::from_str(r#"{"action":"eth_block_number","chain":"polygon"}"#).unwrap();
        match action {
            EvmRpcAction::EthBlockNumber { chain, rpc_url } => {
                assert_eq!(chain.as_deref(), Some("polygon"));
                assert!(rpc_url.is_none());
            }
            _ => panic!("expected EthBlockNumber"),
        }
    }

    #[test]
    fn parse_eth_call_full_shape() {
        let json = r#"{
            "action": "eth_call",
            "chain": "ethereum",
            "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "data": "0x70a08231000000000000000000000000abc",
            "block": "latest"
        }"#;
        let action: EvmRpcAction = serde_json::from_str(json).unwrap();
        match action {
            EvmRpcAction::EthCall {
                to, data, block, ..
            } => {
                assert_eq!(to, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
                assert!(data.starts_with("0x70a08231"));
                assert_eq!(block.as_deref(), Some("latest"));
            }
            _ => panic!("expected EthCall"),
        }
    }

    #[test]
    fn parse_eth_get_logs_with_topics_including_null() {
        let json = r#"{
            "action": "eth_get_logs",
            "from_block": "0x100",
            "to_block": "latest",
            "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", null]
        }"#;
        let action: EvmRpcAction = serde_json::from_str(json).unwrap();
        match action {
            EvmRpcAction::EthGetLogs {
                from_block,
                to_block,
                topics,
                ..
            } => {
                assert_eq!(from_block.as_deref(), Some("0x100"));
                assert_eq!(to_block.as_deref(), Some("latest"));
                let topics = topics.expect("topics present");
                assert_eq!(topics.len(), 2);
                assert!(topics[0].as_deref().unwrap().starts_with("0xddf252"));
                assert!(topics[1].is_none());
            }
            _ => panic!("expected EthGetLogs"),
        }
    }
}
