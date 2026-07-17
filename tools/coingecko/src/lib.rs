//! CoinGecko WASM Tool for IronClaw.
//!
//! Wraps the CoinGecko API (<https://docs.coingecko.com>) so an agent can:
//!
//! - `ping`              — check server connection.
//! - `simple_price`      — get current prices of specified coins.
//! - `coin_markets`      — list coin market data.
//! - `coin_details`      — get detailed coin metadata & market snapshot.
//! - `coin_market_chart` — retrieve historical price chart data.
//! - `coin_ohlc`         — get candlestick price data.
//! - `trending_coins`    — fetch trending coins / categories.
//! - `list_categories`   — list categories with metrics.
//! - `search`            — search for coins, NFTs, exchanges.
//! - `coins_list`        — list top supported coins (dynamic or static fallback).

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const SECRET_NAME: &str = "coingecko_api_key";
const MAX_RETRIES: u32 = 3;
const HTTP_TIMEOUT_MS: u32 = 30_000;
const MAX_POINTS: usize = 100;

struct CoinGeckoTool;

impl exports::near::agent::tool::Guest for CoinGeckoTool {
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
        "CoinGecko cryptocurrency price and market oracle. \
         Actions: 'ping', 'simple_price' (current prices), 'coin_markets' (market data tables), \
         'coin_details' (pruned coin metadata), 'coin_market_chart' (historical prices), \
         'coin_ohlc' (candles), 'trending_coins', 'list_categories', 'search' (keyword search), \
         'coins_list' (top 100-1000 coins lookup). \
         Support for Demo and Pro APIs via the 'pro' flag. \
         Authentication uses 'coingecko_api_key' injected by the host."
            .to_string()
    }
}

/// Tool actions. Selected via the `action` field.
#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    Ping {
        #[serde(default)]
        pro: Option<bool>,
    },
    SimplePrice {
        ids: String,
        vs_currencies: String,
        #[serde(default)]
        include_market_cap: Option<bool>,
        #[serde(default)]
        include_24hr_vol: Option<bool>,
        #[serde(default)]
        include_24hr_change: Option<bool>,
        #[serde(default)]
        include_last_updated_at: Option<bool>,
        #[serde(default)]
        pro: Option<bool>,
    },
    CoinMarkets {
        vs_currency: String,
        #[serde(default)]
        ids: Option<String>,
        #[serde(default)]
        category: Option<String>,
        #[serde(default)]
        order: Option<String>,
        #[serde(default)]
        per_page: Option<u32>,
        #[serde(default)]
        page: Option<u32>,
        #[serde(default)]
        sparkline: Option<bool>,
        #[serde(default)]
        price_change_percentage: Option<String>,
        #[serde(default)]
        pro: Option<bool>,
    },
    CoinDetails {
        id: String,
        #[serde(default)]
        localization: Option<bool>,
        #[serde(default)]
        tickers: Option<bool>,
        #[serde(default)]
        market_data: Option<bool>,
        #[serde(default)]
        community_data: Option<bool>,
        #[serde(default)]
        developer_data: Option<bool>,
        #[serde(default)]
        sparkline: Option<bool>,
        #[serde(default)]
        pro: Option<bool>,
    },
    CoinMarketChart {
        id: String,
        vs_currency: String,
        days: String,
        #[serde(default)]
        interval: Option<String>,
        #[serde(default)]
        pro: Option<bool>,
    },
    CoinOhlc {
        id: String,
        vs_currency: String,
        days: String,
        #[serde(default)]
        pro: Option<bool>,
    },
    TrendingCoins {
        #[serde(default)]
        pro: Option<bool>,
    },
    ListCategories {
        #[serde(default)]
        order: Option<String>,
        #[serde(default)]
        pro: Option<bool>,
    },
    Search {
        query: String,
        #[serde(default)]
        pro: Option<bool>,
    },
    CoinsList {
        #[serde(default)]
        limit: Option<u32>,
        #[serde(default)]
        pro: Option<bool>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!(
            "Invalid parameters: {e}. Provide an 'action' field (one of: ping, simple_price, \
             coin_markets, coin_details, coin_market_chart, coin_ohlc, trending_coins, \
             list_categories, search, coins_list)."
        )
    })?;

    // Pre-flight: verify capabilities key is declared.
    if !near::agent::host::secret_exists(SECRET_NAME) {
        return Err(
            "CoinGecko API key not configured in capabilities. Run setup for the tool."
                .to_string(),
        );
    }

    match action {
        Action::Ping { pro } => run_ping(pro.unwrap_or(false)),
        Action::SimplePrice {
            ids,
            vs_currencies,
            include_market_cap,
            include_24hr_vol,
            include_24hr_change,
            include_last_updated_at,
            pro,
        } => run_simple_price(
            ids,
            vs_currencies,
            include_market_cap.unwrap_or(false),
            include_24hr_vol.unwrap_or(false),
            include_24hr_change.unwrap_or(false),
            include_last_updated_at.unwrap_or(false),
            pro.unwrap_or(false),
        ),
        Action::CoinMarkets {
            vs_currency,
            ids,
            category,
            order,
            per_page,
            page,
            sparkline,
            price_change_percentage,
            pro,
        } => run_coin_markets(
            vs_currency,
            ids,
            category,
            order,
            per_page,
            page,
            sparkline.unwrap_or(false),
            price_change_percentage,
            pro.unwrap_or(false),
        ),
        Action::CoinDetails {
            id,
            localization,
            tickers,
            market_data,
            community_data,
            developer_data,
            sparkline,
            pro,
        } => run_coin_details(
            id,
            localization.unwrap_or(false),
            tickers.unwrap_or(false),
            market_data.unwrap_or(true),
            community_data.unwrap_or(false),
            developer_data.unwrap_or(false),
            sparkline.unwrap_or(false),
            pro.unwrap_or(false),
        ),
        Action::CoinMarketChart {
            id,
            vs_currency,
            days,
            interval,
            pro,
        } => run_coin_market_chart(id, vs_currency, days, interval, pro.unwrap_or(false)),
        Action::CoinOhlc {
            id,
            vs_currency,
            days,
            pro,
        } => run_coin_ohlc(id, vs_currency, days, pro.unwrap_or(false)),
        Action::TrendingCoins { pro } => run_trending_coins(pro.unwrap_or(false)),
        Action::ListCategories { order, pro } => run_list_categories(order, pro.unwrap_or(false)),
        Action::Search { query, pro } => run_search(query, pro.unwrap_or(false)),
        Action::CoinsList { limit, pro } => run_coins_list(limit, pro.unwrap_or(false)),
    }
}

