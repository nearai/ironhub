use crate::rpc;
use serde_json::{json, Map, Value};

const DEFAULT_BLOCK: &str = "latest";

fn block_param(block: Option<&str>) -> Value {
    json!(block.unwrap_or(DEFAULT_BLOCK))
}

pub fn block_number(chain: Option<&str>, rpc_url: Option<&str>) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(&url, "eth_blockNumber", json!([]))
}

pub fn chain_id(chain: Option<&str>, rpc_url: Option<&str>) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(&url, "eth_chainId", json!([]))
}

pub fn gas_price(chain: Option<&str>, rpc_url: Option<&str>) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(&url, "eth_gasPrice", json!([]))
}

pub fn get_balance(
    address: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
    block: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(&url, "eth_getBalance", json!([address, block_param(block)]))
}

pub fn get_transaction_count(
    address: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
    block: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(
        &url,
        "eth_getTransactionCount",
        json!([address, block_param(block)]),
    )
}

pub fn get_code(
    address: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
    block: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(&url, "eth_getCode", json!([address, block_param(block)]))
}

pub fn get_storage_at(
    address: &str,
    slot: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
    block: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(
        &url,
        "eth_getStorageAt",
        json!([address, slot, block_param(block)]),
    )
}

pub fn eth_call(
    to: &str,
    data: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
    from: Option<&str>,
    value: Option<&str>,
    block: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    let mut tx = Map::new();
    tx.insert("to".into(), json!(to));
    tx.insert("data".into(), json!(data));
    if let Some(from) = from {
        tx.insert("from".into(), json!(from));
    }
    if let Some(value) = value {
        tx.insert("value".into(), json!(value));
    }
    rpc::call(
        &url,
        "eth_call",
        json!([Value::Object(tx), block_param(block)]),
    )
}

pub fn estimate_gas(
    to: &str,
    data: Option<&str>,
    chain: Option<&str>,
    rpc_url: Option<&str>,
    from: Option<&str>,
    value: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    let mut tx = Map::new();
    tx.insert("to".into(), json!(to));
    if let Some(data) = data {
        tx.insert("data".into(), json!(data));
    }
    if let Some(from) = from {
        tx.insert("from".into(), json!(from));
    }
    if let Some(value) = value {
        tx.insert("value".into(), json!(value));
    }
    rpc::call(&url, "eth_estimateGas", json!([Value::Object(tx)]))
}

pub fn get_block_by_number(
    block: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
    full: Option<bool>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(
        &url,
        "eth_getBlockByNumber",
        json!([block, full.unwrap_or(false)]),
    )
}

pub fn get_block_by_hash(
    block_hash: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
    full: Option<bool>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(
        &url,
        "eth_getBlockByHash",
        json!([block_hash, full.unwrap_or(false)]),
    )
}

pub fn get_transaction_by_hash(
    tx_hash: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(&url, "eth_getTransactionByHash", json!([tx_hash]))
}

pub fn get_transaction_receipt(
    tx_hash: &str,
    chain: Option<&str>,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    rpc::call(&url, "eth_getTransactionReceipt", json!([tx_hash]))
}

pub fn get_logs(
    chain: Option<&str>,
    rpc_url: Option<&str>,
    from_block: Option<&str>,
    to_block: Option<&str>,
    address: Option<&str>,
    topics: Option<&[Option<String>]>,
) -> Result<String, String> {
    let url = rpc::resolve_url(chain, rpc_url)?;
    let mut filter = Map::new();
    if let Some(from) = from_block {
        filter.insert("fromBlock".into(), json!(from));
    }
    if let Some(to) = to_block {
        filter.insert("toBlock".into(), json!(to));
    }
    if let Some(addr) = address {
        filter.insert("address".into(), json!(addr));
    }
    if let Some(topics) = topics {
        let topics_json: Vec<Value> = topics
            .iter()
            .map(|t| match t {
                Some(s) => json!(s),
                None => Value::Null,
            })
            .collect();
        filter.insert("topics".into(), Value::Array(topics_json));
    }
    rpc::call(&url, "eth_getLogs", json!([Value::Object(filter)]))
}
