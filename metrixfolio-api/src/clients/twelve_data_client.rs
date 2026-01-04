use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::time::Duration;

use crate::models::market_data::TickerInfo;

const BASE_URL: &str = "https://api.twelvedata.com";

#[derive(Clone)]
pub struct TwelveDataClient {
    http_client: Client,
    api_key: String,
}

impl TwelveDataClient {
    pub fn new(api_key: String) -> Self {
        Self {
            http_client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap(),
            api_key,
        }
    }

    pub async fn fetch_prices(&self, symbols: &str) -> Result<HashMap<String, TickerInfo>, String> {
        if symbols.is_empty() {
            return Ok(HashMap::new());
        }

        let url = format!(
            "{}/quote?symbol={}&apikey={}",
            BASE_URL, symbols, self.api_key
        );
        println!("🌍 Twelve Data Request: {}", symbols);

        let response = self
            .http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let resp_text = response.text().await.map_err(|e| e.to_string())?;

        let json_value: Value =
            serde_json::from_str(&resp_text).map_err(|e| format!("JSON Parse Error: {}", e))?;

        let mut results = HashMap::new();

        let parse_quote = |val: &Value| -> Option<TickerInfo> {
            let price = val
                .get("close")
                .or_else(|| val.get("price"))
                .and_then(|v| v.as_str())
                .and_then(|v| v.parse::<f64>().ok())?;

            let change_percent = val
                .get("percent_change")
                .and_then(|v| v.as_str())
                .and_then(|v| v.parse::<f64>().ok())
                .unwrap_or(0.0); // Bulamazsa 0.0 don

            Some(TickerInfo {
                price,
                change_percent,
            })
        };

        if let Some(info) = parse_quote(&json_value) {
            if !symbols.contains(',') {
                results.insert(symbols.to_string(), info);
            }
            return Ok(results);
        }

        if let Some(obj) = json_value.as_object() {
            for (sym, val) in obj {
                if let Some(info) = parse_quote(val) {
                    results.insert(sym.clone(), info);
                } else if let Some(code) = val.get("code") {
                    println!("⚠️ Twelve Data Warning for {}: Error Code {}", sym, code);
                }
            }
        }

        if results.is_empty() && resp_text.contains("\"code\":") {
            return Err(format!("API Error (Single): {}", resp_text));
        }

        Ok(results)
    }
}
