//! Etherscan V2 WASM Tool for IronClaw.
//!
//! Wraps the Etherscan v2 API (<https://api.etherscan.io/v2/api>) to query
//! blockchain index and contract data across 60+ EVM-compatible chains.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const SECRET_NAME: &str = "etherscan_api_key";
const MAX_RETRIES: u32 = 3;
const HTTP_TIMEOUT_MS: u32 = 30_000;

struct EtherscanTool;

impl exports::near::agent::tool::Guest for EtherscanTool {
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
        SCHEMA.to_string()
    }

    fn description() -> String {
        "Etherscan v2 cryptocurrency price and market oracle. \
         Actions: 'balance', 'balancemulti', 'txlist', 'txlistinternal', \
         'tokentx', 'tokennfttx', 'token1155tx', 'getabi', 'getsourcecode', \
         'getstatus', 'gettxreceiptstatus'. \
         Supports 60+ EVM-compatible networks using the 'chain' parameter (name or ID). \
         Authentication uses 'etherscan_api_key' injected as query param 'apikey' by host."
            .to_string()
    }
}

/// Tool actions. Selected via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    Balance {
        address: String,
        chain: Value,
    },
    #[serde(rename = "balancemulti")]
    BalanceMulti {
        address: String,
        chain: Value,
    },
    Txlist {
        address: String,
        chain: Value,
        #[serde(default)]
        startblock: Option<u64>,
        #[serde(default)]
        endblock: Option<u64>,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
        #[serde(default)]
        sort: Option<String>,
    },
    Txlistinternal {
        chain: Value,
        #[serde(default)]
        address: Option<String>,
        #[serde(default)]
        txhash: Option<String>,
        #[serde(default)]
        startblock: Option<u64>,
        #[serde(default)]
        endblock: Option<u64>,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
        #[serde(default)]
        sort: Option<String>,
    },
    Tokentx {
        chain: Value,
        #[serde(default)]
        address: Option<String>,
        #[serde(default)]
        contractaddress: Option<String>,
        #[serde(default)]
        startblock: Option<u64>,
        #[serde(default)]
        endblock: Option<u64>,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
        #[serde(default)]
        sort: Option<String>,
    },
    Tokennfttx {
        chain: Value,
        #[serde(default)]
        address: Option<String>,
        #[serde(default)]
        contractaddress: Option<String>,
        #[serde(default)]
        startblock: Option<u64>,
        #[serde(default)]
        endblock: Option<u64>,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
        #[serde(default)]
        sort: Option<String>,
    },
    Token1155tx {
        chain: Value,
        #[serde(default)]
        address: Option<String>,
        #[serde(default)]
        contractaddress: Option<String>,
        #[serde(default)]
        startblock: Option<u64>,
        #[serde(default)]
        endblock: Option<u64>,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        offset: Option<u32>,
        #[serde(default)]
        sort: Option<String>,
    },
    Getabi {
        address: String,
        chain: Value,
    },
    Getsourcecode {
        address: String,
        chain: Value,
    },
    Getstatus {
        txhash: String,
        chain: Value,
    },
    Gettxreceiptstatus {
        txhash: String,
        chain: Value,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid parameters: {e}. Provide an 'action' field (one of: balance, balancemulti, \
             txlist, txlistinternal, tokentx, nfttx, token1155tx, getabi, getsourcecode, \
             getstatus, gettxreceiptstatus)."
        )
    })?;

    // Pre-flight: verify Etherscan capabilities key exists.
    if !near::agent::host::secret_exists(SECRET_NAME) {
        return Err(
            "Etherscan API key not configured in capabilities. Run setup for the tool."
                .to_string(),
        );
    }

    match action {
        Action::Balance { address, chain } => run_balance(address, resolve_chain(&chain)?),
        Action::BalanceMulti { address, chain } => run_balance_multi(address, resolve_chain(&chain)?),
        Action::Txlist {
            address,
            chain,
            startblock,
            endblock,
            page,
            offset,
            sort,
        } => run_txlist(address, resolve_chain(&chain)?, startblock, endblock, page, offset, sort),
        Action::Txlistinternal {
            chain,
            address,
            txhash,
            startblock,
            endblock,
            page,
            offset,
            sort,
        } => run_txlistinternal(resolve_chain(&chain)?, address, txhash, startblock, endblock, page, offset, sort),
        Action::Tokentx {
            chain,
            address,
            contractaddress,
            startblock,
            endblock,
            page,
            offset,
            sort,
        } => run_tokentx(resolve_chain(&chain)?, address, contractaddress, startblock, endblock, page, offset, sort),
        Action::Tokennfttx {
            chain,
            address,
            contractaddress,
            startblock,
            endblock,
            page,
            offset,
            sort,
        } => run_tokennfttx(resolve_chain(&chain)?, address, contractaddress, startblock, endblock, page, offset, sort),
        Action::Token1155tx {
            chain,
            address,
            contractaddress,
            startblock,
            endblock,
            page,
            offset,
            sort,
        } => run_token1155tx(resolve_chain(&chain)?, address, contractaddress, startblock, endblock, page, offset, sort),
        Action::Getabi { address, chain } => run_getabi(address, resolve_chain(&chain)?),
        Action::Getsourcecode { address, chain } => run_getsourcecode(address, resolve_chain(&chain)?),
        Action::Getstatus { txhash, chain } => run_getstatus(txhash, resolve_chain(&chain)?),
        Action::Gettxreceiptstatus { txhash, chain } => run_gettxreceiptstatus(txhash, resolve_chain(&chain)?),
    }
}

