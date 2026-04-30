use crate::rpc;
use serde::de::IgnoredAny;
use serde::Deserialize;
use serde_json::{json, Map, Value};

pub fn view_account(
    account_id: &str,
    network: &str,
    rpc_url: Option<&str>,
    block_height: Option<u64>,
    block_hash: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("request_type".into(), json!("view_account"));
    params.insert("account_id".into(), json!(account_id));
    apply_block_reference(&mut params, block_height, block_hash);
    rpc::call(&url, "query", Value::Object(params))
}

#[derive(Deserialize)]
struct AccountState {
    #[serde(default)]
    amount: String,
    #[serde(default)]
    locked: String,
    #[serde(default)]
    storage_usage: u64,
}

pub fn view_account_balance(
    account_id: &str,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let raw = view_account(account_id, network, rpc_url, None, None)?;
    let state: AccountState = serde_json::from_str(&raw)
        .map_err(|e| format!("view_account_balance parse error: {}", e))?;

    let response = json!({
        "account_id": account_id,
        "balance_yocto": state.amount,
        "balance_near": yocto_to_near(&state.amount),
        "locked_yocto": state.locked,
        "locked_near": yocto_to_near(&state.locked),
        "storage_usage": state.storage_usage,
    });
    serde_json::to_string(&response).map_err(|e| e.to_string())
}

pub fn view_access_key(
    account_id: &str,
    public_key: &str,
    network: &str,
    rpc_url: Option<&str>,
    block_height: Option<u64>,
    block_hash: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("request_type".into(), json!("view_access_key"));
    params.insert("account_id".into(), json!(account_id));
    params.insert("public_key".into(), json!(public_key));
    apply_block_reference(&mut params, block_height, block_hash);
    rpc::call(&url, "query", Value::Object(params))
}

pub fn view_access_key_list(
    account_id: &str,
    network: &str,
    rpc_url: Option<&str>,
    block_height: Option<u64>,
    block_hash: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("request_type".into(), json!("view_access_key_list"));
    params.insert("account_id".into(), json!(account_id));
    apply_block_reference(&mut params, block_height, block_hash);
    rpc::call(&url, "query", Value::Object(params))
}

pub fn view_state(
    account_id: &str,
    prefix_base64: &str,
    include_proof: bool,
    network: &str,
    rpc_url: Option<&str>,
    block_height: Option<u64>,
    block_hash: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("request_type".into(), json!("view_state"));
    params.insert("account_id".into(), json!(account_id));
    params.insert("prefix_base64".into(), json!(prefix_base64));
    if include_proof {
        params.insert("include_proof".into(), json!(true));
    }
    apply_block_reference(&mut params, block_height, block_hash);
    rpc::call(&url, "query", Value::Object(params))
}

pub fn view_code(
    account_id: &str,
    network: &str,
    rpc_url: Option<&str>,
    block_height: Option<u64>,
    block_hash: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("request_type".into(), json!("view_code"));
    params.insert("account_id".into(), json!(account_id));
    apply_block_reference(&mut params, block_height, block_hash);
    rpc::call(&url, "query", Value::Object(params))
}

#[derive(Deserialize)]
struct CallFunctionResult {
    #[serde(default)]
    result: Vec<u8>,
    #[serde(default)]
    logs: Vec<String>,
    #[serde(default)]
    block_height: Option<u64>,
    #[serde(default)]
    block_hash: Option<String>,
}

pub fn view_function(
    account_id: &str,
    method_name: &str,
    args_base64: &str,
    network: &str,
    rpc_url: Option<&str>,
    block_height: Option<u64>,
    block_hash: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("request_type".into(), json!("call_function"));
    params.insert("account_id".into(), json!(account_id));
    params.insert("method_name".into(), json!(method_name));
    params.insert("args_base64".into(), json!(args_base64));
    apply_block_reference(&mut params, block_height, block_hash);

    let raw = rpc::call(&url, "query", Value::Object(params))?;
    let parsed: CallFunctionResult =
        serde_json::from_str(&raw).map_err(|e| format!("view_function parse error: {}", e))?;

    let decoded = String::from_utf8(parsed.result)
        .map_err(|e| format!("view_function result not UTF-8: {}", e))?;

    let output = serde_json::from_str::<Value>(&decoded).unwrap_or(Value::String(decoded));

    let response = json!({
        "result": output,
        "logs": parsed.logs,
        "block_height": parsed.block_height,
        "block_hash": parsed.block_hash,
    });
    serde_json::to_string(&response).map_err(|e| e.to_string())
}

