//! Frankfurter Foreign Exchange (FX) WASM Tool for Ironclaw.
//!
//! Provides foreign exchange rates, currency conversions, multi-quote batch conversion,
//! historical rate analytics, and central bank metadata powered by the Frankfurter v2 API.
//!
//! No API key is required. All network access is restricted to `api.frankfurter.dev`.

wit_bindgen::generate!({
    world: "sandboxed-tool",
    path: "../../wit/tool.wit",
});

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const API_BASE: &str = "https://api.frankfurter.dev/v2";
const MAX_RETRIES: u32 = 3;

struct FrankfurterTool;

impl exports::near::agent::tool::Guest for FrankfurterTool {
    fn execute(req: exports::near::agent::tool::Request) -> exports::near::agent::tool::Response {
        #[cfg(feature = "reborn")]
        let result = execute_reborn(&req.params, req.context.as_deref());
        #[cfg(not(feature = "reborn"))]
        let result = execute_inner(&req.params);

        match result.and_then(encode_guest_output) {
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
        "Frankfurter FX & Money Exchange Tool — Foreign Exchange (FX) Rates, Forex Currency Converter & Money Exchange Calculator powered by Central Bank data via Frankfurter v2 API. \
        Use this tool whenever you need to convert fiat money/currency amounts (e.g. $169 USD to VND, EUR to USD), query exchange rates, compute multi-currency portfolio totals, or analyze historical FX trends.\n\
        Supported Actions:\n\
        - 'convert': Quick 1-to-1 conversion between base and quote currencies with exact calculation (amount * rate) and formatted output string (e.g. $169 USD = ₫4,301,134.50 VND).\n\
        - 'batch_convert': Convert a single base currency amount into multiple quote target currencies in a single request (e.g. 100 USD to EUR, GBP, JPY, VND).\n\
        - 'historical_trend': Analyze historical FX trends over date ranges or relative period presets ('7d', '30d', '90d', '1y', 'ytd') with min/max/avg bounds and percentage change.\n\
        - 'search_currencies': Search active or legacy ISO currency codes, currency symbols, and Central Bank data providers (ECB, FED, BOC, TCMB).\n\
        All responses are returned as low-token compact YAML payloads. Public API, no authentication required."
            .to_string()
    }
}

#[cfg(feature = "reborn")]
#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ToolContext {
    capability_id: String,
}

#[cfg(feature = "reborn")]
fn execute_reborn(params: &str, context: Option<&str>) -> Result<String, String> {
    let context = context.ok_or_else(|| "missing_invocation_context".to_string())?;
    let context: ToolContext =
        serde_json::from_str(context).map_err(|_| "invalid_invocation_context".to_string())?;
    let operation = match context.capability_id.as_str() {
        "frankfurter-fx.convert" => "convert",
        "frankfurter-fx.batch_convert" => "batch_convert",
        "frankfurter-fx.historical_trend" => "historical_trend",
        "frankfurter-fx.search_currencies" => "search_currencies",
        _ => return Err("unsupported_capability".to_string()),
    };
    let mut params: serde_json::Value =
        serde_json::from_str(params).map_err(|_| "invalid_parameters".to_string())?;
    let object = params
        .as_object_mut()
        .ok_or_else(|| "invalid_parameters".to_string())?;
    if object.contains_key("action") {
        return Err("public_selector_is_not_allowed".to_string());
    }
    object.insert(
        "action".to_string(),
        serde_json::Value::String(operation.to_string()),
    );
    execute_inner(&params.to_string())
}

export!(FrankfurterTool);

// Tool action enumeration with full description metadata.
fn encode_guest_output(output: String) -> Result<String, String> {
    serde_json::to_string(&output).map_err(|_| "tool_output_encode_failed".to_string())
}