// ==================== Chain Resolution Helpers ====================

fn normalize_chain_name(name: &str) -> String {
    name.to_lowercase()
        .replace(" mainnet", "")
        .replace(" testnet", "")
        .replace(" c-chain", "")
        .replace(" smart chain", "")
        .replace(" one", "")
        .replace(" alpha", "")
        .replace(" curtis", "")
        .replace(" sepolia", "")
        .replace(" amoy", "")
        .replace(" apothem", "")
        .replace(" bepolia", "")
        .replace(" bokuto", "")
        .replace(" insectarium", "")
        .replace(" hoodi", "")
        .replace("-", "")
        .replace("_", "")
        .replace(" ", "")
}

fn lookup_static_chain(normalized_name: &str) -> Option<u32> {
    match normalized_name {
        "ethereum" | "eth" => Some(1),
        "sepolia" => Some(11155111),
        "hoodi" => Some(560048),
        "bnbsmartchain" | "bsc" | "bnb" | "binance" => Some(56),
        "polygon" | "matic" => Some(137),
        "polygonamoy" | "amoy" => Some(80002),
        "base" => Some(8453),
        "basesepolia" => Some(84532),
        "arbitrum" | "arbitrumone" | "arb" => Some(42161),
        "arbitrumsepolia" => Some(421614),
        "linea" => Some(59144),
        "lineasepolia" => Some(59141),
        "blast" => Some(81457),
        "blastsepolia" => Some(168587773),
        "op" | "optimism" => Some(10),
        "opsepolia" | "optimismsepolia" => Some(11155420),
        "avalanche" | "avax" => Some(43114),
        "avalanchefuji" | "fuji" => Some(43113),
        "bittorrent" | "btt" => Some(199),
        "celo" => Some(42220),
        "celosepolia" => Some(11142220),
        "fraxtal" => Some(252),
        "gnosis" | "gno" => Some(100),
        "mantle" => Some(5000),
        "memecore" => Some(4352),
        "moonbeam" => Some(1284),
        "moonriver" => Some(1285),
        "moonbase" => Some(1287),
        "opbnb" => Some(204),
        "taiko" => Some(167000),
        "xdc" => Some(50),
        "apechain" | "ape" => Some(33139),
        "world" => Some(480),
        "sonic" => Some(146),
        "unichain" => Some(130),
        "abstract" => Some(2741),
        "berachain" | "bera" => Some(80094),
        "monad" => Some(143),
        "hyperevm" => Some(999),
        "katana" => Some(747474),
        "sei" => Some(1329),
        "stable" => Some(988),
        "plasma" => Some(9745),
        "megaeth" => Some(4326),
        _ => None,
    }
}

fn fetch_dynamic_chain_id(chain_name: &str) -> Result<u32, String> {
    let url = "https://api.etherscan.io/v2/chainlist";
    let headers = json!({
        "Accept": "application/json",
        "User-Agent": "IronClaw-Etherscan-Tool/0.1"
    });

    let resp = near::agent::host::http_request("GET", url, &headers.to_string(), None, Some(HTTP_TIMEOUT_MS))
        .map_err(|e| format!("Dynamic chain lookup request failed: {e}"))?;

    if !(200..300).contains(&resp.status) {
        return Err(format!("Failed to fetch chain list: HTTP status {}", resp.status));
    }

    let body_str = String::from_utf8(resp.body)
        .map_err(|e| format!("Invalid UTF-8 in chainlist response: {e}"))?;

    let json_val: Value = serde_json::from_str(&body_str)
        .map_err(|e| format!("Failed to parse chainlist JSON: {e}"))?;

    let result_arr = json_val["result"]
        .as_array()
        .ok_or_else(|| "Invalid chainlist response: result field is missing or not an array".to_string())?;

    let normalized_search = normalize_chain_name(chain_name);
    for entry in result_arr {
        if let (Some(name), Some(id_str)) = (entry["chainname"].as_str(), entry["chainid"].as_str()) {
            if normalize_chain_name(name) == normalized_search {
                if let Ok(id) = id_str.parse::<u32>() {
                    return Ok(id);
                }
            }
        }
    }

    Err(format!("Chain '{}' not found in Etherscan't active chain list.", chain_name))
}

