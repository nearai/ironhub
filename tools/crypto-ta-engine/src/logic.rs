//! Pure tool logic — NO host imports, NO `wit_bindgen`.
//!
//! Runs natively under `cargo test`. The wasm glue in `lib.rs` only does the two
//! impure things this file cannot: fetch klines over HTTP and read the clock.
//! Everything else — parsing, indicator orchestration, scoring, risk levels,
//! multi-timeframe aggregation, JSON shaping — lives here and is fully tested.

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::indicators::*;
use crate::scoring::{score, ScoreInput, Scored};

/// Binance Spot public base. Must match the host allowlist in
/// `ta-engine-tool.capabilities.json`. No key/secret — public market data.
pub const BASE_URL: &str = "https://api.binance.com/api/v3";
/// US-region fallback for 451/region-blocked responses.
pub const FALLBACK_BASE_URL: &str = "https://api.binance.us/api/v3";

/// Default multi-timeframe set (top-down: macro → entry).
pub const DEFAULT_INTERVALS: [&str; 3] = ["4h", "1h", "15m"];
/// Default candle count — enough to warm up EMA(200), ADX, ATR.
pub const DEFAULT_LIMIT: u32 = 300;
/// Minimum candles to attempt a full analysis.
pub const MIN_CANDLES: usize = 60;

/// Typed command surface. `{"command":"analyze","symbol":"BTCUSDT"}`.
#[derive(Debug, PartialEq, Deserialize)]
#[serde(tag = "command")]
pub enum Command {
    /// Multi-timeframe analysis + confluence verdict.
    #[serde(rename = "analyze")]
    Analyze {
        symbol: String,
        #[serde(default)]
        intervals: Vec<String>,
        limit: Option<u32>,
    },
    /// Single-timeframe raw indicator snapshot (no cross-TF aggregation).
    #[serde(rename = "indicators")]
    Indicators {
        symbol: String,
        interval: String,
        limit: Option<u32>,
    },
}

pub fn parse_command(params: &str) -> Result<Command, String> {
    serde_json::from_str(params).map_err(|e| format!("Invalid parameters: {e}"))
}

/// Normalize a symbol to Binance form: uppercase, no separators.
pub fn normalize_symbol(s: &str) -> String {
    s.to_uppercase().replace(['/', '-', '_', ' '], "")
}

/// Build the klines request URL.
pub fn build_klines_url(base: &str, symbol: &str, interval: &str, limit: u32) -> String {
    format!(
        "{base}/klines?symbol={}&interval={interval}&limit={limit}",
        normalize_symbol(symbol)
    )
}

const VALID_INTERVALS: [&str; 15] = [
    "1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M",
];

pub fn validate_interval(iv: &str) -> Result<(), String> {
    if VALID_INTERVALS.contains(&iv) {
        Ok(())
    } else {
        Err(format!(
            "Invalid interval '{iv}'. Valid: {}",
            VALID_INTERVALS.join(", ")
        ))
    }
}

/// Parse a Binance klines JSON array into candles.
/// Each row: [openTime, open, high, low, close, volume, ...]. Prices are strings.
pub fn parse_klines(body: &str) -> Result<Vec<Candle>, String> {
    let v: Value = serde_json::from_str(body).map_err(|e| format!("klines JSON parse: {e}"))?;
    // Binance returns {"code":...,"msg":...} on error.
    if let Some(msg) = v.get("msg").and_then(|m| m.as_str()) {
        return Err(format!("Binance error: {msg}"));
    }
    let rows = v.as_array().ok_or("klines response is not an array")?;
    let mut out = Vec::with_capacity(rows.len());
    for row in rows {
        let r = row.as_array().ok_or("kline row is not an array")?;
        if r.len() < 6 {
            return Err("kline row too short".into());
        }
        out.push(Candle {
            open: num(&r[1])?,
            high: num(&r[2])?,
            low: num(&r[3])?,
            close: num(&r[4])?,
            volume: num(&r[5])?,
        });
    }
    Ok(out)
}