pub fn get_block(
    block_height: Option<u64>,
    block_hash: Option<&str>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    apply_block_reference(&mut params, block_height, block_hash);
    rpc::call(&url, "block", Value::Object(params))
}

pub fn get_chunk(
    chunk_id: Option<&str>,
    block_height: Option<u64>,
    block_hash: Option<&str>,
    shard_id: Option<u64>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    if let Some(cid) = chunk_id {
        return rpc::call(&url, "chunk", json!({"chunk_id": cid}));
    }
    let block = match (block_height, block_hash) {
        (Some(h), _) => json!(h),
        (_, Some(hash)) => json!(hash),
        _ => {
            return Err(
                "get_chunk requires chunk_id, or block_height/block_hash + shard_id".to_string(),
            )
        }
    };
    let sid = shard_id.ok_or("get_chunk by block requires shard_id")?;
    rpc::call(&url, "chunk", json!({"block_id": block, "shard_id": sid}))
}

#[derive(Deserialize)]
struct StatusSyncInfo {
    latest_block_height: u64,
}

#[derive(Deserialize)]
struct StatusSummary {
    sync_info: StatusSyncInfo,
}

#[derive(Deserialize)]
struct BlockSummary {
    header: BlockHeaderSummary,
    #[serde(default)]
    author: Option<String>,
}

#[derive(Deserialize)]
struct BlockHeaderSummary {
    #[serde(default)]
    height: Option<u64>,
    #[serde(default)]
    hash: Option<String>,
    #[serde(default)]
    prev_hash: Option<String>,
    #[serde(default)]
    timestamp_nanosec: Option<String>,
    #[serde(default)]
    gas_price: Option<String>,
    #[serde(default)]
    chunks_included: Option<u64>,
}

pub fn get_recent_blocks(
    count: u32,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let count = count.min(10);
    let url = rpc::resolve_url(network, rpc_url);

    let status_raw = rpc::call(&url, "status", json!([]))?;
    let status: StatusSummary = serde_json::from_str(&status_raw)
        .map_err(|e| format!("get_recent_blocks status parse error: {}", e))?;
    let latest = status.sync_info.latest_block_height;

    let mut blocks = Vec::with_capacity(count as usize);
    for i in 0..count as u64 {
        let height = latest.saturating_sub(i);
        let block_raw = match rpc::call(&url, "block", json!({"block_id": height})) {
            Ok(b) => b,
            Err(_) => continue,
        };
        let block: BlockSummary = match serde_json::from_str(&block_raw) {
            Ok(b) => b,
            Err(_) => continue,
        };
        blocks.push(json!({
            "height": block.header.height,
            "hash": block.header.hash,
            "prev_hash": block.header.prev_hash,
            "timestamp_nanosec": block.header.timestamp_nanosec,
            "author": block.author,
            "gas_price": block.header.gas_price,
            "chunks_included": block.header.chunks_included,
        }));
    }

    let response = json!({
        "latest_height": latest,
        "blocks": blocks,
    });
    serde_json::to_string(&response).map_err(|e| e.to_string())
}

pub fn get_transaction(
    tx_hash: &str,
    sender_account_id: &str,
    wait_until: Option<&str>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let params = match wait_until {
        Some(w) => json!({
            "tx_hash": tx_hash,
            "sender_account_id": sender_account_id,
            "wait_until": w,
        }),
        None => json!([tx_hash, sender_account_id]),
    };
    rpc::call(&url, "tx", params)
}

