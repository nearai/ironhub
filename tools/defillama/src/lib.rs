//! DefiLlama WASM Tool for IronClaw.
//!
//! Exposes the DefiLlama open API (TVL, coin prices, stablecoins, yields,
//! DEX volumes, fees/revenue). Free endpoints only (`api.llama.fi`,
//! `coins.llama.fi`, `stablecoins.llama.fi`, `yields.llama.fi`) — no
//! credentials, no setup.
//!
//! Pro API deliberately NOT supported: DefiLlama Pro puts the API key in the
//! URL path (`pro-api.llama.fi/<KEY>/...` — both official SDKs; no header or
//! query alternative, verified 2026-07-11), and IronClaw's tools lane does not
//! substitute `url_path` credential placeholders. Revisit if either side
//! changes.
//!
//! Memory: the sandbox defaults to 10 MB linear memory. The three big
//! endpoints (/protocols, /pools, /protocol/{p}) are fetched with
//! `Accept-Encoding: gzip` (2-3 MB compressed) and inflated incrementally
//! into byte-level JSON scanners with bounded top-N accumulation — measured
//! peak ≈ 2.5-3.2 MB, comfortably under the default cap. Responses are also
//! summarized/downsampled to keep model-context usage low.
//!
//! ⚠ FUEL REQUIREMENT (verified e2e 2026-07-11): inflating + scanning ~10 MB
//! of JSON costs more than IronClaw's default 500M-instruction fuel limit —
//! list_protocols / list_pools / get_protocol fuel-exhaust on stock settings
//! (a fuel trap cannot be caught in-tool). Operators must set
//! `WASM_DEFAULT_FUEL_LIMIT=2000000000` (2B verified sufficient; 5B for
//! headroom) in `~/.ironclaw/.env`. All other actions run fine on defaults.
//! See docs/reference/raising-wasm-limits.md.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::Deserialize;
use serde_json::{json, Value};

const FREE_API: &str = "https://api.llama.fi";
const FREE_COINS: &str = "https://coins.llama.fi";
const FREE_STABLECOINS: &str = "https://stablecoins.llama.fi";
const FREE_YIELDS: &str = "https://yields.llama.fi";

const DEFAULT_LIMIT: usize = 20;
const MAX_LIMIT: usize = 100;
/// Default/most points returned for time-series actions.
const DEFAULT_POINTS: usize = 90;
const MAX_POINTS: usize = 500;
const MAX_RETRIES: u32 = 3;

/// Which DefiLlama service a free endpoint lives on.
#[derive(Clone, Copy)]
enum Service {
    Api,
    Coins,
    Stablecoins,
    Yields,
}

impl Service {
    fn free_base(self) -> &'static str {
        match self {
            Service::Api => FREE_API,
            Service::Coins => FREE_COINS,
            Service::Stablecoins => FREE_STABLECOINS,
            Service::Yields => FREE_YIELDS,
        }
    }
}

fn service_url(service: Service, path: &str) -> String {
    format!("{}{path}", service.free_base())
}

struct DefiLlamaTool;

impl exports::near::agent::tool::Guest for DefiLlamaTool {
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
        "DefiLlama DeFi analytics. Free actions (no API key): 'list_protocols'/'get_protocol'/'protocol_tvl' \
         (protocol TVL), 'list_chains'/'chain_tvl_history' (chain TVL), 'current_prices'/'historical_prices'/\
         'price_chart'/'price_percentage'/'first_prices'/'block' (token prices; coins are \
         '{chain}:{address}' or 'coingecko:{id}'), 'list_stablecoins'/'get_stablecoin'/'stablecoin_history'/\
         'stablecoin_chains'/'stablecoin_prices' (stablecoin circulation), 'list_pools'/'pool_history' \
         (yield/APY pools), 'dex_overview'/'dex_summary'/'options_overview'/'options_summary'/\
         'open_interest_overview' (volumes), 'fees_overview'/'fees_summary' (fees & revenue). \
         No API key needed; DefiLlama Pro endpoints are not supported. \
         NOTE: if list_protocols/list_pools/get_protocol fail with a fuel/instruction-limit error, the \
         IronClaw host needs WASM_DEFAULT_FUEL_LIMIT=2000000000 in its env (default 500M is too low for \
         these ~10 MB streams) — tell the user, you can use http tools for this case as a workaround."
            .to_string()
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    // ---- TVL ----
    ListProtocols {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        category: Option<String>,
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        limit: Option<usize>,
    },
    GetProtocol {
        protocol: String,
        #[serde(default)]
        points: Option<usize>,
    },
    ProtocolTvl {
        protocol: String,
    },
    ListChains {
        #[serde(default)]
        limit: Option<usize>,
    },
    ChainTvlHistory {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        points: Option<usize>,
    },
    // ---- Coin prices ----
    CurrentPrices {
        coins: String,
        #[serde(default)]
        search_width: Option<String>,
    },
    HistoricalPrices {
        coins: String,
        timestamp: u64,
        #[serde(default)]
        search_width: Option<String>,
    },
    PriceChart {
        coins: String,
        #[serde(default)]
        start: Option<u64>,
        #[serde(default)]
        end: Option<u64>,
        #[serde(default)]
        span: Option<u32>,
        #[serde(default)]
        period: Option<String>,
        #[serde(default)]
        search_width: Option<String>,
    },
    PricePercentage {
        coins: String,
        #[serde(default)]
        timestamp: Option<u64>,
        #[serde(default)]
        look_forward: Option<bool>,
        #[serde(default)]
        period: Option<String>,
    },
    FirstPrices {
        coins: String,
    },
    Block {
        chain: String,
        timestamp: u64,
    },
    // ---- Stablecoins ----
    ListStablecoins {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        limit: Option<usize>,
    },
    GetStablecoin {
        stablecoin_id: String,
    },
    StablecoinHistory {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        stablecoin_id: Option<String>,
        #[serde(default)]
        points: Option<usize>,
    },
    StablecoinChains,
    StablecoinPrices {
        #[serde(default)]
        points: Option<usize>,
    },
    // ---- Yields ----
    ListPools {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        project: Option<String>,
        #[serde(default)]
        symbol: Option<String>,
        #[serde(default)]
        limit: Option<usize>,
    },
    PoolHistory {
        pool: String,
        #[serde(default)]
        points: Option<usize>,
    },
    // ---- Volumes ----
    DexOverview {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        limit: Option<usize>,
    },
    DexSummary {
        protocol: String,
    },
    OptionsOverview {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        data_type: Option<String>,
        #[serde(default)]
        limit: Option<usize>,
    },
    OptionsSummary {
        protocol: String,
        #[serde(default)]
        data_type: Option<String>,
    },
    OpenInterestOverview {
        #[serde(default)]
        limit: Option<usize>,
    },
    // ---- Fees & revenue ----
    FeesOverview {
        #[serde(default)]
        chain: Option<String>,
        #[serde(default)]
        data_type: Option<String>,
        #[serde(default)]
        limit: Option<usize>,
    },
    FeesSummary {
        protocol: String,
        #[serde(default)]
        data_type: Option<String>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid parameters: {e}. Provide an 'action' field (one of: list_protocols, get_protocol, \
             protocol_tvl, list_chains, chain_tvl_history, current_prices, historical_prices, price_chart, \
             price_percentage, first_prices, block, list_stablecoins, get_stablecoin, stablecoin_history, \
             stablecoin_chains, stablecoin_prices, list_pools, pool_history, dex_overview, dex_summary, \
             options_overview, options_summary, open_interest_overview, fees_overview, fees_summary)."
        )
    })?;

    match action {
        Action::ListProtocols {
            query,
            category,
            chain,
            limit,
        } => list_protocols(
            query.as_deref(),
            category.as_deref(),
            chain.as_deref(),
            clamp_limit(limit)),
        Action::GetProtocol { protocol, points } => {
            get_protocol(&protocol, clamp_points(points))
        }
        Action::ProtocolTvl { protocol } => protocol_tvl(&protocol),
        Action::ListChains { limit } => list_chains(clamp_limit(limit)),
        Action::ChainTvlHistory { chain, points } => {
            chain_tvl_history(chain.as_deref(), clamp_points(points))
        }
        Action::CurrentPrices {
            coins,
            search_width,
        } => coins_get(
            &format!("/prices/current/{}", validate_coins(&coins)?),
            &[("searchWidth", opt_str(&search_width))]),
        Action::HistoricalPrices {
            coins,
            timestamp,
            search_width,
        } => coins_get(
            &format!(
                "/prices/historical/{timestamp}/{}",
                validate_coins(&coins)?
            ),
            &[("searchWidth", opt_str(&search_width))]),
        Action::PriceChart {
            coins,
            start,
            end,
            span,
            period,
            search_width,
        } => {
            if start.is_some() && end.is_some() {
                return Err("price_chart accepts 'start' or 'end', not both".into());
            }
            coins_get(
                &format!("/chart/{}", validate_coins(&coins)?),
                &[
                    ("start", start.map(|v| v.to_string())),
                    ("end", end.map(|v| v.to_string())),
                    ("span", span.map(|v| v.to_string())),
                    ("period", opt_str(&period)),
                    ("searchWidth", opt_str(&search_width)),
                ])
        }
        Action::PricePercentage {
            coins,
            timestamp,
            look_forward,
            period,
        } => coins_get(
            &format!("/percentage/{}", validate_coins(&coins)?),
            &[
                ("timestamp", timestamp.map(|v| v.to_string())),
                ("lookForward", look_forward.map(|v| v.to_string())),
                ("period", opt_str(&period)),
            ]),
        Action::FirstPrices { coins } => coins_get(
            &format!("/prices/first/{}", validate_coins(&coins)?),
            &[]),
        Action::Block { chain, timestamp } => coins_get(
            &format!("/block/{}/{timestamp}", validate_segment(&chain, "chain")?),
            &[]),
        Action::ListStablecoins { query, limit } => {
            list_stablecoins(query.as_deref(), clamp_limit(limit))
        }
        Action::GetStablecoin { stablecoin_id } => get_stablecoin(&stablecoin_id),
        Action::StablecoinHistory {
            chain,
            stablecoin_id,
            points,
        } => stablecoin_history(
            chain.as_deref(),
            stablecoin_id.as_deref(),
            clamp_points(points)),
        Action::StablecoinChains => {
            let url = service_url(Service::Stablecoins, "/stablecoinchains");
            serialize(&http_get_json(&url)?)
        }
        Action::StablecoinPrices { points } => stablecoin_prices(clamp_points(points)),
        Action::ListPools {
            chain,
            project,
            symbol,
            limit,
        } => list_pools(
            chain.as_deref(),
            project.as_deref(),
            symbol.as_deref(),
            clamp_limit(limit)),
        Action::PoolHistory { pool, points } => pool_history(&pool, clamp_points(points)),
        Action::DexOverview { chain, limit } => {
            adapter_overview("dexs", chain.as_deref(), None, clamp_limit(limit))
        }
        Action::DexSummary { protocol } => adapter_summary("dexs", &protocol, None),
        Action::OptionsOverview {
            chain,
            data_type,
            limit,
        } => {
            let dt = validate_opt_choice(
                data_type.as_deref(),
                "data_type",
                &["dailyPremiumVolume", "dailyNotionalVolume"],
            )?;
            adapter_overview("options", chain.as_deref(), dt, clamp_limit(limit))
        }
        Action::OptionsSummary {
            protocol,
            data_type,
        } => {
            let dt = validate_opt_choice(
                data_type.as_deref(),
                "data_type",
                &["dailyPremiumVolume", "dailyNotionalVolume"],
            )?;
            adapter_summary("options", &protocol, dt)
        }
        Action::OpenInterestOverview { limit } => {
            adapter_overview("open-interest", None, None, clamp_limit(limit))
        }
        Action::FeesOverview {
            chain,
            data_type,
            limit,
        } => {
            let dt = validate_opt_choice(
                data_type.as_deref(),
                "data_type",
                &["dailyFees", "dailyRevenue", "dailyHoldersRevenue"],
            )?;
            adapter_overview("fees", chain.as_deref(), dt, clamp_limit(limit))
        }
        Action::FeesSummary {
            protocol,
            data_type,
        } => {
            let dt = validate_opt_choice(
                data_type.as_deref(),
                "data_type",
                &["dailyFees", "dailyRevenue", "dailyHoldersRevenue"],
            )?;
            adapter_summary("fees", &protocol, dt)
        }
    }
}