// ==================== Actions Implementation ====================

fn run_ping(pro: bool) -> Result<String, String> {
    let resp = get_json(pro, "/ping", &[])?;
    serialize(&resp)
}

fn run_simple_price(
    ids: String,
    vs_currencies: String,
    include_market_cap: bool,
    include_24hr_vol: bool,
    include_24hr_change: bool,
    include_last_updated_at: bool,
    pro: bool,
) -> Result<String, String> {
    let query = vec![
        ("ids", Some(ids)),
        ("vs_currencies", Some(vs_currencies)),
        ("include_market_cap", Some(include_market_cap.to_string())),
        ("include_24hr_vol", Some(include_24hr_vol.to_string())),
        ("include_24hr_change", Some(include_24hr_change.to_string())),
        (
            "include_last_updated_at",
            Some(include_last_updated_at.to_string()),
        ),
    ];
    let resp = get_json(pro, "/simple/price", &query)?;
    serialize(&resp)
}

#[derive(Debug, Deserialize, Serialize)]
struct CoinMarketEntry {
    id: String,
    symbol: String,
    name: String,
    #[serde(default)]
    image: Option<String>,
    #[serde(default)]
    current_price: Option<f64>,
    #[serde(default)]
    market_cap: Option<f64>,
    #[serde(default)]
    market_cap_rank: Option<i32>,
    #[serde(default)]
    total_volume: Option<f64>,
    #[serde(default)]
    high_24h: Option<f64>,
    #[serde(default)]
    low_24h: Option<f64>,
    #[serde(default)]
    price_change_percentage_24h: Option<f64>,
}

fn run_coin_markets(
    vs_currency: String,
    ids: Option<String>,
    category: Option<String>,
    order: Option<String>,
    per_page: Option<u32>,
    page: Option<u32>,
    sparkline: bool,
    price_change_percentage: Option<String>,
    pro: bool,
) -> Result<String, String> {
    let query = vec![
        ("vs_currency", Some(vs_currency)),
        ("ids", ids),
        ("category", category),
        ("order", order),
        ("per_page", per_page.map(|p| p.to_string())),
        ("page", page.map(|p| p.to_string())),
        ("sparkline", Some(sparkline.to_string())),
        ("price_change_percentage", price_change_percentage),
    ];
    let resp = get_json(pro, "/coins/markets", &query)?;
    let entries: Vec<CoinMarketEntry> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse markets response: {e}"))?;
    serialize(&entries)
}

