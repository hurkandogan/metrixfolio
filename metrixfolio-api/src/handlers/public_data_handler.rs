use crate::services::market_data_service;
use crate::state::AppState;
use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::Deserialize;
use std::{collections::HashMap, env};

#[derive(Deserialize)]
pub struct PriceRequest {
    pub symbols: Vec<String>,
    pub wait_for_open: Option<bool>, // Yeni parametre: Opsiyonel
}

fn check_auth(headers: &HeaderMap) -> bool {
    let secret = env::var("NOTIFIER_API_SECRET").unwrap_or("gizli-anahtar".to_string());
    let auth_header = headers.get("Authorization").and_then(|v| v.to_str().ok());
    auth_header == Some(&format!("Bearer {}", secret))
}

pub async fn get_market_prices_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<PriceRequest>,
) -> impl IntoResponse {
    if !check_auth(&headers) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized access").into_response();
    }

    let full_data = market_data_service::get_market_prices(
        &state.twelve_data_client,
        &state.yahoo_client,
        payload.symbols,
        false, // Normal endpoint bekleme yapmaz
    )
    .await;

    // For old api compatibility, return a simple map of symbol to price
    let mut simple_prices: HashMap<String, f64> = HashMap::new();
    for (symbol, data) in full_data {
        simple_prices.insert(symbol, data.price);
    }

    (StatusCode::OK, Json(simple_prices)).into_response()
}

// returns detailed price data including change percent
pub async fn get_market_prices_detailed_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<PriceRequest>,
) -> impl IntoResponse {
    if !check_auth(&headers) {
        return (StatusCode::UNAUTHORIZED, "Unauthorized access").into_response();
    }

    let full_data = market_data_service::get_market_prices(
        &state.twelve_data_client,
        &state.yahoo_client,
        payload.symbols,
        payload.wait_for_open.unwrap_or(false),
    )
    .await;

    (StatusCode::OK, Json(full_data)).into_response()
}