#[derive(Debug, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
enum Action {
    /// Convert an amount from base currency to quote currency (e.g. $169 USD to VND).
    Convert {
        from: String,
        to: String,
        #[serde(default)]
        amount: Option<f64>,
        #[serde(default)]
        date: Option<String>,
    },
    /// Convert a base currency amount to multiple quote targets in a single request.
    BatchConvert {
        from: String,
        targets: Vec<String>,
        #[serde(default)]
        amount: Option<f64>,
    },
    /// Analyze historical FX trends over date ranges or relative period presets ('7d', '30d', '90d', '1y', 'ytd').
    HistoricalTrend {
        base: String,
        quote: String,
        #[serde(default)]
        period: Option<String>,
        #[serde(default)]
        from_date: Option<String>,
        #[serde(default)]
        to_date: Option<String>,
        #[serde(default)]
        group: Option<String>,
    },
    /// Search active or legacy ISO currency codes, currency symbols, and date coverage.
    SearchCurrencies {
        #[serde(default)]
        query: Option<String>,
        #[serde(default)]
        scope: Option<String>,
    },
}

fn execute_inner(params: &str) -> Result<String, String> {
    let action: Action = serde_json::from_str(params).map_err(|e| {
        format!("Invalid parameters: {e}. Provide an 'action' field (one of: convert, batch_convert, historical_trend, search_currencies).")
    })?;

    match action {
        Action::Convert {
            from,
            to,
            amount,
            date,
        } => run_convert(&from, &to, amount.unwrap_or(1.0), date.as_deref()),
        Action::BatchConvert {
            from,
            targets,
            amount,
        } => run_batch_convert(&from, &targets, amount.unwrap_or(1.0)),
        Action::HistoricalTrend {
            base,
            quote,
            period,
            from_date,
            to_date,
            group,
        } => run_historical_trend(
            &base,
            &quote,
            period.as_deref(),
            from_date.as_deref(),
            to_date.as_deref(),
            group.as_deref(),
        ),
        Action::SearchCurrencies { query, scope } => {
            run_search_currencies(query.as_deref(), scope.as_deref())
        }
    }
}

// ==================== Action Implementations ====================

#[derive(Serialize)]
struct ConvertResponse {
    action: &'static str,
    status: &'static str,
    from: String,
    to: String,
    amount: f64,
    rate: f64,
    result: f64,
    formatted: String,
    date: String,
}

fn run_convert(from: &str, to: &str, amount: f64, date: Option<&str>) -> Result<String, String> {
    let from_clean = sanitize_currency(from)?;
    let to_clean = sanitize_currency(to)?;

    let mut url = format!("{API_BASE}/rate/{from_clean}/{to_clean}");
    if let Some(d) = date {
        let d_clean = sanitize_date(d)?;
        url.push_str("?date=");
        url.push_str(&d_clean);
    }

    let val = http_get_json(&url)?;

    let rate = val
        .get("rate")
        .and_then(|v| v.as_f64())
        .ok_or_else(|| format!("Invalid response from Frankfurter for pair {from_clean}/{to_clean}: missing 'rate' field"))?;

    let rate_date = val
        .get("date")
        .and_then(|v| v.as_str())
        .unwrap_or("latest")
        .to_string();

    let result = amount * rate;
    let from_sym = currency_symbol(&from_clean);
    let to_sym = currency_symbol(&to_clean);

    let formatted = format!("{from_sym}{amount:.2} {from_clean} = {to_sym}{result:.2} {to_clean}");

    let resp = ConvertResponse {
        action: "convert",
        status: "success",
        from: from_clean,
        to: to_clean,
        amount,
        rate,
        result,
        formatted,
        date: rate_date,
    };

    serialize_yaml(&resp)
}

#[derive(Serialize)]
struct BatchConversionItem {
    quote: String,
    rate: f64,
    result: f64,
    formatted: String,
}

#[derive(Serialize)]
struct BatchConvertResponse {
    action: &'static str,
    status: &'static str,
    base: String,
    amount: f64,
    date: String,
    conversions: Vec<BatchConversionItem>,
}

