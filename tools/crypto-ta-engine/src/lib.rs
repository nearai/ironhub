//! TA-Engine — deterministic technical-analysis WASM tool for IronClaw.
//!
//! Why this exists: LLMs are unreliable at arithmetic. v1 of the trading skill
//! asked the model to compute EMA/RSI/MACD/ADX/ATR from raw candles in-context —
//! slow, token-heavy, and numerically wrong. This tool moves ALL math into
//! sandboxed Rust. It fetches Binance Spot klines itself (public, no key) and
//! returns a compact, scored JSON verdict. Raw candles never enter LLM context.
//!
//! # Architecture
//! * [`indicators`] — pure indicator math (native-tested).
//! * [`scoring`]    — pure confluence rubric (native-tested).
//! * [`logic`]      — pure parsing/orchestration/JSON shaping (native-tested).
//! * the `wasm` module below — thin host glue (HTTP fetch), compiled only for
//!   `wasm32` so `cargo test` runs the pure logic natively without a wasm runtime.
//!
//! # Security
//! Binance Spot market-data endpoints are public — this tool sends NO credentials
//! and declares no secrets. The host allowlist (`ta-engine-tool.capabilities.json`)
//! restricts it to `api.binance.com` / `api.binance.us` under `/api/v3` (GET only).

mod indicators;
mod logic;
mod scoring;

// NOTE: This schema uses the top-level `required` + `oneOf` (per-command branch)
// shape, matching the working `github` tool. The host forwards only the fields
// named in the matching branch's `properties`/`required`; a flat schema with
// `required: ["command","symbol"]` causes every OPTIONAL argument (intervals,
// interval, limit) to be stripped before the tool sees it — so callers could
// never override the defaults. Each branch therefore lists `command` plus that
// command's own fields. Do NOT add a top-level `additionalProperties: false`:
// with per-branch properties it would reject every real argument.
//
// Consumed by the wasm host glue (and the native `schema_tests`); marked
// allow(dead_code) for the plain native build where neither is compiled.
#[cfg_attr(not(target_arch = "wasm32"), allow(dead_code))]
const SCHEMA: &str = r#"{
    "type": "object",
    "required": ["command"],
    "oneOf": [
        {
            "properties": {
                "command": {
                    "const": "analyze",
                    "description": "Weighted multi-timeframe confluence verdict"
                },
                "symbol": {
                    "type": "string",
                    "description": "Trading pair, e.g. BTCUSDT. Separators (/, -) are stripped automatically."
                },
                "intervals": {
                    "type": "array",
                    "items": { "type": "string" },
                    "description": "Timeframes top-down. Default ['4h','1h','15m']. Valid: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M"
                },
                "limit": {
                    "type": "integer",
                    "description": "Candles per timeframe (default 300, max 1000). Use >=200 for reliable EMA200/ADX/ATR."
                }
            },
            "required": ["command", "symbol"]
        },
        {
            "properties": {
                "command": {
                    "const": "indicators",
                    "description": "Single-timeframe raw indicator snapshot"
                },
                "symbol": {
                    "type": "string",
                    "description": "Trading pair, e.g. BTCUSDT. Separators (/, -) are stripped automatically."
                },
                "interval": {
                    "type": "string",
                    "description": "Single timeframe, e.g. '1h'. Valid: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M"
                },
                "limit": {
                    "type": "integer",
                    "description": "Candles (default 300, max 1000). Use >=200 for reliable EMA200/ADX/ATR."
                }
            },
            "required": ["command", "symbol", "interval"]
        }
    ]
}"#;

#[cfg(target_arch = "wasm32")]
mod wasm {
    use super::SCHEMA;
    use crate::logic::{
        analyze_timeframe, build_analysis_output, build_klines_url, handle_klines_response,
        parse_command, validate_interval, Command, TimeframeReport, BASE_URL, DEFAULT_INTERVALS,
        DEFAULT_LIMIT, FALLBACK_BASE_URL,
    };
    use serde_json::json;

    wit_bindgen::generate!({
        world: "sandboxed-tool",
        path: "../../wit/tool.wit",
    });

    use near::agent::host;

    struct TaEngine;