fn num(v: &Value) -> Result<f64, String> {
    match v {
        Value::String(s) => s
            .parse::<f64>()
            .map_err(|e| format!("bad number '{s}': {e}")),
        Value::Number(n) => n.as_f64().ok_or_else(|| "non-f64 number".into()),
        _ => Err("expected number or numeric string".into()),
    }
}

/// Interpret a raw klines HTTP response (status + body) into candles.
pub fn handle_klines_response(status: u16, body: &[u8]) -> Result<Vec<Candle>, String> {
    let text = String::from_utf8_lossy(body);
    if (200..300).contains(&status) {
        parse_klines(&text)
    } else if status == 451 {
        Err("HTTP 451 region-blocked — retry against the US fallback host".into())
    } else if status == 429 {
        Err("HTTP 429 rate-limited — back off before retrying".into())
    } else if status == 418 {
        Err("HTTP 418 IP banned — stop requesting".into())
    } else {
        Err(format!("Binance klines error ({status}): {text}"))
    }
}

/// Full per-timeframe report: the key indicator values + the scored verdict.
#[derive(Debug, Clone, Serialize)]
pub struct TimeframeReport {
    pub interval: String,
    pub candles: usize,
    pub close: f64,
    pub indicators: IndicatorSnapshot,
    pub scores: Scored,
    pub supports: Vec<f64>,
    pub resistances: Vec<f64>,
}

/// Rounded indicator values surfaced to the LLM for narration.
#[derive(Debug, Clone, Serialize)]
pub struct IndicatorSnapshot {
    pub ema9: f64,
    pub ema21: f64,
    pub ema50: f64,
    pub ema200: f64,
    pub rsi: f64,
    pub macd_hist: f64,
    pub stoch_k: f64,
    pub adx: f64,
    pub di_plus: f64,
    pub di_minus: f64,
    pub atr: f64,
    pub bb_upper: f64,
    pub bb_mid: f64,
    pub bb_lower: f64,
    pub obv_slope: f64,
    pub cmf: f64,
    pub vwap: f64,
    pub vol: f64,
    pub vol_ma20: f64,
}

fn r2(x: f64) -> f64 {
    (x * 100.0).round() / 100.0
}