fn resolve_chain(chain_val: &Value) -> Result<u32, String> {
    match chain_val {
        Value::Number(num) => {
            if let Some(id) = num.as_u64() {
                Ok(id as u32)
            } else {
                Err(format!("Invalid chain number: {num}"))
            }
        }
        Value::String(s) => {
            let s_trimmed = s.trim();
            if let Ok(id) = s_trimmed.parse::<u32>() {
                return Ok(id);
            }
            
            // Look up in static list
            let normalized = normalize_chain_name(s_trimmed);
            if let Some(id) = lookup_static_chain(&normalized) {
                return Ok(id);
            }
            
            // Dynamic fallback for newly added chains
            #[cfg(target_arch = "wasm32")]
            {
                near::agent::host::log(
                    near::agent::host::LogLevel::Info,
                    &format!("Chain '{}' not found in static list. Querying Etherscan chainlist dynamically...", s_trimmed),
                );
                fetch_dynamic_chain_id(s_trimmed)
            }
            #[cfg(not(target_arch = "wasm32"))]
            {
                // In non-wasm (tests), we can mock dynamic check or fallback to error
                Err(format!("Unknown chain name '{}' (dynamic query not available in tests)", s_trimmed))
            }
        }
        _ => Err("chain parameter must be an integer or a string".to_string()),
    }
}

// ==================== EVM Address Validators ====================

fn validate_evm_address(addr: &str) -> Result<(), String> {
    let trimmed = addr.trim();
    if !trimmed.starts_with("0x") {
        return Err(format!("Address '{trimmed}' must start with '0x'"));
    }
    if trimmed.len() != 42 {
        return Err(format!("Address '{trimmed}' must be exactly 42 characters long"));
    }
    for c in trimmed[2..].chars() {
        if !c.is_ascii_hexdigit() {
            return Err(format!("Address '{trimmed}' contains invalid hex character '{c}'"));
        }
    }
    Ok(())
}

fn validate_evm_addresses_comma_separated(addrs: &str) -> Result<(), String> {
    let parts: Vec<&str> = addrs.split(',').map(|s| s.trim()).collect();
    if parts.is_empty() || addrs.trim().is_empty() {
        return Err("Address list must not be empty".to_string());
    }
    for p in parts {
        validate_evm_address(p)?;
    }
    Ok(())
}

fn validate_tx_hash(hash: &str) -> Result<(), String> {
    let trimmed = hash.trim();
    if !trimmed.starts_with("0x") {
        return Err(format!("Transaction hash '{trimmed}' must start with '0x'"));
    }
    if trimmed.len() != 66 {
        return Err(format!("Transaction hash '{trimmed}' must be exactly 66 characters long"));
    }
    for c in trimmed[2..].chars() {
        if !c.is_ascii_hexdigit() {
            return Err(format!("Transaction hash '{trimmed}' contains invalid hex character '{c}'"));
        }
    }
    Ok(())
}

// ==================== Actions Implementation ====================

fn run_balance(address: String, chainid: u32) -> Result<String, String> {
    validate_evm_address(&address)?;
    let resp = get_etherscan(
        chainid,
        "account",
        "balance",
        &[("address", Some(address.trim().to_string()))],
    )?;

    let balance_wei = resp
        .as_str()
        .ok_or_else(|| "Etherscan balance response result is not a string".to_string())?;

    let out = json!({
        "balance_wei": balance_wei,
        "balance_ether": format_wei_to_ether(balance_wei),
    });
    serialize(&out)
}

#[derive(Debug, Deserialize, Serialize)]
struct BalanceMultiEntryInput {
    account: String,
    balance: String,
}

#[derive(Debug, Serialize)]
struct BalanceMultiEntryOutput {
    account: String,
    balance_wei: String,
    balance_ether: String,
}

fn run_balance_multi(address: String, chainid: u32) -> Result<String, String> {
    validate_evm_addresses_comma_separated(&address)?;
    let resp = get_etherscan(
        chainid,
        "account",
        "balancemulti",
        &[("address", Some(address.trim().to_string()))],
    )?;

    let inputs: Vec<BalanceMultiEntryInput> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse balance multi response list: {e}"))?;

    let outputs: Vec<BalanceMultiEntryOutput> = inputs
        .into_iter()
        .map(|i| BalanceMultiEntryOutput {
            account: i.account,
            balance_wei: i.balance.clone(),
            balance_ether: format_wei_to_ether(&i.balance),
        })
        .collect();

    serialize(&outputs)
}

