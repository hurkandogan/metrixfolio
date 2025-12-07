use crate::services::market_data_service;
use crate::state::AppState;
use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use serde::Deserialize;
use std::env;

#[derive(Deserialize)]
pub struct PriceRequest {
    pub symbols: Vec<String>,
}

pub async fn get_market_prices_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<PriceRequest>,
) -> impl IntoResponse {
    let secret = env::var("NOTIFIER_API_SECRET").unwrap_or("gizli-anahtar".to_string());
    let auth_header = headers.get("Authorization").and_then(|v| v.to_str().ok());

    if auth_header != Some(&format!("Bearer {}", secret)) {
        return (StatusCode::UNAUTHORIZED, "Yetkisiz Erişim").into_response();
    }

    let prices = market_data_service::get_market_prices(
        &state.firestore_client.db,
        &state.twelve_data_client,
        &state.yahoo_client,
        payload.symbols,
    )
    .await;

    (StatusCode::OK, Json(prices)).into_response()
}