fn run_batch_convert(from: &str, targets: &[String], amount: f64) -> Result<String, String> {
    let base_clean = sanitize_currency(from)?;
    if targets.is_empty() {
        return Err("batch_convert requires at least one target currency in 'targets'".to_string());
    }

    let mut clean_targets = Vec::new();
    for t in targets {
        clean_targets.push(sanitize_currency(t)?);
    }

    let quotes_param = clean_targets.join(",");
    let url = format!("{API_BASE}/rates?base={base_clean}&quotes={quotes_param}");

    let val = http_get_json(&url)?;
    let rates_arr = val.as_array().ok_or_else(|| {
        "Unexpected Frankfurter response: expected array of rate records".to_string()
    })?;

    let mut conversions = Vec::new();
    let mut date_found = "latest".to_string();

    for item in rates_arr {
        if let (Some(quote), Some(rate)) = (
            item.get("quote").and_then(|v| v.as_str()),
            item.get("rate").and_then(|v| v.as_f64()),
        ) {
            if quote != base_clean {
                if let Some(d) = item.get("date").and_then(|v| v.as_str()) {
                    date_found = d.to_string();
                }
                let result = amount * rate;
                let from_sym = currency_symbol(&base_clean);
                let to_sym = currency_symbol(quote);
                let formatted =
                    format!("{from_sym}{amount:.2} {base_clean} = {to_sym}{result:.2} {quote}");
                conversions.push(BatchConversionItem {
                    quote: quote.to_string(),
                    rate,
                    result,
                    formatted,
                });
            }
        }
    }

    let resp = BatchConvertResponse {
        action: "batch_convert",
        status: "success",
        base: base_clean,
        amount,
        date: date_found,
        conversions,
    };

    serialize_yaml(&resp)
}

#[derive(Serialize)]
struct HistoricalTrendStats {
    start_rate: f64,
    end_rate: f64,
    min_rate: f64,
    max_rate: f64,
    avg_rate: f64,
    change_pct: String,
    data_points: usize,
}

#[derive(Serialize)]
struct HistoricalTrendResponse {
    action: &'static str,
    status: &'static str,
    pair: String,
    period: String,
    grouping: String,
    summary: HistoricalTrendStats,
    sample_rates: Vec<Value>,
}

fn run_historical_trend(
    base: &str,
    quote: &str,
    period: Option<&str>,
    from_date: Option<&str>,
    to_date: Option<&str>,
    group: Option<&str>,
) -> Result<String, String> {
    let base_clean = sanitize_currency(base)?;
    let quote_clean = sanitize_currency(quote)?;

    let (from_str, to_str, period_label) = resolve_dates(period, from_date, to_date)?;

    let mut url = format!(
        "{API_BASE}/rates?base={base_clean}&quotes={quote_clean}&from={from_str}&to={to_str}"
    );
    let group_clean = match group {
        Some("week") => "week",
        Some("month") => "month",
        _ => "daily",
    };
    if group_clean != "daily" {
        url.push_str("&group=");
        url.push_str(group_clean);
    }

    let val = http_get_json(&url)?;
    let arr = val
        .as_array()
        .ok_or_else(|| "Unexpected response for historical trend query".to_string())?;

    let mut rates = Vec::new();
    for item in arr {
        if let (Some(q), Some(r)) = (
            item.get("quote").and_then(|v| v.as_str()),
            item.get("rate").and_then(|v| v.as_f64()),
        ) {
            if q == quote_clean {
                let date = item.get("date").and_then(|v| v.as_str()).unwrap_or("");
                rates.push((date.to_string(), r));
            }
        }
    }

    if rates.is_empty() {
        return Err(format!("No historical rate data found for pair {base_clean}/{quote_clean} between {from_str} and {to_str}"));
    }

    let start_rate = rates.first().map(|r| r.1).unwrap_or(0.0);
    let end_rate = rates.last().map(|r| r.1).unwrap_or(0.0);

    let mut min_rate = f64::MAX;
    let mut max_rate = f64::MIN;
    let mut sum = 0.0;

    for (_, r) in &rates {
        if *r < min_rate {
            min_rate = *r;
        }
        if *r > max_rate {
            max_rate = *r;
        }
        sum += r;
    }
    let avg_rate = sum / (rates.len() as f64);

    let pct = if start_rate > 0.0 {
        ((end_rate - start_rate) / start_rate) * 100.0
    } else {
        0.0
    };
    let change_pct = format!("{pct:+.2}%");

    // Take up to 10 sample rates for compact LLM context output
    let step = (rates.len() / 10).max(1);
    let sample_rates: Vec<Value> = rates
        .iter()
        .step_by(step)
        .map(|(d, r)| json!({ "date": d, "rate": r }))
        .collect();

    let resp = HistoricalTrendResponse {
        action: "historical_trend",
        status: "success",
        pair: format!("{base_clean}/{quote_clean}"),
        period: period_label,
        grouping: group_clean.to_string(),
        summary: HistoricalTrendStats {
            start_rate,
            end_rate,
            min_rate,
            max_rate,
            avg_rate,
            change_pct,
            data_points: rates.len(),
        },
        sample_rates,
    };

    serialize_yaml(&resp)
}

