use crate::near::agent::host;

pub const GAMMA_HOST: &str = "gamma-api.polymarket.com";
pub const CLOB_HOST: &str = "clob.polymarket.com";
pub const DATA_HOST: &str = "data-api.polymarket.com";

pub fn get(host: &str, path: &str, query: Option<&str>) -> Result<String, String> {
    let url = match query {
        Some(q) if !q.is_empty() => format!("https://{}{}?{}", host, path, q),
        _ => format!("https://{}{}", host, path),
    };

    host::log(host::LogLevel::Debug, &format!("polymarket GET {}", url));

    let resp = host::http_request("GET", &url, r#"{"Accept": "application/json"}"#, None, None)?;

    finalize(resp)
}

pub fn post(host: &str, path: &str, body: serde_json::Value) -> Result<String, String> {
    let url = format!("https://{}{}", host, path);
    let body_str = serde_json::to_string(&body).map_err(|e| e.to_string())?;

    host::log(
        host::LogLevel::Debug,
        &format!("polymarket POST {} ({} bytes)", url, body_str.len()),
    );

    let resp = host::http_request(
        "POST",
        &url,
        r#"{"Content-Type": "application/json", "Accept": "application/json"}"#,
        Some(body_str.as_bytes()),
        None,
    )?;

    finalize(resp)
}

fn finalize(resp: host::HttpResponse) -> Result<String, String> {
    let text =
        String::from_utf8(resp.body).map_err(|e| format!("Invalid UTF-8 in response: {}", e))?;

    if resp.status < 200 || resp.status >= 300 {
        return Err(format!("Polymarket HTTP {}: {}", resp.status, text));
    }

    Ok(text)
}

pub fn build_query(params: &[(&str, Option<&str>)]) -> String {
    let mut out = String::new();
    let mut first = true;
    for (k, v) in params {
        if let Some(val) = v {
            if !val.is_empty() {
                if !first {
                    out.push('&');
                }
                first = false;
                out.push_str(k);
                out.push('=');
                push_url_encoded(&mut out, val);
            }
        }
    }
    out
}

fn push_url_encoded(out: &mut String, s: &str) {
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            _ => {
                let _ = std::fmt::Write::write_fmt(out, format_args!("%{:02X}", byte));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_query_omits_none() {
        let q = build_query(&[("a", Some("1")), ("b", None), ("c", Some("3"))]);
        assert_eq!(q, "a=1&c=3");
    }

    #[test]
    fn build_query_omits_empty() {
        let q = build_query(&[("a", Some("1")), ("b", Some("")), ("c", Some("3"))]);
        assert_eq!(q, "a=1&c=3");
    }

    #[test]
    fn build_query_url_encodes() {
        let q = build_query(&[("q", Some("hello world"))]);
        assert_eq!(q, "q=hello%20world");
    }

    #[test]
    fn build_query_url_encodes_special() {
        let q = build_query(&[("slug", Some("us-election-2024"))]);
        assert_eq!(q, "slug=us-election-2024");
    }

    #[test]
    fn build_query_empty_when_all_none() {
        let q = build_query(&[("a", None), ("b", None)]);
        assert_eq!(q, "");
    }
}
