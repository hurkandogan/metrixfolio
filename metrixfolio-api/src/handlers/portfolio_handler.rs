use crate::models::settings_model::PortfolioConfig;
use crate::services::{
    asset_service, calculation_service, market_data_service, transaction_service,
};
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
    //TODO: Better handling for fiat currencies and ETFs
    let fiat_currencies = vec!["USD", "EUR", "TRY", "GBP", "CHF", "CAD", "AUD", "JPY"];

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

    let (assets, transactions) = tokio::join!(
        asset_service::get_all_assets(db, &user_id),
        transaction_service::get_transactions(db, &user_id)
    );

    let assets = assets.unwrap_or_default();

    let mut symbols_to_fetch = Vec::new();
    for asset in &assets {
        if asset.source == "MANUAL" || asset.category_id == "Cash" {
            continue;
        }

        // Option filter
        if asset.symbol.contains(" ") || asset.symbol.contains("_") {
            continue;
        }

        // Fiat filter
        if fiat_currencies.contains(&asset.symbol.as_str()) {
            continue;
        }

        let query_symbol = if asset.source == "KRAKEN"
            || asset.symbol == "BTC"
            || asset.symbol == "ETH"
            || asset.symbol == "XRP"
        {
            format!("{}/USD", asset.symbol)
        } else {
            asset.symbol.clone()
        };

        symbols_to_fetch.push(query_symbol);
    }

    let current_prices = market_data_service::get_market_prices(
        db,
        &state.twelve_data_client,
        &state.yahoo_client,
        symbols_to_fetch,
    )
    .await;

    let summary =
        calculation_service::calculate_portfolio(assets, transactions, config, &current_prices);

    (StatusCode::OK, Json(summary)).into_response()
}