fn clamp_limit(limit: Option<usize>) -> usize {
    limit.unwrap_or(DEFAULT_LIMIT).clamp(1, MAX_LIMIT)
}

fn clamp_points(points: Option<usize>) -> usize {
    points.unwrap_or(DEFAULT_POINTS).clamp(2, MAX_POINTS)
}

fn opt_str(v: &Option<String>) -> Option<String> {
    v.as_ref().map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
}

// ==================== Streaming big-payload machinery ====================
//
// The WASM sandbox defaults to a 10 MB linear-memory cap, and the WIT
// http-request returns the whole body as ONE buffer — there is no streaming
// across the host boundary. Raw /protocols (7.9 MB), /pools (10.6 MB), and
// /protocol/{p} (up to 9.5 MB) bodies therefore cannot be held decompressed.
//
// Trick: the IronClaw host's reqwest is built WITHOUT the gzip feature, so it
// neither sends Accept-Encoding nor auto-decompresses. We request
// `Accept-Encoding: gzip` ourselves; DefiLlama serves 2-3 MB of compressed
// bytes, which is what lands in WASM memory. We then inflate INCREMENTALLY
// (64 KB at a time) into a byte-level JSON scanner that emits one array item
// (or one wanted object field) at a time, parses it with serde, filters, and
// keeps only a bounded top-N. The full decompressed document never exists in
// memory. Measured peak ≈ compressed body + ~1 MB.

/// Byte-level JSON structure tracker shared by the streaming scanners.
/// Understands strings/escapes so braces inside strings don't confuse depth.
/// Multibyte UTF-8 continuation bytes are all >= 0x80 and can never be
/// mistaken for the structural bytes we test ('"', '\\', '{', ...).
#[derive(Default)]
struct JsonCursor {
    in_string: bool,
    escape: bool,
}

impl JsonCursor {
    /// Advance over one byte. Returns true if the byte is "structural"
    /// (outside any string literal).
    fn step(&mut self, b: u8) -> bool {
        if self.in_string {
            if self.escape {
                self.escape = false;
            } else if b == b'\\' {
                self.escape = true;
            } else if b == b'"' {
                self.in_string = false;
            }
            false
        } else {
            if b == b'"' {
                self.in_string = true;
                return false;
            }
            true
        }
    }
}

/// Where the item array lives in the document.
enum ArrayAt {
    /// Document root is the array (e.g. /protocols).
    Root,
    /// Array is the value of this top-level object key (e.g. "data" in /pools).
    Key(&'static str),
}

/// Incremental scanner that emits complete top-level items of a JSON array as
/// byte slices, across arbitrary chunk boundaries.
struct ArrayItemScanner {
    at: ArrayAt,
    cursor: JsonCursor,
    depth: i32,
    /// Depth of the target array once found (-1 = not found yet).
    array_depth: i32,
    /// Buffer for the item currently being captured (empty = between items).
    item: Vec<u8>,
    capturing: bool,
    /// Root-object key currently being read (only tracked in Key mode, depth 1).
    key_buf: Vec<u8>,
    reading_key: bool,
    /// The last completed root-level key matched the target.
    key_matched: bool,
    done: bool,
}

impl ArrayItemScanner {
    fn new(at: ArrayAt) -> Self {
        Self {
            at,
            cursor: JsonCursor::default(),
            depth: 0,
            array_depth: -1,
            item: Vec::new(),
            capturing: false,
            key_buf: Vec::new(),
            reading_key: false,
            key_matched: false,
            done: false,
        }
    }