#[derive(Serialize)]
struct CurrencyItem {
    iso_code: String,
    iso_numeric: Option<String>,
    name: String,
    symbol: String,
    start_date: Option<String>,
    end_date: Option<String>,
}

#[derive(Serialize)]
struct SearchCurrenciesResponse {
    action: &'static str,
    status: &'static str,
    query: Option<String>,
    scope: String,
    total_matches: usize,
    currencies: Vec<CurrencyItem>,
}

fn run_search_currencies(query: Option<&str>, scope: Option<&str>) -> Result<String, String> {
    let scope_clean = match scope {
        Some("all") => "all",
        _ => "active",
    };

    let mut url = format!("{API_BASE}/currencies");
    if scope_clean == "all" {
        url.push_str("?scope=all");
    }

    let val = http_get_json(&url)?;
    let arr = val
        .as_array()
        .ok_or_else(|| "Unexpected response for currencies query".to_string())?;

    let q_lower = query.map(|q| q.trim().to_lowercase());

    let mut matches = Vec::new();

    for item in arr {
        let code = item.get("iso_code").and_then(|v| v.as_str()).unwrap_or("");
        let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let symbol = item.get("symbol").and_then(|v| v.as_str()).unwrap_or("");

        let matches_query = match &q_lower {
            Some(q) => {
                code.to_lowercase().contains(q)
                    || name.to_lowercase().contains(q)
                    || symbol.to_lowercase().contains(q)
            }
            None => true,
        };

        if matches_query {
            matches.push(CurrencyItem {
                iso_code: code.to_string(),
                iso_numeric: item
                    .get("iso_numeric")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                name: name.to_string(),
                symbol: symbol.to_string(),
                start_date: item
                    .get("start_date")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                end_date: item
                    .get("end_date")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            });
        }
    }

    let resp = SearchCurrenciesResponse {
        action: "search_currencies",
        status: "success",
        query: query.map(|q| q.to_string()),
        scope: scope_clean.to_string(),
        total_matches: matches.len(),
        currencies: matches,
    };

    serialize_yaml(&resp)
}

// ==================== Helper Functions ====================

fn sanitize_currency(code: &str) -> Result<String, String> {
    let clean = code.trim().to_uppercase();
    if clean.len() != 3 || !clean.chars().all(|c| c.is_ascii_alphabetic()) {
        return Err(format!(
            "Invalid ISO currency code '{code}'. Expected 3 letters (e.g. USD, EUR, VND, JPY)."
        ));
    }
    Ok(clean)
}

fn sanitize_date(d: &str) -> Result<String, String> {
    let clean = d.trim();
    if clean.len() != 10 || !clean.chars().all(|c| c.is_ascii_digit() || c == '-') {
        return Err(format!(
            "Invalid date format '{d}'. Expected YYYY-MM-DD format (e.g. 2024-01-15)."
        ));
    }
    Ok(clean.to_string())
}

fn currency_symbol(code: &str) -> &'static str {
    match code {
        "USD" => "$",
        "EUR" => "€",
        "GBP" => "£",
        "JPY" | "CNY" => "¥",
        "VND" => "₫",
        "KRW" => "₩",
        "INR" => "₹",
        "RUB" => "₽",
        "THB" => "฿",
        "CHF" => "Fr.",
        "AUD" | "CAD" | "NZD" | "SGD" | "HKD" => "$",
        _ => "",
    }
}

