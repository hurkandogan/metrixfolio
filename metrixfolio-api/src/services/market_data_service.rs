use crate::clients::{twelve_data_client::TwelveDataClient, yahoo_client::YahooClient};
use crate::models::market_data::MarketData;
use firestore::*;
use futures::stream::StreamExt;
use std::collections::HashMap;
use std::env;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{Duration, sleep};

const CACHE_DURATION_SECONDS: u64 = 15 * 60;

pub async fn get_market_prices(
    db: &FirestoreDb,
    client: &TwelveDataClient,
    yahoo_client: &YahooClient, // Parametre olarak YahooClient ekledik
    symbols: Vec<String>,
) -> HashMap<String, f64> {
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

    let mut price_map: HashMap<String, f64> = HashMap::new();
    let mut symbols_to_fetch: Vec<String> = Vec::new();

    // --- 1. CACHE KONTROLÜ ---
    let cached_list: Vec<MarketData> = match cached_data_stream {
        Ok(s) => s.collect().await,
        Err(_) => Vec::new(),
    };

    let mut cache_map: HashMap<String, MarketData> = HashMap::new();
    for md in cached_list {
        cache_map.insert(md.symbol.clone(), md);
    }

    for sym in &symbols {
        // Kripto sembolü temizliği (Cache ID'si ile eşleşmesi için)
        let clean_sym_for_cache = sym.replace("/USD", "");

        let needs_update = if let Some(md) = cache_map.get(&clean_sym_for_cache) {
            if now - md.last_updated > CACHE_DURATION_SECONDS {
                true // Bayat
            } else {
                price_map.insert(clean_sym_for_cache, md.price);
                false // Taze
            }
        } else {
            true // Hiç yok
        };

        if needs_update {
            symbols_to_fetch.push(sym.clone());
        }
    }

    // --- 2. API ÇAĞRILARI (HIBIT MANTIK) ---
    if !symbols_to_fetch.is_empty() {
        // Bulunan fiyatları burada toplayacağız
        // Type annotation hatasını çözmek için açıkça tipi belirtiyoruz:
        let mut fetched_prices: HashMap<String, f64> = HashMap::new();

        // A) TWELVE DATA (Asıl Kaynak) - Chunking ile
        for chunk in symbols_to_fetch.chunks(2) {
            let query_string = chunk.join(",");
            println!(
                "🌍 Twelve Data Fetching chunk: {} (Waiting 2s...)",
                query_string
            );

            match client.fetch_prices(&query_string).await {
                Ok(new_prices) => {
                    for (sym, price) in new_prices {
                        // Kripto sembolünü temizle: "ETH/USD" -> "ETH"
                        let clean_sym = sym.replace("/USD", "");
                        fetched_prices.insert(clean_sym, price);
                    }
                }
                Err(e) => eprintln!("❌ Twelve Data API Error: {}", e),
            }

            sleep(Duration::from_secs(2)).await;
        }

        // B) EKSİKLERİ BUL (Twelve Data'da bulunamayanlar)
        // İstenenler listesindeki (temizlenmiş haliyle) hangileri fetched_prices'da yok?
        let missing_symbols: Vec<String> = symbols_to_fetch
            .iter()
            .filter(|s| {
                let clean_s = s.replace("/USD", "");
                !fetched_prices.contains_key(&clean_s)
            })
            .cloned() // Referansları kopyalayarak yeni Vector oluştur
            .collect();

        // C) YAHOO FINANCE (Yedek Güç)
        if !missing_symbols.is_empty() {
            println!(
                "⚠️ Twelve Data missed some symbols. Trying Yahoo for: {:?}",
                missing_symbols
            );

            // Yahoo Client'ı burada kullanıyoruz
            let yahoo_prices = yahoo_client.fetch_prices(&missing_symbols).await;

            // Yahoo'dan gelenleri de listeye ekle
            fetched_prices.extend(yahoo_prices);
        }

        // D) HEPSİNİ VERİTABANINA YAZ VE MAP'E EKLE
        for (sym, price) in fetched_prices {
            // price_map'e ekle (Handler'a dönecek)
            price_map.insert(sym.clone(), price);

            // DB'ye Yaz
            let md = MarketData {
                symbol: sym.clone(),
                price,
                currency: "USD".to_string(),
                last_updated: now,
                source: "HYBRID".to_string(), // Kaynağı genel yapalım
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
