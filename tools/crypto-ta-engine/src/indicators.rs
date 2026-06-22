//! Pure technical-indicator math. NO host imports, NO `wit_bindgen`.
//!
//! Everything here is plain `f64` arithmetic and runs under native `cargo test`.
//! This is the whole point of the v2 tool: indicator values are computed here,
//! deterministically, instead of being estimated by an LLM.
//!
//! Conventions:
//! * Series functions return a `Vec<f64>` aligned 1:1 with the input. Positions
//!   that are not yet defined (warm-up window) hold `f64::NAN`.
//! * Use [`last_valid`] to pull the most recent defined value.
//! * Wilder smoothing (RSI/ATR/ADX) follows the classic recursive definition.

#![allow(dead_code)]

/// One OHLCV candle. Built from a Binance kline row.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Candle {
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
}

/// Last non-NaN value of a series, if any.
pub fn last_valid(series: &[f64]) -> Option<f64> {
    series.iter().rev().copied().find(|v| !v.is_nan())
}

/// Last two non-NaN values `(prev, last)` of a series, if both exist.
pub fn last_two_valid(series: &[f64]) -> Option<(f64, f64)> {
    let mut it = series.iter().rev().copied().filter(|v| !v.is_nan());
    let last = it.next()?;
    let prev = it.next()?;
    Some((prev, last))
}

/// Simple moving average series.
pub fn sma_series(vals: &[f64], period: usize) -> Vec<f64> {
    let mut out = vec![f64::NAN; vals.len()];
    if period == 0 || vals.len() < period {
        return out;
    }
    let mut sum: f64 = vals[..period].iter().sum();
    out[period - 1] = sum / period as f64;
    for i in period..vals.len() {
        sum += vals[i] - vals[i - period];
        out[i] = sum / period as f64;
    }
    out
}

/// Exponential moving average series, seeded with the SMA at index `period-1`.
pub fn ema_series(vals: &[f64], period: usize) -> Vec<f64> {
    let mut out = vec![f64::NAN; vals.len()];
    if period == 0 || vals.len() < period {
        return out;
    }
    let k = 2.0 / (period as f64 + 1.0);
    let seed: f64 = vals[..period].iter().sum::<f64>() / period as f64;
    out[period - 1] = seed;
    let mut prev = seed;
    for i in period..vals.len() {
        let cur = vals[i] * k + prev * (1.0 - k);
        out[i] = cur;
        prev = cur;
    }
    out
}

/// Standard-deviation (population) over a trailing window, aligned series.
fn stddev_series(vals: &[f64], period: usize) -> Vec<f64> {
    let mut out = vec![f64::NAN; vals.len()];
    if period == 0 || vals.len() < period {
        return out;
    }
    for i in (period - 1)..vals.len() {
        let win = &vals[i + 1 - period..=i];
        let mean = win.iter().sum::<f64>() / period as f64;
        let var = win.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / period as f64;
        out[i] = var.sqrt();
    }
    out
}

/// Wilder RSI series.
pub fn rsi_series(closes: &[f64], period: usize) -> Vec<f64> {
    let n = closes.len();
    let mut out = vec![f64::NAN; n];
    if period == 0 || n <= period {
        return out;
    }
    let mut gain = 0.0;
    let mut loss = 0.0;
    for i in 1..=period {
        let d = closes[i] - closes[i - 1];
        if d >= 0.0 {
            gain += d;
        } else {
            loss -= d;
        }
    }
    let mut avg_gain = gain / period as f64;
    let mut avg_loss = loss / period as f64;
    out[period] = rsi_from(avg_gain, avg_loss);
    for i in (period + 1)..n {
        let d = closes[i] - closes[i - 1];
        let (g, l) = if d >= 0.0 { (d, 0.0) } else { (0.0, -d) };
        avg_gain = (avg_gain * (period as f64 - 1.0) + g) / period as f64;
        avg_loss = (avg_loss * (period as f64 - 1.0) + l) / period as f64;
        out[i] = rsi_from(avg_gain, avg_loss);
    }
    out
}

