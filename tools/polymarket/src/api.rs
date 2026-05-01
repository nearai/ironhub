use crate::http::{build_query, get, post, CLOB_HOST, DATA_HOST, GAMMA_HOST};

pub struct MarketsQuery<'a> {
    pub slug: Option<&'a [String]>,
    pub id: Option<&'a [u64]>,
    pub condition_ids: Option<&'a [String]>,
    pub clob_token_ids: Option<&'a [String]>,
    pub tag_id: Option<u64>,
    pub related_tags: Option<bool>,
    pub active: Option<bool>,
    pub closed: Option<bool>,
    pub order: Option<&'a str>,
    pub ascending: Option<bool>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub liquidity_num_min: Option<f64>,
    pub volume_num_min: Option<f64>,
    pub start_date_min: Option<&'a str>,
    pub end_date_max: Option<&'a str>,
}

pub fn list_markets(q: MarketsQuery) -> Result<String, String> {
    let slug_csv = q.slug.map(csv_strings);
    let id_csv = q.id.map(csv_u64);
    let cond_csv = q.condition_ids.map(csv_strings);
    let token_csv = q.clob_token_ids.map(csv_strings);
    let tag_id_str = q.tag_id.map(|n| n.to_string());
    let related_str = q.related_tags.map(bool_to_str);
    let active_str = q.active.map(bool_to_str);
    let closed_str = q.closed.map(bool_to_str);
    let asc_str = q.ascending.map(bool_to_str);
    let limit_str = q.limit.map(|n| n.to_string());
    let offset_str = q.offset.map(|n| n.to_string());
    let liq_str = q.liquidity_num_min.map(|n| n.to_string());
    let vol_str = q.volume_num_min.map(|n| n.to_string());

    let query = build_query(&[
        ("slug", slug_csv.as_deref()),
        ("id", id_csv.as_deref()),
        ("condition_ids", cond_csv.as_deref()),
        ("clob_token_ids", token_csv.as_deref()),
        ("tag_id", tag_id_str.as_deref()),
        ("related_tags", related_str.as_deref()),
        ("active", active_str.as_deref()),
        ("closed", closed_str.as_deref()),
        ("order", q.order),
        ("ascending", asc_str.as_deref()),
        ("limit", limit_str.as_deref()),
        ("offset", offset_str.as_deref()),
        ("liquidity_num_min", liq_str.as_deref()),
        ("volume_num_min", vol_str.as_deref()),
        ("start_date_min", q.start_date_min),
        ("end_date_max", q.end_date_max),
    ]);

    get(GAMMA_HOST, "/markets", Some(&query))
}

pub fn get_market_by_id(market_id: &str) -> Result<String, String> {
    get(GAMMA_HOST, &format!("/markets/{}", market_id), None)
}

pub fn get_market_by_slug(slug: &str) -> Result<String, String> {
    let query = build_query(&[("slug", Some(slug))]);
    get(GAMMA_HOST, "/markets", Some(&query))
}

pub fn get_clob_market_info(condition_id: &str) -> Result<String, String> {
    get(CLOB_HOST, &format!("/markets/{}", condition_id), None)
}

pub struct EventsQuery<'a> {
    pub slug: Option<&'a [String]>,
    pub id: Option<&'a [u64]>,
    pub tag_id: Option<u64>,
    pub related_tags: Option<bool>,
    pub active: Option<bool>,
    pub closed: Option<bool>,
    pub order: Option<&'a str>,
    pub ascending: Option<bool>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

