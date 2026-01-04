use crate::clients::{twelve_data_client::TwelveDataClient, yahoo_client::YahooClient};
use crate::models::market_data::MarketData;
// DIKKAT: Client'larin dondugu struct'i da import etmemiz lazim
use crate::models::market_data::TickerInfo;
use firestore::*;
use futures::stream::StreamExt;
use serde::Serialize;
use std::collections::HashMap;
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{Duration, sleep};

const CACHE_DURATION_SECONDS: u64 = 15 * 60;

#[derive(Serialize, Clone, Debug)]
pub struct MarketPriceData {
    pub price: f64,
    #[serde(rename = "changePercent")]
    pub change_percent: f64,
}

impl From<TickerInfo> for MarketPriceData {
    fn from(info: TickerInfo) -> Self {
        Self {
            price: info.price,
            change_percent: info.change_percent,
        }
    }
}

pub async fn get_market_prices(
    db: &FirestoreDb,
    client: &TwelveDataClient,
    yahoo_client: &YahooClient,
    symbols: Vec<String>,
) -> HashMap<String, MarketPriceData> {
    let project_id = env::var("FIREBASE_PROJECT_ID").unwrap_or("metrixfolio".to_string());
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let collection_path = format!("projects/{}/databases/(default)/documents", project_id);

    println!("🔍 Checking Cache for {} symbols...", symbols.len());

    let cached_data_stream = db
        .fluent()
        .select()
        .from("market_data")
        .parent(&collection_path)
        .obj::<MarketData>()
        .stream_query()
        .await;

    let mut price_map: HashMap<String, MarketPriceData> = HashMap::new();
    let mut symbols_to_fetch: Vec<String> = Vec::new();

    let cached_list: Vec<MarketData> = match cached_data_stream {
        Ok(s) => s.collect().await,
        Err(_) => Vec::new(),
    };

    let mut cache_map: HashMap<String, MarketData> = HashMap::new();
    for md in cached_list {
        cache_map.insert(md.symbol.clone(), md);
    }

    for sym in &symbols {
        let clean_sym_for_cache = sym.replace("/USD", "");

        let needs_update = if let Some(md) = cache_map.get(&clean_sym_for_cache) {
            if now - md.last_updated > CACHE_DURATION_SECONDS {
                true
            } else {
                price_map.insert(
                    clean_sym_for_cache,
                    MarketPriceData {
                        price: md.price,
                        change_percent: md.change_percent,
                    },
                );
                false
            }
        } else {
            true
        };

        if needs_update {
            symbols_to_fetch.push(sym.clone());
        }
    }

    if !symbols_to_fetch.is_empty() {
        let mut fetched_data: HashMap<String, MarketPriceData> = HashMap::new();

        for chunk in symbols_to_fetch.chunks(8) {
            let query_string = chunk.join(",");
            println!(
                "🌍 Twelve Data Fetching chunk: {} (Waiting 2s...)",
                query_string
            );

            match client.fetch_prices(&query_string).await {
                Ok(new_prices) => {
                    for (sym, info) in new_prices {
                        let clean_sym = sym.replace("/USD", "");

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
                let clean_s = s.replace("/USD", "");
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

            let md = MarketData {
                symbol: sym.clone(),
                price: data.price,
                change_percent: data.change_percent,
                currency: "USD".to_string(),
                last_updated: now,
                source: "HYBRID".to_string(),
            };

            let _ = db
                .fluent()
                .update()
                .in_col("market_data")
                .document_id(&sym)
                .parent(&collection_path)
                .object(&md)
                .execute::<()>()
                .await
                .map_err(|e| eprintln!("❌ Cache Write Error {}: {}", sym, e));
        }
    } else {
        println!("✨ All prices served from Cache!");
    }

    price_map
}