pub fn tx_status(
    tx_hash: &str,
    sender_account_id: &str,
    wait_until: Option<&str>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("tx_hash".into(), json!(tx_hash));
    params.insert("sender_account_id".into(), json!(sender_account_id));
    if let Some(w) = wait_until {
        params.insert("wait_until".into(), json!(w));
    }
    rpc::call(&url, "EXPERIMENTAL_tx_status", Value::Object(params))
}

pub fn send_tx(
    signed_tx_base64: &str,
    wait_until: Option<&str>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("signed_tx_base64".into(), json!(signed_tx_base64));
    if let Some(w) = wait_until {
        params.insert("wait_until".into(), json!(w));
    }
    rpc::call(&url, "send_tx", Value::Object(params))
}

pub fn broadcast_tx_async(
    signed_tx_base64: &str,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    rpc::call(&url, "broadcast_tx_async", json!([signed_tx_base64]))
}

pub fn broadcast_tx_commit(
    signed_tx_base64: &str,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    rpc::call(&url, "broadcast_tx_commit", json!([signed_tx_base64]))
}

pub fn status(network: &str, rpc_url: Option<&str>) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    rpc::call(&url, "status", json!([]))
}

pub fn health(network: &str, rpc_url: Option<&str>) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    rpc::call(&url, "health", json!([]))
}

pub fn network_info(network: &str, rpc_url: Option<&str>) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    rpc::call(&url, "network_info", json!([]))
}

pub fn client_config(network: &str, rpc_url: Option<&str>) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    rpc::call(&url, "client_config", json!([]))
}

#[derive(Deserialize)]
struct ValidatorsCounts {
    #[serde(default)]
    current_validators: Vec<IgnoredAny>,
    #[serde(default)]
    next_validators: Vec<IgnoredAny>,
    #[serde(default)]
    current_proposals: Vec<IgnoredAny>,
    #[serde(default)]
    prev_epoch_kickout: Vec<IgnoredAny>,
    #[serde(default)]
    current_fishermen: Vec<IgnoredAny>,
    #[serde(default)]
    next_fishermen: Vec<IgnoredAny>,
    #[serde(default)]
    epoch_height: Option<u64>,
    #[serde(default)]
    epoch_start_height: Option<u64>,
}

pub fn validators(
    block_height: Option<u64>,
    block_hash: Option<&str>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let block_id = match (block_height, block_hash) {
        (Some(h), _) => json!(h),
        (_, Some(h)) => json!(h),
        _ => Value::Null,
    };
    let raw = rpc::call(&url, "validators", json!([block_id]))?;

    let counts: ValidatorsCounts =
        serde_json::from_str(&raw).map_err(|e| format!("validators parse error: {}", e))?;

    let response = format!(
        r#"{{"current_validators_count":{},"next_validators_count":{},"current_proposals_count":{},"prev_epoch_kickout_count":{},"current_fishermen_count":{},"next_fishermen_count":{},"epoch_height":{},"epoch_start_height":{},"raw":{}}}"#,
        counts.current_validators.len(),
        counts.next_validators.len(),
        counts.current_proposals.len(),
        counts.prev_epoch_kickout.len(),
        counts.current_fishermen.len(),
        counts.next_fishermen.len(),
        counts
            .epoch_height
            .map(|n| n.to_string())
            .unwrap_or_else(|| "null".to_string()),
        counts
            .epoch_start_height
            .map(|n| n.to_string())
            .unwrap_or_else(|| "null".to_string()),
        raw,
    );
    Ok(response)
}

pub fn gas_price(
    block_height: Option<u64>,
    block_hash: Option<&str>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let block_id = match (block_height, block_hash) {
        (Some(h), _) => json!(h),
        (_, Some(h)) => json!(h),
        _ => Value::Null,
    };
    rpc::call(&url, "gas_price", json!([block_id]))
}

pub fn protocol_config(
    block_height: Option<u64>,
    block_hash: Option<&str>,
    epoch_id: Option<&str>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    if let Some(eid) = epoch_id {
        params.insert("epoch_id".into(), json!(eid));
    } else {
        apply_block_reference(&mut params, block_height, block_hash);
    }
    rpc::call(&url, "EXPERIMENTAL_protocol_config", Value::Object(params))
}

