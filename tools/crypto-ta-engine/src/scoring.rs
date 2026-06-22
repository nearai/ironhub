//! Pure confluence scoring. NO host imports.
//!
//! Mirrors the SKILL.md rubric (§6 scoring, §8 confidence table) but executes it
//! as deterministic Rust so the verdict is reproducible and not LLM-estimated.
//!
//! Each component (Trend / Momentum / Volume / Structure) scores -1, 0, or +1.
//! Confluence = their sum, in [-4, +4], mapped to a labelled verdict.

#![allow(dead_code)]

use serde::Serialize;

/// Snapshot of the indicator values a single timeframe needs for scoring.
/// All fields are "last" values unless the name says `_prev`.
#[derive(Debug, Clone, Copy)]
pub struct ScoreInput {
    pub close: f64,
    pub ema9: f64,
    pub ema21: f64,
    pub ema50: f64,
    pub ema200: f64,
    pub rsi: f64,
    pub rsi_prev: f64,
    pub macd_hist: f64,
    pub macd_hist_prev: f64,
    pub stoch_k: f64,
    pub stoch_k_prev: f64,
    pub adx: f64,
    pub di_plus: f64,
    pub di_minus: f64,
    pub vol: f64,
    pub vol_ma20: f64,
    pub obv: f64,
    pub obv_prev: f64,
    pub cmf: f64,
    pub bb_upper: f64,
    pub bb_lower: f64,
    pub vwap: f64,
    /// Distance to nearest support as a fraction of price (e.g. 0.004 = 0.4%).
    pub dist_to_support: f64,
    /// Distance to nearest resistance as a fraction of price.
    pub dist_to_resistance: f64,
}

/// One component's score plus a short human reason.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct Component {
    pub score: i32,
    pub reason: String,
}

/// Full scored result for a timeframe.
#[derive(Debug, Clone, Serialize)]
pub struct Scored {
    pub trend: Component,
    pub momentum: Component,
    pub volume: Component,
    pub structure: Component,
    pub confluence: i32,
    pub verdict: String,
    pub label: String,
    pub sizing: String,
}

fn c(score: i32, reason: impl Into<String>) -> Component {
    Component {
        score,
        reason: reason.into(),
    }
}

/// TREND: EMA stack + ADX strength + DI direction.
pub fn trend_score(i: &ScoreInput) -> Component {
    let bull_stack = i.ema9 > i.ema21 && i.ema21 > i.ema50 && i.ema50 > i.ema200;
    let bear_stack = i.ema9 < i.ema21 && i.ema21 < i.ema50 && i.ema50 < i.ema200;
    let strong = i.adx > 25.0;
    if bull_stack && strong && i.di_plus > i.di_minus {
        c(1, "EMA 9>21>50>200, ADX>25, DI+>DI- → strong uptrend")
    } else if bear_stack && strong && i.di_minus > i.di_plus {
        c(-1, "EMA 9<21<50<200, ADX>25, DI->DI+ → strong downtrend")
    } else {
        c(0, "EMAs mixed or ADX<25 → no confirmed trend")
    }
}

/// MOMENTUM: RSI zone/slope + MACD histogram + Stoch RSI recovery.
pub fn momentum_score(i: &ScoreInput) -> Component {
    let rsi_rising = i.rsi > i.rsi_prev;
    let macd_up = i.macd_hist > 0.0 && i.macd_hist > i.macd_hist_prev;
    let stoch_cross_up = i.stoch_k_prev < 20.0 && i.stoch_k > i.stoch_k_prev;
    let bearish_div =
        i.rsi > 70.0 || (i.macd_hist < 0.0 && i.macd_hist < i.macd_hist_prev && i.rsi < 50.0);

    if (40.0..=65.0).contains(&i.rsi) && rsi_rising && (macd_up || stoch_cross_up) {
        c(
            1,
            "RSI 40-65 rising + MACD/Stoch turning up → positive momentum",
        )
    } else if bearish_div {
        c(
            -1,
            "RSI overbought or MACD rolling over → negative momentum",
        )
    } else {
        c(0, "RSI mid-range, MACD flat → neutral momentum")
    }
}

/// VOLUME: breakout volume + OBV slope + CMF flow.
pub fn volume_score(i: &ScoreInput) -> Component {
    let obv_rising = i.obv > i.obv_prev;
    let breakout_vol = i.vol_ma20 > 0.0 && i.vol > 1.5 * i.vol_ma20;
    if breakout_vol && obv_rising && i.cmf > 0.1 {
        c(1, "Vol >150% MA20 + OBV rising + CMF>0.1 → inflow confirms")
    } else if breakout_vol && !obv_rising && i.cmf < -0.1 {
        c(-1, "High vol + OBV falling + CMF<-0.1 → distribution")
    } else {
        c(0, "Average volume, flow neutral")
    }
}