fn rsi_from(avg_gain: f64, avg_loss: f64) -> f64 {
    if avg_loss == 0.0 {
        return if avg_gain == 0.0 { 50.0 } else { 100.0 };
    }
    let rs = avg_gain / avg_loss;
    100.0 - 100.0 / (1.0 + rs)
}

/// MACD: returns `(macd_line, signal_line, histogram)` aligned series.
pub fn macd_series(
    closes: &[f64],
    fast: usize,
    slow: usize,
    signal: usize,
) -> (Vec<f64>, Vec<f64>, Vec<f64>) {
    let ema_fast = ema_series(closes, fast);
    let ema_slow = ema_series(closes, slow);
    let n = closes.len();
    let mut macd = vec![f64::NAN; n];
    for i in 0..n {
        if !ema_fast[i].is_nan() && !ema_slow[i].is_nan() {
            macd[i] = ema_fast[i] - ema_slow[i];
        }
    }
    // Signal = EMA of the defined MACD tail; map back onto full-length series.
    let start = macd.iter().position(|v| !v.is_nan());
    let mut sig = vec![f64::NAN; n];
    if let Some(s) = start {
        let dense: Vec<f64> = macd[s..].to_vec();
        let sig_dense = ema_series(&dense, signal);
        for (off, v) in sig_dense.iter().enumerate() {
            sig[s + off] = *v;
        }
    }
    let mut hist = vec![f64::NAN; n];
    for i in 0..n {
        if !macd[i].is_nan() && !sig[i].is_nan() {
            hist[i] = macd[i] - sig[i];
        }
    }
    (macd, sig, hist)
}

/// True Range series (index 0 is NaN — needs a previous close).
fn true_range_series(c: &[Candle]) -> Vec<f64> {
    let mut out = vec![f64::NAN; c.len()];
    for i in 1..c.len() {
        let h = c[i].high;
        let l = c[i].low;
        let pc = c[i - 1].close;
        out[i] = (h - l).max((h - pc).abs()).max((l - pc).abs());
    }
    out
}

/// Wilder smoothing of a series that begins at `first_idx`, averaging the first
/// `period` samples then recursively smoothing. Returns aligned series.
fn wilder_smooth(vals: &[f64], period: usize, first_idx: usize) -> Vec<f64> {
    let n = vals.len();
    let mut out = vec![f64::NAN; n];
    let end = first_idx + period;
    if end > n {
        return out;
    }
    let seed: f64 = vals[first_idx..end].iter().sum::<f64>() / period as f64;
    out[end - 1] = seed;
    let mut prev = seed;
    for i in end..n {
        let cur = (prev * (period as f64 - 1.0) + vals[i]) / period as f64;
        out[i] = cur;
        prev = cur;
    }
    out
}

/// Wilder ATR series.
pub fn atr_series(c: &[Candle], period: usize) -> Vec<f64> {
    let tr = true_range_series(c);
    // TR is defined from index 1.
    wilder_smooth(&tr, period, 1)
}

/// ADX bundle: `(adx, di_plus, di_minus)` aligned series.
pub fn adx_series(c: &[Candle], period: usize) -> (Vec<f64>, Vec<f64>, Vec<f64>) {
    let n = c.len();
    let mut plus_dm = vec![f64::NAN; n];
    let mut minus_dm = vec![f64::NAN; n];
    let mut tr = vec![f64::NAN; n];
    for i in 1..n {
        let up = c[i].high - c[i - 1].high;
        let down = c[i - 1].low - c[i].low;
        plus_dm[i] = if up > down && up > 0.0 { up } else { 0.0 };
        minus_dm[i] = if down > up && down > 0.0 { down } else { 0.0 };
        let h = c[i].high;
        let l = c[i].low;
        let pc = c[i - 1].close;
        tr[i] = (h - l).max((h - pc).abs()).max((l - pc).abs());
    }
    let tr_s = wilder_smooth(&tr, period, 1);
    let pdm_s = wilder_smooth(&plus_dm, period, 1);
    let mdm_s = wilder_smooth(&minus_dm, period, 1);

    let mut di_plus = vec![f64::NAN; n];
    let mut di_minus = vec![f64::NAN; n];
    let mut dx = vec![f64::NAN; n];
    for i in 0..n {
        if tr_s[i].is_nan() || tr_s[i] == 0.0 {
            continue;
        }
        let dip = 100.0 * pdm_s[i] / tr_s[i];
        let dim = 100.0 * mdm_s[i] / tr_s[i];
        di_plus[i] = dip;
        di_minus[i] = dim;
        let denom = dip + dim;
        dx[i] = if denom == 0.0 {
            0.0
        } else {
            100.0 * (dip - dim).abs() / denom
        };
    }
    // ADX = Wilder smoothing of DX, starting at the first defined DX index.
    let dx_start = dx.iter().position(|v| !v.is_nan()).unwrap_or(n);
    let adx = wilder_smooth(&dx, period, dx_start);
    (adx, di_plus, di_minus)
}