pub fn genesis_config(network: &str, rpc_url: Option<&str>) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    rpc::call(&url, "EXPERIMENTAL_genesis_config", json!([]))
}

pub struct ChangesQuery<'a> {
    pub changes_type: &'a str,
    pub account_ids: &'a [String],
    pub key_prefix_base64: Option<&'a str>,
    pub public_key: Option<&'a str>,
    pub block_height: Option<u64>,
    pub block_hash: Option<&'a str>,
}

pub fn changes(
    query: ChangesQuery,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("changes_type".into(), json!(query.changes_type));

    match query.changes_type {
        "account_changes" | "all_access_key_changes" | "contract_code_changes" => {
            require_account_ids(query.account_ids, query.changes_type)?;
            params.insert("account_ids".into(), json!(query.account_ids));
        }
        "data_changes" => {
            require_account_ids(query.account_ids, query.changes_type)?;
            let prefix = query
                .key_prefix_base64
                .ok_or("data_changes requires key_prefix_base64")?;
            params.insert("account_ids".into(), json!(query.account_ids));
            params.insert("key_prefix_base64".into(), json!(prefix));
        }
        "single_access_key_changes" => {
            require_account_ids(query.account_ids, query.changes_type)?;
            let pk = query
                .public_key
                .ok_or("single_access_key_changes requires public_key")?;
            let keys: Vec<Value> = query
                .account_ids
                .iter()
                .map(|aid| json!({"account_id": aid, "public_key": pk}))
                .collect();
            params.insert("keys".into(), json!(keys));
        }
        other => {
            return Err(format!(
                "Unknown changes_type '{}'. Valid: account_changes, single_access_key_changes, all_access_key_changes, data_changes, contract_code_changes",
                other
            ));
        }
    }

    apply_block_reference(&mut params, query.block_height, query.block_hash);
    rpc::call(&url, "EXPERIMENTAL_changes", Value::Object(params))
}

pub fn changes_in_block(
    block_height: Option<u64>,
    block_hash: Option<&str>,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    apply_block_reference(&mut params, block_height, block_hash);
    rpc::call(&url, "EXPERIMENTAL_changes_in_block", Value::Object(params))
}

pub struct LightClientProofRequest<'a> {
    pub proof_type: &'a str,
    pub transaction_hash: Option<&'a str>,
    pub sender_id: Option<&'a str>,
    pub receipt_id: Option<&'a str>,
    pub receiver_id: Option<&'a str>,
    pub light_client_head: &'a str,
}

pub fn light_client_proof(
    request: LightClientProofRequest,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    let mut params = Map::new();
    params.insert("type".into(), json!(request.proof_type));
    params.insert("light_client_head".into(), json!(request.light_client_head));

    match request.proof_type {
        "transaction" => {
            let tx_hash = request
                .transaction_hash
                .ok_or("light_client_proof type=transaction requires transaction_hash")?;
            let sender = request
                .sender_id
                .ok_or("light_client_proof type=transaction requires sender_id")?;
            params.insert("transaction_hash".into(), json!(tx_hash));
            params.insert("sender_id".into(), json!(sender));
        }
        "receipt" => {
            let rid = request
                .receipt_id
                .ok_or("light_client_proof type=receipt requires receipt_id")?;
            let recv = request
                .receiver_id
                .ok_or("light_client_proof type=receipt requires receiver_id")?;
            params.insert("receipt_id".into(), json!(rid));
            params.insert("receiver_id".into(), json!(recv));
        }
        other => {
            return Err(format!(
                "Unknown light_client_proof type '{}'. Valid: transaction, receipt",
                other
            ));
        }
    }

    rpc::call(&url, "light_client_proof", Value::Object(params))
}

pub fn next_light_client_block(
    last_block_hash: &str,
    network: &str,
    rpc_url: Option<&str>,
) -> Result<String, String> {
    let url = rpc::resolve_url(network, rpc_url);
    rpc::call(&url, "next_light_client_block", json!([last_block_hash]))
}