#[derive(Debug, Deserialize, Serialize)]
struct NormalTransaction {
    hash: String,
    #[serde(rename = "timeStamp")]
    time_stamp: String,
    from: String,
    to: String,
    value: String,
    #[serde(rename = "functionName")]
    function_name: String,
    #[serde(rename = "isError")]
    is_error: String,
    #[serde(rename = "blockNumber")]
    block_number: String,
}

fn run_txlist(
    address: String,
    chainid: u32,
    startblock: Option<u64>,
    endblock: Option<u64>,
    page: Option<u32>,
    offset: Option<u32>,
    sort: Option<String>,
) -> Result<String, String> {
    validate_evm_address(&address)?;
    let offset_val = offset.unwrap_or(20).min(100);

    let query = [
        ("address", Some(address.trim().to_string())),
        ("startblock", startblock.map(|b| b.to_string())),
        ("endblock", endblock.map(|b| b.to_string())),
        ("page", page.map(|p| p.to_string())),
        ("offset", Some(offset_val.to_string())),
        ("sort", sort),
    ];

    let resp = get_etherscan(chainid, "account", "txlist", &query)?;
    let mut txs: Vec<NormalTransaction> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse normal transaction list: {e}"))?;

    txs.truncate(100);
    serialize(&txs)
}

#[derive(Debug, Deserialize, Serialize)]
struct InternalTransaction {
    hash: String,
    #[serde(rename = "timeStamp")]
    time_stamp: String,
    from: String,
    to: String,
    value: String,
    #[serde(rename = "isError")]
    is_error: String,
    #[serde(rename = "blockNumber")]
    block_number: String,
    #[serde(rename = "type")]
    tx_type: String,
    #[serde(rename = "traceId")]
    trace_id: String,
}

fn run_txlistinternal(
    chainid: u32,
    address: Option<String>,
    txhash: Option<String>,
    startblock: Option<u64>,
    endblock: Option<u64>,
    page: Option<u32>,
    offset: Option<u32>,
    sort: Option<String>,
) -> Result<String, String> {
    if address.is_none() && txhash.is_none() {
        return Err("Provide either 'address' or 'txhash' parameters".to_string());
    }
    if let Some(ref a) = address {
        validate_evm_address(a)?;
    }
    if let Some(ref h) = txhash {
        validate_tx_hash(h)?;
    }

    let offset_val = offset.unwrap_or(20).min(100);

    let query = [
        ("address", address.map(|a| a.trim().to_string())),
        ("txhash", txhash.map(|h| h.trim().to_string())),
        ("startblock", startblock.map(|b| b.to_string())),
        ("endblock", endblock.map(|b| b.to_string())),
        ("page", page.map(|p| p.to_string())),
        ("offset", Some(offset_val.to_string())),
        ("sort", sort),
    ];

    let resp = get_etherscan(chainid, "account", "txlistinternal", &query)?;
    let mut txs: Vec<InternalTransaction> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse internal transaction list: {e}"))?;

    txs.truncate(100);
    serialize(&txs)
}

#[derive(Debug, Deserialize, Serialize)]
struct TokenTransfer {
    hash: String,
    #[serde(rename = "timeStamp")]
    time_stamp: String,
    from: String,
    to: String,
    #[serde(rename = "contractAddress")]
    contract_address: String,
    #[serde(rename = "tokenName")]
    token_name: String,
    #[serde(rename = "tokenSymbol")]
    token_symbol: String,
    #[serde(rename = "tokenDecimal")]
    token_decimal: Option<String>,
    #[serde(rename = "tokenID")]
    token_id: Option<String>,
    #[serde(rename = "tokenValue")]
    token_value: Option<String>,
    value: Option<String>,
}

fn run_tokentx(
    chainid: u32,
    address: Option<String>,
    contractaddress: Option<String>,
    startblock: Option<u64>,
    endblock: Option<u64>,
    page: Option<u32>,
    offset: Option<u32>,
    sort: Option<String>,
) -> Result<String, String> {
    if address.is_none() && contractaddress.is_none() {
        return Err("Provide either 'address' or 'contractaddress' parameters".to_string());
    }
    if let Some(ref a) = address {
        validate_evm_address(a)?;
    }
    if let Some(ref c) = contractaddress {
        validate_evm_address(c)?;
    }

    let offset_val = offset.unwrap_or(20).min(100);

    let query = [
        ("address", address.map(|a| a.trim().to_string())),
        ("contractaddress", contractaddress.map(|c| c.trim().to_string())),
        ("startblock", startblock.map(|b| b.to_string())),
        ("endblock", endblock.map(|b| b.to_string())),
        ("page", page.map(|p| p.to_string())),
        ("offset", Some(offset_val.to_string())),
        ("sort", sort),
    ];

    let resp = get_etherscan(chainid, "account", "tokentx", &query)?;
    let mut txs: Vec<TokenTransfer> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse token transaction list: {e}"))?;

    txs.truncate(100);
    serialize(&txs)
}

