use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;
use std::time::Duration;

const BASE_URL: &str = "https://api.twelvedata.com";

#[derive(Clone)]
pub struct TwelveDataClient {
    http_client: Client,
    api_key: String,
}

#[derive(Debug, Deserialize)]
pub struct PriceResponse {
    pub price: String,
}

#[derive(Debug, Deserialize)]
pub struct ErrorResponse {
    pub code: u16,
    pub message: String,
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

        if resp_text.contains(r#""code":"#) && resp_text.contains(r#""message":"#) {
            return Err(format!("API Error: {}", resp_text).into());
        }

        let mut prices = HashMap::new();

        if symbols.contains(',') {
            let batch_data: HashMap<String, PriceResponse> = serde_json::from_str(&resp_text)
                .map_err(|e| format!("JSON Parse Error (Batch): {} | Text: {}", e, resp_text))?;

            for (sym, data) in batch_data {
                let price = data.price.parse::<f64>().unwrap_or(0.0);
                prices.insert(sym, price);
            }
        } else {
            let single_data: PriceResponse = serde_json::from_str(&resp_text)
                .map_err(|e| format!("JSON Parse Error (Single): {} | Text: {}", e, resp_text))?;

            let price = single_data.price.parse::<f64>().unwrap_or(0.0);
            prices.insert(symbols.to_string(), price);
        }

        Ok(prices)
    }
}