/// Bollinger bands: `(mid, upper, lower)` aligned series.
pub fn bollinger_series(
    closes: &[f64],
    period: usize,
    mult: f64,
) -> (Vec<f64>, Vec<f64>, Vec<f64>) {
    let mid = sma_series(closes, period);
    let sd = stddev_series(closes, period);
    let n = closes.len();
    let mut up = vec![f64::NAN; n];
    let mut lo = vec![f64::NAN; n];
    for i in 0..n {
        if !mid[i].is_nan() && !sd[i].is_nan() {
            up[i] = mid[i] + mult * sd[i];
            lo[i] = mid[i] - mult * sd[i];
        }
    }
    (mid, up, lo)
}

/// On-Balance Volume series.
pub fn obv_series(c: &[Candle]) -> Vec<f64> {
    let n = c.len();
    let mut out = vec![f64::NAN; n];
    if n == 0 {
        return out;
    }
    let mut obv = 0.0;
    out[0] = 0.0;
    for i in 1..n {
        if c[i].close > c[i - 1].close {
            obv += c[i].volume;
        } else if c[i].close < c[i - 1].close {
            obv -= c[i].volume;
        }
        out[i] = obv;
    }
    out
}

/// Chaikin Money Flow over a trailing window.
pub fn cmf_series(c: &[Candle], period: usize) -> Vec<f64> {
    let n = c.len();
    let mut out = vec![f64::NAN; n];
    if period == 0 || n < period {
        return out;
    }
    // Money-flow volume per candle.
    let mfv: Vec<f64> = c
        .iter()
        .map(|k| {
            let range = k.high - k.low;
            if range == 0.0 {
                0.0
            } else {
                ((k.close - k.low) - (k.high - k.close)) / range * k.volume
            }
        })
        .collect();
    for i in (period - 1)..n {
        let vol: f64 = c[i + 1 - period..=i].iter().map(|k| k.volume).sum();
        if vol == 0.0 {
            out[i] = 0.0;
        } else {
            let flow: f64 = mfv[i + 1 - period..=i].iter().sum();
            out[i] = flow / vol;
        }
    }
    out
}

/// Volume-weighted average price over the whole window (typical price).
pub fn vwap(c: &[Candle]) -> f64 {
    let mut pv = 0.0;
    let mut vol = 0.0;
    for k in c {
        let tp = (k.high + k.low + k.close) / 3.0;
        pv += tp * k.volume;
        vol += k.volume;
    }
    if vol == 0.0 {
        f64::NAN
    } else {
        pv / vol
    }
}

/// Stochastic RSI: returns `(k_line, d_line)` aligned series.
pub fn stoch_rsi_series(
    closes: &[f64],
    rsi_period: usize,
    stoch_period: usize,
    k_smooth: usize,
    d_smooth: usize,
) -> (Vec<f64>, Vec<f64>) {
    let rsi = rsi_series(closes, rsi_period);
    let n = closes.len();
    let mut raw = vec![f64::NAN; n];
    for i in 0..n {
        if i + 1 < stoch_period {
            continue;
        }
        let win = &rsi[i + 1 - stoch_period..=i];
        if win.iter().any(|v| v.is_nan()) {
            continue;
        }
        let lo = win.iter().cloned().fold(f64::INFINITY, f64::min);
        let hi = win.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        raw[i] = if hi - lo == 0.0 {
            0.0
        } else {
            100.0 * (rsi[i] - lo) / (hi - lo)
        };
    }
    let k = sma_nan_series(&raw, k_smooth);
    let d = sma_nan_series(&k, d_smooth);
    (k, d)
}

