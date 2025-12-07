use std::{collections::HashMap, sync::Arc};
use tokio::time::{Duration, sleep};
use yahoo_finance_api::YahooConnector;

#[derive(Clone)]
pub struct YahooClient {
    provider: Arc<YahooConnector>,
}

impl YahooClient {
    pub fn new() -> Self {
        Self {
            provider: Arc::new(YahooConnector::new().expect("Failed to create YahooConnector")),
        }
    }

    pub async fn fetch_prices(&self, symbols: &[String]) -> HashMap<String, f64> {
        let mut results = HashMap::new();

        for symbol in symbols {
            println!("🌍 Yahoo Finance Request: {}", symbol);

            let search_symbol = match symbol.as_str() {
                s if s.contains("/") => s.replace("/", "-"),
                _ => symbol.clone(),
            };

            match self.provider.get_latest_quotes(&search_symbol, "1d").await {
                Ok(response) => {
                    let quote = response.last_quote();
                    if let Ok(q) = quote {
                        results.insert(symbol.clone(), q.close);
                        println!("✅ Yahoo Found: {} -> {}", symbol, q.close);
                    }
                }
                Err(e) => {
                    println!("❌ Yahoo Error for {}: {}", symbol, e);
                }
            }
            sleep(Duration::from_millis(500)).await;
        }
        results
    }
}