    /// Feed a chunk; `on_item` is called once per complete array item.
    fn feed(
        &mut self,
        chunk: &[u8],
        on_item: &mut dyn FnMut(&[u8]) -> Result<(), String>,
    ) -> Result<(), String> {
        for &b in chunk {
            if self.done {
                return Ok(());
            }
            let was_in_string = self.cursor.in_string;
            let structural = self.cursor.step(b);

            // Track root-object keys when hunting for a named array.
            if self.array_depth < 0 {
                if let ArrayAt::Key(want) = self.at {
                    if self.depth == 1 {
                        if !was_in_string && self.cursor.in_string {
                            // String just opened at root level: candidate key.
                            self.reading_key = true;
                            self.key_buf.clear();
                            continue;
                        }
                        if was_in_string && self.reading_key {
                            if self.cursor.in_string {
                                self.key_buf.push(b);
                            } else {
                                // Key string closed.
                                self.reading_key = false;
                                self.key_matched = self.key_buf == want.as_bytes();
                            }
                            continue;
                        }
                    }
                }
            }

            if self.capturing {
                self.item.push(b);
            }

            if !structural {
                continue;
            }
            match b {
                b'{' | b'[' => {
                    self.depth += 1;
                    // Did we just enter the target array?
                    if self.array_depth < 0 && b == b'[' {
                        let found = match self.at {
                            ArrayAt::Root => self.depth == 1,
                            ArrayAt::Key(_) => self.depth == 2 && self.key_matched,
                        };
                        if found {
                            self.array_depth = self.depth;
                            continue;
                        }
                    }
                    // First byte of a new item?
                    if self.array_depth > 0 && self.depth == self.array_depth + 1 && !self.capturing
                    {
                        self.capturing = true;
                        self.item.clear();
                        self.item.push(b);
                    }
                }
                b'}' | b']' => {
                    self.depth -= 1;
                    if self.array_depth > 0 {
                        if self.capturing && self.depth == self.array_depth {
                            // Item complete.
                            self.capturing = false;
                            on_item(&self.item)?;
                            self.item.clear();
                        } else if b == b']' && self.depth == self.array_depth - 1 {
                            // Target array closed.
                            self.done = true;
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(())
    }
}

/// Incremental scanner that captures the values of selected top-level object
/// keys as byte slices, skipping (without buffering) everything else — used
/// for /protocol/{slug}, whose unwanted `chainTvls` block is multi-MB.
struct ObjectFieldScanner {
    wanted: &'static [&'static str],
    cursor: JsonCursor,
    depth: i32,
    key_buf: Vec<u8>,
    reading_key: bool,
    /// Key whose value we're waiting for / capturing (None = skipping).
    pending_key: Option<String>,
    awaiting_value: bool,
    value: Vec<u8>,
    capturing: bool,
    /// Depth at which the captured value started.
    value_depth: i32,
    /// Collected (key, raw JSON value) pairs.
    fields: Vec<(String, Vec<u8>)>,
}

impl ObjectFieldScanner {
    fn new(wanted: &'static [&'static str]) -> Self {
        Self {
            wanted,
            cursor: JsonCursor::default(),
            depth: 0,
            key_buf: Vec::new(),
            reading_key: false,
            pending_key: None,
            awaiting_value: false,
            value: Vec::new(),
            capturing: false,
            value_depth: 0,
            fields: Vec::new(),
        }
    }

    fn finish_value(&mut self) {
        if let Some(key) = self.pending_key.take() {
            let mut v = std::mem::take(&mut self.value);
            // Trim trailing whitespace picked up before the terminator.
            while matches!(v.last(), Some(b' ' | b'\t' | b'\n' | b'\r')) {
                v.pop();
            }
            self.fields.push((key, v));
        }
        self.capturing = false;
    }

    fn feed(&mut self, chunk: &[u8]) {
        for &b in chunk {
            let was_in_string = self.cursor.in_string;
            let structural = self.cursor.step(b);
            let in_string = self.cursor.in_string;

            // Root-level key tracking (only when not inside a value).
            if self.depth == 1 && !self.capturing && !self.awaiting_value {
                if !was_in_string && in_string {
                    self.reading_key = true;
                    self.key_buf.clear();
                    continue;
                }
                if was_in_string && self.reading_key {
                    if in_string {
                        self.key_buf.push(b);
                    } else {
                        self.reading_key = false;
                        if let Ok(k) = std::str::from_utf8(&self.key_buf) {
                            if self.wanted.contains(&k) {
                                self.pending_key = Some(k.to_string());
                            }
                        }
                        self.awaiting_value = true;
                    }
                    continue;
                }
            }

            // Start of a value after "key":
            if self.awaiting_value
                && !matches!(b, b':' | b' ' | b'\t' | b'\n' | b'\r')
                && !was_in_string
            {
                self.awaiting_value = false;
                self.capturing = true;
                self.value_depth = self.depth;
                self.value.clear();
            }

            if self.capturing {
                // Scalar values end at an unquoted ',' or '}' at object depth.
                if structural && self.depth == self.value_depth && matches!(b, b',' | b'}') {
                    self.finish_value();
                } else if self.pending_key.is_some() {
                    self.value.push(b);
                }
            }

            if structural {
                match b {
                    b'{' | b'[' => self.depth += 1,
                    b'}' | b']' => {
                        self.depth -= 1;
                        // A bracketed value closes when depth returns to its start.
                        if self.capturing && self.depth == self.value_depth {
                            self.finish_value();
                        }
                    }
                    _ => {}
                }
            }
        }
    }
}

/// Inflate-if-gzipped and feed a body through `sink` in bounded chunks.
/// Bodies that don't start with the gzip magic pass through as one chunk.
fn stream_body(body: &[u8], sink: &mut dyn FnMut(&[u8]) -> Result<(), String>) -> Result<(), String> {
    use std::io::Read;
    if body.len() >= 2 && body[0] == 0x1f && body[1] == 0x8b {
        let mut decoder = flate2::bufread::MultiGzDecoder::new(body);
        let mut buf = vec![0u8; 64 * 1024];
        loop {
            let n = decoder
                .read(&mut buf)
                .map_err(|e| format!("Failed to decompress DefiLlama response: {e}"))?;
            if n == 0 {
                return Ok(());
            }
            sink(&buf[..n])?;
        }
    } else {
        sink(body)
    }
}

/// Bounded top-N accumulator: keeps memory O(limit) while streaming thousands
/// of candidate rows sorted by a descending f64 key.
struct TopN<T> {
    limit: usize,
    rows: Vec<(f64, T)>,
}

impl<T> TopN<T> {
    fn new(limit: usize) -> Self {
        Self {
            limit,
            rows: Vec::new(),
        }
    }

    fn prune_threshold(&self) -> usize {
        (self.limit * 4).max(512)
    }

    fn push(&mut self, key: f64, row: T) {
        self.rows.push((key, row));
        if self.rows.len() >= self.prune_threshold() {
            self.prune();
        }
    }

    fn prune(&mut self) {
        self.rows
            .sort_unstable_by(|a, b| b.0.total_cmp(&a.0));
        self.rows.truncate(self.limit);
    }

    fn finish(mut self) -> Vec<T> {
        self.prune();
        self.rows.into_iter().map(|(_, r)| r).collect()
    }
}

#[derive(Deserialize)]
struct ProtocolRow {
    #[serde(default)]
    slug: Option<String>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    symbol: Option<String>,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    tvl: Option<f64>,
    #[serde(default)]
    change_1d: Option<f64>,
    #[serde(default)]
    change_7d: Option<f64>,
    #[serde(default)]
    mcap: Option<f64>,
    #[serde(default)]
    chains: Vec<String>,
}

#[derive(Deserialize)]
struct TvlPoint {
    #[serde(default)]
    date: Option<u64>,
    #[serde(default, rename = "totalLiquidityUSD")]
    total_liquidity_usd: Option<f64>,
}

// ==================== TVL actions ====================

fn list_protocols(
    query: Option<&str>,
    category: Option<&str>,
    chain: Option<&str>,
    limit: usize,
) -> Result<String, String> {
    let body = http_get_gzip(&service_url(Service::Api, "/protocols"))?;

    let q = lower_opt(query);
    let cat = lower_opt(category);
    let ch = lower_opt(chain);

    let mut scanner = ArrayItemScanner::new(ArrayAt::Root);
    let mut top = TopN::new(limit);
    let mut total = 0usize;
    {
        let mut on_item = |item: &[u8]| -> Result<(), String> {
            let Ok(p) = serde_json::from_slice::<ProtocolRow>(item) else {
                return Ok(()); // tolerate odd rows
            };
            let name_hit = q.as_deref().is_none_or(|q| {
                opt_contains_ci(&p.name, q) || opt_contains_ci(&p.symbol, q) || opt_contains_ci(&p.slug, q)
            });
            let cat_hit = cat
                .as_deref()
                .is_none_or(|c| p.category.as_deref().unwrap_or("").to_lowercase() == c);
            let chain_hit = ch
                .as_deref()
                .is_none_or(|c| p.chains.iter().any(|s| s.to_lowercase() == c));
            if name_hit && cat_hit && chain_hit {
                total += 1;
                top.push(p.tvl.unwrap_or(0.0), p);
            }
            Ok(())
        };
        stream_body(&body, &mut |chunk| scanner.feed(chunk, &mut on_item))?;
    }
    drop(body);

    let matched = top.finish();
    let protocols: Vec<Value> = matched.iter().map(summarize_protocol).collect();
    serialize(&json!({
        "query": query, "category": category, "chain": chain,
        "match_count": total, "returned": protocols.len(),
        "protocols": protocols,
    }))
}

/// Top-level /protocol/{slug} fields we keep. Everything else — notably the
/// multi-MB `chainTvls`/`tokens`/`tokensInUsd` blocks — is skipped without
/// ever being buffered.
const PROTOCOL_DETAIL_FIELDS: &[&str] = &[
    "name",
    "symbol",
    "url",
    "description",
    "category",
    "chains",
    "gecko_id",
    "twitter",
    "mcap",
    "currentChainTvls",
    "tvl",
];

fn get_protocol(protocol: &str, points: usize) -> Result<String, String> {
    let slug = validate_segment(protocol, "protocol")?;
    let body = http_get_gzip(&service_url(
        Service::Api,
        &format!("/protocol/{}", url_encode(&slug)),
    ))?;

    let mut scanner = ObjectFieldScanner::new(PROTOCOL_DETAIL_FIELDS);
    stream_body(&body, &mut |chunk| {
        scanner.feed(chunk);
        Ok(())
    })?;
    drop(body);

    let mut fields: std::collections::HashMap<String, Vec<u8>> =
        scanner.fields.into_iter().collect();

    // Recent total-TVL series, downsampled.
    let tvl: Vec<TvlPoint> = fields
        .remove("tvl")
        .and_then(|raw| serde_json::from_slice(&raw).ok())
        .unwrap_or_default();

    let mut take = |k: &str| -> Value {
        fields
            .remove(k)
            .and_then(|raw| serde_json::from_slice(&raw).ok())
            .unwrap_or(Value::Null)
    };

    let name = take("name");
    if name.is_null() {
        return Err(format!(
            "No protocol found for slug '{slug}'. Use list_protocols to discover valid slugs."
        ));
    }
    let series: Vec<Value> = sample_indices(tvl.len(), points)
        .into_iter()
        .map(|i| {
            let p = &tvl[i];
            json!({ "date": p.date, "tvl": p.total_liquidity_usd })
        })
        .collect();

    serialize(&json!({
        "name": name,
        "symbol": take("symbol"),
        "url": take("url"),
        "description": take("description"),
        "category": take("category"),
        "chains": take("chains"),
        "gecko_id": take("gecko_id"),
        "twitter": take("twitter"),
        "mcap": take("mcap"),
        "currentChainTvls": take("currentChainTvls"),
        "tvl_history": series,
        "note": "Token breakdowns and per-chain histories are omitted to keep output small; tvl_history is downsampled.",
    }))
}

fn protocol_tvl(protocol: &str) -> Result<String, String> {
    let slug = validate_segment(protocol, "protocol")?;
    let value = http_get_json(&service_url(
        Service::Api,
        &format!("/tvl/{}", url_encode(&slug))))?;
    serialize(&json!({ "protocol": slug, "tvl_usd": value }))
}

fn list_chains(limit: usize) -> Result<String, String> {
    let value = http_get_json(&service_url(Service::Api, "/v2/chains"))?;
    let all = value
        .as_array()
        .ok_or("Unexpected /v2/chains response: expected an array")?;
    let mut chains: Vec<&Value> = all.iter().collect();
    let total = chains.len();
    let tvl_of = |v: &Value| v.get("tvl").and_then(Value::as_f64).unwrap_or(0.0);
    chains.sort_by(|a, b| tvl_of(b).total_cmp(&tvl_of(a)));
    chains.truncate(limit);
    let out: Vec<Value> = chains
        .iter()
        .map(|c| {
            json!({
                "name": c.get("name"),
                "tvl": c.get("tvl"),
                "tokenSymbol": c.get("tokenSymbol"),
                "gecko_id": c.get("gecko_id"),
                "chainId": c.get("chainId"),
            })
        })
        .collect();
    serialize(&json!({ "chain_count": total, "returned": out.len(), "chains": out }))
}

fn chain_tvl_history(chain: Option<&str>, points: usize) -> Result<String, String> {
    let path = match chain {
        Some(c) => format!(
            "/v2/historicalChainTvl/{}",
            url_encode(&validate_segment(c, "chain")?)
        ),
        None => "/v2/historicalChainTvl".to_string(),
    };
    let value = http_get_json(&service_url(Service::Api, &path))?;
    let arr = value
        .as_array()
        .ok_or("Unexpected historicalChainTvl response: expected an array")?;
    let sampled = downsample(arr, points);
    serialize(&json!({
        "chain": chain.unwrap_or("all"),
        "total_points": arr.len(),
        "returned": sampled.len(),
        "history": sampled,
    }))
}

// ==================== Coin price actions ====================

/// GET a coins.llama.fi endpoint with optional query params; responses are
/// small (keyed by requested coins), so they pass through unshaped.
fn coins_get(path: &str, params: &[(&str, Option<String>)]) -> Result<String, String> {
    let mut url = service_url(Service::Coins, path);
    let qs: Vec<String> = params
        .iter()
        .filter_map(|(k, v)| {
            v.as_ref()
                .map(|v| format!("{k}={}", url_encode(v)))
        })
        .collect();
    if !qs.is_empty() {
        url.push('?');
        url.push_str(&qs.join("&"));
    }
    serialize(&http_get_json(&url)?)
}

// ==================== Stablecoin actions ====================

#[derive(Deserialize)]
struct StablecoinList {
    #[serde(rename = "peggedAssets")]
    pegged_assets: Vec<StablecoinRow>,
}

#[derive(Deserialize)]
struct StablecoinRow {
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    symbol: Option<String>,
    #[serde(default)]
    gecko_id: Option<String>,
    #[serde(default, rename = "pegType")]
    peg_type: Option<String>,
    #[serde(default, rename = "pegMechanism")]
    peg_mechanism: Option<String>,
    #[serde(default)]
    price: Option<f64>,
    #[serde(default)]
    circulating: Option<Value>,
    #[serde(default)]
    chains: Vec<String>,
    /// Per-chain current + prev-day/week/month circulation. Only read by
    /// get_stablecoin; small (no history).
    #[serde(default, rename = "chainCirculating")]
    chain_circulating: Option<Value>,
}

/// Fetch the stablecoin list (≈0.5 MB) as typed rows.
///
/// NOTE: get_stablecoin deliberately sources from this list instead of
/// `/stablecoin/{asset}` — that endpoint returns the FULL daily per-chain
/// history (19 MB for USDT), which exceeds the sandbox's 16 MB memory cap
/// outright.
fn fetch_stablecoins() -> Result<Vec<StablecoinRow>, String> {
    let body = http_get_text(&service_url(
        Service::Stablecoins,
        "/stablecoins?includePrices=true"))?;
    let list: StablecoinList = serde_json::from_str(&body)
        .map_err(|e| format!("Unexpected /stablecoins response: {e}"))?;
    Ok(list.pegged_assets)
}

fn stablecoin_circulating(row: &StablecoinRow) -> f64 {
    row.circulating
        .as_ref()
        .map(pegged_amount)
        .unwrap_or(0.0)
}

fn list_stablecoins(query: Option<&str>, limit: usize) -> Result<String, String> {
    let assets = fetch_stablecoins()?;
    let q = lower_opt(query);
    let mut matched: Vec<&StablecoinRow> = assets
        .iter()
        .filter(|a| {
            q.as_deref()
                .is_none_or(|q| opt_contains_ci(&a.name, q) || opt_contains_ci(&a.symbol, q))
        })
        .collect();
    let total = matched.len();
    matched.sort_by(|a, b| stablecoin_circulating(b).total_cmp(&stablecoin_circulating(a)));
    matched.truncate(limit);

    let out: Vec<Value> = matched
        .iter()
        .map(|a| {
            json!({
                "id": a.id,
                "name": a.name,
                "symbol": a.symbol,
                "gecko_id": a.gecko_id,
                "pegType": a.peg_type,
                "pegMechanism": a.peg_mechanism,
                "price": a.price,
                "circulating": stablecoin_circulating(a),
                "chain_count": a.chains.len(),
            })
        })
        .collect();
    serialize(&json!({
        "query": query, "match_count": total, "returned": out.len(),
        "stablecoins": out,
        "note": "circulating is the peggedUSD/peggedEUR/... total. Use get_stablecoin for per-chain detail (pass the numeric id).",
    }))
}

fn get_stablecoin(id: &str) -> Result<String, String> {
    let id = validate_segment(id, "stablecoin_id")?;
    let assets = fetch_stablecoins()?;
    let row = assets
        .iter()
        .find(|a| a.id.as_deref() == Some(id.as_str()))
        .ok_or_else(|| {
            format!("No stablecoin found for id '{id}'. Use list_stablecoins to discover ids.")
        })?;

    serialize(&json!({
        "id": row.id,
        "name": row.name,
        "symbol": row.symbol,
        "gecko_id": row.gecko_id,
        "pegType": row.peg_type,
        "pegMechanism": row.peg_mechanism,
        "price": row.price,
        "circulating": stablecoin_circulating(row),
        "chains": row.chains,
        "chainCirculating": row.chain_circulating,
        "note": "chainCirculating holds current + prev day/week/month per chain. For time series use stablecoin_history with this id.",
    }))
}

fn stablecoin_history(
    chain: Option<&str>,
    stablecoin_id: Option<&str>,
    points: usize,
) -> Result<String, String> {
    let mut path = match chain {
        Some(c) => format!(
            "/stablecoincharts/{}",
            url_encode(&validate_segment(c, "chain")?)
        ),
        None => "/stablecoincharts/all".to_string(),
    };
    if let Some(id) = stablecoin_id {
        let id = validate_segment(id, "stablecoin_id")?;
        path.push_str(&format!("?stablecoin={}", url_encode(&id)));
    }
    let value = http_get_json(&service_url(Service::Stablecoins, &path))?;
    let arr = value
        .as_array()
        .ok_or("Unexpected stablecoincharts response: expected an array")?;
    let sampled = downsample(arr, points);
    serialize(&json!({
        "chain": chain.unwrap_or("all"),
        "stablecoin_id": stablecoin_id,
        "total_points": arr.len(),
        "returned": sampled.len(),
        "history": sampled,
    }))
}

fn stablecoin_prices(points: usize) -> Result<String, String> {
    let value = http_get_json(&service_url(Service::Stablecoins, "/stablecoinprices"))?;
    let arr = value
        .as_array()
        .ok_or("Unexpected /stablecoinprices response: expected an array")?;
    let sampled = downsample(arr, points);
    serialize(&json!({
        "total_points": arr.len(),
        "returned": sampled.len(),
        "prices": sampled,
    }))
}

// ==================== Yield actions ====================

#[derive(Deserialize)]
struct PoolRow {
    #[serde(default)]
    pool: Option<String>,
    #[serde(default)]
    chain: Option<String>,
    #[serde(default)]
    project: Option<String>,
    #[serde(default)]
    symbol: Option<String>,
    #[serde(default, rename = "tvlUsd")]
    tvl_usd: Option<f64>,
    #[serde(default)]
    apy: Option<f64>,
    #[serde(default, rename = "apyBase")]
    apy_base: Option<f64>,
    #[serde(default, rename = "apyReward")]
    apy_reward: Option<f64>,
    #[serde(default, rename = "apyMean30d")]
    apy_mean_30d: Option<f64>,
    #[serde(default)]
    stablecoin: Option<bool>,
    #[serde(default, rename = "ilRisk")]
    il_risk: Option<String>,
    #[serde(default)]
    exposure: Option<String>,
}

fn list_pools(
    chain: Option<&str>,
    project: Option<&str>,
    symbol: Option<&str>,
    limit: usize,
) -> Result<String, String> {
    // /pools is ~10.6 MB raw / ~2.1 MB gzipped; streamed row-by-row.
    let body = http_get_gzip(&service_url(Service::Yields, "/pools"))?;
    let ch = lower_opt(chain);
    let pr = lower_opt(project);
    let sy = lower_opt(symbol);

    let mut scanner = ArrayItemScanner::new(ArrayAt::Key("data"));
    let mut top = TopN::new(limit);
    let mut total = 0usize;
    {
        let mut on_item = |item: &[u8]| -> Result<(), String> {
            let Ok(p) = serde_json::from_slice::<PoolRow>(item) else {
                return Ok(());
            };
            let chain_hit = ch
                .as_deref()
                .is_none_or(|c| p.chain.as_deref().unwrap_or("").to_lowercase() == c);
            let proj_hit = pr.as_deref().is_none_or(|c| opt_contains_ci(&p.project, c));
            let sym_hit = sy.as_deref().is_none_or(|c| opt_contains_ci(&p.symbol, c));
            if chain_hit && proj_hit && sym_hit {
                total += 1;
                top.push(p.tvl_usd.unwrap_or(0.0), p);
            }
            Ok(())
        };
        stream_body(&body, &mut |chunk| scanner.feed(chunk, &mut on_item))?;
    }
    drop(body);
    let matched = top.finish();

    let out: Vec<Value> = matched
        .iter()
        .map(|p| {
            json!({
                "pool": p.pool,
                "chain": p.chain,
                "project": p.project,
                "symbol": p.symbol,
                "tvlUsd": p.tvl_usd,
                "apy": p.apy,
                "apyBase": p.apy_base,
                "apyReward": p.apy_reward,
                "apyMean30d": p.apy_mean_30d,
                "stablecoin": p.stablecoin,
                "ilRisk": p.il_risk,
                "exposure": p.exposure,
            })
        })
        .collect();
    serialize(&json!({
        "chain": chain, "project": project, "symbol": symbol,
        "match_count": total, "returned": out.len(),
        "pools": out,
        "note": "Sorted by tvlUsd desc. Use the 'pool' id with pool_history for APY/TVL history.",
    }))
}

fn pool_history(pool: &str, points: usize) -> Result<String, String> {
    let pool = validate_segment(pool, "pool")?;
    let value = http_get_json(&service_url(
        Service::Yields,
        &format!("/chart/{}", url_encode(&pool))))?;
    let arr = value
        .get("data")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            format!("No history for pool '{pool}'. Use list_pools to discover pool ids.")
        })?;
    let sampled = downsample(arr, points);
    serialize(&json!({
        "pool": pool,
        "total_points": arr.len(),
        "returned": sampled.len(),
        "history": sampled,
    }))
}

// ==================== Volume / fees adapters ====================

#[derive(Deserialize)]
struct OverviewResp {
    #[serde(default)]
    total24h: Option<f64>,
    #[serde(default)]
    total7d: Option<f64>,
    #[serde(default)]
    total30d: Option<f64>,
    #[serde(default)]
    change_1d: Option<f64>,
    #[serde(default)]
    change_7d: Option<f64>,
    #[serde(default)]
    change_1m: Option<f64>,
    #[serde(default, rename = "allChains")]
    all_chains: Option<Vec<String>>,
    #[serde(default)]
    chain: Option<String>,
    #[serde(default)]
    protocols: Vec<OverviewProtocol>,
}

#[derive(Deserialize)]
struct OverviewProtocol {
    #[serde(default)]
    name: Option<String>,
    #[serde(default, rename = "displayName")]
    display_name: Option<String>,
    #[serde(default)]
    slug: Option<String>,
    #[serde(default)]
    module: Option<String>,
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    chains: Vec<String>,
    #[serde(default)]
    total24h: Option<f64>,
    #[serde(default)]
    total7d: Option<f64>,
    #[serde(default)]
    total30d: Option<f64>,
    #[serde(default)]
    change_1d: Option<f64>,
    #[serde(default)]
    change_7d: Option<f64>,
    #[serde(default)]
    change_1m: Option<f64>,
}

/// GET /overview/{kind}[/{chain}] with charts excluded, and summarize the
/// protocols list (it carries dozens of fields per protocol; ~1.5 MB body).
fn adapter_overview(
    kind: &str,
    chain: Option<&str>,
    data_type: Option<String>,
    limit: usize,
) -> Result<String, String> {
    let mut path = match chain {
        Some(c) => format!("/overview/{kind}/{}", url_encode(&validate_segment(c, "chain")?)),
        None => format!("/overview/{kind}"),
    };
    path.push_str("?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true");
    if let Some(dt) = &data_type {
        path.push_str(&format!("&dataType={}", url_encode(dt)));
    }
    let body = http_get_text(&service_url(Service::Api, &path))?;
    let mut resp: OverviewResp = serde_json::from_str(&body)
        .map_err(|e| format!("Unexpected /overview/{kind} response: {e}"))?;
    drop(body);

    let total = resp.protocols.len();
    resp.protocols
        .sort_by(|a, b| b.total24h.unwrap_or(0.0).total_cmp(&a.total24h.unwrap_or(0.0)));
    resp.protocols.truncate(limit);
    let plist: Vec<Value> = resp
        .protocols
        .iter()
        .map(|p| {
            json!({
                "name": p.display_name.as_ref().or(p.name.as_ref()),
                "slug": p.slug.as_ref().or(p.module.as_ref()),
                "category": p.category,
                "chains": p.chains,
                "total24h": p.total24h,
                "total7d": p.total7d,
                "total30d": p.total30d,
                "change_1d": p.change_1d,
                "change_7d": p.change_7d,
                "change_1m": p.change_1m,
            })
        })
        .collect();

    serialize(&json!({
        "total24h": resp.total24h,
        "total7d": resp.total7d,
        "total30d": resp.total30d,
        "change_1d": resp.change_1d,
        "change_7d": resp.change_7d,
        "change_1m": resp.change_1m,
        "allChains": resp.all_chains,
        "chain": resp.chain,
        "dataType": data_type,
        "protocol_count": total,
        "returned": plist.len(),
        "protocols": plist,
    }))
}

/// GET /summary/{kind}/{protocol} with charts excluded.
fn adapter_summary(
    kind: &str,
    protocol: &str,
    data_type: Option<String>,
) -> Result<String, String> {
    let slug = validate_segment(protocol, "protocol")?;
    let mut path = format!(
        "/summary/{kind}/{}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true",
        url_encode(&slug)
    );
    if let Some(dt) = &data_type {
        path.push_str(&format!("&dataType={}", url_encode(dt)));
    }
    let mut value = http_get_json(&service_url(Service::Api, &path))?;
    // Belt-and-braces: drop chart arrays if the server ignored the exclude flags.
    if let Some(obj) = value.as_object_mut() {
        obj.remove("totalDataChart");
        obj.remove("totalDataChartBreakdown");
    }
    serialize(&value)
}

// ==================== Shaping helpers ====================

fn summarize_protocol(p: &ProtocolRow) -> Value {
    let chains: Vec<&String> = p.chains.iter().take(8).collect();
    json!({
        "slug": p.slug,
        "name": p.name,
        "symbol": p.symbol,
        "category": p.category,
        "tvl": p.tvl,
        "change_1d": p.change_1d,
        "change_7d": p.change_7d,
        "mcap": p.mcap,
        "chain_count": p.chains.len(),
        "chains": chains,
    })
}

/// Indices for an even sample of `len` items down to at most `n`, always
/// including the last (most recent) item.
fn sample_indices(len: usize, n: usize) -> Vec<usize> {
    if len <= n {
        return (0..len).collect();
    }
    let mut out: Vec<usize> = Vec::with_capacity(n);
    for i in 0..n - 1 {
        out.push(i * (len - 1) / (n - 1));
    }
    out.push(len - 1);
    out
}

/// Evenly sample `arr` down to at most `n` points, always keeping the last
/// (most recent) point.
fn downsample(arr: &[Value], n: usize) -> Vec<Value> {
    sample_indices(arr.len(), n)
        .into_iter()
        .map(|i| arr[i].clone())
        .collect()
}

/// Read the single amount out of a `{"peggedUSD": 123.0}`-style object.
fn pegged_amount(v: &Value) -> f64 {
    v.as_object()
        .and_then(|m| m.values().next())
        .and_then(Value::as_f64)
        .unwrap_or(0.0)
}

fn opt_contains_ci(v: &Option<String>, needle_lower: &str) -> bool {
    v.as_deref()
        .is_some_and(|s| s.to_lowercase().contains(needle_lower))
}

fn lower_opt(s: Option<&str>) -> Option<String> {
    s.map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty())
}

// ==================== HTTP helpers ====================

fn http_get_json(url: &str) -> Result<Value, String> {
    let body = http_get_text(url)?;
    serde_json::from_str(&body).map_err(|e| format!("Failed to parse DefiLlama response: {e}"))
}

fn http_get_text(url: &str) -> Result<String, String> {
    let body = http_get_raw(url, false)?;
    String::from_utf8(body).map_err(|e| format!("Invalid UTF-8 response: {e}"))
}

/// GET with `Accept-Encoding: gzip`. The IronClaw host's HTTP client is built
/// without gzip support, so it forwards our header and hands back the raw
/// (compressed) bytes — 2-3 MB instead of 8-11 MB for the big endpoints.
/// Decompress incrementally via stream_body(); never inflate to one buffer.
fn http_get_gzip(url: &str) -> Result<Vec<u8>, String> {
    http_get_raw(url, true)
}

fn http_get_raw(url: &str, accept_gzip: bool) -> Result<Vec<u8>, String> {
    let headers = if accept_gzip {
        json!({
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "User-Agent": "IronClaw-DefiLlama-Tool/0.1"
        })
    } else {
        json!({
            "Accept": "application/json",
            "User-Agent": "IronClaw-DefiLlama-Tool/0.1"
        })
    };

    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        let resp = near::agent::host::http_request("GET", url, &headers.to_string(), None, None)
            .map_err(|e| format!("HTTP request failed: {e}"))?;

        if (200..300).contains(&resp.status) {
            break resp;
        }

        if attempt < MAX_RETRIES && (resp.status == 429 || resp.status >= 500) {
            near::agent::host::log(
                near::agent::host::LogLevel::Warn,
                &format!(
                    "DefiLlama request returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        let body = String::from_utf8_lossy(&resp.body);
        let hint = match resp.status {
            401 | 403 => " (pro endpoint auth failed — check the stored defillama_api_key)",
            404 => " (not found — check the slug/id; discover them via the list_* actions)",
            _ => "",
        };
        return Err(format!(
            "DefiLlama request failed (HTTP {}){hint}: {}",
            resp.status,
            body.chars().take(500).collect::<String>()
        ));
    };

    Ok(response.body)
}

// ==================== Validation / encoding ====================

/// Validate a single URL path segment (protocol slug, chain name, pool id,
/// stablecoin id). Chains are capitalized on DefiLlama (e.g. 'Ethereum').
fn validate_segment(s: &str, field: &str) -> Result<String, String> {
    let s = s.trim();
    if s.is_empty() {
        return Err(format!("{field} must not be empty"));
    }
    if s.len() > 128 {
        return Err(format!("{field} exceeds maximum length of 128 characters"));
    }
    if !s
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_' | b'.' | b'%' | b' '))
    {
        return Err(format!(
            "Invalid {field} '{s}': only letters, digits, '-', '_', '.', and spaces are allowed"
        ));
    }
    Ok(s.to_string())
}

/// Validate a coins list: comma-separated `{chain}:{address}` or
/// `coingecko:{id}` entries.
fn validate_coins(coins: &str) -> Result<String, String> {
    let coins = coins.trim();
    if coins.is_empty() {
        return Err("coins must not be empty (e.g. 'coingecko:ethereum' or 'ethereum:0x...,bsc:0x...')".into());
    }
    if coins.len() > 2000 {
        return Err("coins list is too long (max 2000 characters)".into());
    }
    if !coins
        .bytes()
        .all(|b| b.is_ascii_alphanumeric() || matches!(b, b':' | b',' | b'-' | b'_' | b'.'))
    {
        return Err(format!(
            "Invalid coins '{coins}': entries must be '{{chain}}:{{address}}' or 'coingecko:{{id}}', comma-separated"
        ));
    }
    Ok(coins.to_string())
}

fn validate_opt_choice(
    val: Option<&str>,
    field: &str,
    allowed: &[&str],
) -> Result<Option<String>, String> {
    match val {
        None => Ok(None),
        Some(v) => {
            let vt = v.trim();
            allowed
                .iter()
                .find(|a| a.eq_ignore_ascii_case(vt))
                .map(|a| Some(a.to_string()))
                .ok_or_else(|| {
                    format!(
                        "Invalid {field} '{v}': allowed values are {}",
                        allowed.join(", ")
                    )
                })
        }
    }
}

/// Percent-encode a string for safe use in a URL path segment or query value.
fn url_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 2);
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' | b':' | b',' => {
                out.push(b as char);
            }
            _ => {
                out.push('%');
                out.push(char::from(b"0123456789ABCDEF"[(b >> 4) as usize]));
                out.push(char::from(b"0123456789ABCDEF"[(b & 0xf) as usize]));
            }
        }
    }
    out
}