#[derive(Debug, Deserialize, Serialize)]
struct CoinDetailsResponse {
    id: String,
    symbol: String,
    name: String,
    #[serde(default)]
    description: Option<Description>,
    #[serde(default)]
    links: Option<Links>,
    #[serde(default)]
    market_data: Option<MarketDataSnapshot>,
    #[serde(default)]
    community_data: Option<CommunityData>,
    #[serde(default)]
    developer_data: Option<DeveloperData>,
}

#[derive(Debug, Deserialize, Serialize)]
struct CommunityData {
    #[serde(default)]
    facebook_likes: Option<f64>,
    #[serde(default)]
    twitter_followers: Option<f64>,
    #[serde(default)]
    reddit_average_posts_48h: Option<f64>,
    #[serde(default)]
    reddit_average_comments_48h: Option<f64>,
    #[serde(default)]
    reddit_subscribers: Option<f64>,
    #[serde(default)]
    reddit_active_users: Option<f64>,
    #[serde(default)]
    telegram_channel_user_count: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
struct DeveloperData {
    #[serde(default)]
    forks: Option<f64>,
    #[serde(default)]
    stars: Option<f64>,
    #[serde(default)]
    subscribers: Option<f64>,
    #[serde(default)]
    total_issues: Option<f64>,
    #[serde(default)]
    closed_issues: Option<f64>,
    #[serde(default)]
    pull_requests_merged: Option<f64>,
    #[serde(default)]
    pull_request_contributors: Option<f64>,
    #[serde(default)]
    commit_count_4_weeks: Option<f64>,
}

#[derive(Debug, Deserialize, Serialize)]
struct Description {
    #[serde(default)]
    en: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct Links {
    #[serde(default)]
    homepage: Option<Vec<String>>,
    #[serde(default)]
    blockchain_site: Option<Vec<String>>,
    #[serde(default)]
    official_forum_url: Option<Vec<String>>,
    #[serde(default)]
    chat_url: Option<Vec<String>>,
    #[serde(default)]
    announcement_url: Option<Vec<String>>,
    #[serde(default)]
    twitter_screen_name: Option<String>,
    #[serde(default)]
    facebook_username: Option<String>,
    #[serde(default)]
    subreddit_url: Option<String>,
    #[serde(default)]
    repos_url: Option<ReposUrl>,
}

#[derive(Debug, Deserialize, Serialize)]
struct ReposUrl {
    #[serde(default)]
    github: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize)]
struct MarketDataSnapshot {
    #[serde(default)]
    current_price: Option<serde_json::Map<String, Value>>,
    #[serde(default)]
    market_cap: Option<serde_json::Map<String, Value>>,
    #[serde(default)]
    total_volume: Option<serde_json::Map<String, Value>>,
    #[serde(default)]
    high_24h: Option<serde_json::Map<String, Value>>,
    #[serde(default)]
    low_24h: Option<serde_json::Map<String, Value>>,
    #[serde(default)]
    price_change_percentage_24h: Option<f64>,
    #[serde(default)]
    price_change_percentage_7d: Option<f64>,
    #[serde(default)]
    price_change_percentage_30d: Option<f64>,
    #[serde(default)]
    circulating_supply: Option<f64>,
    #[serde(default)]
    total_supply: Option<f64>,
    #[serde(default)]
    max_supply: Option<f64>,
}

fn run_coin_details(
    id: String,
    localization: bool,
    tickers: bool,
    market_data: bool,
    community_data: bool,
    developer_data: bool,
    sparkline: bool,
    pro: bool,
) -> Result<String, String> {
    let id_clean = id.trim();
    if id_clean.is_empty() {
        return Err("coin 'id' must not be empty".to_string());
    }
    let query = vec![
        ("localization", Some(localization.to_string())),
        ("tickers", Some(tickers.to_string())),
        ("market_data", Some(market_data.to_string())),
        ("community_data", Some(community_data.to_string())),
        ("developer_data", Some(developer_data.to_string())),
        ("sparkline", Some(sparkline.to_string())),
    ];
    let path = format!("/coins/{id_clean}");
    let resp = get_json(pro, &path, &query)?;
    let details: CoinDetailsResponse = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse coin details: {e}"))?;
    serialize(&details)
}

#[derive(Debug, Deserialize)]
struct MarketChartRaw {
    prices: Vec<Vec<f64>>,
    #[serde(default)]
    market_caps: Option<Vec<Vec<f64>>>,
    #[serde(default)]
    total_volumes: Option<Vec<Vec<f64>>>,
}

fn run_coin_market_chart(
    id: String,
    vs_currency: String,
    days: String,
    interval: Option<String>,
    pro: bool,
) -> Result<String, String> {
    let id_clean = id.trim();
    if id_clean.is_empty() {
        return Err("coin 'id' must not be empty".to_string());
    }
    let query = vec![
        ("vs_currency", Some(vs_currency)),
        ("days", Some(days)),
        ("interval", interval),
    ];
    let path = format!("/coins/{id_clean}/market_chart");
    let resp = get_json(pro, &path, &query)?;
    let raw: MarketChartRaw = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse market chart response: {e}"))?;

    // Downsample chart data to avoid memory bounds & token limits.
    let prices_downsampled = downsample(&raw.prices, MAX_POINTS);
    let caps_downsampled = raw.market_caps.map(|c| downsample(&c, MAX_POINTS));
    let vols_downsampled = raw.total_volumes.map(|v| downsample(&v, MAX_POINTS));

    let out = json!({
        "prices": prices_downsampled,
        "market_caps": caps_downsampled,
        "total_volumes": vols_downsampled,
    });
    serialize(&out)
}

fn run_coin_ohlc(
    id: String,
    vs_currency: String,
    days: String,
    pro: bool,
) -> Result<String, String> {
    let id_clean = id.trim();
    if id_clean.is_empty() {
        return Err("coin 'id' must not be empty".to_string());
    }
    let query = vec![
        ("vs_currency", Some(vs_currency)),
        ("days", Some(days)),
    ];
    let path = format!("/coins/{id_clean}/ohlc");
    let resp = get_json(pro, &path, &query)?;
    let raw: Vec<Vec<f64>> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse OHLC response: {e}"))?;

    let downsampled = downsample(&raw, MAX_POINTS);
    serialize(&downsampled)
}

#[derive(Debug, Deserialize, Serialize)]
struct TrendingResponse {
    #[serde(default)]
    coins: Vec<TrendingCoinItem>,
    #[serde(default)]
    nfts: Vec<Value>,
    #[serde(default)]
    categories: Vec<Value>,
}

#[derive(Debug, Deserialize, Serialize)]
struct TrendingCoinItem {
    item: TrendingCoinDetails,
}

#[derive(Debug, Deserialize, Serialize)]
struct TrendingCoinDetails {
    id: String,
    coin_id: u32,
    name: String,
    symbol: String,
    market_cap_rank: Option<i32>,
    #[serde(default)]
    thumb: Option<String>,
    #[serde(default)]
    score: Option<u32>,
}

fn run_trending_coins(pro: bool) -> Result<String, String> {
    let resp = get_json(pro, "/search/trending", &[])?;
    let trending: TrendingResponse = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse trending response: {e}"))?;
    serialize(&trending)
}

#[derive(Debug, Deserialize, Serialize)]
struct CategoryEntry {
    id: String,
    name: String,
    #[serde(default)]
    market_cap: Option<f64>,
    #[serde(default)]
    market_cap_change_24h: Option<f64>,
    #[serde(default)]
    volume_24h: Option<f64>,
}

fn run_list_categories(order: Option<String>, pro: bool) -> Result<String, String> {
    let query = vec![("order", order)];
    let resp = get_json(pro, "/coins/categories", &query)?;
    let categories: Vec<CategoryEntry> = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse categories response: {e}"))?;
    serialize(&categories)
}

#[derive(Debug, Deserialize, Serialize)]
struct SearchResponse {
    #[serde(default)]
    coins: Vec<SearchCoinItem>,
    #[serde(default)]
    exchanges: Vec<Value>,
    #[serde(default)]
    nfts: Vec<Value>,
    #[serde(default)]
    categories: Vec<Value>,
}

#[derive(Debug, Deserialize, Serialize)]
struct SearchCoinItem {
    id: String,
    name: String,
    api_symbol: String,
    symbol: String,
    market_cap_rank: Option<i32>,
}

fn run_search(query: String, pro: bool) -> Result<String, String> {
    let query_clean = query.trim();
    if query_clean.is_empty() {
        return Err("search 'query' must not be empty".to_string());
    }
    let query_param = vec![("query", Some(query_clean.to_string()))];
    let resp = get_json(pro, "/search", &query_param)?;
    let search_res: SearchResponse = serde_json::from_value(resp)
        .map_err(|e| format!("Failed to parse search response: {e}"))?;

    // Compact search results
    let coins: Vec<SearchCoinItem> = search_res.coins.into_iter().take(10).collect();
    let exchanges: Vec<Value> = search_res.exchanges.into_iter().take(5).collect();
    let nfts: Vec<Value> = search_res.nfts.into_iter().take(5).collect();
    let categories: Vec<Value> = search_res.categories.into_iter().take(5).collect();

    let out = json!({
        "coins": coins,
        "exchanges": exchanges,
        "nfts": nfts,
        "categories": categories,
    });
    serialize(&out)
}

#[derive(Serialize)]
struct CompactCoinListEntry {
    id: String,
    symbol: String,
    name: String,
}

fn run_coins_list(limit: Option<u32>, pro: bool) -> Result<String, String> {
    if let Some(l) = limit {
        let l = l.clamp(1, 1000);
        let query = vec![
            ("vs_currency", Some("usd".to_string())),
            ("order", Some("market_cap_desc".to_string())),
            ("per_page", Some(l.to_string())),
        ];
        match get_json(pro, "/coins/markets", &query) {
            Ok(resp) => {
                if let Ok(entries) = serde_json::from_value::<Vec<CoinMarketEntry>>(resp) {
                    let compact: Vec<CompactCoinListEntry> = entries
                        .into_iter()
                        .map(|e| CompactCoinListEntry {
                            id: e.id,
                            symbol: e.symbol,
                            name: e.name,
                        })
                        .collect();
                    return serialize(&compact);
                }
            }
            Err(e) => {
                near::agent::host::log(
                    near::agent::host::LogLevel::Warn,
                    &format!("Dynamic coins_list query failed: {e}. Falling back to static top 100 list."),
                );
            }
        }
    }

    // Static list fallback (Task 2.3)
    let compact: Vec<CompactCoinListEntry> = STATIC_TOP_100
        .iter()
        .map(|&(id, sym, name)| CompactCoinListEntry {
            id: id.to_string(),
            symbol: sym.to_string(),
            name: name.to_string(),
        })
        .collect();
    serialize(&compact)
}

// ==================== HTTP & Utility Helpers ====================

fn get_json(pro: bool, path: &str, query_params: &[(&str, Option<String>)]) -> Result<Value, String> {
    let base = if pro {
        "https://pro-api.coingecko.com/api/v3"
    } else {
        "https://api.coingecko.com/api/v3"
    };

    let mut query_parts = Vec::new();
    for (k, v) in query_params {
        if let Some(val) = v {
            query_parts.push(format!("{}={}", k, url_encode(&val)));
        }
    }

    let url = if query_parts.is_empty() {
        format!("{base}{path}")
    } else {
        format!("{base}{path}?{}", query_parts.join("&"))
    };

    let headers = json!({
        "Accept": "application/json",
        "User-Agent": "IronClaw-CoinGecko-Tool/0.1"
    });

    request("GET", &url, &headers.to_string(), None)
}

fn request(method: &str, url: &str, headers: &str, body: Option<Vec<u8>>) -> Result<Value, String> {
    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        let resp = near::agent::host::http_request(
            method,
            url,
            headers,
            body.as_deref(),
            Some(HTTP_TIMEOUT_MS),
        )
        .map_err(|e| format!("HTTP request failed: {e}"))?;

        if (200..300).contains(&resp.status) {
            break resp;
        }

        if attempt < MAX_RETRIES && (resp.status == 429 || resp.status >= 500) {
            near::agent::host::log(
                near::agent::host::LogLevel::Warn,
                &format!(
                    "CoinGecko {method} {url} returned {} (attempt {attempt}/{MAX_RETRIES}); retrying",
                    resp.status
                ),
            );
            continue;
        }

        return Err(sanitize_error(resp.status, &resp.body));
    };