/// SMA that tolerates leading NaNs (used to smooth Stoch %K/%D).
fn sma_nan_series(vals: &[f64], period: usize) -> Vec<f64> {
    let n = vals.len();
    let mut out = vec![f64::NAN; n];
    if period == 0 {
        return out;
    }
    for i in 0..n {
        if i + 1 < period {
            continue;
        }
        let win = &vals[i + 1 - period..=i];
        if win.iter().any(|v| v.is_nan()) {
            continue;
        }
        out[i] = win.iter().sum::<f64>() / period as f64;
    }
    out
}

/// Swing pivots → support/resistance candidates. Returns (supports, resistances)
/// as price levels, nearest-first relative to `ref_price`, deduped, max `limit`.
pub fn swing_levels(
    c: &[Candle],
    left: usize,
    right: usize,
    ref_price: f64,
    limit: usize,
) -> (Vec<f64>, Vec<f64>) {
    let mut sup = Vec::new();
    let mut res = Vec::new();
    if c.len() < left + right + 1 {
        return (sup, res);
    }
    for i in left..c.len() - right {
        let is_high = (i - left..i).all(|j| c[j].high <= c[i].high)
            && (i + 1..=i + right).all(|j| c[j].high <= c[i].high);
        let is_low = (i - left..i).all(|j| c[j].low >= c[i].low)
            && (i + 1..=i + right).all(|j| c[j].low >= c[i].low);
        if is_high {
            res.push(c[i].high);
        }
        if is_low {
            sup.push(c[i].low);
        }
    }
    // Supports below ref, resistances above ref; nearest first.
    sup.retain(|v| *v < ref_price);
    res.retain(|v| *v > ref_price);
    sup.sort_by(|a, b| b.partial_cmp(a).unwrap());
    res.sort_by(|a, b| a.partial_cmp(b).unwrap());
    sup.dedup_by(|a, b| (*a - *b).abs() / ref_price < 0.001);
    res.dedup_by(|a, b| (*a - *b).abs() / ref_price < 0.001);
    sup.truncate(limit);
    res.truncate(limit);
    (sup, res)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn closes(v: &[f64]) -> Vec<f64> {
        v.to_vec()
    }

    fn candle(o: f64, h: f64, l: f64, cl: f64, vol: f64) -> Candle {
        Candle {
            open: o,
            high: h,
            low: l,
            close: cl,
            volume: vol,
        }
    }

    #[test]
    fn sma_basic() {
        let s = sma_series(&closes(&[1.0, 2.0, 3.0, 4.0, 5.0]), 3);
        assert!(s[0].is_nan() && s[1].is_nan());
        assert_eq!(s[2], 2.0);
        assert_eq!(s[3], 3.0);
        assert_eq!(s[4], 4.0);
    }

    #[test]
    fn ema_seeds_with_sma_then_recurses() {
        let s = ema_series(&closes(&[1.0, 2.0, 3.0, 4.0, 5.0]), 3);
        assert_eq!(s[2], 2.0); // seed = SMA(1,2,3)
                               // k = 2/4 = 0.5; next = 4*0.5 + 2*0.5 = 3.0
        assert_eq!(s[3], 3.0);
        // next = 5*0.5 + 3*0.5 = 4.0
        assert_eq!(s[4], 4.0);
    }

    #[test]
    fn rsi_all_gains_is_100() {
        let c: Vec<f64> = (1..=20).map(|x| x as f64).collect();
        let r = rsi_series(&c, 14);
        assert_eq!(last_valid(&r), Some(100.0));
    }

    #[test]
    fn rsi_known_wilder_value() {
        // Classic Wilder textbook series; RSI(14) first value ≈ 70.46.
        let c = closes(&[
            44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03,
            45.61, 46.28, 46.28,
        ]);
        let r = rsi_series(&c, 14);
        let v = last_valid(&r).unwrap();
        assert!((v - 70.46).abs() < 0.5, "rsi was {v}");
    }

    #[test]
    fn macd_hist_is_macd_minus_signal() {
        let c: Vec<f64> = (1..=60)
            .map(|x| (x as f64).sin() * 5.0 + x as f64)
            .collect();
        let (m, s, h) = macd_series(&c, 12, 26, 9);
        let (mi, si, hi) = (last_valid(&m), last_valid(&s), last_valid(&h));
        assert!(mi.is_some() && si.is_some() && hi.is_some());
        assert!((hi.unwrap() - (mi.unwrap() - si.unwrap())).abs() < 1e-9);
    }

    #[test]
    fn atr_positive_on_volatile_series() {
        let c: Vec<Candle> = (0..30)
            .map(|i| {
                let base = 100.0 + i as f64;
                candle(base, base + 2.0, base - 2.0, base + 1.0, 1000.0)
            })
            .collect();
        let a = atr_series(&c, 14);
        assert!(last_valid(&a).unwrap() > 0.0);
    }

    #[test]
    fn adx_strong_trend_high() {
        // Monotonic uptrend → ADX should climb well above 25.
        let c: Vec<Candle> = (0..50)
            .map(|i| {
                let base = 100.0 + i as f64 * 2.0;
                candle(base, base + 1.0, base - 1.0, base + 0.5, 1000.0)
            })
            .collect();
        let (adx, dip, dim) = adx_series(&c, 14);
        assert!(last_valid(&adx).unwrap() > 25.0);
        assert!(last_valid(&dip).unwrap() > last_valid(&dim).unwrap());
    }

    #[test]
    fn bollinger_brackets_price() {
        let c: Vec<f64> = (0..30).map(|i| 100.0 + (i as f64).sin()).collect();
        let (mid, up, lo) = bollinger_series(&c, 20, 2.0);
        let i = c.len() - 1;
        assert!(lo[i] <= mid[i] && mid[i] <= up[i]);
    }

    #[test]
    fn obv_tracks_direction() {
        let c = vec![
            candle(10.0, 10.0, 10.0, 10.0, 100.0),
            candle(10.0, 11.0, 10.0, 11.0, 50.0), // up → +50
            candle(11.0, 11.0, 9.0, 9.0, 30.0),   // down → -30
        ];
        let o = obv_series(&c);
        assert_eq!(o[1], 50.0);
        assert_eq!(o[2], 20.0);
    }

    #[test]
    fn cmf_bounded() {
        let c: Vec<Candle> = (0..25)
            .map(|i| candle(100.0, 101.0, 99.0, 100.5 + (i % 2) as f64 * 0.2, 1000.0))
            .collect();
        let m = cmf_series(&c, 20);
        let v = last_valid(&m).unwrap();
        assert!((-1.0..=1.0).contains(&v));
    }

    #[test]
    fn vwap_between_low_and_high() {
        let c = vec![
            candle(10.0, 12.0, 8.0, 11.0, 100.0),
            candle(11.0, 13.0, 9.0, 12.0, 200.0),
        ];
        let v = vwap(&c);
        assert!(v > 8.0 && v < 13.0);
    }

    #[test]
    fn stoch_rsi_in_range() {
        let c: Vec<f64> = (0..60)
            .map(|i| 100.0 + (i as f64 / 3.0).sin() * 4.0)
            .collect();
        let (k, _d) = stoch_rsi_series(&c, 14, 14, 3, 3);
        let v = last_valid(&k).unwrap();
        assert!((0.0..=100.0).contains(&v), "stochrsi {v}");
    }

    #[test]
    fn swing_levels_split_around_price() {
        let mut c = Vec::new();
        for i in 0..40 {
            let p = 100.0 + ((i as f64) * 0.3).sin() * 10.0;
            c.push(candle(p, p + 1.0, p - 1.0, p, 1000.0));
        }
        let (sup, res) = swing_levels(&c, 2, 2, 100.0, 3);
        assert!(sup.iter().all(|s| *s < 100.0));
        assert!(res.iter().all(|r| *r > 100.0));
    }
}