fn serialize(value: &Value) -> Result<String, String> {
    serde_json::to_string(value).map_err(|e| format!("Failed to serialize output: {e}"))
}

// NOTE: This schema uses the top-level `required` + `oneOf` (per-action branch)
// shape. The host forwards only the fields named in the matching branch; a flat
// schema would strip every non-'action' argument before the tool sees it. Each
// branch re-lists `action` plus that action's mandatory fields. Do NOT add a
// top-level `additionalProperties: false`.
const SCHEMA: &str = r#"{
    "type": "object",
    "required": ["action"],
    "oneOf": [
        {
            "properties": {
                "action": { "const": "list_protocols" },
                "query": { "type": "string", "description": "Filter on protocol name/symbol/slug (case-insensitive substring)." },
                "category": { "type": "string", "description": "Exact category filter, e.g. 'Lending', 'Dexs', 'Liquid Staking'." },
                "chain": { "type": "string", "description": "Only protocols deployed on this chain, e.g. 'Ethereum', 'Solana'." },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Max results, sorted by TVL desc (1-100, default 20)." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "get_protocol" },
                "protocol": { "type": "string", "description": "Protocol slug, e.g. 'aave', 'uniswap'. Discover slugs with list_protocols." },
                "points": { "type": "integer", "minimum": 2, "maximum": 500, "default": 90, "description": "Max TVL history points returned (downsampled)." }
            },
            "required": ["action", "protocol"]
        },
        {
            "properties": {
                "action": { "const": "protocol_tvl" },
                "protocol": { "type": "string", "description": "Protocol slug, e.g. 'aave'. Returns the current TVL as a single number." }
            },
            "required": ["action", "protocol"]
        },
        {
            "properties": {
                "action": { "const": "list_chains" },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Max chains, sorted by TVL desc." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "chain_tvl_history" },
                "chain": { "type": "string", "description": "Chain name, e.g. 'Ethereum'. Omit for all-chains total TVL." },
                "points": { "type": "integer", "minimum": 2, "maximum": 500, "default": 90, "description": "Max history points returned (evenly downsampled)." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "current_prices" },
                "coins": { "type": "string", "description": "Comma-separated '{chain}:{address}' or 'coingecko:{id}', e.g. 'coingecko:ethereum,bsc:0x762539b45a1dcce3d36d080f74d1aed37844b878'." },
                "search_width": { "type": "string", "description": "Time range to find price data, e.g. '4h' (default 6h)." }
            },
            "required": ["action", "coins"]
        },
        {
            "properties": {
                "action": { "const": "historical_prices" },
                "coins": { "type": "string", "description": "Comma-separated '{chain}:{address}' or 'coingecko:{id}'." },
                "timestamp": { "type": "integer", "description": "Unix timestamp (seconds) of the moment to price." },
                "search_width": { "type": "string", "description": "Time range to find price data, e.g. '4h' (default 6h)." }
            },
            "required": ["action", "coins", "timestamp"]
        },
        {
            "properties": {
                "action": { "const": "price_chart" },
                "coins": { "type": "string", "description": "Comma-separated '{chain}:{address}' or 'coingecko:{id}'." },
                "start": { "type": "integer", "description": "Unix timestamp of earliest data point. Use start OR end, not both." },
                "end": { "type": "integer", "description": "Unix timestamp of latest data point." },
                "span": { "type": "integer", "description": "Number of data points to return (server-side), e.g. 30." },
                "period": { "type": "string", "description": "Interval between points: e.g. '1d', '4h', '1w' (default '24h')." },
                "search_width": { "type": "string", "description": "Time range on either side to find price data (default 10% of period)." }
            },
            "required": ["action", "coins"]
        },
        {
            "properties": {
                "action": { "const": "price_percentage" },
                "coins": { "type": "string", "description": "Comma-separated '{chain}:{address}' or 'coingecko:{id}'." },
                "timestamp": { "type": "integer", "description": "Unix timestamp to compute change from (default: now)." },
                "look_forward": { "type": "boolean", "description": "true = change over the period AFTER the timestamp (default false = before)." },
                "period": { "type": "string", "description": "Change window, e.g. '24h', '7d' (default '24h')." }
            },
            "required": ["action", "coins"]
        },
        {
            "properties": {
                "action": { "const": "first_prices" },
                "coins": { "type": "string", "description": "Comma-separated '{chain}:{address}' or 'coingecko:{id}'. Returns each token's earliest recorded price." }
            },
            "required": ["action", "coins"]
        },
        {
            "properties": {
                "action": { "const": "block" },
                "chain": { "type": "string", "description": "Chain name, e.g. 'ethereum'." },
                "timestamp": { "type": "integer", "description": "Unix timestamp. Returns the closest block at or after it." }
            },
            "required": ["action", "chain", "timestamp"]
        },
        {
            "properties": {
                "action": { "const": "list_stablecoins" },
                "query": { "type": "string", "description": "Filter on stablecoin name/symbol." },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Max results, sorted by circulating supply desc." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "get_stablecoin" },
                "stablecoin_id": { "type": "string", "description": "Numeric stablecoin id (e.g. '1' for USDT). Discover ids with list_stablecoins." }
            },
            "required": ["action", "stablecoin_id"]
        },
        {
            "properties": {
                "action": { "const": "stablecoin_history" },
                "chain": { "type": "string", "description": "Chain slug, e.g. 'Ethereum'. Omit for all chains combined." },
                "stablecoin_id": { "type": "string", "description": "Restrict to one stablecoin (numeric id from list_stablecoins)." },
                "points": { "type": "integer", "minimum": 2, "maximum": 500, "default": 90, "description": "Max history points returned (evenly downsampled)." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "stablecoin_chains" }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "stablecoin_prices" },
                "points": { "type": "integer", "minimum": 2, "maximum": 500, "default": 90, "description": "Max daily price points returned." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "list_pools" },
                "chain": { "type": "string", "description": "Exact chain filter, e.g. 'Ethereum'." },
                "project": { "type": "string", "description": "Project slug filter (substring), e.g. 'aave-v3', 'lido'." },
                "symbol": { "type": "string", "description": "Token symbol filter (substring), e.g. 'USDC'." },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Max pools, sorted by TVL desc." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "pool_history" },
                "pool": { "type": "string", "description": "Pool UUID from list_pools (the 'pool' field)." },
                "points": { "type": "integer", "minimum": 2, "maximum": 500, "default": 90, "description": "Max APY/TVL history points returned." }
            },
            "required": ["action", "pool"]
        },
        {
            "properties": {
                "action": { "const": "dex_overview" },
                "chain": { "type": "string", "description": "Chain filter, e.g. 'ethereum'. Omit for all chains." },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Max DEXs, sorted by 24h volume desc." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "dex_summary" },
                "protocol": { "type": "string", "description": "DEX protocol slug, e.g. 'uniswap'." }
            },
            "required": ["action", "protocol"]
        },
        {
            "properties": {
                "action": { "const": "options_overview" },
                "chain": { "type": "string", "description": "Chain filter, e.g. 'ethereum'. Omit for all chains." },
                "data_type": { "type": "string", "enum": ["dailyPremiumVolume", "dailyNotionalVolume"], "description": "Volume type (default dailyNotionalVolume)." },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Max protocols, sorted by 24h volume desc." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "options_summary" },
                "protocol": { "type": "string", "description": "Options protocol slug, e.g. 'lyra'." },
                "data_type": { "type": "string", "enum": ["dailyPremiumVolume", "dailyNotionalVolume"], "description": "Volume type (default dailyNotionalVolume)." }
            },
            "required": ["action", "protocol"]
        },
        {
            "properties": {
                "action": { "const": "open_interest_overview" },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Max perp protocols, sorted by open interest desc." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "fees_overview" },
                "chain": { "type": "string", "description": "Chain filter, e.g. 'ethereum'. Omit for all chains." },
                "data_type": { "type": "string", "enum": ["dailyFees", "dailyRevenue", "dailyHoldersRevenue"], "description": "Metric (default dailyFees)." },
                "limit": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20, "description": "Max protocols, sorted by 24h fees desc." }
            },
            "required": ["action"]
        },
        {
            "properties": {
                "action": { "const": "fees_summary" },
                "protocol": { "type": "string", "description": "Protocol slug, e.g. 'aave'." },
                "data_type": { "type": "string", "enum": ["dailyFees", "dailyRevenue", "dailyHoldersRevenue"], "description": "Metric (default dailyFees)." }
            },
            "required": ["action", "protocol"]
        }
    ]
}"#;