/// STRUCTURE: proximity to S/R + Bollinger position.
pub fn structure_score(i: &ScoreInput) -> Component {
    let near = 0.005; // within 0.5%
    let at_support = i.dist_to_support <= near;
    let at_resistance = i.dist_to_resistance <= near;
    let below_lower = i.close < i.bb_lower;
    let above_upper = i.close > i.bb_upper;
    if at_support || below_lower {
        c(1, "Price at support / below lower BB → bounce zone")
    } else if at_resistance || above_upper {
        c(-1, "Price at resistance / above upper BB → rejection zone")
    } else {
        c(0, "Price mid-structure, no edge")
    }
}

/// Map confluence sum to verdict/label/sizing per SKILL.md §8.
fn verdict_for(sum: i32) -> (String, String, String) {
    let (label, sizing) = match sum {
        s if s >= 4 => ("STRONG BUY", "Full size (2% capital)"),
        3 => ("BUY", "1.5% capital"),
        2 => ("WEAK BUY", "1% capital, caution"),
        1 => ("WATCH LONG", "Wait for confirmation"),
        0 => ("NEUTRAL", "No trade"),
        -1 => ("WATCH SHORT", "Wait for confirmation"),
        -2 => ("WEAK SELL", "Short 1%, caution"),
        -3 => ("SELL", "Short 1.5%"),
        _ => ("STRONG SELL", "Full size short (2% capital)"),
    };
    let verdict = if sum >= 2 {
        "BUY"
    } else if sum <= -2 {
        "SELL"
    } else {
        "NEUTRAL/WAIT"
    };
    (verdict.to_string(), label.to_string(), sizing.to_string())
}

/// Score one timeframe end-to-end.
pub fn score(i: &ScoreInput) -> Scored {
    let trend = trend_score(i);
    let momentum = momentum_score(i);
    let volume = volume_score(i);
    let structure = structure_score(i);
    let confluence = trend.score + momentum.score + volume.score + structure.score;
    let (verdict, label, sizing) = verdict_for(confluence);
    Scored {
        trend,
        momentum,
        volume,
        structure,
        confluence,
        verdict,
        label,
        sizing,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bull() -> ScoreInput {
        ScoreInput {
            close: 110.0,
            ema9: 109.0,
            ema21: 107.0,
            ema50: 104.0,
            ema200: 100.0,
            rsi: 55.0,
            rsi_prev: 50.0,
            macd_hist: 1.2,
            macd_hist_prev: 0.8,
            stoch_k: 30.0,
            stoch_k_prev: 25.0,
            adx: 30.0,
            di_plus: 28.0,
            di_minus: 12.0,
            vol: 2000.0,
            vol_ma20: 1000.0,
            obv: 5000.0,
            obv_prev: 4000.0,
            cmf: 0.2,
            bb_upper: 115.0,
            bb_lower: 95.0,
            vwap: 105.0,
            dist_to_support: 0.003,
            dist_to_resistance: 0.05,
        }
    }

    #[test]
    fn full_bull_is_strong_buy() {
        let s = score(&bull());
        assert_eq!(s.trend.score, 1);
        assert_eq!(s.momentum.score, 1);
        assert_eq!(s.volume.score, 1);
        assert_eq!(s.structure.score, 1);
        assert_eq!(s.confluence, 4);
        assert_eq!(s.label, "STRONG BUY");
        assert_eq!(s.verdict, "BUY");
    }

    #[test]
    fn full_bear_is_strong_sell() {
        let mut i = bull();
        i.ema9 = 100.0;
        i.ema21 = 103.0;
        i.ema50 = 106.0;
        i.ema200 = 110.0;
        i.di_plus = 10.0;
        i.di_minus = 30.0;
        i.rsi = 75.0;
        i.macd_hist = -1.0;
        i.macd_hist_prev = -0.5;
        i.obv = 3000.0;
        i.obv_prev = 4000.0;
        i.cmf = -0.2;
        i.dist_to_support = 0.05;
        i.dist_to_resistance = 0.002;
        let s = score(&i);
        assert_eq!(s.confluence, -4);
        assert_eq!(s.label, "STRONG SELL");
        assert_eq!(s.verdict, "SELL");
    }

    #[test]
    fn neutral_midrange() {
        let mut i = bull();
        i.ema9 = 102.0;
        i.ema21 = 103.0;
        i.ema50 = 101.0;
        i.ema200 = 104.0; // mixed stack → trend 0
        i.adx = 18.0;
        i.rsi = 50.0;
        i.rsi_prev = 50.0;
        i.macd_hist = 0.0;
        i.macd_hist_prev = 0.0;
        i.stoch_k = 50.0;
        i.stoch_k_prev = 50.0;
        i.vol = 1000.0; // no breakout
        i.dist_to_support = 0.05;
        i.dist_to_resistance = 0.05;
        let s = score(&i);
        assert_eq!(s.confluence, 0);
        assert_eq!(s.verdict, "NEUTRAL/WAIT");
    }

    #[test]
    fn verdict_table_edges() {
        assert_eq!(verdict_for(2).1, "WEAK BUY");
        assert_eq!(verdict_for(1).0, "NEUTRAL/WAIT");
        assert_eq!(verdict_for(-2).1, "WEAK SELL");
        assert_eq!(verdict_for(-4).1, "STRONG SELL");
    }
}
