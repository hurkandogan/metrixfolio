use crate::state::AppState;
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::Serialize;
use serde_json::Value;

#[derive(Serialize, Debug, Clone)]
struct StockInfo {
    symbol: String,
    name: String,
}

pub async fn stock_list_handler(State(state): State<AppState>) -> impl IntoResponse {
    println!("Public stock list handler called.");

    let sheet_data = match state.google_sheets_client.fetch_stock_data().await {
        Ok(data) => data,
        Err(e) => {
            eprintln!("stock_list_handler: Error fetching stock data: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, "").into_response();
        }
    };

    let mut stock_list: Vec<StockInfo> = Vec::new();

    for item in sheet_data {
        let symbol = item.get("SYMBOL").and_then(|v| v.as_str());
        let name = item.get("NAME").and_then(|v| v.as_str());

        if let (Some(s), Some(n)) = (symbol, name) {
            if !s.starts_with("CURRENCY:") {
                stock_list.push(StockInfo {
                    symbol: s.to_string(),
                    name: n.to_string(),
                });
            }
        }
    }

    (StatusCode::OK, Json(stock_list)).into_response()
}