/// Compute every indicator + score for a single timeframe.
pub fn analyze_timeframe(interval: &str, c: &[Candle]) -> Result<TimeframeReport, String> {
    if c.len() < MIN_CANDLES {
        return Err(format!(
            "need ≥{MIN_CANDLES} candles for {interval}, got {}",
            c.len()
        ));
    }
    let closes: Vec<f64> = c.iter().map(|k| k.close).collect();
    let vols: Vec<f64> = c.iter().map(|k| k.volume).collect();
    let close = *closes.last().unwrap();

    let ema9 = last_valid(&ema_series(&closes, 9)).unwrap_or(close);
    let ema21 = last_valid(&ema_series(&closes, 21)).unwrap_or(close);
    let ema50 = last_valid(&ema_series(&closes, 50)).unwrap_or(close);
    let ema200 = last_valid(&ema_series(&closes, 200)).unwrap_or(close);

    let rsi_s = rsi_series(&closes, 14);
    let (rsi_prev, rsi) = last_two_valid(&rsi_s).unwrap_or((50.0, 50.0));

    let (_m, _sig, hist) = macd_series(&closes, 12, 26, 9);
    let (macd_hist_prev, macd_hist) = last_two_valid(&hist).unwrap_or((0.0, 0.0));

    let (stoch_k_s, _d) = stoch_rsi_series(&closes, 14, 14, 3, 3);
    let (stoch_k_prev, stoch_k) = last_two_valid(&stoch_k_s).unwrap_or((50.0, 50.0));

    let (adx_s, dip_s, dim_s) = adx_series(c, 14);
    let adx = last_valid(&adx_s).unwrap_or(0.0);
    let di_plus = last_valid(&dip_s).unwrap_or(0.0);
    let di_minus = last_valid(&dim_s).unwrap_or(0.0);

    let atr = last_valid(&atr_series(c, 14)).unwrap_or(0.0);

    let (bb_mid_s, bb_up_s, bb_lo_s) = bollinger_series(&closes, 20, 2.0);
    let bb_mid = last_valid(&bb_mid_s).unwrap_or(close);
    let bb_upper = last_valid(&bb_up_s).unwrap_or(close);
    let bb_lower = last_valid(&bb_lo_s).unwrap_or(close);

    let obv_s = obv_series(c);
    let (obv_prev, obv) = last_two_valid(&obv_s).unwrap_or((0.0, 0.0));
    let obv_slope = obv - obv_prev;

    let cmf = last_valid(&cmf_series(c, 20)).unwrap_or(0.0);
    let vwap_v = vwap(c);
    let vol = *vols.last().unwrap();
    let vol_ma20 = last_valid(&sma_series(&vols, 20)).unwrap_or(vol);

    let (supports, resistances) = swing_levels(c, 3, 3, close, 3);
    let dist_to_support = supports.first().map(|s| (close - s) / close).unwrap_or(1.0);
    let dist_to_resistance = resistances
        .first()
        .map(|r| (r - close) / close)
        .unwrap_or(1.0);

    let input = ScoreInput {
        close,
        ema9,
        ema21,
        ema50,
        ema200,
        rsi,
        rsi_prev,
        macd_hist,
        macd_hist_prev,
        stoch_k,
        stoch_k_prev,
        adx,
        di_plus,
        di_minus,
        vol,
        vol_ma20,
        obv,
        obv_prev,
        cmf,
        bb_upper,
        bb_lower,
        vwap: vwap_v,
        dist_to_support,
        dist_to_resistance,
    };
    let scored = score(&input);

    Ok(TimeframeReport {
        interval: interval.to_string(),
        candles: c.len(),
        close: r2(close),
        indicators: IndicatorSnapshot {
            ema9: r2(ema9),
            ema21: r2(ema21),
            ema50: r2(ema50),
            ema200: r2(ema200),
            rsi: r2(rsi),
            macd_hist: r2(macd_hist),
            stoch_k: r2(stoch_k),
            adx: r2(adx),
            di_plus: r2(di_plus),
            di_minus: r2(di_minus),
            atr: r2(atr),
            bb_upper: r2(bb_upper),
            bb_mid: r2(bb_mid),
            bb_lower: r2(bb_lower),
            obv_slope: r2(obv_slope),
            cmf: r2(cmf),
            vwap: r2(vwap_v),
            vol: r2(vol),
            vol_ma20: r2(vol_ma20),
        },
        scores: scored,
        supports: supports.iter().map(|x| r2(*x)).collect(),
        resistances: resistances.iter().map(|x| r2(*x)).collect(),
    })
}

/// ATR-based risk plan from the entry timeframe (the last/shortest interval).
pub fn build_risk_plan(close: f64, atr: f64, direction: &str) -> Value {
    let risk = 2.0 * atr; // SL distance
    let (sl, tp1, tp2, tp3) = if direction == "SELL" {
        (
            close + risk,
            close - 1.5 * risk,
            close - 2.5 * risk,
            close - 4.0 * risk,
        )
    } else {
        (
            close - risk,
            close + 1.5 * risk,
            close + 2.5 * risk,
            close + 4.0 * risk,
        )
    };
    let pct = |p: f64| r2((p - close) / close * 100.0);
    json!({
        "atr": r2(atr),
        "entry": r2(close),
        "stop_loss": r2(sl),
        "stop_loss_pct": pct(sl),
        "tp1": { "price": r2(tp1), "pct": pct(tp1), "size": "50%", "rr": "1:1.5" },
        "tp2": { "price": r2(tp2), "pct": pct(tp2), "size": "30%", "rr": "1:2.5" },
        "tp3": { "price": r2(tp3), "pct": pct(tp3), "size": "20%", "rr": "1:4+" }
    })
}