fn run_tokennfttx(
    chainid: u32,
    address: Option<String>,
    contractaddress: Option<String>,
    startblock: Option<u64>,
    endblock: Option<u64>,
    page: Option<u32>,
    offset: Option<u32>,
    sort: Option<String>,
) -> Result<String, String> {
    if address.is_none() && contractaddress.is_none() {
        return Err("Provide either 'address' or 'contractaddress' parameters".to_string());
    }
    if let Some(ref a) = address {
        validate_evm_address(a)?;
    }
    if let Some(ref c) = contractaddress {
        validate_evm_address(c)?;
    }

    let offset_val = offset.unwrap_or(20).min(100);

    let query = [
        ("address", address.map(|a| a.trim().to_string())),
        ("contractaddress", contractaddress.map(|c| c.trim().to_string())),
        ("startblock", startblock.map(|b| b.to_string())),
        ("endblock", endblock.map(|b| b.to_string())),
        ("page", page.map(|p| p.to_string())),
        ("offset", Some(offset_val.to_string())),
        ("sort", sort),
    ];

    let resp = get_etherscan(chainid, "account", "tokennfttx", &query)?;
    let mut txs: Vec<TokenTransfer> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse token nft transaction list: {e}"))?;

    txs.truncate(100);
    serialize(&txs)
}

fn run_token1155tx(
    chainid: u32,
    address: Option<String>,
    contractaddress: Option<String>,
    startblock: Option<u64>,
    endblock: Option<u64>,
    page: Option<u32>,
    offset: Option<u32>,
    sort: Option<String>,
) -> Result<String, String> {
    if address.is_none() && contractaddress.is_none() {
        return Err("Provide either 'address' or 'contractaddress' parameters".to_string());
    }
    if let Some(ref a) = address {
        validate_evm_address(a)?;
    }
    if let Some(ref c) = contractaddress {
        validate_evm_address(c)?;
    }

    let offset_val = offset.unwrap_or(20).min(100);

    let query = [
        ("address", address.map(|a| a.trim().to_string())),
        ("contractaddress", contractaddress.map(|c| c.trim().to_string())),
        ("startblock", startblock.map(|b| b.to_string())),
        ("endblock", endblock.map(|b| b.to_string())),
        ("page", page.map(|p| p.to_string())),
        ("offset", Some(offset_val.to_string())),
        ("sort", sort),
    ];

    let resp = get_etherscan(chainid, "account", "token1155tx", &query)?;
    let mut txs: Vec<TokenTransfer> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse token 1155 transaction list: {e}"))?;

    txs.truncate(100);
    serialize(&txs)
}

fn run_getabi(address: String, chainid: u32) -> Result<String, String> {
    validate_evm_address(&address)?;
    let resp = get_etherscan(
        chainid,
        "contract",
        "getabi",
        &[("address", Some(address.trim().to_string()))],
    )?;

    let abi_str = resp
        .as_str()
        .ok_or_else(|| "Etherscan getabi response result is not a string".to_string())?;

    // Attempt to parse contract ABI as JSON so we return formatted JSON instead of escaped string
    if let Ok(json_abi) = serde_json::from_str::<Value>(abi_str) {
        serialize(&json_abi)
    } else {
        Ok(abi_str.to_string())
    }
}

fn run_getsourcecode(address: String, chainid: u32) -> Result<String, String> {
    validate_evm_address(&address)?;
    let resp = get_etherscan(
        chainid,
        "contract",
        "getsourcecode",
        &[("address", Some(address.trim().to_string()))],
    )?;
    serialize(&resp)
}

fn run_getstatus(txhash: String, chainid: u32) -> Result<String, String> {
    validate_tx_hash(&txhash)?;
    let resp = get_etherscan(
        chainid,
        "transaction",
        "getstatus",
        &[("txhash", Some(txhash.trim().to_string()))],
    )?;
    serialize(&resp)
}

fn run_gettxreceiptstatus(txhash: String, chainid: u32) -> Result<String, String> {
    validate_tx_hash(&txhash)?;
    let resp = get_etherscan(
        chainid,
        "transaction",
        "gettxreceiptstatus",
        &[("txhash", Some(txhash.trim().to_string()))],
    )?;
    serialize(&resp)
}