pub fn list_events(q: EventsQuery) -> Result<String, String> {
    let slug_csv = q.slug.map(csv_strings);
    let id_csv = q.id.map(csv_u64);
    let tag_id_str = q.tag_id.map(|n| n.to_string());
    let related_str = q.related_tags.map(bool_to_str);
    let active_str = q.active.map(bool_to_str);
    let closed_str = q.closed.map(bool_to_str);
    let asc_str = q.ascending.map(bool_to_str);
    let limit_str = q.limit.map(|n| n.to_string());
    let offset_str = q.offset.map(|n| n.to_string());

    let query = build_query(&[
        ("slug", slug_csv.as_deref()),
        ("id", id_csv.as_deref()),
        ("tag_id", tag_id_str.as_deref()),
        ("related_tags", related_str.as_deref()),
        ("active", active_str.as_deref()),
        ("closed", closed_str.as_deref()),
        ("order", q.order),
        ("ascending", asc_str.as_deref()),
        ("limit", limit_str.as_deref()),
        ("offset", offset_str.as_deref()),
    ]);

    get(GAMMA_HOST, "/events", Some(&query))
}

pub fn get_event_by_id(event_id: u64) -> Result<String, String> {
    get(GAMMA_HOST, &format!("/events/{}", event_id), None)
}

pub fn get_event_by_slug(slug: &str) -> Result<String, String> {
    let query = build_query(&[("slug", Some(slug))]);
    get(GAMMA_HOST, "/events", Some(&query))
}

pub fn list_tags(limit: Option<u32>, offset: Option<u32>) -> Result<String, String> {
    let limit_str = limit.map(|n| n.to_string());
    let offset_str = offset.map(|n| n.to_string());
    let query = build_query(&[
        ("limit", limit_str.as_deref()),
        ("offset", offset_str.as_deref()),
    ]);
    get(GAMMA_HOST, "/tags", Some(&query))
}

pub fn get_tag_by_id(tag_id: u64) -> Result<String, String> {
    get(GAMMA_HOST, &format!("/tags/{}", tag_id), None)
}

pub fn get_tag_by_slug(slug: &str) -> Result<String, String> {
    get(GAMMA_HOST, &format!("/tags/slug/{}", slug), None)
}

pub fn get_related_tags_by_tag_id(tag_id: u64) -> Result<String, String> {
    get(GAMMA_HOST, &format!("/tags/{}/related-tags", tag_id), None)
}

pub fn get_related_tags_by_tag_slug(slug: &str) -> Result<String, String> {
    get(
        GAMMA_HOST,
        &format!("/tags/slug/{}/related-tags", slug),
        None,
    )
}

pub fn get_sports_metadata() -> Result<String, String> {
    get(GAMMA_HOST, "/sports", None)
}

pub fn list_teams() -> Result<String, String> {
    get(GAMMA_HOST, "/teams", None)
}

pub fn search(q: &str, limit: Option<u32>) -> Result<String, String> {
    let limit_str = limit.map(|n| n.to_string());
    let query = build_query(&[("q", Some(q)), ("limit", limit_str.as_deref())]);
    get(GAMMA_HOST, "/public-search", Some(&query))
}

pub fn get_orderbook(token_id: &str) -> Result<String, String> {
    let query = build_query(&[("token_id", Some(token_id))]);
    get(CLOB_HOST, "/book", Some(&query))
}

pub fn get_orderbooks(token_ids: &[String]) -> Result<String, String> {
    let body = serde_json::Value::Array(
        token_ids
            .iter()
            .map(|t| serde_json::json!({"token_id": t}))
            .collect(),
    );
    post(CLOB_HOST, "/books", body)
}

pub fn get_market_price(token_id: &str, side: &str) -> Result<String, String> {
    let query = build_query(&[("token_id", Some(token_id)), ("side", Some(side))]);
    get(CLOB_HOST, "/price", Some(&query))
}

pub fn get_midpoint_price(token_id: &str) -> Result<String, String> {
    let query = build_query(&[("token_id", Some(token_id))]);
    get(CLOB_HOST, "/midpoint", Some(&query))
}

pub fn get_midpoint_prices(token_ids: &[String]) -> Result<String, String> {
    let body = serde_json::Value::Array(
        token_ids
            .iter()
            .map(|t| serde_json::json!({"token_id": t}))
            .collect(),
    );
    post(CLOB_HOST, "/midpoints", body)
}

pub fn get_last_trade_price(token_id: &str) -> Result<String, String> {
    let query = build_query(&[("token_id", Some(token_id))]);
    get(CLOB_HOST, "/last-trade-price", Some(&query))
}