    impl exports::near::agent::tool::Guest for TaEngine {
        fn execute(
            req: exports::near::agent::tool::Request,
        ) -> exports::near::agent::tool::Response {
            match execute_inner(&req.params) {
                Ok(output) => exports::near::agent::tool::Response {
                    output: Some(output),
                    error: None,
                },
                Err(error) => exports::near::agent::tool::Response {
                    output: None,
                    error: Some(error),
                },
            }
        }

        fn schema() -> String {
            SCHEMA.to_string()
        }

        fn description() -> String {
            "Deterministic technical-analysis engine. Fetches Binance Spot klines (public, no key) \
             and computes EMA/RSI/MACD/StochRSI/ADX/ATR/Bollinger/OBV/CMF/VWAP plus a weighted \
             multi-timeframe confluence verdict with ATR-based stop-loss/take-profit levels. \
             Use 'analyze' for a full multi-timeframe read, 'indicators' for one timeframe. \
             Returns compact JSON — raw candles are processed inside the tool, not returned."
                .to_string()
        }
    }

    fn execute_inner(params: &str) -> Result<String, String> {
        match parse_command(params)? {
            Command::Analyze {
                symbol,
                intervals,
                limit,
            } => {
                let ivs: Vec<String> = if intervals.is_empty() {
                    DEFAULT_INTERVALS.iter().map(|s| s.to_string()).collect()
                } else {
                    intervals
                };
                let lim = limit.unwrap_or(DEFAULT_LIMIT);
                let mut reports: Vec<TimeframeReport> = Vec::new();
                for iv in &ivs {
                    validate_interval(iv)?;
                    let candles = fetch_klines(&symbol, iv, lim)?;
                    reports.push(analyze_timeframe(iv, &candles)?);
                }
                build_analysis_output(&symbol, reports)
            }
            Command::Indicators {
                symbol,
                interval,
                limit,
            } => {
                validate_interval(&interval)?;
                let lim = limit.unwrap_or(DEFAULT_LIMIT);
                let candles = fetch_klines(&symbol, &interval, lim)?;
                let rep = analyze_timeframe(&interval, &candles)?;
                serde_json::to_string(&rep).map_err(|e| format!("serialize: {e}"))
            }
        }
    }

    /// Fetch + parse klines. Falls back to the US host on a 451 region block.
    fn fetch_klines(
        symbol: &str,
        interval: &str,
        limit: u32,
    ) -> Result<Vec<crate::indicators::Candle>, String> {
        let headers = json!({ "Accept": "application/json" }).to_string();

        let url = build_klines_url(BASE_URL, symbol, interval, limit);
        host::log(host::LogLevel::Debug, &format!("GET {url}"));
        let resp = host::http_request("GET", &url, &headers, None, None)
            .map_err(|e| format!("klines request failed: {e}"))?;

        match handle_klines_response(resp.status, &resp.body) {
            Ok(c) => Ok(c),
            Err(e) if resp.status == 451 => {
                let url2 = build_klines_url(FALLBACK_BASE_URL, symbol, interval, limit);
                host::log(host::LogLevel::Debug, &format!("451 fallback GET {url2}"));
                let resp2 = host::http_request("GET", &url2, &headers, None, None)
                    .map_err(|e2| format!("fallback klines request failed: {e2}"))?;
                handle_klines_response(resp2.status, &resp2.body)
                    .map_err(|e2| format!("both Binance hosts failed: primary={e}; fallback={e2}"))
            }
            Err(e) => Err(e),
        }
    }

    export!(TaEngine);
}

#[cfg(test)]
mod schema_tests {
    use super::SCHEMA;
    use serde_json::Value;

    #[test]
    fn schema_is_valid_oneof() {
        let v: Value = serde_json::from_str(SCHEMA).expect("schema must be valid JSON");
        assert_eq!(v["type"], "object");
        assert_eq!(v["required"][0], "command");
        // Per-command `oneOf` branches each re-list their fields so the host forwards
        // them (a flat `required: ["command","symbol"]` strips every optional argument).
        let branches = v["oneOf"].as_array().expect("oneOf must be an array");
        assert_eq!(branches.len(), 2, "one branch per Command variant");
        for b in branches {
            let req = b["required"].as_array().expect("branch needs required[]");
            assert_eq!(req[0], "command");
            // command is pinned to a const matching one variant's command string.
            assert!(b["properties"]["command"]["const"].is_string());
        }
    }
}
