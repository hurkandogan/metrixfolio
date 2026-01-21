use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::time::Duration;

use crate::models::market_data::TickerInfo;

/// İki mumlu veri yapısı: Dünün kapanışı ve bugünün açılışı
#[derive(Clone, Debug)]
pub struct CandleData {
    pub prev_close: f64,
    pub current_open: f64,
}

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

    /// Son 2 günün mum verilerini çeker: Dünün kapanışı ve bugünün açılışı
    pub async fn fetch_time_series(&self, symbol: &str) -> Result<CandleData, String> {
        // Time series endpoint: Son 2 mum (1day interval)
        let url = format!(
            "{}/time_series?symbol={}&interval=1day&outputsize=2&apikey={}",
            BASE_URL, symbol, self.api_key
        );
        println!("🕯️ Twelve Data Time Series Request: {}", symbol);

        let response = self
            .http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let resp_text = response.text().await.map_err(|e| e.to_string())?;
        let json_value: Value =
            serde_json::from_str(&resp_text).map_err(|e| format!("JSON Parse Error: {}", e))?;

        // values array'inden mumları çek
        let values = json_value
            .get("values")
            .and_then(|v| v.as_array())
            .ok_or_else(|| format!("No values array in response for {}", symbol))?;

        if values.len() < 2 {
            return Err(format!("Not enough candles for {}: got {}", symbol, values.len()));
        }

        // values[0] = bugün (en son), values[1] = dün
        let today = &values[0];
        let yesterday = &values[1];

        let current_open = today
            .get("open")
            .and_then(|v| v.as_str())
            .and_then(|v| v.parse::<f64>().ok())
            .ok_or_else(|| format!("Could not parse today's open for {}", symbol))?;

        let prev_close = yesterday
            .get("close")
            .and_then(|v| v.as_str())
            .and_then(|v| v.parse::<f64>().ok())
            .ok_or_else(|| format!("Could not parse yesterday's close for {}", symbol))?;

        println!(
            "✅ Twelve Data Candles: {} -> prev_close: {:.2}, current_open: {:.2}",
            symbol, prev_close, current_open
        );

        Ok(CandleData {
            prev_close,
            current_open,
        })
    }
}
