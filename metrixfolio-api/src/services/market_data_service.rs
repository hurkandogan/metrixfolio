use crate::clients::{twelve_data_client::TwelveDataClient, yahoo_client::YahooClient};
// DIKKAT: Client'larin dondugu struct'i da import etmemiz lazim
use crate::models::market_data::TickerInfo;
use serde::Serialize;
use std::collections::HashMap;
use tokio::time::{Duration, sleep};

#[derive(Serialize, Clone, Debug)]
pub struct MarketPriceData {
    pub price: f64,
    pub open_price: f64,
    pub prev_close: f64,
    #[serde(rename = "changePercent")]
    pub change_percent: f64,
    pub is_up: bool,
}

impl From<TickerInfo> for MarketPriceData {
    fn from(info: TickerInfo) -> Self {
        let prev_close = if info.change_percent != 0.0 {
            info.price / (1.0 + (info.change_percent / 100.0))
        } else {
            info.price
        };

        Self {
            price: info.price,
            open_price: info.price,
            prev_close,
            change_percent: info.change_percent,
            is_up: info.change_percent >= 0.0,
        }
    }
}

pub async fn get_market_prices(
    client: &TwelveDataClient,
    yahoo_client: &YahooClient,
    symbols: Vec<String>,
    wait_for_open: bool, // Yeni parametre
) -> HashMap<String, MarketPriceData> {
    // Rust Notu: 'symbols' vektörünü temizlemek için yardımcı bir closure (isimsiz fonksiyon)
    let clean_symbol = |s: &str| s.replace("/USD", "").replace("S&P500", "SPX");

    let mut price_map: HashMap<String, MarketPriceData> = HashMap::new();
    let mut symbols_to_fetch: Vec<String> = Vec::new();

    // Cache kontrolü yok, hepsini fetch listesine ekle
    symbols_to_fetch = symbols.clone();

    if !symbols_to_fetch.is_empty() {
        let mut fetched_data: HashMap<String, MarketPriceData> = HashMap::new();

        // Sadece Broadcaster (Node.js) istediğinde bekleme yap
        // Bu sayede normal kullanıcılar portföylerine bakarken 10sn beklemez.
        if wait_for_open {
            println!("⏳ Waiting 30s for market opening noise to settle...");
            sleep(Duration::from_secs(30)).await;
        }

        for chunk in symbols_to_fetch.chunks(8) {
            let query_string = chunk.join(",");
            println!(
                "🌍 Twelve Data Fetching chunk: {} (Waiting 2s...)",
                query_string
            );

            match client.fetch_prices(&query_string).await {
                Ok(new_prices) => {
                    for (sym, info) in new_prices {
                        let clean_sym = clean_symbol(&sym);

                        fetched_data.insert(clean_sym, MarketPriceData::from(info));
                    }
                }
                Err(e) => eprintln!("❌ Twelve Data API Error: {}", e),
            }

            sleep(Duration::from_secs(2)).await;
        }

        let missing_symbols: Vec<String> = symbols_to_fetch
            .iter()
            .filter(|s| {
                let clean_s = clean_symbol(s);
                !fetched_data.contains_key(&clean_s)
            })
            .cloned()
            .collect();

        if !missing_symbols.is_empty() {
            println!(
                "⚠️ Twelve Data missed some symbols. Trying Yahoo for: {:?}",
                missing_symbols
            );

            let yahoo_prices = yahoo_client.fetch_prices(&missing_symbols).await;

            for (sym, info) in yahoo_prices {
                fetched_data.insert(sym, MarketPriceData::from(info));
            }
        }

        for (sym, data) in fetched_data {
            price_map.insert(sym.clone(), data.clone());
        }
    } else {
        println!("✨ All prices served from Cache!");
    }

    price_map
}
