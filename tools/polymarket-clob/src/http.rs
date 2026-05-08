use crate::near::agent::host;

pub const CLOB_HOST: &str = "clob.polymarket.com";

pub fn request(
    method: &str,
    url: &str,
    body: Option<&[u8]>,
) -> Result<String, String> {
    host::log(host::LogLevel::Debug, &format!("polymarket-clob {} {}", method, url));

    let headers = if body.is_some() {
        r#"{"Content-Type":"application/json","Accept":"application/json"}"#
    } else {
        r#"{"Accept":"application/json"}"#
    };

    let resp = host::http_request(method, url, headers, body, None)?;
    let text =
        String::from_utf8(resp.body).map_err(|e| format!("Invalid UTF-8 in response: {}", e))?;

    if resp.status < 200 || resp.status >= 300 {
        return Err(format!("Polymarket CLOB HTTP {}: {}", resp.status, text));
    }

    Ok(text)
}

pub fn build_query(params: &[(&str, Option<&str>)]) -> String {
    let mut out = String::new();
    let mut first = true;
    for (k, v) in params {
        if let Some(val) = v {
            if val.is_empty() {
                continue;
            }
            if !first {
                out.push('&');
            }
            first = false;
            out.push_str(k);
            out.push('=');
            push_url_encoded(&mut out, val);
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
    fn build_query_basic() {
        let q = build_query(&[("a", Some("1")), ("b", Some("2"))]);
        assert_eq!(q, "a=1&b=2");
    }

    #[test]
    fn build_query_omits_none() {
        let q = build_query(&[("a", Some("1")), ("b", None)]);
        assert_eq!(q, "a=1");
    }

    #[test]
    fn build_query_url_encodes() {
        let q = build_query(&[("q", Some("hello world"))]);
        assert_eq!(q, "q=hello%20world");
    }
}