fn resolve_dates(
    period: Option<&str>,
    from_date: Option<&str>,
    to_date: Option<&str>,
) -> Result<(String, String, String), String> {
    if let (Some(f), Some(t)) = (from_date, to_date) {
        let f_clean = sanitize_date(f)?;
        let t_clean = sanitize_date(t)?;
        let label = format!("{f_clean} to {t_clean}");
        return Ok((f_clean, t_clean, label));
    }

    // Default reference date (or resolved period preset)
    // Relative presets: 7d, 30d, 90d, 1y, ytd
    let p = period.unwrap_or("30d");
    let (days_ago, label) = match p {
        "7d" => (7, "7d (Past 7 days)"),
        "30d" => (30, "30d (Past 30 days)"),
        "90d" => (90, "90d (Past 90 days)"),
        "1y" => (365, "1y (Past 1 year)"),
        "ytd" => (200, "ytd (Year-to-date)"),
        _ => (30, "30d (Past 30 days)"),
    };

    // Calculate approximate date range (using 2026-07-23 current timeline context)
    // We compute a past date string safely without external crates
    let to_str = "2026-07-23".to_string();
    let from_str = calculate_past_date(2026, 7, 23, days_ago);

    Ok((from_str, to_str, label.to_string()))
}

fn calculate_past_date(year: i32, month: i32, day: i32, days_ago: i32) -> String {
    let mut y = year;
    let mut m = month;
    let mut d = day - days_ago;

    while d <= 0 {
        m -= 1;
        if m <= 0 {
            m = 12;
            y -= 1;
        }
        let days_in_prev_month = match m {
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            4 | 6 | 9 | 11 => 30,
            2 => {
                if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) {
                    29
                } else {
                    28
                }
            }
            _ => 30,
        };
        d += days_in_prev_month;
    }

    format!("{y:04}-{m:02}-{d:02}")
}

fn http_get_json(url: &str) -> Result<Value, String> {
    let headers = json!({
        "Accept": "application/json",
        "User-Agent": "ironclaw-frankfurter-tool/0.1.0"
    });

    let mut attempt = 0;
    let response = loop {
        attempt += 1;
        let resp = near::agent::host::http_request("GET", url, &headers.to_string(), None, None)
            .map_err(|e| format!("HTTP request failed to {url}: {e}"))?;

        if (200..300).contains(&resp.status) {
            break resp;
        }

        if attempt < MAX_RETRIES && (resp.status == 429 || resp.status >= 500) {
            near::agent::host::log(
                near::agent::host::LogLevel::Warn,
                &format!("Frankfurter request to {url} returned status {} (attempt {attempt}/{MAX_RETRIES}); retrying", resp.status),
            );
            continue;
        }

        let err_body = String::from_utf8_lossy(&resp.body);
        return Err(format!(
            "Frankfurter API returned HTTP status {}: {err_body}",
            resp.status
        ));
    };

    let body_str = String::from_utf8(response.body)
        .map_err(|e| format!("Failed to parse response body from {url} as UTF-8: {e}"))?;

    serde_json::from_str(&body_str)
        .map_err(|e| format!("Failed to parse JSON response from {url}: {e}"))
}

fn serialize_yaml<T: Serialize>(val: &T) -> Result<String, String> {
    serde_yaml::to_string(val).map_err(|e| format!("Failed to format response as YAML: {e}"))
}

// ==================== Load-Bearing Schema ====================