// ==================== HTTP & Utility Helpers ====================

#[derive(Debug, Deserialize)]
struct EtherscanRawResponse {
    status: String,
    message: String,
    result: Value,
}

fn is_empty_list_message(status: &str, message: &str) -> bool {
    if status == "0" {
        let msg = message.to_ascii_lowercase();
        msg.contains("no transactions")
            || msg.contains("no internal")
            || msg.contains("no matching")
            || msg.contains("no transfer")
            || msg.contains("no erc")
    } else {
        false
    }
}

fn get_etherscan(
    chainid: u32,
    module: &str,
    action: &str,
    query_params: &[(&str, Option<String>)],
) -> Result<Value, String> {
    let mut query = vec![
        ("chainid".to_string(), chainid.to_string()),
        ("module".to_string(), module.to_string()),
        ("action".to_string(), action.to_string()),
    ];
    for (k, v) in query_params {
        if let Some(val) = v {
            query.push((k.to_string(), val.clone()));
        }
    }

    let query_str = query
        .iter()
        .map(|(k, v)| format!("{}={}", k, url_encode(v)))
        .collect::<Vec<String>>()
        .join("&");

    let url = format!("https://api.etherscan.io/v2/api?{query_str}");

    let headers = json!({
        "Accept": "application/json",
        "User-Agent": "IronClaw-Etherscan-Tool/0.1"
    });

    let mut attempt = 0;
    let raw_resp = loop {
        attempt += 1;
        let resp = near::agent::host::http_request(
            "GET",
            &url,
            &headers.to_string(),
            None,
            Some(HTTP_TIMEOUT_MS),
        )
        .map_err(|e| format!("HTTP request failed: {e}"))?;

        // Handle 429 and rate-limiting proxies
        if resp.status == 429 || resp.status >= 500 {
            if attempt < MAX_RETRIES {
                near::agent::host::log(
                    near::agent::host::LogLevel::Warn,
                    &format!("HTTP status {} (attempt {}/{}); retrying", resp.status, attempt, MAX_RETRIES),
                );
                std::thread::sleep(std::time::Duration::from_millis(attempt as u64 * 500));
                continue;
            }
            return Err(format!("Etherscan API returned HTTP status {}", resp.status));
        }

        if !(200..300).contains(&resp.status) {
            return Err(format!("Etherscan request failed with HTTP {}", resp.status));
        }

        let body_str = String::from_utf8(resp.body)
            .map_err(|e| format!("Invalid UTF-8 response: {e}"))?;

        let json_val: Value = serde_json::from_str(&body_str)
            .map_err(|e| format!("Failed to parse Etherscan response JSON: {e}"))?;

        // Decrypt Etherscan's internal rate limiting message
        if let Some(result_str) = json_val.get("result").and_then(Value::as_str) {
            if result_str.contains("Max rate limit reached") || result_str.contains("rate limit") {
                if attempt < MAX_RETRIES {
                    near::agent::host::log(
                        near::agent::host::LogLevel::Warn,
                        &format!("Etherscan API rate limit reached (attempt {}/{}); retrying", attempt, MAX_RETRIES),
                    );
                    std::thread::sleep(std::time::Duration::from_millis(attempt as u64 * 500));
                    continue;
                }
                return Err("Etherscan API rate limit exceeded. Please try again later.".to_string());
            }
        }

        break json_val;
    };

    let raw: EtherscanRawResponse = serde_json::from_value(raw_resp)
        .map_err(|e| format!("Failed to parse Etherscan envelope: {e}"))?;

    if is_empty_list_message(&raw.status, &raw.message) {
        return Ok(Value::Array(vec![]));
    }

    if raw.status != "1" {
        let err_msg = if let Some(s) = raw.result.as_str() {
            s.to_string()
        } else {
            raw.message
        };
        return Err(format!("Etherscan API error: {err_msg}"));
    }

    Ok(raw.result)
}

fn format_wei_to_ether(wei_str: &str) -> String {
    if let Ok(wei) = wei_str.parse::<u128>() {
        let integer = wei / 1_000_000_000_000_000_000;
        let fraction = wei % 1_000_000_000_000_000_000;
        let mut frac_str = format!("{:018}", fraction);
        while frac_str.ends_with('0') {
            frac_str.pop();
        }
        if frac_str.is_empty() {
            integer.to_string()
        } else {
            format!("{integer}.{frac_str}")
        }
    } else {
        "0".to_string()
    }
}