pub fn get_last_trade_prices(token_ids: &[String]) -> Result<String, String> {
    let body = serde_json::Value::Array(
        token_ids
            .iter()
            .map(|t| serde_json::json!({"token_id": t}))
            .collect(),
    );
    post(CLOB_HOST, "/last-trades-prices", body)
}

pub fn get_spread(token_id: &str) -> Result<String, String> {
    let query = build_query(&[("token_id", Some(token_id))]);
    get(CLOB_HOST, "/spread", Some(&query))
}

pub fn get_spreads(token_ids: &[String]) -> Result<String, String> {
    let body = serde_json::Value::Array(
        token_ids
            .iter()
            .map(|t| serde_json::json!({"token_id": t}))
            .collect(),
    );
    post(CLOB_HOST, "/spreads", body)
}

pub fn get_tick_size(token_id: &str) -> Result<String, String> {
    let query = build_query(&[("token_id", Some(token_id))]);
    get(CLOB_HOST, "/tick-size", Some(&query))
}

pub fn get_fee_rate(token_id: &str) -> Result<String, String> {
    let query = build_query(&[("token_id", Some(token_id))]);
    get(CLOB_HOST, "/fee-rate", Some(&query))
}

pub fn get_server_time() -> Result<String, String> {
    get(CLOB_HOST, "/time", None)
}

pub fn get_prices_history(
    market: &str,
    start_ts: Option<u64>,
    end_ts: Option<u64>,
    fidelity: Option<u32>,
    interval: Option<&str>,
) -> Result<String, String> {
    let start_str = start_ts.map(|n| n.to_string());
    let end_str = end_ts.map(|n| n.to_string());
    let fid_str = fidelity.map(|n| n.to_string());
    let query = build_query(&[
        ("market", Some(market)),
        ("startTs", start_str.as_deref()),
        ("endTs", end_str.as_deref()),
        ("fidelity", fid_str.as_deref()),
        ("interval", interval),
    ]);
    get(CLOB_HOST, "/prices-history", Some(&query))
}

pub fn get_batch_prices_history(
    markets: &[String],
    start_ts: Option<u64>,
    end_ts: Option<u64>,
    fidelity: Option<u32>,
    interval: Option<&str>,
) -> Result<String, String> {
    let mut body = serde_json::Map::new();
    body.insert("markets".into(), serde_json::json!(markets));
    if let Some(ts) = start_ts {
        body.insert("startTs".into(), serde_json::json!(ts));
    }
    if let Some(ts) = end_ts {
        body.insert("endTs".into(), serde_json::json!(ts));
    }
    if let Some(f) = fidelity {
        body.insert("fidelity".into(), serde_json::json!(f));
    }
    if let Some(i) = interval {
        body.insert("interval".into(), serde_json::json!(i));
    }
    post(
        CLOB_HOST,
        "/batch-prices-history",
        serde_json::Value::Object(body),
    )
}

pub struct PositionsQuery<'a> {
    pub user: &'a str,
    pub market: Option<&'a [String]>,
    pub event_id: Option<&'a [u64]>,
    pub size_threshold: Option<f64>,
    pub redeemable: Option<bool>,
    pub mergeable: Option<bool>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub sort_by: Option<&'a str>,
    pub sort_direction: Option<&'a str>,
}

pub fn get_current_positions(q: PositionsQuery) -> Result<String, String> {
    let market_csv = q.market.map(csv_strings);
    let event_csv = q.event_id.map(csv_u64);
    let size_str = q.size_threshold.map(|n| n.to_string());
    let red_str = q.redeemable.map(bool_to_str);
    let merge_str = q.mergeable.map(bool_to_str);
    let limit_str = q.limit.map(|n| n.to_string());
    let offset_str = q.offset.map(|n| n.to_string());

    let query = build_query(&[
        ("user", Some(q.user)),
        ("market", market_csv.as_deref()),
        ("eventId", event_csv.as_deref()),
        ("sizeThreshold", size_str.as_deref()),
        ("redeemable", red_str.as_deref()),
        ("mergeable", merge_str.as_deref()),
        ("limit", limit_str.as_deref()),
        ("offset", offset_str.as_deref()),
        ("sortBy", q.sort_by),
        ("sortDirection", q.sort_direction),
    ]);

    get(DATA_HOST, "/positions", Some(&query))
}

