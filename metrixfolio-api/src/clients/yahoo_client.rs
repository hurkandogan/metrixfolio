use std::{collections::HashMap, sync::Arc};
use tokio::time::{Duration, sleep};
use yahoo_finance_api::YahooConnector;
use yahoo_finance_api::time::{OffsetDateTime, Duration as TimeDuration};

use crate::models::market_data::TickerInfo;
use crate::clients::twelve_data_client::CandleData;

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

    /// Son 5 günün verilerini çekip dünün kapanışı ve bugünün açılışını döndürür
    pub async fn fetch_historical(&self, symbol: &str) -> Result<CandleData, String> {
        println!("🕯️ Yahoo Historical Request: {}", symbol);

        let search_symbol = match symbol {
            s if s.contains("/") => s.replace("/", "-"),
            _ => symbol.to_string(),
        };

        // Son 5 günü çek (hafta sonu için buffer)
        let end = OffsetDateTime::now_utc();
        let start = end - TimeDuration::days(5);

        match self.provider.get_quote_history(&search_symbol, start, end).await {
            Ok(response) => {
                let quotes = response.quotes().map_err(|e| e.to_string())?;
                
                if quotes.len() < 2 {
                    return Err(format!("Not enough quotes for {}: got {}", symbol, quotes.len()));
                }

                // Son iki işlem günü
                let today = &quotes[quotes.len() - 1];
                let yesterday = &quotes[quotes.len() - 2];

                let candle = CandleData {
                    prev_close: yesterday.close,
                    current_open: today.open,
                };

                println!(
                    "✅ Yahoo Candles: {} -> prev_close: {:.2}, current_open: {:.2}",
                    symbol, candle.prev_close, candle.current_open
                );

                Ok(candle)
            }
            Err(e) => {
                Err(format!("Yahoo historical error for {}: {}", symbol, e))
            }
        }
    }
}
