use std::{collections::HashMap, sync::Arc};
use tokio::time::{Duration, sleep};
use yahoo_finance_api::YahooConnector;

use crate::models::market_data::TickerInfo;

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

    pub async fn fetch_prices(&self, symbols: &[String]) -> HashMap<String, TickerInfo> {
        let mut results = HashMap::new();

        for symbol in symbols {
            println!("🌍 Yahoo Finance Request: {}", symbol);

            let search_symbol = match symbol.as_str() {
                s if s.contains("/") => s.replace("/", "-"),
                _ => symbol.clone(),
            };

            match self.provider.get_latest_quotes(&search_symbol, "1d").await {
                Ok(response) => {
                    if let Ok(quote) = response.last_quote() {
                        let change_percent = if quote.open > 0.0 {
                            ((quote.close - quote.open) / quote.open) * 100.0
                        } else {
                            0.0
                        };

                        results.insert(
                            symbol.clone(),
                            TickerInfo {
                                price: quote.close,
                                change_percent,
                            },
                        );

                        println!(
                            "✅ Yahoo Found: {} -> {}$ ({:.2}%)",
                            symbol, quote.close, change_percent
                        );
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