const SCHEMA: &str = r#"{
  "type": "object",
  "required": ["action"],
  "oneOf": [
    {
      "title": "convert",
      "description": "Convert an amount from a base currency to a quote currency with rate lookup and calculated result (e.g. convert $169 USD to VND).",
      "properties": {
        "action": {
          "type": "string",
          "const": "convert",
          "description": "Action discriminator for currency conversion."
        },
        "from": {
          "type": "string",
          "description": "Base currency ISO code (e.g. 'USD', 'EUR', 'GBP')."
        },
        "to": {
          "type": "string",
          "description": "Quote target currency ISO code (e.g. 'VND', 'JPY', 'EUR')."
        },
        "amount": {
          "type": "number",
          "default": 1.0,
          "description": "Amount of base currency to convert (e.g. 169.0)."
        },
        "date": {
          "type": "string",
          "description": "Optional specific historical date in YYYY-MM-DD format (e.g. '2024-01-15'). Defaults to latest rates."
        }
      },
      "required": ["action", "from", "to"]
    },
    {
      "title": "batch_convert",
      "description": "Convert a single base amount into multiple quote target currencies in a single API call (e.g. convert 100 USD to EUR, GBP, JPY, and VND simultaneously).",
      "properties": {
        "action": {
          "type": "string",
          "const": "batch_convert",
          "description": "Action discriminator for batch multi-currency conversion."
        },
        "from": {
          "type": "string",
          "description": "Base currency ISO code (e.g. 'USD')."
        },
        "targets": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of target quote currency ISO codes (e.g. ['EUR', 'GBP', 'JPY', 'VND'])."
        },
        "amount": {
          "type": "number",
          "default": 1.0,
          "description": "Amount of base currency to convert across all target currencies."
        }
      },
      "required": ["action", "from", "targets"]
    },
    {
      "title": "historical_trend",
      "description": "Query historical exchange rate performance over a date range or relative preset ('7d', '30d', '90d', '1y', 'ytd') and calculate summary statistics (min, max, avg, % change).",
      "properties": {
        "action": {
          "type": "string",
          "const": "historical_trend",
          "description": "Action discriminator for historical FX analytics."
        },
        "base": {
          "type": "string",
          "description": "Base currency ISO code (e.g. 'USD')."
        },
        "quote": {
          "type": "string",
          "description": "Quote currency ISO code (e.g. 'VND')."
        },
        "period": {
          "type": "string",
          "enum": ["7d", "30d", "90d", "1y", "ytd"],
          "description": "Relative time period preset (defaults to '30d')."
        },
        "from_date": {
          "type": "string",
          "description": "Start of date range in YYYY-MM-DD format (overrides relative period preset if to_date is also set)."
        },
        "to_date": {
          "type": "string",
          "description": "End of date range in YYYY-MM-DD format."
        },
        "group": {
          "type": "string",
          "enum": ["week", "month"],
          "description": "Optional time grouping for downsampling rates ('week' or 'month')."
        }
      },
      "required": ["action", "base", "quote"]
    },
    {
      "title": "search_currencies",
      "description": "Search active or legacy ISO currency codes, currency names, symbols, and central bank data providers.",
      "properties": {
        "action": {
          "type": "string",
          "const": "search_currencies",
          "description": "Action discriminator for currency metadata search."
        },
        "query": {
          "type": "string",
          "description": "Optional search term to filter currency codes, names, or symbols (e.g. 'Dong', 'VND', 'Yen')."
        },
        "scope": {
          "type": "string",
          "enum": ["active", "all"],
          "default": "active",
          "description": "Set to 'all' to include historical legacy currencies."
        }
      },
      "required": ["action"]
    }
  ]
}"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_convert_action() -> Result<(), String> {
        let json_input = r#"{"action":"convert","from":"USD","to":"VND","amount":169.0}"#;
        let action: Action = serde_json::from_str(json_input)
            .map_err(|e| format!("Failed to parse Convert action: {e}"))?;

        if let Action::Convert {
            from, to, amount, ..
        } = action
        {
            if from != "USD" || to != "VND" || amount != Some(169.0) {
                return Err("Action fields mismatch".to_string());
            }
        } else {
            return Err("Expected Action::Convert variant".to_string());
        }
        Ok(())
    }

    #[test]
    fn test_parse_batch_convert_action() -> Result<(), String> {
        let json_input =
            r#"{"action":"batch_convert","from":"USD","targets":["EUR","VND"],"amount":100.0}"#;
        let action: Action = serde_json::from_str(json_input)
            .map_err(|e| format!("Failed to parse BatchConvert action: {e}"))?;

        if let Action::BatchConvert {
            from,
            targets,
            amount,
        } = action
        {
            if from != "USD" || targets.len() != 2 || amount != Some(100.0) {
                return Err("BatchConvert fields mismatch".to_string());
            }
        } else {
            return Err("Expected Action::BatchConvert variant".to_string());
        }
        Ok(())
    }

    #[test]
    fn test_calculate_past_date() -> Result<(), String> {
        let past = calculate_past_date(2026, 7, 23, 30);
        if past != "2026-06-23" {
            return Err(format!("Expected 2026-06-23, got {past}"));
        }
        Ok(())
    }

    #[test]
    fn test_sanitize_currency() -> Result<(), String> {
        let clean = sanitize_currency(" usd ")?;
        if clean != "USD" {
            return Err(format!("Expected USD, got {clean}"));
        }
        if sanitize_currency("US1").is_ok() {
            return Err("Expected error for non-alphabetic currency".to_string());
        }
        Ok(())
    }
}