export!(DefiLlamaTool);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn schema_is_valid_json() {
        let v: Value = serde_json::from_str(SCHEMA).expect("schema must be valid JSON");
        assert_eq!(v["type"], "object");
        assert_eq!(v["required"][0], "action");
        let branches = v["oneOf"].as_array().expect("oneOf must be an array");
        assert_eq!(branches.len(), 25);
        for b in branches {
            let req = b["required"].as_array().expect("branch needs required[]");
            assert_eq!(req[0], "action");
            assert!(b["properties"]["action"]["const"].is_string());
        }
    }

    #[test]
    fn schema_actions_match_enum() {
        // Every schema const must deserialize into the Action enum (with
        // minimal required params) and vice versa is covered by the count.
        let v: Value = serde_json::from_str(SCHEMA).unwrap();
        for b in v["oneOf"].as_array().unwrap() {
            let action = b["properties"]["action"]["const"].as_str().unwrap();
            let mut obj = serde_json::Map::new();
            obj.insert("action".into(), json!(action));
            for r in b["required"].as_array().unwrap().iter().skip(1) {
                let field = r.as_str().unwrap();
                let ftype = b["properties"][field]["type"].as_str().unwrap_or("string");
                let filler = match ftype {
                    "integer" => json!(1),
                    _ => json!("x"),
                };
                obj.insert(field.to_string(), filler);
            }
            let params = Value::Object(obj).to_string();
            serde_json::from_str::<Action>(&params)
                .unwrap_or_else(|e| panic!("schema action '{action}' failed to deserialize: {e}"));
        }
    }

    #[test]
    fn downsample_keeps_bounds() {
        let arr: Vec<Value> = (0..1000).map(|i| json!(i)).collect();
        let s = downsample(&arr, 90);
        assert_eq!(s.len(), 90);
        assert_eq!(s[0], json!(0));
        assert_eq!(s[89], json!(999));

        let small: Vec<Value> = (0..5).map(|i| json!(i)).collect();
        assert_eq!(downsample(&small, 90).len(), 5);
    }

    #[test]
    fn clamp_bounds() {
        assert_eq!(clamp_limit(None), DEFAULT_LIMIT);
        assert_eq!(clamp_limit(Some(0)), 1);
        assert_eq!(clamp_limit(Some(9999)), MAX_LIMIT);
        assert_eq!(clamp_points(None), DEFAULT_POINTS);
        assert_eq!(clamp_points(Some(1)), 2);
        assert_eq!(clamp_points(Some(100_000)), MAX_POINTS);
    }

    #[test]
    fn validate_segment_rules() {
        assert!(validate_segment("aave", "protocol").is_ok());
        assert!(validate_segment("Ethereum", "chain").is_ok());
        assert!(validate_segment("aave-v3", "protocol").is_ok());
        assert!(validate_segment("747c1d2a-c668-4682-b9f9-296708a3dd90", "pool").is_ok());
        assert!(validate_segment("Arbitrum Nova", "chain").is_ok());
        assert!(validate_segment("", "protocol").is_err());
        assert!(validate_segment("a/b", "protocol").is_err());
        assert!(validate_segment("a?x=1", "protocol").is_err());
    }

    #[test]
    fn validate_coins_rules() {
        assert!(validate_coins("coingecko:ethereum").is_ok());
        assert!(validate_coins("ethereum:0xdF574c24545E5FfEcb9a659c229253D4111d87e1,coingecko:bitcoin").is_ok());
        assert!(validate_coins("").is_err());
        assert!(validate_coins("a b").is_err());
        assert!(validate_coins("x?y=1").is_err());
    }

    #[test]
    fn service_url_routing() {
        assert_eq!(
            service_url(Service::Api, "/protocols"),
            "https://api.llama.fi/protocols"
        );
        assert_eq!(
            service_url(Service::Coins, "/prices/current/coingecko:ethereum"),
            "https://coins.llama.fi/prices/current/coingecko:ethereum"
        );
        assert_eq!(
            service_url(Service::Yields, "/pools"),
            "https://yields.llama.fi/pools"
        );
        assert_eq!(
            service_url(Service::Stablecoins, "/stablecoins"),
            "https://stablecoins.llama.fi/stablecoins"
        );
    }

    #[test]
    fn action_deserializes_variants() {
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"list_protocols","chain":"Ethereum"}"#),
            Ok(Action::ListProtocols { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"get_protocol","protocol":"aave"}"#),
            Ok(Action::GetProtocol { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(
                r#"{"action":"current_prices","coins":"coingecko:ethereum"}"#
            ),
            Ok(Action::CurrentPrices { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(
                r#"{"action":"historical_prices","coins":"coingecko:ethereum","timestamp":1700000000}"#
            ),
            Ok(Action::HistoricalPrices { .. })
        ));
        assert!(matches!(
            serde_json::from_str::<Action>(r#"{"action":"stablecoin_chains"}"#),
            Ok(Action::StablecoinChains)
        ));
    }

    #[test]
    fn required_fields_enforced() {
        assert!(serde_json::from_str::<Action>(r#"{"action":"get_protocol"}"#).is_err());
        assert!(serde_json::from_str::<Action>(r#"{"action":"current_prices"}"#).is_err());
        assert!(serde_json::from_str::<Action>(r#"{"action":"pool_history"}"#).is_err());
        assert!(serde_json::from_str::<Action>(r#"{"action":"pro","path":"api/hacks"}"#).is_err()); // pro removed
        assert!(serde_json::from_str::<Action>(r#"{"action":"block","chain":"ethereum"}"#).is_err());
    }

    #[test]
    fn validate_choice_data_types() {
        assert_eq!(
            validate_opt_choice(Some("dailyfees"), "data_type", &["dailyFees", "dailyRevenue"])
                .unwrap(),
            Some("dailyFees".to_string())
        );
        assert_eq!(
            validate_opt_choice(None, "data_type", &["dailyFees"]).unwrap(),
            None
        );
        assert!(validate_opt_choice(Some("bogus"), "data_type", &["dailyFees"]).is_err());
    }

    #[test]
    fn url_encode_escapes() {
        assert_eq!(url_encode("a b"), "a%20b");
        assert_eq!(url_encode("coingecko:ethereum,bsc:0x1"), "coingecko:ethereum,bsc:0x1");
        assert_eq!(url_encode("a&b=c"), "a%26b%3Dc");
    }

    #[test]
    fn summarize_protocol_shapes() {
        let p: ProtocolRow = serde_json::from_value(json!({
            "slug": "aave", "name": "Aave", "symbol": "AAVE", "category": "Lending",
            "tvl": 1.0e10, "change_1d": 0.5, "change_7d": -1.2, "mcap": 2.0e9,
            "chains": ["Ethereum", "Polygon"],
            "unknown_field_is_skipped": { "big": [1, 2, 3] }
        }))
        .unwrap();
        let s = summarize_protocol(&p);
        assert_eq!(s["slug"], "aave");
        assert_eq!(s["chain_count"], 2);
        assert_eq!(s["chains"][0], "Ethereum");
    }

    #[test]
    fn typed_rows_skip_unknown_fields() {
        let r: StablecoinRow = serde_json::from_value(json!({
            "id": "1", "name": "Tether", "symbol": "USDT",
            "circulating": { "peggedUSD": 100.0 },
            "chainCirculating": { "Ethereum": { "current": { "peggedUSD": 60.0 } } },
            "chains": ["Ethereum"]
        }))
        .unwrap();
        assert_eq!(stablecoin_circulating(&r), 100.0);
        assert_eq!(r.id.as_deref(), Some("1"));
    }

    /// Feed a scanner in pathological chunk sizes to shake out boundary bugs.
    fn scan_array_chunked(json: &str, at: ArrayAt, chunk: usize) -> Vec<String> {
        let mut scanner = ArrayItemScanner::new(at);
        let mut items = Vec::new();
        let bytes = json.as_bytes();
        let mut on_item = |item: &[u8]| -> Result<(), String> {
            items.push(String::from_utf8(item.to_vec()).unwrap());
            Ok(())
        };
        for c in bytes.chunks(chunk) {
            scanner.feed(c, &mut on_item).unwrap();
        }
        items
    }

    #[test]
    fn array_scanner_root_and_key_modes() {
        let root = r#"[{"a":1},{"b":"x{[,]}y"},{"c":{"d":[1,2]}}]"#;
        for chunk in [1, 3, 7, 1024] {
            let items = scan_array_chunked(root, ArrayAt::Root, chunk);
            assert_eq!(items.len(), 3, "chunk={chunk}");
            assert_eq!(items[0], r#"{"a":1}"#);
            assert_eq!(items[1], r#"{"b":"x{[,]}y"}"#); // braces inside strings ignored
            assert_eq!(items[2], r#"{"c":{"d":[1,2]}}"#);
        }

        let keyed = r#"{"status":"ok","meta":{"data":[9]},"data":[{"p":"u\"v"},{"q":2}],"z":[3]}"#;
        for chunk in [1, 5, 1024] {
            let items = scan_array_chunked(keyed, ArrayAt::Key("data"), chunk);
            // "data" nested inside "meta" must NOT match; only the root-level one.
            assert_eq!(items.len(), 2, "chunk={chunk}");
            assert_eq!(items[0], r#"{"p":"u\"v"}"#); // escaped quote survives
            assert_eq!(items[1], r#"{"q":2}"#);
        }
    }

    #[test]
    fn object_field_scanner_captures_and_skips() {
        const WANTED: &[&str] = &["name", "mcap", "chains", "tvl"];
        let doc = r#"{"name":"Aave","chainTvls":{"Ethereum":{"tokens":[1,2,3],"s":"}]"}},"mcap":2.5,"chains":["Ethereum","Base"],"skip_me":[[[1],2],3],"tvl":[{"date":1,"totalLiquidityUSD":2.0}]}"#;
        for chunk in [1, 4, 1024] {
            let mut s = ObjectFieldScanner::new(WANTED);
            for c in doc.as_bytes().chunks(chunk) {
                s.feed(c);
            }
            let map: std::collections::HashMap<String, Vec<u8>> = s.fields.into_iter().collect();
            assert_eq!(map.len(), 4, "chunk={chunk}");
            assert_eq!(map["name"], br#""Aave""#.to_vec());
            assert_eq!(map["mcap"], b"2.5".to_vec());
            let chains: Vec<String> = serde_json::from_slice(&map["chains"]).unwrap();
            assert_eq!(chains, vec!["Ethereum", "Base"]);
            let tvl: Vec<TvlPoint> = serde_json::from_slice(&map["tvl"]).unwrap();
            assert_eq!(tvl.len(), 1);
            assert!(!map.contains_key("chainTvls")); // skipped, never buffered
        }
    }

    #[test]
    fn stream_body_inflates_gzip_and_passes_plain() {
        use std::io::Write;
        let payload = br#"[{"x":1},{"y":2}]"#;
        let mut enc =
            flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        enc.write_all(payload).unwrap();
        let gz = enc.finish().unwrap();

        for body in [gz.as_slice(), payload.as_slice()] {
            let mut out = Vec::new();
            stream_body(body, &mut |c| {
                out.extend_from_slice(c);
                Ok(())
            })
            .unwrap();
            assert_eq!(out, payload);
        }
    }

    /// End-to-end streaming check against real captured payloads. Skipped
    /// unless DEFI_FIXTURES points at a directory containing pools.json.gz /
    /// protocols.json.gz / aave.json.gz (raw gzip bodies as served with
    /// Accept-Encoding: gzip).
    #[test]
    fn streams_real_fixtures_when_present() {
        let Ok(dir) = std::env::var("DEFI_FIXTURES") else {
            return;
        };
        let read = |n: &str| std::fs::read(format!("{dir}/{n}")).unwrap();

        // /pools — count rows via the "data" array scanner.
        let body = read("pools.json.gz");
        let mut scanner = ArrayItemScanner::new(ArrayAt::Key("data"));
        let mut n = 0usize;
        let mut top = TopN::new(10);
        let mut on_item = |item: &[u8]| -> Result<(), String> {
            let p: PoolRow = serde_json::from_slice(item).map_err(|e| e.to_string())?;
            n += 1;
            top.push(p.tvl_usd.unwrap_or(0.0), p);
            Ok(())
        };
        stream_body(&body, &mut |c| scanner.feed(c, &mut on_item)).unwrap();
        assert!(n > 10_000, "expected >10k pools, got {n}");
        let best = top.finish();
        assert_eq!(best.len(), 10);
        assert!(best[0].tvl_usd.unwrap() >= best[9].tvl_usd.unwrap());

        // /protocols — root array scanner.
        let body = read("protocols.json.gz");
        let mut scanner = ArrayItemScanner::new(ArrayAt::Root);
        let mut n = 0usize;
        let mut on_item = |item: &[u8]| -> Result<(), String> {
            let _p: ProtocolRow = serde_json::from_slice(item).map_err(|e| e.to_string())?;
            n += 1;
            Ok(())
        };
        stream_body(&body, &mut |c| scanner.feed(c, &mut on_item)).unwrap();
        assert!(n > 5_000, "expected >5k protocols, got {n}");

        // /protocol/aave — object field scanner skips the multi-MB chainTvls.
        let body = read("aave.json.gz");
        let mut s = ObjectFieldScanner::new(PROTOCOL_DETAIL_FIELDS);
        stream_body(&body, &mut |c| {
            s.feed(c);
            Ok(())
        })
        .unwrap();
        let map: std::collections::HashMap<String, Vec<u8>> = s.fields.into_iter().collect();
        assert_eq!(
            serde_json::from_slice::<String>(&map["name"]).unwrap(),
            "Aave"
        );
        let tvl: Vec<TvlPoint> = serde_json::from_slice(&map["tvl"]).unwrap();
        assert!(tvl.len() > 1000);
        let captured: usize = map.values().map(Vec::len).sum();
        assert!(
            captured < 1_000_000,
            "captured fields should be <1MB, got {captured}"
        );
    }

    #[test]
    fn top_n_stays_bounded_and_sorted() {
        let mut top = TopN::new(3);
        for i in 0..10_000u32 {
            top.push(f64::from(i % 977), i);
            assert!(top.rows.len() < top.prune_threshold() + 1);
        }
        let rows = top.finish();
        assert_eq!(rows.len(), 3);
        // All three winners carry the max key 976.
        assert!(rows.iter().all(|r| r % 977 == 976));
    }

    #[test]
    fn pegged_amount_reads_first_peg() {
        assert_eq!(pegged_amount(&json!({ "peggedUSD": 123.0 })), 123.0);
        assert_eq!(pegged_amount(&json!({})), 0.0);
    }

    #[test]
    fn sample_indices_bounds() {
        assert_eq!(sample_indices(5, 90), vec![0, 1, 2, 3, 4]);
        let idx = sample_indices(1000, 90);
        assert_eq!(idx.len(), 90);
        assert_eq!(idx[0], 0);
        assert_eq!(idx[89], 999);
    }
}