    let text =
        String::from_utf8(response.body).map_err(|e| format!("Invalid UTF-8 response: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Failed to parse CoinGecko response: {e}"))
}

fn sanitize_error(status: u16, body: &[u8]) -> String {
    let detail = serde_json::from_slice::<Value>(body)
        .ok()
        .and_then(|v| {
            v.get("error")
                .or_else(|| v.get("status").and_then(|s| s.get("error_message")))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| String::from_utf8_lossy(body).chars().take(300).collect());

    match status {
        401 | 403 => format!(
            "CoinGecko rejected the API key (HTTP {status}). \
             Check 'coingecko_api_key'. Detail: {detail}"
        ),
        429 => format!("CoinGecko rate limit exceeded (HTTP 429). Detail: {detail}"),
        _ => format!("CoinGecko request failed (HTTP {status}): {detail}"),
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

fn downsample<T: Clone>(list: &[T], max_points: usize) -> Vec<T> {
    if list.len() <= max_points {
        return list.to_vec();
    }
    let step = list.len() as f64 / max_points as f64;
    let mut result = Vec::with_capacity(max_points);
    for i in 0..max_points {
        let index = (i as f64 * step).round() as usize;
        if index < list.len() {
            result.push(list[index].clone());
        }
    }
    result
}

fn serialize<T: Serialize>(value: &T) -> Result<String, String> {
    serde_json::to_string(value).map_err(|e| format!("Failed to serialize output: {e}"))
}

// ==================== Static Fallback List ====================

const STATIC_TOP_100: &[(&str, &str, &str)] = &[
    ("bitcoin", "btc", "Bitcoin"),
    ("ethereum", "eth", "Ethereum"),
    ("tether", "usdt", "Tether"),
    ("binancecoin", "bnb", "BNB"),
    ("solana", "sol", "Solana"),
    ("ripple", "xrp", "XRP"),
    ("usd-coin", "usdc", "USDC"),
    ("dogecoin", "doge", "Dogecoin"),
    ("cardano", "ada", "Cardano"),
    ("shiba-inu", "shib", "Shiba Inu"),
    ("avalanche-2", "avax", "Avalanche"),
    ("chainlink", "link", "Chainlink"),
    ("polkadot", "dot", "Polkadot"),
    ("tron", "trx", "TRON"),
    ("near", "near", "NEAR Protocol"),
    ("matic-network", "matic", "Polygon"),
    ("uniswap", "uni", "Uniswap"),
    ("litecoin", "ltc", "Litecoin"),
    ("pepe", "pepe", "Pepe"),
    ("stellar", "xlm", "Stellar"),
    ("internet-computer", "icp", "Internet Computer"),
    ("ethereum-classic", "etc", "Ethereum Classic"),
    ("monero", "xmr", "Monero"),
    ("render-token", "render", "Render"),
    ("kaspa", "kas", "Kaspa"),
    ("aptos", "apt", "Aptos"),
    ("cosmos", "atom", "Cosmos"),
    ("filecoin", "fil", "Filecoin"),
    ("hedera-hashgraph", "hbar", "Hedera"),
    ("arbitrum", "arb", "Arbitrum"),
    ("stacks", "stx", "Stacks"),
    ("fantom", "ftm", "Fantom"),
    ("lido-dao", "ldo", "Lido Dao"),
    ("theta-token", "theta", "Theta Network"),
    ("optimism", "op", "Optimism"),
    ("vechain", "vet", "VeChain"),
    ("maker", "mkr", "Maker"),
    ("graph", "grt", "The Graph"),
    ("dogwifhat", "wif", "dogwifhat"),
    ("fetch-ai", "fet", "Artificial Superintelligence Alliance"),
    ("thorchain", "rune", "THORChain"),
    ("floki", "floki", "Floki"),
    ("bonk", "bonk", "Bonk"),
    ("gala", "gala", "Gala"),
    ("arweave", "ar", "Arweave"),
    ("aave", "aave", "Aave"),
    ("jupiter-exchange-solana", "jup", "Jupiter"),
    ("core-dao", "core", "Core"),
    ("chiliz", "chz", "Chiliz"),
    ("eos", "eos", "EOS"),
    ("tezos", "xtz", "Tezos"),
    ("decentraland", "mana", "Decentraland"),
    ("the-sandbox", "sand", "The Sandbox"),
    ("flow", "flow", "Flow"),
    ("axie-infinity", "axs", "Axie Infinity"),
    ("multiversx-egld", "egld", "MultiversX"),
    ("kucoin-shares", "kcs", "KuCoin Token"),
    ("quant-network", "qnt", "Quant"),
    ("helium", "hnt", "Helium"),
    ("synthetix-network-token", "snx", "Synthetix"),
    ("beam", "beam", "Beam"),
    ("sei-network", "sei", "Sei"),
    ("sui", "sui", "Sui"),
    ("ethena", "ena", "Ethena"),
    ("dydx", "dydx", "dydx"),
    ("wootrade", "woo", "WOO"),
    ("pyth-network", "pyth", "Pyth Network"),
    ("ronin", "ron", "Ronin"),
    ("superverse", "super", "SuperVerse"),
    ("radix", "xrd", "Radix"),
    ("pancakeswap-token", "cake", "Cake"),
    ("iota", "iota", "IOTA"),
    ("neo", "neo", "NEO"),
    ("klay-token", "klay", "Klaytn"),
    ("gmx", "gmx", "GMX"),
    ("1inch", "1inch", "1inch"),
    ("curve-dao-token", "crv", "Curve DAO Token"),
    ("conflux-token", "cfx", "Conflux"),
    ("mina-protocol", "mina", "Mina"),
    ("oasis-network", "rose", "Oasis Network"),
    ("celo", "celo", "Celo"),
    ("qtum", "qtum", "Qtum"),
    ("zilliqa", "zil", "Zilliqa"),
    ("trust-wallet-token", "twt", "Trust Wallet Token"),
    ("zcash", "zec", "Zcash"),
    ("dash", "dash", "Dash"),
    ("compound-governance-token", "comp", "Compound"),
    ("nexo", "nexo", "Nexo"),
    ("loopring", "lrc", "Loopring"),
    ("enjincoin", "enj", "Enjin Coin"),
    ("yearn-finance", "yfi", "yearn.finance"),
    ("balancer", "bal", "Balancer"),
    ("bancor", "bnt", "Bancor"),
    ("ankr", "ankr", "Ankr"),
    ("0x", "zrx", "0x"),
    ("audius", "audio", "Audius"),
    ("livepeer", "lpt", "Livepeer"),
    ("threshold-network-token", "t", "Threshold"),
    ("singularitynet", "agix", "SingularityNET"),
    ("ocean-protocol", "ocean", "Ocean Protocol")
];

// ==================== JSON Schema ====================

const SCHEMA: &str = r#"{
  "type": "object",
  "required": ["action"],
  "oneOf": [
    {
      "properties": {
        "action": { "const": "ping" },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain (pro-api.coingecko.com). Default is false." }
      },
      "required": ["action"]
    },
    {
      "properties": {
        "action": { "const": "simple_price" },
        "ids": { "type": "string", "description": "Comma-separated list of coin IDs (e.g. 'bitcoin,ethereum')." },
        "vs_currencies": { "type": "string", "description": "Comma-separated list of target currencies (e.g. 'usd,eur')." },
        "include_market_cap": { "type": "boolean", "description": "Include market cap. Default is false." },
        "include_24hr_vol": { "type": "boolean", "description": "Include 24hr volume. Default is false." },
        "include_24hr_change": { "type": "boolean", "description": "Include 24hr price change percentage. Default is false." },
        "include_last_updated_at": { "type": "boolean", "description": "Include last updated timestamp. Default is false." },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain. Default is false." }
      },
      "required": ["action", "ids", "vs_currencies"]
    },
    {
      "properties": {
        "action": { "const": "coin_markets" },
        "vs_currency": { "type": "string", "description": "Target currency (e.g. 'usd')." },
        "ids": { "type": "string", "description": "Comma-separated list of coin IDs to filter. Optional." },
        "category": { "type": "string", "description": "Filter by coin category ID. Optional." },
        "order": { "type": "string", "enum": ["market_cap_desc", "gecko_desc", "gecko_asc", "market_cap_asc", "volume_asc", "volume_desc", "id_asc", "id_desc"], "description": "Sort order. Default is 'market_cap_desc'." },
        "per_page": { "type": "integer", "minimum": 1, "maximum": 250, "description": "Total results per page (1-250). Default is 100." },
        "page": { "type": "integer", "minimum": 1, "description": "Page number. Default is 1." },
        "sparkline": { "type": "boolean", "description": "Include sparkline 7-day data. Default is false." },
        "price_change_percentage": { "type": "string", "description": "Comma-separated timeframes (e.g. '1h,24h,7d'). Optional." },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain. Default is false." }
      },
      "required": ["action", "vs_currency"]
    },
    {
      "properties": {
        "action": { "const": "coin_details" },
        "id": { "type": "string", "description": "The coin ID (e.g. 'bitcoin')." },
        "localization": { "type": "boolean", "description": "Include localized languages. Default is false." },
        "tickers": { "type": "boolean", "description": "Include exchange tickers. Default is false." },
        "market_data": { "type": "boolean", "description": "Include market data. Default is true." },
        "community_data": { "type": "boolean", "description": "Include community data. Default is false." },
        "developer_data": { "type": "boolean", "description": "Include developer data. Default is false." },
        "sparkline": { "type": "boolean", "description": "Include sparkline data. Default is false." },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain. Default is false." }
      },
      "required": ["action", "id"]
    },
    {
      "properties": {
        "action": { "const": "coin_market_chart" },
        "id": { "type": "string", "description": "The coin ID (e.g. 'bitcoin')." },
        "vs_currency": { "type": "string", "description": "Target currency (e.g. 'usd')." },
        "days": { "type": "string", "description": "Number of days of historical data (e.g. '1', '7', '30', 'max')." },
        "interval": { "type": "string", "enum": ["daily"], "description": "Data interval (e.g. 'daily'). Optional." },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain. Default is false." }
      },
      "required": ["action", "id", "vs_currency", "days"]
    },
    {
      "properties": {
        "action": { "const": "coin_ohlc" },
        "id": { "type": "string", "description": "The coin ID (e.g. 'bitcoin')." },
        "vs_currency": { "type": "string", "description": "Target currency (e.g. 'usd')." },
        "days": { "type": "string", "enum": ["1", "7", "14", "30", "90", "180", "365", "max"], "description": "Number of days of data." },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain. Default is false." }
      },
      "required": ["action", "id", "vs_currency", "days"]
    },
    {
      "properties": {
        "action": { "const": "trending_coins" },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain (pro-api.coingecko.com). Default is false." }
      },
      "required": ["action"]
    },
    {
      "properties": {
        "action": { "const": "list_categories" },
        "order": { "type": "string", "enum": ["market_cap_desc", "market_cap_asc", "name_desc", "name_asc"], "description": "Sort order. Default is 'market_cap_desc'." },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain. Default is false." }
      },
      "required": ["action"]
    },
    {
      "properties": {
        "action": { "const": "search" },
        "query": { "type": "string", "description": "Search query keyword." },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain. Default is false." }
      },
      "required": ["action", "query"]
    },
    {
      "properties": {
        "action": { "const": "coins_list" },
        "limit": { "type": "integer", "minimum": 1, "maximum": 1000, "description": "Limit the number of top coins fetched from the markets API (e.g., 100, 500, 1000). If omitted, returns the static top 100 coins." },
        "pro": { "type": "boolean", "description": "Set to true to use the Pro API domain. Default is false." }
      },
      "required": ["action"]
    }
  ]
}"#;

export!(CoinGeckoTool);

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
        assert_eq!(branches.len(), 10, "must have 10 action branches");
        for b in branches {
            let req = b["required"].as_array().expect("branch needs required[]");
            assert_eq!(req[0], "action");
            assert!(b["properties"]["action"]["const"].is_string());
        }
    }

    #[test]
    fn parse_ping() {
        let a: Action = serde_json::from_str(r#"{"action":"ping"}"#).unwrap();
        assert!(matches!(a, Action::Ping { .. }));
    }

    #[test]
    fn parse_simple_price() {
        let a: Action = serde_json::from_str(
            r#"{"action":"simple_price","ids":"bitcoin","vs_currencies":"usd","include_market_cap":true}"#,
        )
        .unwrap();
        if let Action::SimplePrice {
            ids,
            vs_currencies,
            include_market_cap,
            ..
        } = a
        {
            assert_eq!(ids, "bitcoin");
            assert_eq!(vs_currencies, "usd");
            assert_eq!(include_market_cap.unwrap(), true);
        } else {
            panic!("wrong variant");
        }
    }

    #[test]
    fn parse_coins_list() {
        let a: Action = serde_json::from_str(r#"{"action":"coins_list","limit":500}"#).unwrap();
        if let Action::CoinsList { limit, .. } = a {
            assert_eq!(limit.unwrap(), 500);
        } else {
            panic!("wrong variant");
        }
    }

    #[test]
    fn test_url_encode() {
        assert_eq!(url_encode("hello world"), "hello+world");
        assert_eq!(url_encode("BTC/USD"), "BTC%2FUSD");
    }

    #[test]
    fn test_downsample() {
        let items: Vec<i32> = (0..500).collect();
        let downsampled = downsample(&items, 100);
        assert_eq!(downsampled.len(), 100);
        assert_eq!(downsampled[0], 0);
        assert_eq!(downsampled[99], 495); // (99 * 5) = 495
    }
}