fn url_encode(input: &str) -> String {
    let mut encoded = String::new();
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            b' ' => {
                encoded.push('+');
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}

fn serialize<T: Serialize>(value: &T) -> Result<String, String> {
    serde_json::to_string(value).map_err(|e| format!("Failed to serialize output: {e}"))
}

//// ==================== JSON Schema ====================
 
const SCHEMA: &str = r#"{
  "type": "object",
  "required": ["action"],
  "oneOf": [
    {
      "properties": {
        "action": { "const": "balance" },
        "address": { "type": "string", "description": "The EVM address to query." },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID (e.g. 1) or chain name (e.g. 'ethereum', 'base')." }
      },
      "required": ["action", "address", "chain"]
    },
    {
      "properties": {
        "action": { "const": "balancemulti" },
        "address": { "type": "string", "description": "Comma-separated list of EVM addresses." },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." }
      },
      "required": ["action", "address", "chain"]
    },
    {
      "properties": {
        "action": { "const": "txlist" },
        "address": { "type": "string", "description": "The EVM address to query." },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." },
        "startblock": { "type": "integer", "description": "Start block number. Optional." },
        "endblock": { "type": "integer", "description": "End block number. Optional." },
        "page": { "type": "integer", "description": "Page number. Optional." },
        "offset": { "type": "integer", "description": "Number of records per page (default 20, max 100). Optional." },
        "sort": { "type": "string", "enum": ["asc", "desc"], "description": "Sort order (default 'asc'). Optional." }
      },
      "required": ["action", "address", "chain"]
    },
    {
      "properties": {
        "action": { "const": "txlistinternal" },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." },
        "address": { "type": "string", "description": "The EVM address. Optional if txhash is provided." },
        "txhash": { "type": "string", "description": "Transaction hash. Optional if address is provided." },
        "startblock": { "type": "integer", "description": "Start block number. Optional." },
        "endblock": { "type": "integer", "description": "End block number. Optional." },
        "page": { "type": "integer", "description": "Page number. Optional." },
        "offset": { "type": "integer", "description": "Number of records per page (default 20, max 100). Optional." },
        "sort": { "type": "string", "enum": ["asc", "desc"], "description": "Sort order (default 'asc'). Optional." }
      },
      "required": ["action", "chain"]
    },
    {
      "properties": {
        "action": { "const": "tokentx" },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." },
        "address": { "type": "string", "description": "The EVM address. Optional if contractaddress is provided." },
        "contractaddress": { "type": "string", "description": "ERC-20 token contract address. Optional." },
        "startblock": { "type": "integer", "description": "Start block number. Optional." },
        "endblock": { "type": "integer", "description": "End block number. Optional." },
        "page": { "type": "integer", "description": "Page number. Optional." },
        "offset": { "type": "integer", "description": "Number of records per page (default 20, max 100). Optional." },
        "sort": { "type": "string", "enum": ["asc", "desc"], "description": "Sort order (default 'asc'). Optional." }
      },
      "required": ["action", "chain"]
    },
    {
      "properties": {
        "action": { "const": "tokennfttx" },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." },
        "address": { "type": "string", "description": "The EVM address. Optional if contractaddress is provided." },
        "contractaddress": { "type": "string", "description": "ERC-721 token contract address. Optional." },
        "startblock": { "type": "integer", "description": "Start block number. Optional." },
        "endblock": { "type": "integer", "description": "End block number. Optional." },
        "page": { "type": "integer", "description": "Page number. Optional." },
        "offset": { "type": "integer", "description": "Number of records per page (default 20, max 100). Optional." },
        "sort": { "type": "string", "enum": ["asc", "desc"], "description": "Sort order (default 'asc'). Optional." }
      },
      "required": ["action", "chain"]
    },
    {
      "properties": {
        "action": { "const": "token1155tx" },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." },
        "address": { "type": "string", "description": "The EVM address. Optional if contractaddress is provided." },
        "contractaddress": { "type": "string", "description": "ERC-1155 token contract address. Optional." },
        "startblock": { "type": "integer", "description": "Start block number. Optional." },
        "endblock": { "type": "integer", "description": "End block number. Optional." },
        "page": { "type": "integer", "description": "Page number. Optional." },
        "offset": { "type": "integer", "description": "Number of records per page (default 20, max 100). Optional." },
        "sort": { "type": "string", "enum": ["asc", "desc"], "description": "Sort order (default 'asc'). Optional." }
      },
      "required": ["action", "chain"]
    },
    {
      "properties": {
        "action": { "const": "getabi" },
        "address": { "type": "string", "description": "Contract address." },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." }
      },
      "required": ["action", "address", "chain"]
    },
    {
      "properties": {
        "action": { "const": "getsourcecode" },
        "address": { "type": "string", "description": "Contract address." },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." }
      },
      "required": ["action", "address", "chain"]
    },
    {
      "properties": {
        "action": { "const": "getstatus" },
        "txhash": { "type": "string", "description": "Transaction hash." },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." }
      },
      "required": ["action", "txhash", "chain"]
    },
    {
      "properties": {
        "action": { "const": "gettxreceiptstatus" },
        "txhash": { "type": "string", "description": "Transaction hash." },
        "chain": { "type": ["integer", "string"], "description": "The EVM chain ID or name." }
      },
      "required": ["action", "txhash", "chain"]
    }
  ]
}"#;

