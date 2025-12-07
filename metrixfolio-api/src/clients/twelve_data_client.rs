use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::time::Duration;

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

    pub async fn fetch_prices(&self, symbols: &str) -> Result<HashMap<String, f64>, String> {
        if symbols.is_empty() {
            return Ok(HashMap::new());
        }

        let url = format!(
            "{}/price?symbol={}&apikey={}",
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

        let mut prices = HashMap::new();

        if let Some(price_str) = json_value.get("price").and_then(|v| v.as_str()) {
            if let Ok(price) = price_str.parse::<f64>() {
                prices.insert(symbols.to_string(), price);
            }
            return Ok(prices);
        }

        if let Some(obj) = json_value.as_object() {
            for (sym, val) in obj {
                if let Some(price_str) = val.get("price").and_then(|v| v.as_str()) {
                    if let Ok(price) = price_str.parse::<f64>() {
                        prices.insert(sym.clone(), price);
                    }
                } else if let Some(code) = val.get("code") {
                    println!("⚠️ Twelve Data Warning for {}: Error Code {}", sym, code);
                }
            }
        }

        if prices.is_empty() && resp_text.contains("\"code\":") && !symbols.contains(',') {
            return Err(format!("API Error (Single): {}", resp_text));
        }

        Ok(prices)
    }
}