pub fn get_closed_positions(
    user: &str,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<String, String> {
    let limit_str = limit.map(|n| n.to_string());
    let offset_str = offset.map(|n| n.to_string());
    let query = build_query(&[
        ("user", Some(user)),
        ("limit", limit_str.as_deref()),
        ("offset", offset_str.as_deref()),
    ]);
    get(DATA_HOST, "/closed-positions", Some(&query))
}

pub fn get_user_activity(
    user: &str,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<String, String> {
    let limit_str = limit.map(|n| n.to_string());
    let offset_str = offset.map(|n| n.to_string());
    let query = build_query(&[
        ("user", Some(user)),
        ("limit", limit_str.as_deref()),
        ("offset", offset_str.as_deref()),
    ]);
    get(DATA_HOST, "/activity", Some(&query))
}

pub fn get_trades(
    user: Option<&str>,
    market: Option<&str>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<String, String> {
    let limit_str = limit.map(|n| n.to_string());
    let offset_str = offset.map(|n| n.to_string());
    let query = build_query(&[
        ("user", user),
        ("market", market),
        ("limit", limit_str.as_deref()),
        ("offset", offset_str.as_deref()),
    ]);
    get(DATA_HOST, "/trades", Some(&query))
}

pub fn get_trader_leaderboard(period: Option<&str>, limit: Option<u32>) -> Result<String, String> {
    let limit_str = limit.map(|n| n.to_string());
    let query = build_query(&[("period", period), ("limit", limit_str.as_deref())]);
    get(DATA_HOST, "/leaderboard", Some(&query))
}

pub fn get_public_profile(address: &str) -> Result<String, String> {
    get(DATA_HOST, &format!("/profile/{}", address), None)
}

pub fn list_comments(
    parent_entity_type: Option<&str>,
    parent_entity_id: Option<&str>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<String, String> {
    let limit_str = limit.map(|n| n.to_string());
    let offset_str = offset.map(|n| n.to_string());
    let query = build_query(&[
        ("parent_entity_type", parent_entity_type),
        ("parent_entity_id", parent_entity_id),
        ("limit", limit_str.as_deref()),
        ("offset", offset_str.as_deref()),
    ]);
    get(GAMMA_HOST, "/comments", Some(&query))
}

fn csv_strings(arr: &[String]) -> String {
    arr.join(",")
}

fn csv_u64(arr: &[u64]) -> String {
    let mut out = String::new();
    let mut first = true;
    for n in arr {
        if !first {
            out.push(',');
        }
        first = false;
        let _ = std::fmt::Write::write_fmt(&mut out, format_args!("{}", n));
    }
    out
}

fn bool_to_str(b: bool) -> String {
    if b {
        "true".to_string()
    } else {
        "false".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn csv_strings_joins() {
        let arr = vec!["a".to_string(), "b".to_string(), "c".to_string()];
        assert_eq!(csv_strings(&arr), "a,b,c");
    }

    #[test]
    fn csv_strings_single() {
        let arr = vec!["only".to_string()];
        assert_eq!(csv_strings(&arr), "only");
    }

    #[test]
    fn csv_strings_empty() {
        let arr: Vec<String> = vec![];
        assert_eq!(csv_strings(&arr), "");
    }

    #[test]
    fn csv_u64_joins() {
        assert_eq!(csv_u64(&[1, 2, 3]), "1,2,3");
    }

    #[test]
    fn csv_u64_single() {
        assert_eq!(csv_u64(&[42]), "42");
    }

    #[test]
    fn bool_to_str_true() {
        assert_eq!(bool_to_str(true), "true");
    }

    #[test]
    fn bool_to_str_false() {
        assert_eq!(bool_to_str(false), "false");
    }
}