fn apply_block_reference(
    params: &mut Map<String, Value>,
    block_height: Option<u64>,
    block_hash: Option<&str>,
) {
    match (block_height, block_hash) {
        (Some(h), _) => {
            params.insert("block_id".into(), json!(h));
        }
        (_, Some(h)) => {
            params.insert("block_id".into(), json!(h));
        }
        _ => {
            params.insert("finality".into(), json!("final"));
        }
    }
}

fn require_account_ids(account_ids: &[String], changes_type: &str) -> Result<(), String> {
    if account_ids.is_empty() {
        return Err(format!("{} requires non-empty account_ids", changes_type));
    }
    Ok(())
}

fn yocto_to_near(yocto: &str) -> String {
    let padded = format!("{:0>25}", yocto);
    let split = padded.len() - 24;
    let whole = &padded[..split];
    let frac = padded[split..].trim_end_matches('0');
    if frac.is_empty() {
        whole.to_string()
    } else {
        format!("{}.{}", whole, frac)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn whole_near() {
        assert_eq!(yocto_to_near("1000000000000000000000000"), "1");
    }

    #[test]
    fn fractional_near() {
        assert_eq!(yocto_to_near("1500000000000000000000000"), "1.5");
    }

    #[test]
    fn sub_one_near() {
        assert_eq!(yocto_to_near("500000000000000000000000"), "0.5");
    }

    #[test]
    fn zero() {
        assert_eq!(yocto_to_near("0"), "0");
    }

    #[test]
    fn large_balance() {
        assert_eq!(yocto_to_near("65000000000000000000000000000"), "65000");
    }

    #[test]
    fn precise_fraction() {
        assert_eq!(yocto_to_near("123456789000000000000000000"), "123.456789");
    }

    #[test]
    fn one_yocto() {
        let result = yocto_to_near("1");
        assert!(result.starts_with("0."));
        assert!(result.ends_with('1'));
    }

    #[test]
    fn block_reference_height_takes_precedence() {
        let mut params = Map::new();
        apply_block_reference(&mut params, Some(196_000_000), Some("ignored"));
        assert_eq!(params.get("block_id"), Some(&json!(196_000_000)));
        assert!(params.get("finality").is_none());
    }

    #[test]
    fn block_reference_hash_when_no_height() {
        let mut params = Map::new();
        apply_block_reference(&mut params, None, Some("HwwwHwww"));
        assert_eq!(params.get("block_id"), Some(&json!("HwwwHwww")));
        assert!(params.get("finality").is_none());
    }

    #[test]
    fn block_reference_finality_when_neither() {
        let mut params = Map::new();
        apply_block_reference(&mut params, None, None);
        assert_eq!(params.get("finality"), Some(&json!("final")));
        assert!(params.get("block_id").is_none());
    }

    #[test]
    fn require_account_ids_rejects_empty() {
        let empty: Vec<String> = vec![];
        let err = require_account_ids(&empty, "account_changes").unwrap_err();
        assert!(err.contains("account_changes"));
        assert!(err.contains("non-empty"));
    }

    #[test]
    fn require_account_ids_accepts_non_empty() {
        let ids = vec!["alice.near".to_string()];
        assert!(require_account_ids(&ids, "data_changes").is_ok());
    }

    #[test]
    fn validators_counts_parse() {
        let raw = r#"{
            "current_validators": [{"a":1},{"b":2},{"c":3}],
            "next_validators": [{"x":1}],
            "current_proposals": [],
            "prev_epoch_kickout": [{"k":1},{"k":2}],
            "current_fishermen": [],
            "next_fishermen": [],
            "epoch_height": 1234,
            "epoch_start_height": 196000000
        }"#;
        let counts: ValidatorsCounts = serde_json::from_str(raw).unwrap();
        assert_eq!(counts.current_validators.len(), 3);
        assert_eq!(counts.next_validators.len(), 1);
        assert_eq!(counts.current_proposals.len(), 0);
        assert_eq!(counts.prev_epoch_kickout.len(), 2);
        assert_eq!(counts.epoch_height, Some(1234));
        assert_eq!(counts.epoch_start_height, Some(196000000));
    }
}
