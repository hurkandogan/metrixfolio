use crate::clients::KrakenClient;
use crate::clients::kraken_client::KRAKEN_BALANCE_ENDPOINT;
use crate::models::{CategoryData, ConsolidatedAsset, Currency, FinalPortfolioResponse};
use crate::state::AppState;
use axum::{
    Extension,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use axum_firebase_middleware::FirebaseClaims;
use serde_json::Value;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
struct ProcessedAsset {
    id: String,
    symbol: String,
    name: String,
    amount: f64,
    category_id: String,
    source: String,
    price_native: f64,
    currency_native: String,
}

pub async fn get_full_portfolio_handler(
    State(state): State<AppState>,
    Extension(user): Extension<FirebaseClaims>,
) -> impl IntoResponse {
    let user_id = user.user_id;
    println!("'Metrixfolio handler is called: {}", user_id);

    let (settings_result, kraken_balance_result, sheets_data_result) = tokio::join!(
        state.firestore_client.get_settings(&user_id),
        get_kraken_balance(state.kraken_client.clone(), &user_id),
        state.google_sheets_client.fetch_stock_data()
    );

    let settings = match settings_result {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Settings couldn't fetched: {}", e),
            )
                .into_response();
        }
    };

    let sheets_data = match sheets_data_result {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Stock prices couldn't fetched: {}", e),
            )
                .into_response();
        }
    };

    let kraken_balance = match kraken_balance_result {
        Ok(b) => b,
        Err(e) => {
            eprintln!("Kraken balance couldn't fetched (But continuing): {}", e);
            Value::Null
        }
    };

    let mut price_map: HashMap<String, HashMap<String, Value>> = HashMap::new();
    for stock in sheets_data {
        if let Some(symbol) = stock.get("SYMBOL").and_then(|s| s.as_str()) {
            price_map.insert(symbol.to_string(), stock);
        }
    }

    let get_rate = |pair: &str| -> f64 {
        price_map
            .get(pair)
            .and_then(|data| data.get("PRICE"))
            .and_then(|price_val| price_val.as_str())
            .and_then(|price_str| price_str.replace(",", ".").parse::<f64>().ok())
            .unwrap_or(0.0)
    };

    let mut reference_rates: HashMap<String, f64> = HashMap::new();
    let eur_usd_rate = get_rate("CURRENCY:EURUSD");
    let hkd_usd_rate = get_rate("CURRENCY:HKDUSD");
    let try_usd_rate = get_rate("CURRENCY:TRYUSD");

    reference_rates.insert("EURUSD".to_string(), eur_usd_rate);
    reference_rates.insert("HKDUSD".to_string(), hkd_usd_rate);
    reference_rates.insert("TRYUSD".to_string(), try_usd_rate);

    let mut all_assets: Vec<ProcessedAsset> = Vec::new();

    for asset in settings.manual_assets {
        if let Some(price_data) = price_map.get(&asset.ticker) {
            let price_str = price_data
                .get("PRICE")
                .and_then(|v| v.as_str())
                .unwrap_or("0.0");
            let currency = price_data
                .get("CURRENCY")
                .and_then(|v| v.as_str())
                .unwrap_or("USD"); // TODO: find a better default
            let name = price_data
                .get("NAME")
                .and_then(|v| v.as_str())
                .unwrap_or(&asset.ticker);

            all_assets.push(ProcessedAsset {
                id: asset.id.clone(),
                symbol: asset.ticker.clone(),
                name: name.to_string(),
                amount: asset.amount,
                category_id: asset.category_id.clone(),
                source: "Manual".to_string(),
                price_native: price_str.replace(",", ".").parse().unwrap_or(0.0),
                currency_native: currency.to_string(),
            });
        }
    }

    let kraken_balance_map = kraken_balance.as_object();

    if let Some(kraken_map) = kraken_balance_map {
        for (kraken_ticker, amount_val) in kraken_map {
            let amount = amount_val.as_str().unwrap_or("0.0").parse().unwrap_or(0.0);
            if amount == 0.0 {
                continue;
            }
            //TODO: This matching should be done through google sheet or get prices directly in USD from Kraken
            let (ticker_base, name_prefix) = match kraken_ticker.as_str() {
                "ETH.F" => ("ETH", "ETH Futures"),
                "XETH" => ("ETH", "Ethereum"),
                "XXRP" => ("XRP", "Ripple"),
                _ => (kraken_ticker.as_str(), kraken_ticker.as_str()),
            };

            let category_id = settings
                .categories
                .iter()
                .find(|c| c.name.to_lowercase() == "crypto") // "Crypto" kategorisini bul
                .map_or("uncategorized".to_string(), |c| c.id.clone()); // Bulamazsan "kategorisiz"

            let price_pair_name = format!("CURRENCY:{}USD", ticker_base);

            let (price_native, currency_native) =
                if let Some(price_data) = price_map.get(&price_pair_name) {
                    let price_str = price_data
                        .get("PRICE")
                        .and_then(|v| v.as_str())
                        .unwrap_or("0.0");
                    let currency = price_data
                        .get("CURRENCY")
                        .and_then(|v| v.as_str())
                        .unwrap_or("USD");
                    (
                        price_str.replace(",", ".").parse().unwrap_or(0.0),
                        currency.to_string(),
                    )
                } else {
                    (0.0, "USD".to_string()) // Fiyat bulunamazsa
                };

            all_assets.push(ProcessedAsset {
                id: kraken_ticker.clone(),
                symbol: kraken_ticker.clone(),
                name: name_prefix.to_string(),
                amount: amount,
                category_id: category_id,
                source: "Kraken".to_string(),
                price_native,
                currency_native,
            });
        }
    }

    let mut total_portfolio: f64 = 0.0;
    let mut final_categories: HashMap<String, CategoryData> = HashMap::new();

    for cat in settings.categories {
        final_categories.insert(
            cat.id.clone(),
            CategoryData {
                name: cat.name.clone(),
                value: 0.0,
                target_percentage: cat.target_percentage,
                actual_percentage: 0.0, // Henüz hesaplanmadı
                assets: Vec::new(),
            },
        );
    }
    //TODO: more currencies will be added
    for asset in all_assets {
        let value_usd = match asset.currency_native.as_str() {
            "USD" => asset.amount * asset.price_native,
            "EUR" => asset.amount * asset.price_native * eur_usd_rate,
            "HKD" => asset.amount * asset.price_native * hkd_usd_rate,
            "TRY" => asset.amount * asset.price_native * try_usd_rate,
            _ => asset.amount * asset.price_native,
        };

        total_portfolio += value_usd;

        let final_asset = ConsolidatedAsset {
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            amount: asset.amount,
            value: value_usd,
            source: asset.source,
            native_currency: asset.currency_native,
            category_id: asset.category_id.clone(),
        };

        if let Some(category_data) = final_categories.get_mut(&asset.category_id) {
            category_data.value += value_usd;
            category_data.assets.push(final_asset);
        } else {
            //TODO: uncategorized assets should be taken care of
        }
    }

    if total_portfolio > 0.0 {
        for category_data in final_categories.values_mut() {
            category_data.actual_percentage = (category_data.value / total_portfolio) * 100.0;
        }
    }

    let final_response = FinalPortfolioResponse {
        total_value: total_portfolio,
        reference_rates,
        categories: final_categories,
    };

    (StatusCode::OK, Json(final_response)).into_response()
}

async fn get_kraken_balance(client: KrakenClient, user_id: &str) -> Result<Value, String> {
    if user_id != "xZy4l4CANfYxpLRfkCxhvfVOURh2" {
        //TODO temporary hack!
        println!("Unauthorized user for Kraken data");
        return Ok(serde_json::json!({}));
    }

    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
        .to_string();
    let mut balance_params = HashMap::new();
    balance_params.insert("nonce".to_string(), nonce);

    client
        .private_request(KRAKEN_BALANCE_ENDPOINT, balance_params)
        .await
}
