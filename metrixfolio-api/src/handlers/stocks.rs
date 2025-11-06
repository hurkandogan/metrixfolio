// src/handlers/stocks.rs

use axum::{
    http::StatusCode,
    response::{IntoResponse, Json},
};
use csv::ReaderBuilder;
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::env;

pub async fn google_sheet_test_handler() -> impl IntoResponse {
    println!("Google Sheet CSV test handler called.");

    let sheet_url = match env::var("GOOGLE_SHEET_CSV_URL") {
        Ok(url) => url,
        Err(_) => {
            eprintln!("ERROR: GOOGLE_SHEET_CSV_URL env variable is not set.");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "ERROR: Google Sheet URL is not set.",
            )
                .into_response();
        }
    };

    let client = Client::new();
    let csv_text = match client.get(&sheet_url).send().await {
        Ok(response) => match response.text().await {
            Ok(text) => text,
            Err(e) => {
                eprintln!("Google Sheet response error: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "ERROR: Sheet response (text) could not be read.",
                )
                    .into_response();
            }
        },
        Err(e) => {
            eprintln!("Google Sheet error: {}", e);
            return (
                StatusCode::BAD_GATEWAY,
                "ERROR: Google Sheet could not be reached.",
            )
                .into_response();
        }
    };

    let mut results: Vec<HashMap<String, Value>> = Vec::new();

    let mut reader = ReaderBuilder::new()
        .flexible(true)
        .from_reader(csv_text.as_bytes());

    let headers = match reader.headers() {
        Ok(h) => h.clone(),
        Err(e) => {
            eprintln!("CSV headers could not be read: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "ERROR: CSV headers could not be read.",
            )
                .into_response();
        }
    };

    for result in reader.records() {
        let record = match result {
            Ok(r) => r,
            Err(_) => continue,
        };

        let map: HashMap<String, Value> = headers
            .iter()
            .zip(record.iter())
            .map(|(header, value_str)| {
                let json_value = match value_str {
                    "N/A" => Value::Null,
                    "#N/A" => Value::Null,
                    "" => Value::Null.take(),
                    _ => Value::String(value_str.to_string()),
                };
                (header.to_string(), json_value)
            })
            .collect();

        results.push(map);
    }

    (StatusCode::OK, Json(results)).into_response()
}