export!(EtherscanTool);

// ==================== Unit Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_is_valid_json() {
        let v: Value = serde_json::from_str(SCHEMA).expect("schema must be valid JSON");
        assert_eq!(v["type"], "object");
        assert_eq!(v["required"][0], "action");
        let branches = v["oneOf"].as_array().expect("oneOf must be an array");
        assert_eq!(branches.len(), 11, "must have 11 action branches");
        for b in branches {
            let req = b["required"].as_array().expect("branch needs required[]");
            assert_eq!(req[0], "action");
            assert!(b["properties"]["action"]["const"].is_string());
        }
    }

    #[test]
    fn test_format_wei_to_ether() {
        assert_eq!(format_wei_to_ether("0"), "0");
        assert_eq!(format_wei_to_ether("1"), "0.000000000000000001");
        assert_eq!(format_wei_to_ether("1000000000000000000"), "1");
        assert_eq!(format_wei_to_ether("1500000000000000000"), "1.5");
        assert_eq!(format_wei_to_ether("10500000000000000000"), "10.5");
        assert_eq!(format_wei_to_ether("999000000000000000000"), "999");
    }

    #[test]
    fn test_url_encode() {
        assert_eq!(url_encode("hello world"), "hello+world");
        assert_eq!(url_encode("0x1234"), "0x1234");
    }

    #[test]
    fn test_validate_address() {
        assert!(validate_evm_address("0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe").is_ok());
        assert!(validate_evm_address("0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BA").is_err()); // too short
        assert!(validate_evm_address("0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAeeG").is_err()); // too long
        assert!(validate_evm_address("de0B295669a9FD93d5F28D9Ec85E40f4cb697BAe").is_err()); // no 0x
        assert!(validate_evm_address("0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAg").is_err()); // invalid hex 'g'
    }

    #[test]
    fn test_validate_addresses_comma_separated() {
        assert!(validate_evm_addresses_comma_separated("0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe,0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe").is_ok());
        assert!(validate_evm_addresses_comma_separated("0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe, 0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe").is_ok()); // with space
        assert!(validate_evm_addresses_comma_separated("0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe,0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BA").is_err()); // second invalid
    }

    #[test]
    fn test_validate_tx_hash() {
        assert!(validate_tx_hash("0x2b5b3a32dc6e174b830d452edb3d4116f07bec31368bab4c201caabce77556ee").is_ok());
        assert!(validate_tx_hash("0x2b5b3a32dc6e174b830d452edb3d4116f07bec31368bab4c201caabce77556e").is_err()); // too short
        assert!(validate_tx_hash("2b5b3a32dc6e174b830d452edb3d4116f07bec31368bab4c201caabce77556ee").is_err()); // no 0x
    }

    #[test]
    fn test_is_empty_list_message() {
        assert!(is_empty_list_message("0", "No transactions found"));
        assert!(is_empty_list_message("0", "No internal transactions found"));
        assert!(is_empty_list_message("0", "No matching records found"));
        assert!(!is_empty_list_message("1", "No transactions found")); // status 1
        assert!(!is_empty_list_message("0", "Max rate limit reached")); // not an empty list message
    }

    #[test]
    fn test_resolve_chain() {
        // Numeric value
        assert_eq!(resolve_chain(&Value::from(1)).unwrap(), 1);
        assert_eq!(resolve_chain(&Value::from(8453)).unwrap(), 8453);

        // Numeric string
        assert_eq!(resolve_chain(&Value::from("1")).unwrap(), 1);
        assert_eq!(resolve_chain(&Value::from("  8453 ")).unwrap(), 8453);

        // Name lookup (static)
        assert_eq!(resolve_chain(&Value::from("ethereum")).unwrap(), 1);
        assert_eq!(resolve_chain(&Value::from("Ethereum Mainnet")).unwrap(), 1);
        assert_eq!(resolve_chain(&Value::from("base")).unwrap(), 8453);
        assert_eq!(resolve_chain(&Value::from("Arbitrum One Mainnet")).unwrap(), 42161);
        assert_eq!(resolve_chain(&Value::from("op")).unwrap(), 10);
        assert_eq!(resolve_chain(&Value::from("polygon")).unwrap(), 137);

        // Unknown chain
        assert!(resolve_chain(&Value::from("unknown-chain-xyz")).is_err());
    }
}