/// Aggregate per-timeframe verdicts into one overall bias.
/// Weighted top-down: 4H=3, 1H=2, 15M=1 (macro dominates).
pub fn aggregate(reports: &[TimeframeReport]) -> (i32, String, String) {
    let mut weighted = 0i32;
    let mut wsum = 0i32;
    for r in reports {
        let w = match r.interval.as_str() {
            "4h" | "6h" | "8h" | "12h" | "1d" => 3,
            "1h" | "2h" => 2,
            _ => 1,
        };
        weighted += r.scores.confluence * w;
        wsum += w;
    }
    // Normalize back to a -4..+4 style scale.
    let norm = if wsum > 0 { weighted / wsum } else { 0 };
    let (verdict, bias) = if norm >= 2 {
        ("BUY", "Uptrend")
    } else if norm <= -2 {
        ("SELL", "Downtrend")
    } else if norm == 1 {
        ("WATCH LONG", "Mild Uptrend")
    } else if norm == -1 {
        ("WATCH SHORT", "Mild Downtrend")
    } else {
        ("NEUTRAL/WAIT", "Sideways")
    };
    (norm, verdict.to_string(), bias.to_string())
}

/// Build the final analysis JSON from the per-timeframe reports.
pub fn build_analysis_output(
    symbol: &str,
    reports: Vec<TimeframeReport>,
) -> Result<String, String> {
    if reports.is_empty() {
        return Err("no timeframes analyzed".into());
    }
    let (norm, verdict, bias) = aggregate(&reports);
    let strength = match norm.abs() {
        n if n >= 3 => "Strong",
        2 => "Medium",
        _ => "Weak",
    };
    // Entry plan derived from the shortest (last) timeframe.
    let entry_tf = reports.last().unwrap();
    let risk = build_risk_plan(entry_tf.close, entry_tf.indicators.atr, &verdict);

    let tfs: serde_json::Map<String, Value> = reports
        .iter()
        .map(|r| (r.interval.clone(), serde_json::to_value(r).unwrap()))
        .collect();

    let out = json!({
        "symbol": normalize_symbol(symbol),
        "price": entry_tf.close,
        "overall": {
            "confluence": norm,
            "verdict": verdict,
            "bias": bias,
            "strength": strength
        },
        "risk_plan": risk,
        "timeframes": tfs,
        "disclaimer": "Technical analysis only — not financial advice."
    });
    Ok(out.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_analyze_defaults() {
        let cmd = parse_command(r#"{"command":"analyze","symbol":"btcusdt"}"#).unwrap();
        match cmd {
            Command::Analyze {
                symbol,
                intervals,
                limit,
            } => {
                assert_eq!(symbol, "btcusdt");
                assert!(intervals.is_empty());
                assert_eq!(limit, None);
            }
            _ => panic!("wrong command"),
        }
    }

    #[test]
    fn normalize_symbol_strips_separators() {
        assert_eq!(normalize_symbol("btc/usdt"), "BTCUSDT");
        assert_eq!(normalize_symbol("eth-usdt"), "ETHUSDT");
    }

    #[test]
    fn url_built_correctly() {
        let u = build_klines_url(BASE_URL, "btc/usdt", "1h", 300);
        assert_eq!(
            u,
            "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=300"
        );
    }

    #[test]
    fn interval_validation() {
        assert!(validate_interval("4h").is_ok());
        assert!(validate_interval("7h").is_err());
    }

    #[test]
    fn parse_klines_handles_string_numbers() {
        let body = r#"[[1,"100.0","110.0","90.0","105.0","12.5",9,"0",0,"0","0","0"]]"#;
        let c = parse_klines(body).unwrap();
        assert_eq!(c.len(), 1);
        assert_eq!(c[0].high, 110.0);
        assert_eq!(c[0].close, 105.0);
        assert_eq!(c[0].volume, 12.5);
    }

    #[test]
    fn parse_klines_surfaces_binance_error() {
        let body = r#"{"code":-1121,"msg":"Invalid symbol."}"#;
        let e = parse_klines(body).unwrap_err();
        assert!(e.contains("Invalid symbol"));
    }

    #[test]
    fn response_status_mapping() {
        assert!(handle_klines_response(451, b"x")
            .unwrap_err()
            .contains("451"));
        assert!(handle_klines_response(429, b"x")
            .unwrap_err()
            .contains("429"));
        assert!(handle_klines_response(418, b"x")
            .unwrap_err()
            .contains("418"));
    }

    /// Synthetic uptrend → full pipeline should produce a BUY-leaning verdict
    /// and a coherent risk plan. Drives the real analyze path end-to-end.
    #[test]
    fn analyze_uptrend_pipeline() {
        // Build 250 rising candles with mild noise.
        let mut rows = String::from("[");
        for i in 0..250 {
            let base = 100.0 + i as f64 * 0.5 + ((i as f64) * 0.7).sin();
            let o = base - 0.2;
            let h = base + 0.6;
            let l = base - 0.6;
            let cl = base + 0.3;
            let v = 1000.0 + (i % 5) as f64 * 100.0;
            if i > 0 {
                rows.push(',');
            }
            rows.push_str(&format!(
                "[{i},\"{o}\",\"{h}\",\"{l}\",\"{cl}\",\"{v}\",0,\"0\",0,\"0\",\"0\",\"0\"]"
            ));
        }
        rows.push(']');
        let candles = parse_klines(&rows).unwrap();
        let rep = analyze_timeframe("1h", &candles).unwrap();
        // Rising EMA stack → trend should be bullish.
        assert_eq!(
            rep.scores.trend.score, 1,
            "trend not bullish: {:?}",
            rep.scores.trend
        );
        assert!(rep.indicators.atr > 0.0);
        assert!(rep.indicators.ema9 > rep.indicators.ema200);

        let out = build_analysis_output("BTCUSDT", vec![rep]).unwrap();
        let v: Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v["symbol"], "BTCUSDT");
        assert!(v["risk_plan"]["stop_loss"].as_f64().unwrap() > 0.0);
        assert!(v["timeframes"]["1h"].is_object());
    }

    #[test]
    fn risk_plan_long_has_sl_below_entry() {
        let p = build_risk_plan(100.0, 2.0, "BUY");
        assert!(p["stop_loss"].as_f64().unwrap() < 100.0);
        assert!(p["tp1"]["price"].as_f64().unwrap() > 100.0);
    }

    #[test]
    fn risk_plan_short_has_sl_above_entry() {
        let p = build_risk_plan(100.0, 2.0, "SELL");
        assert!(p["stop_loss"].as_f64().unwrap() > 100.0);
        assert!(p["tp1"]["price"].as_f64().unwrap() < 100.0);
    }

    #[test]
    fn aggregate_weights_macro_higher() {
        // Build minimal reports with known confluence per TF.
        let mk = |iv: &str, conf: i32| TimeframeReport {
            interval: iv.to_string(),
            candles: 100,
            close: 100.0,
            indicators: snap(),
            scores: Scored {
                trend: crate::scoring::Component {
                    score: 0,
                    reason: String::new(),
                },
                momentum: crate::scoring::Component {
                    score: 0,
                    reason: String::new(),
                },
                volume: crate::scoring::Component {
                    score: 0,
                    reason: String::new(),
                },
                structure: crate::scoring::Component {
                    score: 0,
                    reason: String::new(),
                },
                confluence: conf,
                verdict: String::new(),
                label: String::new(),
                sizing: String::new(),
            },
            supports: vec![],
            resistances: vec![],
        };
        // 4H strongly bull, 15M slightly bear → macro wins.
        let reps = vec![mk("4h", 4), mk("1h", 2), mk("15m", -2)];
        let (norm, verdict, _) = aggregate(&reps);
        assert!(norm >= 2, "norm={norm}");
        assert_eq!(verdict, "BUY");
    }

    fn snap() -> IndicatorSnapshot {
        IndicatorSnapshot {
            ema9: 0.0,
            ema21: 0.0,
            ema50: 0.0,
            ema200: 0.0,
            rsi: 0.0,
            macd_hist: 0.0,
            stoch_k: 0.0,
            adx: 0.0,
            di_plus: 0.0,
            di_minus: 0.0,
            atr: 1.0,
            bb_upper: 0.0,
            bb_mid: 0.0,
            bb_lower: 0.0,
            obv_slope: 0.0,
            cmf: 0.0,
            vwap: 0.0,
            vol: 0.0,
            vol_ma20: 0.0,
        }
    }
}
