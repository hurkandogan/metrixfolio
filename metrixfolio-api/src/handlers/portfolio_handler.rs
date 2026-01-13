use std::collections::HashMap;

use crate::models::currency::CurrencyRate;
use crate::models::portfolio_view::{CategoryAnalysis, PortfolioSummary};
use crate::models::settings_model::{PortfolioConfig};
use crate::services::{asset_service, market_data_service, transaction_service};
use crate::state::AppState;
use axum::debug_handler;
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Json},
};
use firebase_auth::FirebaseUser;

#[debug_handler]
pub async fn get_portfolio_summary(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let token = match auth_header {
        Some(t) => t,
        None => return (StatusCode::UNAUTHORIZED, "Missing Token").into_response(),
    };

    let user_id = match state.firebase_auth.verify::<FirebaseUser>(token) {
        Ok(u) => u.sub,
        Err(_) => return (StatusCode::UNAUTHORIZED, "Invalid Token").into_response(),
    };

    let db = &state.firestore_client.db;

    let config_path = format!("users/{}/configuration", user_id);
    let config: PortfolioConfig = db
        .fluent()
        .select()
        .by_id_in(&config_path)
        .obj()
        .one("main")
        .await
        .unwrap_or(None)
        .unwrap_or_default();

    let (assets_result, transactions_result) = tokio::join!(
        asset_service::get_all_assets(db, &user_id),
        transaction_service::get_transactions(db, &user_id)
    );
    let assets = assets_result.unwrap_or_default();
    let transactions = transactions_result;

    let currencies_stream = db
        .fluent()
        .select()
        .from("currencies")
        .obj::<CurrencyRate>() // Modelini kullan
        .query()
        .await;

    // Kur haritasini olustur: ("EUR", "USD") -> 1.08
    let mut rates_map: HashMap<(String, String), f64> = HashMap::new();
    if let Ok(list) = currencies_stream {
        for r in list {
            rates_map.insert((r.from, r.to), r.rate);
        }
    }

    // --- HESAPLAMA MOTORU ---
    let target_currency = config.base_currency.clone();
    let mut total_value = 0.0;
    let mut total_unrealized_pnl = 0.0;

    // Kategori bazli toplamlari tutmak icin
    let mut category_values: HashMap<String, f64> = HashMap::new();

    // Helper: Kur cevirici
    let convert_currency =
        |amount: f64, from: &str, to: &str, rates: &HashMap<(String, String), f64>| -> f64 {
            if from == to {
                return amount;
            }
            // Direkt kur var mi? (EUR -> USD)
            if let Some(rate) = rates.get(&(from.to_string(), to.to_string())) {
                return amount * rate;
            }
            // Ters kur var mi? (USD -> EUR)
            if let Some(rate) = rates.get(&(to.to_string(), from.to_string())) {
                if *rate != 0.0 {
                    return amount / rate;
                }
            }
            // Kur bulunamazsa 1.0 kabul et (Hata olmamasi icin, loglanabilir)
            eprintln!("⚠️ Missing rate: {} -> {}", from, to);
            amount
        };

    // --- 1. ADIM: Canli Fiyatlari Cek (IBKR Haric) ---
    let mut symbols_to_fetch = Vec::new();
    for asset in &assets {
        // IBKR verisi zaten mini-pc'den geliyor, onu elleme.
        // Kraken ve Manual olanlari canli cek.
        if asset.source != "IBKR" {
            // Kraken icin sembol duzeltmesi (BTC -> BTC/USD)
            let query_symbol = if asset.source == "KRAKEN"
                || ["BTC", "ETH", "XRP", "LTC", "DOGE"].contains(&asset.symbol.as_str())
            {
                format!("{}/USD", asset.symbol)
            } else {
                asset.symbol.clone()
            };
            symbols_to_fetch.push(query_symbol);
        }
    }

    // Servisi cagir (Cache yok, direkt API)
    let fetched_prices = market_data_service::get_market_prices(
        &state.twelve_data_client,
        &state.yahoo_client,
        symbols_to_fetch,
        false, // Bekleme yapma
    )
    .await;

    // --- 2. ADIM: Hesaplama ---
    for asset in &assets {
        // String -> f64 donusumleri (Hata durumunda 0.0)
        let amount = asset.amount.parse::<f64>().unwrap_or(0.0);

        // Fiyat Belirleme: IBKR ise DB'den, degilse Fetch edilen listeden
        let current_price = if asset.source == "IBKR" {
            asset.current_price.parse::<f64>().unwrap_or(0.0)
        } else {
            // Fetch edilen listede var mi? (Clean symbol ile bakiyoruz: BTC/USD -> BTC)
            fetched_prices
                .get(&asset.symbol)
                .map(|d| d.price)
                .unwrap_or_else(|| asset.current_price.parse::<f64>().unwrap_or(0.0))
        };

        let avg_cost = asset.avg_cost.parse::<f64>().unwrap_or(0.0);
        let multiplier = asset.multiplier.parse::<f64>().unwrap_or(1.0);
        let raw_unrealized_pnl = asset.unrealized_pnl.parse::<f64>().unwrap_or(0.0);

        // Varligin kendi para birimindeki degeri
        let raw_market_value = amount * current_price * multiplier;

        // Hedef para birimine cevir (Orn: EUR -> USD)
        let val_in_base = convert_currency(
            raw_market_value,
            &asset.currency,
            &target_currency,
            &rates_map,
        );
        
        let pnl_in_base = convert_currency(
            raw_unrealized_pnl,
            &asset.currency,
            &target_currency,
            &rates_map,
        );

        total_value += val_in_base;
        total_unrealized_pnl += pnl_in_base;

        // Kategori toplami
        *category_values
            .entry(asset.category_id.clone())
            .or_insert(0.0) += val_in_base;
    }

    // --- 3. ADIM: Gerçek Yatırılan Parayı Hesapla (Transaction-based) ---
    let net_invested_map = transaction_service::calculate_net_investment(&transactions);
    let mut total_invested_base = 0.0;
    for (curr, amt) in net_invested_map {
        total_invested_base += convert_currency(amt, &curr, &target_currency, &rates_map);
    }

    let total_pnl = total_value - total_invested_base;
    let pnl_percentage = if total_invested_base != 0.0 {
        (total_pnl / total_invested_base) * 100.0
    } else {
        0.0
    };

    // Kategorileri hazirla
    let mut category_analysis_list: Vec<CategoryAnalysis> = Vec::new();

    // Config'deki kategorileri dolas, degerleri eslestir
    for cat_conf in config.categories {
        let val = *category_values.get(&cat_conf.id).unwrap_or(&0.0);
        let actual_pct = if total_value != 0.0 {
            (val / total_value) * 100.0
        } else {
            0.0
        };

        category_analysis_list.push(CategoryAnalysis {
            id: cat_conf.id,
            name: cat_conf.name,
            value: val,
            actual_percentage: actual_pct,
            target_percentage: cat_conf.target_percentage,
        });
    }

    // Eger config disinda (Uncategorized) asset varsa onlari da ekleyebiliriz
    // Simdilik sadece config'dekileri donuyoruz.

    let summary = PortfolioSummary {
        total_value,
        total_cost: total_invested_base,
        total_pnl,
        pnl_percentage,
        unrealized_pnl: total_unrealized_pnl,
        realized_pnl: total_pnl - total_unrealized_pnl,
        base_currency: target_currency,
        categories: category_analysis_list,
    };

    (StatusCode::OK, Json(summary)).into_response()
}
